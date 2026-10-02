import json
import boto3
import base64
from typing import Dict, Any

rekognition = boto3.client('rekognition', region_name='us-east-1')
bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
s3 = boto3.client('s3')

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Analyze screenshot using Amazon Rekognition to detect text and labels.
    Identifies which AWS portal the screenshot shows.
    """
    try:
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event

        image_data = body.get('image_base64')
        image_url = body.get('image_url')

        image_bytes = None

        if image_data:
            image_bytes = base64.b64decode(image_data)
        elif image_url and image_url.startswith('s3://'):
            parts = image_url.replace('s3://', '').split('/', 1)
            bucket = parts[0]
            key = parts[1] if len(parts) > 1 else ''
            obj = s3.get_object(Bucket=bucket, Key=key)
            image_bytes = obj['Body'].read()
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Provide image_base64 or image_url (s3://...)'})
            }

        # Detect text in the screenshot using Rekognition
        text_response = rekognition.detect_text(
            Image={'Bytes': image_bytes}
        )

        detected_texts = []
        for detection in text_response.get('TextDetections', []):
            if detection['Type'] == 'LINE' and detection['Confidence'] > 80:
                detected_texts.append(detection['DetectedText'])

        # Detect labels (UI elements, logos, etc.)
        label_response = rekognition.detect_labels(
            Image={'Bytes': image_bytes},
            MaxLabels=15,
            MinConfidence=70
        )

        detected_labels = [
            {'name': label['Name'], 'confidence': round(label['Confidence'], 1)}
            for label in label_response.get('Labels', [])
        ]

        # Identify what the screenshot shows using scoring
        all_text = ' '.join(detected_texts).lower()
        label_names = [l['name'].lower() for l in detected_labels]

        portal_type, confidence = classify_screenshot(all_text, label_names, detected_texts)
        analysis_service = 'Amazon Rekognition'
        ai_description = None

        # If Rekognition scoring is low or unknown, ask Bedrock to look at the image
        if confidence < 60 and image_bytes:
            try:
                ai_result = analyze_with_bedrock(image_bytes)
                if ai_result:
                    portal_type = ai_result.get('portal_type', portal_type)
                    confidence = ai_result.get('confidence', confidence)
                    ai_description = ai_result.get('description', '')
                    analysis_service = 'Amazon Rekognition + Bedrock Vision'
            except Exception as e:
                print(f"Bedrock vision fallback error: {str(e)}")

        result = {
            'portal_type': portal_type,
            'confidence': confidence,
            'detected_text': detected_texts[:20],
            'detected_labels': detected_labels,
            'text_count': len(detected_texts),
            'analysis_service': analysis_service
        }
        if ai_description:
            result['ai_description'] = ai_description

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps(result)
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': str(e)})
        }


def classify_screenshot(all_text: str, label_names: list, raw_lines: list) -> tuple:
    """
    Score-based classification that considers both text AND page structure.
    A chat window talking about AWS shouldn't be classified as the AWS Console.
    """

    # First: detect if this is a chat/messaging interface (not an AWS portal at all)
    chat_signals = 0
    chat_text_hints = ['ask your', 'type a message', 'send', 'chat', 'customer support',
                       'new session', 'session:', 'is there anything else',
                       'ask me anything', 'how can i help']
    for hint in chat_text_hints:
        if hint in all_text:
            chat_signals += 2

    for label in label_names:
        if label in ['chat', 'messaging', 'conversation']:
            chat_signals += 3

    # Long paragraphs of text = article/chat, not a portal UI
    long_lines = [l for l in raw_lines if len(l) > 80]
    if len(long_lines) > 3:
        chat_signals += 2

    if chat_signals >= 4:
        return ('Chat / Messaging Interface', 80)

    # Score each portal candidate
    scores = {
        'AWS Builder Center': 0,
        'AWS Skill Builder': 0,
        'AWS Management Console': 0,
        'AWS Documentation': 0,
        'AWS Sign-in Page': 0
    }

    # Strong signals: URL bars, page titles, navigation elements unique to each portal
    strong = {
        'AWS Builder Center': ['builder.aws', 'builder center', 'student rewards',
                               'builder groups', 'join a group', 'claim reward'],
        'AWS Skill Builder': ['skillbuilder.aws', 'skill builder', 'learning path',
                              'my courses', 'subscription', 'digital training',
                              'hands-on lab'],
        'AWS Management Console': ['console.aws', 'management console', 'search services',
                                   'recently visited', 'cost explorer',
                                   'cloudwatch', 'launch instance'],
        'AWS Documentation': ['service guides', 'developer tools', 'ai resources',
                              'view related pages', 'did this page help',
                              'next topic:', 'docs.aws', 'user guide',
                              'search in this guide', 'abstracts generated by ai',
                              'sign in to the console'],
        'AWS Sign-in Page': ['root user email', 'iam user', 'create a new aws account',
                             'forgot password', 'sign-in']
    }

    # Weak signals: words that appear in portal UI but also in conversations about them
    weak = {
        'AWS Builder Center': ['community', 'hackathon', 'events', 'badges'],
        'AWS Skill Builder': ['courses', 'certification', 'learning', 'labs'],
        'AWS Management Console': ['ec2', 's3', 'lambda', 'dashboard'],
        'AWS Documentation': ['get started', 'helpful links', 'aws cli',
                              'provide feedback', 'recommended tasks'],
        'AWS Sign-in Page': ['sign in', 'aws', 'amazon', 'account']
    }

    for portal, terms in strong.items():
        for term in terms:
            if term in all_text:
                scores[portal] += 3

    for portal, terms in weak.items():
        for term in terms:
            if term in all_text:
                scores[portal] += 1

    # UI structure signals from Rekognition labels
    if any(l in label_names for l in ['menu', 'navigation', 'toolbar']):
        scores['AWS Management Console'] += 2
    if any(l in label_names for l in ['login', 'sign in']):
        scores['AWS Sign-in Page'] += 2

    best = max(scores, key=scores.get)
    best_score = scores[best]

    if best_score == 0:
        return ('Unknown - not recognized as an AWS portal', 0)

    # Require a minimum score to avoid false positives
    if best_score < 3:
        return ('Unclear - could not confidently identify the portal', 40)

    confidence = min(95, 50 + best_score * 5)
    return (best, confidence)


def analyze_with_bedrock(image_bytes: bytes) -> dict:
    """
    Use Bedrock multimodal to analyze screenshots that Rekognition scoring can't classify.
    The model sees the actual image and reasons about what page/portal it is.
    """
    response = bedrock.converse(
        modelId='us.anthropic.claude-sonnet-4-6',
        messages=[{
            'role': 'user',
            'content': [
                {
                    'image': {
                        'format': 'png',
                        'source': {'bytes': image_bytes}
                    }
                },
                {
                    'text': (
                        'What AWS page or portal is shown in this screenshot? '
                        'Respond in JSON only: {"portal_type": "name of the page/portal", '
                        '"confidence": 0-100, "description": "one sentence describing what '
                        'this page is and what the user can do here"}. '
                        'If this is not an AWS page, say what it actually is.'
                    )
                }
            ]
        }],
        inferenceConfig={'maxTokens': 300, 'temperature': 0}
    )

    text = response['output']['message']['content'][0]['text']
    # Extract JSON from the response (model might wrap it in markdown)
    if '{' in text:
        json_str = text[text.index('{'):text.rindex('}') + 1]
        return json.loads(json_str)
    return None
