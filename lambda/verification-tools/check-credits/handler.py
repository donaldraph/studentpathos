import json
import boto3
from typing import Dict, Any
from datetime import datetime, timedelta

ce_client = boto3.client('ce')  # Cost Explorer

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Check AWS promotional credits status.
    Returns credit amount, expiration, and usage.
    """
    try:
        account_id = event.get('account_id')
        if not account_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Account ID required'})
            }

        # For demo: Mock credits data
        # Production would query Cost Explorer API for actual credits
        return {
            'statusCode': 200,
            'body': json.dumps({
                'has_credits': True,
                'total_credits': 100.00,
                'used_credits': 12.50,
                'remaining_credits': 87.50,
                'expiration_date': (datetime.now() + timedelta(days=365)).isoformat(),
                'days_until_expiration': 365,
                'recommendation': 'You have $87.50 remaining. Start building to use your credits!'
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
