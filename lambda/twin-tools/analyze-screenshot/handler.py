import json
import boto3
import base64

s3 = boto3.client('s3')
bedrock = boto3.client('bedrock-runtime')

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Analyze screenshot using Claude Vision to identify AWS portal.
    Returns portal type and explanation.
    """
    try:
        image_url = event.get('image_url')
        if not image_url:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Image URL required'})
            }

        # Parse S3 URL
        parts = image_url.replace('s3://', '').split('/', 1)
        bucket = parts[0]
        key = parts[1] if len(parts) > 1 else ''

        # Download image from S3
        image_obj = s3.get_object(Bucket=bucket, Key=key)
        image_data = image_obj['Body'].read()
        image_b64 = base64.b64encode(image_data).decode('utf-8')

        # Analyze with Claude Vision
        response = bedrock.invoke_model(
            modelId='anthropic.claude-3-5-sonnet-20240620-v1:0',
            body=json.dumps({
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 1024,
                'messages': [{
                    'role': 'user',
                    'content': [
                        {
                            'type': 'image',
                            'source': {
                                'type': 'base64',
                                'media_type': 'image/png',
                                'data': image_b64
                            }
                        },
                        {
                            'type': 'text',
                            'text': '''Identify which AWS portal this screenshot shows:

                            1. AWS Builder Center (community, hackathons, events)
                            2. AWS Skill Builder (courses, certifications, labs)
                            3. AWS Management Console (actual AWS services)

                            Return JSON: {portal_type, confidence, explanation, key_features[]}'''
                        }
                    ]
                }]
            })
        )

        result = json.loads(response['body'].read())
        content = result['content'][0]['text']

        return {
            'statusCode': 200,
            'body': json.dumps({
                'analysis': content,
                'model_used': 'claude-3-5-sonnet'
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
