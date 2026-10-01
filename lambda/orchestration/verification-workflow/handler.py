import json
import boto3
from typing import Dict, Any

sfn = boto3.client('stepfunctions')
lambda_client = boto3.client('lambda')

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Orchestrate verification workflow via Step Functions.
    Triggers parallel verification checks and updates journey state.
    """
    try:
        user_id = event.get('user_id')
        if not user_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'User ID required'})
            }

        # Define verification workflow
        workflow_input = {
            'user_id': user_id,
            'checks': [
                {'type': 'account', 'function': 'check-account'},
                {'type': 'credits', 'function': 'check-credits'},
                {'type': 'profile', 'function': 'check-profile'},
                {'type': 'student_status', 'function': 'check-student-status'}
            ]
        }

        # Start Step Functions execution
        state_machine_arn = f'arn:aws:states:us-east-1:ACCOUNT:stateMachine:studentpathos-verification'

        response = sfn.start_execution(
            stateMachineArn=state_machine_arn,
            input=json.dumps(workflow_input)
        )

        execution_arn = response['executionArn']

        # For quick response: invoke checks in parallel (fallback if Step Functions not yet deployed)
        results = {}
        for check in workflow_input['checks']:
            try:
                lambda_response = lambda_client.invoke(
                    FunctionName=f'studentpathos-{check["function"]}',
                    InvocationType='RequestResponse',
                    Payload=json.dumps({
                        'user_id': user_id,
                        'account_id': user_id  # Mock for demo
                    })
                )
                check_result = json.loads(lambda_response['Payload'].read())
                results[check['type']] = check_result
            except Exception as e:
                results[check['type']] = {'error': str(e)}

        # Determine which milestones to celebrate
        milestones_hit = []
        if results.get('account', {}).get('body'):
            account_data = json.loads(results['account']['body'])
            if account_data.get('account_exists'):
                milestones_hit.append('account_created')

        if results.get('credits', {}).get('body'):
            credits_data = json.loads(results['credits']['body'])
            if credits_data.get('has_credits'):
                milestones_hit.append('credits_claimed')

        if results.get('profile', {}).get('body'):
            profile_data = json.loads(results['profile']['body'])
            if profile_data.get('profile_exists'):
                milestones_hit.append('profile_complete')

        if results.get('student_status', {}).get('body'):
            student_data = json.loads(results['student_status']['body'])
            if student_data.get('verified'):
                milestones_hit.append('fully_verified')

        return {
            'statusCode': 200,
            'body': json.dumps({
                'workflow_execution_arn': execution_arn,
                'verification_results': results,
                'milestones_hit': milestones_hit,
                'next_step': 'Check journey dashboard for progress'
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
