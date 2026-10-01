import json
import boto3
from typing import Dict, Any
from decimal import Decimal
from collections import Counter

dynamodb = boto3.resource('dynamodb')

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Aggregate community question patterns.
    Returns trending topics and confusion points.
    """
    try:
        time_period = event.get('time_period', '7d')  # 7d, 30d, 90d

        # Query conversation history table
        table = dynamodb.Table('studentpathos-conversations')

        # Scan conversations (in production, use time-based GSI)
        response = table.scan()
        items = response.get('Items', [])

        # Extract questions and patterns
        all_questions = []
        confusion_points = []

        for item in items:
            messages = item.get('messages', [])
            for msg in messages:
                if msg.get('role') == 'user':
                    content = msg.get('content', '').lower()
                    all_questions.append(content)

                    # Detect confusion signals
                    if any(word in content for word in ['confused', 'where', 'which', 'difference', 'help']):
                        confusion_points.append(content[:100])

        # Identify common topics
        topics = Counter()
        keywords = ['credits', 'verification', 'builder center', 'skill builder', 'console', 'profile']
        for question in all_questions:
            for keyword in keywords:
                if keyword in question:
                    topics[keyword] += 1

        # Calculate metrics
        total_students = len(set(item.get('user_id') for item in items))
        avg_questions_per_student = len(all_questions) / max(total_students, 1)

        return {
            'statusCode': 200,
            'body': json.dumps({
                'time_period': time_period,
                'total_conversations': len(items),
                'total_students': total_students,
                'total_questions': len(all_questions),
                'avg_questions_per_student': round(avg_questions_per_student, 2),
                'trending_topics': [
                    {'topic': topic, 'count': count}
                    for topic, count in topics.most_common(10)
                ],
                'confusion_points': confusion_points[:20],
                'recommendations_for_aws': [
                    'Simplify portal navigation documentation',
                    'Create visual comparison guide for Builder Center vs Skill Builder',
                    'Add progress tracker to credit claim process'
                ]
            }, default=str)
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
