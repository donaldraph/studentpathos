import json
import boto3
import os
from typing import Dict, Any

bedrock_agent = boto3.client('bedrock-agent-runtime')

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
        if not knowledge_base_id:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'Knowledge base not configured'})
            }

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
