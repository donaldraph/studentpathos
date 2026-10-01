import json
import boto3
from typing import Dict, Any
from datetime import datetime, timedelta
from collections import defaultdict

dynamodb = boto3.resource('dynamodb')

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Aggregate questions from all students for analytics.
    Creates weekly reports of common pain points.
    """
    try:
        # Get all conversations from the past week
        table = dynamodb.Table('studentpathos-conversations')
        one_week_ago = (datetime.now() - timedelta(days=7)).isoformat()

        response = table.scan(
            FilterExpression='created_at >= :week_ago',
            ExpressionAttributeValues={':week_ago': one_week_ago}
        )

        conversations = response.get('Items', [])

        # Aggregate by topic
        topic_frequency = defaultdict(int)
        confusion_words = ['confused', 'don\'t understand', 'what is', 'difference between', 'where']

        question_categories = {
            'account_creation': 0,
            'credit_claiming': 0,
            'portal_navigation': 0,
            'verification_status': 0,
            'profile_setup': 0,
            'general_confusion': 0
        }

        all_questions = []

        for conv in conversations:
            messages = conv.get('messages', [])
            for msg in messages:
                if msg.get('role') == 'user':
                    content = msg.get('content', '').lower()
                    all_questions.append({
                        'user_id': conv.get('user_id'),
                        'question': content[:200],
                        'timestamp': msg.get('timestamp')
                    })

                    # Categorize
                    if 'account' in content or 'sign up' in content:
                        question_categories['account_creation'] += 1
                    elif 'credit' in content:
                        question_categories['credit_claiming'] += 1
                    elif 'builder center' in content or 'skill builder' in content or 'console' in content:
                        question_categories['portal_navigation'] += 1
                    elif 'verification' in content or 'verify' in content:
                        question_categories['verification_status'] += 1
                    elif 'profile' in content:
                        question_categories['profile_setup'] += 1
                    elif any(word in content for word in confusion_words):
                        question_categories['general_confusion'] += 1

        # Generate recommendations for AWS
        top_category = max(question_categories.items(), key=lambda x: x[1])
        recommendations = []

        if top_category[0] == 'portal_navigation':
            recommendations.append('Create visual guide showing Builder Center vs Skill Builder vs Console')
        if question_categories['credit_claiming'] > 10:
            recommendations.append('Simplify credit claiming flow - too many questions about it')
        if question_categories['verification_status'] > 10:
            recommendations.append('Add progress tracker to verification process')

        return {
            'statusCode': 200,
            'body': json.dumps({
                'week': one_week_ago,
                'total_conversations': len(conversations),
                'total_questions': len(all_questions),
                'question_categories': question_categories,
                'top_pain_point': top_category[0],
                'recommendations_for_aws': recommendations,
                'sample_questions': all_questions[:10]
            }, default=str)
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
