import json
import boto3
import os
from typing import Dict, Any

bedrock_agent = boto3.client('bedrock-agent-runtime')

# Embedded FAQ for fallback when Knowledge Base not configured
FAQ_KNOWLEDGE = """
AWS Student Builder - Correct Onboarding Flow:
1. Sign up on AWS Builder Center (no .edu email required)
2. Verify student status with your .edu email
3. Claim Skill Builder Premium at https://builder.aws.com/student-rewards
4. Sign up on AWS Console to build projects

Portal Differences:
- Builder Center: Community hub, sign up first, claim rewards
- Skill Builder: Training platform with courses
- Console: Where you actually build with AWS services

Key Facts:
- .edu email NOT needed for Builder Center signup, only for student verification
- Verification takes 1-3 business days
- Credits appear in AWS Billing console after verification
- Skill Builder Premium included in Student Rewards (normally $29/month)
"""

def fallback_faq_search(query: str) -> Dict[str, Any]:
    """Fallback FAQ search when Knowledge Base not configured"""
    query_lower = query.lower()
    results = []

    if any(word in query_lower for word in ['portal', 'difference', 'center', 'builder', 'console']):
        results.append({'content': 'Builder Center is community hub (sign up first), Skill Builder is for training, Console is where you build projects', 'score': 0.9})

    if any(word in query_lower for word in ['.edu', 'email', 'required', 'need']):
        results.append({'content': 'You can sign up on AWS Builder Center without .edu email. Email only required when verifying student status.', 'score': 0.95})

    if any(word in query_lower for word in ['flow', 'steps', 'onboard', 'how']):
        results.append({'content': 'Flow: 1) Sign up Builder Center 2) Verify student with .edu 3) Claim Skill Builder Premium 4) Sign up AWS Console', 'score': 0.92})

    if any(word in query_lower for word in ['verify', 'pending', 'long', 'wait']):
        results.append({'content': 'Student verification takes 1-3 business days. Check your .edu email for verification link.', 'score': 0.88})

    if any(word in query_lower for word in ['credit', 'claim', 'reward', 'free']):
        results.append({'content': 'After verification, credits appear in AWS Billing console. Student Rewards includes Skill Builder Premium and AWS credits.', 'score': 0.90})

    if not results:
        results.append({'content': 'Visit https://builder.aws.com for AWS Student Rewards information.', 'score': 0.5})

    return {
        'statusCode': 200,
        'body': json.dumps({
            'query': query,
            'results': results,
            'total_found': len(results),
            'source': 'embedded_faq'
        })
    }

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Search knowledge base using Bedrock RAG.
    Returns relevant AWS documentation chunks.
    """
    try:
        query = event.get('query')
        if not query:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Query required'})
            }

        knowledge_base_id = os.environ.get('KNOWLEDGE_BASE_ID')

        # Fallback to embedded FAQ if Knowledge Base not configured
        if not knowledge_base_id:
            return fallback_faq_search(query)

        # Query the knowledge base
        response = bedrock_agent.retrieve(
            knowledgeBaseId=knowledge_base_id,
            retrievalQuery={'text': query},
            retrievalConfiguration={
                'vectorSearchConfiguration': {
                    'numberOfResults': 5
                }
            }
        )

        # Extract results
        results = []
        for result in response.get('retrievalResults', []):
            results.append({
                'content': result['content']['text'],
                'score': result['score'],
                'source': result.get('location', {}).get('s3Location', {}).get('uri', 'unknown')
            })

        return {
            'statusCode': 200,
            'body': json.dumps({
                'query': query,
                'results': results,
                'total_found': len(results)
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
