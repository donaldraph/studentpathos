import json
import boto3
from typing import Dict, Any, List

dynamodb = boto3.resource('dynamodb')

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Recommend next action based on journey state.
    Deterministic logic for the 5-step path.
    """
    try:
        user_id = event.get('user_id')
        if not user_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'User ID required'})
            }

        # Get current journey state
        table = dynamodb.Table('studentpathos-journeys')
        response = table.get_item(Key={'user_id': user_id})
        journey = response.get('Item', {})

        # Journey steps with deterministic logic
        steps = [
            {
                'step': 1,
                'title': 'Create AWS Account',
                'check_key': 'account_exists',
                'action': 'Sign up at aws.amazon.com with your .edu email',
                'tool': 'check-account'
            },
            {
                'step': 2,
                'title': 'Verify Student Email',
                'check_key': 'edu_email_verified',
                'action': 'Check your .edu inbox and verify your email',
                'tool': 'check-student-status'
            },
            {
                'step': 3,
                'title': 'Create Builder Center Profile',
                'check_key': 'profile_exists',
                'action': 'Complete your profile at builder.aws.com',
                'tool': 'check-profile'
            },
            {
                'step': 4,
                'title': 'Claim AWS Credits',
                'check_key': 'has_credits',
                'action': 'Claim $100 in AWS promotional credits',
                'tool': 'check-credits'
            },
            {
                'step': 5,
                'title': 'Student Verification Complete',
                'check_key': 'verified',
                'action': 'Start building! Your account is fully set up.',
                'tool': 'check-student-status'
            }
        ]

        # Find current step (first incomplete)
        current_step = None
        completed_steps = []

        for step in steps:
            is_complete = journey.get(step['check_key'], False)
            if is_complete:
                completed_steps.append(step['step'])
            elif not current_step:
                current_step = step

        # If all complete, recommend first project
        if not current_step:
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'all_complete': True,
                    'completed_steps': len(steps),
                    'total_steps': len(steps),
                    'recommendation': {
                        'title': 'Start Your First AWS Project',
                        'action': 'Deploy a web app with Amplify or try a Lambda function',
                        'resources': [
                            'AWS Skill Builder free courses',
                            'AWS Builder Center hackathons',
                            'StudentPathOS community'
                        ]
                    }
                })
            }

        return {
            'statusCode': 200,
            'body': json.dumps({
                'all_complete': False,
                'current_step': current_step['step'],
                'total_steps': len(steps),
                'completed_steps': completed_steps,
                'recommendation': {
                    'title': current_step['title'],
                    'action': current_step['action'],
                    'tool_to_check': current_step['tool'],
                    'estimated_time_minutes': 5
                },
                'next_steps_after': [
                    steps[current_step['step']]['title']
                    for current_step in steps[current_step['step']:]
                ] if current_step['step'] < len(steps) else []
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
