import json
import boto3
import base64
from typing import Dict, Any

rekognition = boto3.client('rekognition', region_name='us-east-1')
s3 = boto3.client('s3')

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Analyze screenshot using Amazon Rekognition to detect text and labels.
    Identifies which AWS portal the screenshot shows.
    """
    try:
        image_data = event.get('image_base64')
        image_url = event.get('image_url')

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

        # Identify portal based on detected text
        all_text = ' '.join(detected_texts).lower()
        portal_type = 'unknown'
        confidence = 0

        if any(term in all_text for term in ['builder center', 'builder.aws', 'student rewards', 'community']):
            portal_type = 'AWS Builder Center'
            confidence = 90
        elif any(term in all_text for term in ['skill builder', 'skillbuilder', 'courses', 'learning path', 'certification']):
            portal_type = 'AWS Skill Builder'
            confidence = 90
        elif any(term in all_text for term in ['console', 'services', 'ec2', 's3', 'lambda', 'cloudformation', 'dashboard']):
            portal_type = 'AWS Management Console'
            confidence = 85
        elif any(term in all_text for term in ['sign in', 'create account', 'aws', 'amazon']):
            portal_type = 'AWS Sign-in Page'
            confidence = 75

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'portal_type': portal_type,
                'confidence': confidence,
                'detected_text': detected_texts[:20],
                'detected_labels': detected_labels,
                'text_count': len(detected_texts),
                'analysis_service': 'Amazon Rekognition'
            })
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
