import json
import boto3
from typing import Dict, Any

polly = boto3.client('polly')
sns = boto3.client('sns')
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Trigger celebrations when students hit milestones.
    Sends confetti animation + voice message via SNS to frontend.
    """
    try:
        user_id = event.get('user_id')
        milestone = event.get('milestone')

        if not user_id or not milestone:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'User ID and milestone required'})
            }

        # Define celebration messages
        celebrations = {
            'account_created': {
                'message': 'Nice! Your AWS account is ready. Welcome to the builder community!',
                'animation': 'confetti',
                'voice_text': 'Amazing! Your AWS account is created. You're officially a builder now!',
                'color_theme': 'blue'
            },
            'email_verified': {
                'message': 'Email verified! Your .edu status is confirmed.',
                'animation': 'stars',
                'voice_text': 'Perfect! Your student email is verified. One step closer!',
                'color_theme': 'green'
            },
            'profile_complete': {
                'message': 'Builder profile complete! You're visible in the community.',
                'animation': 'fireworks',
                'voice_text': 'Excellent! Your Builder Center profile is complete!',
                'color_theme': 'purple'
            },
            'credits_claimed': {
                'message': 'You claimed $100 in AWS credits! Time to build something awesome.',
                'animation': 'money',
                'voice_text': 'Boom! One hundred dollars in credits claimed. Now let's build!',
                'color_theme': 'gold'
            },
            'fully_verified': {
                'message': 'FULLY VERIFIED! Your AWS student journey is complete. Go build amazing things!',
                'animation': 'ultimate',
                'voice_text': 'You did it! Fully verified AWS student. The cloud is yours. Go build something incredible!',
                'color_theme': 'rainbow'
            }
        }

        celebration = celebrations.get(milestone, celebrations['account_created'])

        # Generate voice using Polly
        polly_response = polly.synthesize_speech(
            Text=celebration['voice_text'],
            OutputFormat='mp3',
            VoiceId='Joanna',
            Engine='neural'
        )

        # Store celebration event
        table = dynamodb.Table('studentpathos-celebrations')
        table.put_item(Item={
            'user_id': user_id,
            'milestone': milestone,
            'triggered_at': context.request_id,
            'celebration_data': celebration
        })

        # Publish to SNS for real-time frontend notification
        sns.publish(
            TopicArn=f'arn:aws:sns:us-east-1:ACCOUNT:studentpathos-celebrations',
            Message=json.dumps({
                'user_id': user_id,
                'celebration': celebration,
                'audio_stream': 'polly_stream_id'
            })
        )

        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'milestone': milestone,
                'celebration': celebration
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
