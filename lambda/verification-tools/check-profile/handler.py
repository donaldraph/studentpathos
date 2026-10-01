import json
import boto3
from typing import Dict, Any

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Check if Builder Center profile exists.
    Returns profile status and completion percentage.
    """
    try:
        user_id = event.get('user_id')
        if not user_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'User ID required'})
            }

        # Mock Builder Center profile check
        # Production would use Builder Center API
        return {
            'statusCode': 200,
            'body': json.dumps({
                'profile_exists': True,
                'profile_url': f'https://builder.aws.com/profile/{user_id}',
                'completion_percentage': 85,
                'joined_date': '2026-09-15',
                'is_verified': True,
                'next_step': 'Claim your student perks in the Student Perks section'
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
