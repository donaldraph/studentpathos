import json
import boto3
from typing import Dict, Any

bedrock = boto3.client('bedrock-runtime')

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Use Claude to generate insights from aggregated questions.
    Returns actionable recommendations for AWS.
    """
    try:
        aggregated_data = event.get('aggregated_data')
        if not aggregated_data:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Aggregated data required'})
            }

        # Build prompt for Claude
        prompt = f"""Analyze these AWS student onboarding questions and generate insights:

Total conversations: {aggregated_data.get('total_conversations')}
Total questions: {aggregated_data.get('total_questions')}

Question categories:
{json.dumps(aggregated_data.get('question_categories', {}), indent=2)}

Sample questions:
{chr(10).join(q['question'] for q in aggregated_data.get('sample_questions', [])[:5])}

Generate:
1. Top 3 pain points
2. Root causes for each
3. Specific recommendations for AWS to fix these issues
4. Estimated impact if fixed (% reduction in questions)

Return as JSON with keys: pain_points, root_causes, recommendations, estimated_impact"""

        # Call Claude via Bedrock
        response = bedrock.invoke_model(
            modelId='anthropic.claude-3-5-haiku-20241022-v1:0',
            body=json.dumps({
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 2048,
                'messages': [{
                    'role': 'user',
                    'content': prompt
                }]
            })
        )

        result = json.loads(response['body'].read())
        insights_text = result['content'][0]['text']

        # Try to parse as JSON, fallback to text
        try:
            insights = json.loads(insights_text)
        except:
            insights = {'raw_insights': insights_text}

        return {
            'statusCode': 200,
            'body': json.dumps({
                'insights': insights,
                'generated_at': aggregated_data.get('week'),
                'model_used': 'claude-3-5-haiku'
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
