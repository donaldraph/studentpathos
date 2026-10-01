import json
import boto3
from typing import Dict, Any

sts = boto3.client('sts')

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Check if AWS account exists using email.
    Returns account ID and creation info.
    """
    try:
        email = event.get('email')
        if not email:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Email required'})
            }

        # For demo: Mock response based on email domain
        # Production would use AWS Organizations API or IAM
        if email.endswith('.edu'):
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'account_exists': True,
                    'account_id': '123456789012',
                    'is_student_email': True,
                    'next_step': 'Verify your .edu email in AWS console'
                })
            }
        else:
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'account_exists': False,
                    'recommendation': 'Create AWS account with your .edu email for student benefits'
                })
            }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
