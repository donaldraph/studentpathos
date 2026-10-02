import json
import boto3
import os
from typing import Dict, Any, List
from datetime import datetime

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
dynamodb = boto3.resource('dynamodb')
lambda_client = boto3.client('lambda')

# Agent configuration
MODEL_ID = 'us.anthropic.claude-sonnet-4-6'  # Claude Sonnet 4.6 via US inference profile

# Load FAQ knowledge base
FAQ_CONTEXT = """
# AWS Student Builder - Core Information

## Correct Onboarding Flow
1. Sign up on AWS Builder Center (no .edu email required)
2. Verify student status with your .edu email
3. Claim Skill Builder Premium subscription (https://builder.aws.com/student-rewards)
4. Sign up on AWS Console to build actual projects

## Portal Differences
- Builder Center: Community hub, sign up first, claim rewards
- Skill Builder: Training platform, get Premium through student rewards
- AWS Console: Where you actually build projects with AWS services

## Common Questions
- .edu email is NOT needed for Builder Center signup, only for student verification
- Student verification takes 1-3 business days
- Credits appear in AWS Billing console after verification
- Use AWS Console (console.aws.amazon.com) to build projects after setup complete
"""

SYSTEM_PROMPT = f"""You are the StudentPathOS AI Twin - a knowledgeable assistant helping AWS students navigate their onboarding journey.

{FAQ_CONTEXT}

Guidelines:
- Give clear, accurate answers based on the FAQ knowledge above
- Use tools to check real account status when needed
- Keep responses professional - minimal emojis, clean formatting
- Use markdown sparingly (bold for emphasis, lists when needed)
- For questions outside AWS student onboarding, use web search tool
- Remember conversation context and reference what the student already shared

Available tools:
- search_knowledge: Search local AWS documentation and FAQs (use this FIRST)
- web_search: Search the web for information not in local knowledge base
- check_account: Verify if their AWS account exists
- check_credits: Check their credit balance
- check_profile: Verify Builder Center profile
- check_student_status: Check student verification status"""

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Real Bedrock Agent with conversation memory and tool execution.
    Implements the agentic loop: Reasoning → Tool Selection → Execution → Context Update
    """
    try:
        # Parse body if coming from API Gateway
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event

        user_id = body.get('user_id', 'anonymous')
        user_message = body.get('message', '')

        if not user_message:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'error': 'Message required'})
            }

        # Load conversation history from DynamoDB
        conversation_history = load_conversation_history(user_id)

        # Add user message to history (Converse API requires content as list)
        conversation_history.append({
            'role': 'user',
            'content': [{'text': user_message}]
        })

        # Bedrock Converse API with tool use
        response = bedrock.converse(
            modelId=MODEL_ID,
            messages=conversation_history,
            system=[{'text': SYSTEM_PROMPT}],
            toolConfig={
                'tools': get_tool_definitions()
            },
            inferenceConfig={
                'maxTokens': 2048,
                'temperature': 0.7
            }
        )

        # Process response and handle tool calls
        stop_reason = response['stopReason']
        output_message = response['output']['message']

        if stop_reason == 'tool_use':
            # Agent wants to use tools - execute them
            tool_results = execute_tools(output_message['content'])

            # Add tool results back to conversation
            conversation_history.append(output_message)
            conversation_history.append({
                'role': 'user',
                'content': tool_results
            })

            # Get final response after tool execution
            # toolConfig required because conversation now contains tool blocks
            final_response = bedrock.converse(
                modelId=MODEL_ID,
                messages=conversation_history,
                system=[{'text': SYSTEM_PROMPT}],
                toolConfig={
                    'tools': get_tool_definitions()
                },
                inferenceConfig={
                    'maxTokens': 2048,
                    'temperature': 0.7
                }
            )

            assistant_message = final_response['output']['message']
        else:
            assistant_message = output_message

        # Extract text response
        assistant_text = ''
        for content_block in assistant_message['content']:
            if 'text' in content_block:
                assistant_text = content_block['text']
                break

        # Save updated conversation history
        conversation_history.append(assistant_message)
        save_conversation_history(user_id, conversation_history)

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'response': assistant_text,
                'user_id': user_id,
                'model': MODEL_ID,
                'tools_used': stop_reason == 'tool_use'
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': str(e)})
        }


def get_tool_definitions() -> List[Dict]:
    """Define tools the agent can use"""
    return [
        {
            'toolSpec': {
                'name': 'check_account',
                'description': 'Check if the student has an AWS account with their .edu email',
                'inputSchema': {
                    'json': {
                        'type': 'object',
                        'properties': {
                            'email': {
                                'type': 'string',
                                'description': 'The student\'s .edu email address'
                            }
                        },
                        'required': ['email']
                    }
                }
            }
        },
        {
            'toolSpec': {
                'name': 'check_credits',
                'description': 'Check the student\'s AWS credit balance and expiration',
                'inputSchema': {
                    'json': {
                        'type': 'object',
                        'properties': {
                            'user_id': {
                                'type': 'string',
                                'description': 'The student user ID'
                            }
                        },
                        'required': ['user_id']
                    }
                }
            }
        },
        {
            'toolSpec': {
                'name': 'check_profile',
                'description': 'Check if the student has completed their AWS Builder Center profile',
                'inputSchema': {
                    'json': {
                        'type': 'object',
                        'properties': {
                            'user_id': {
                                'type': 'string',
                                'description': 'The student user ID'
                            }
                        },
                        'required': ['user_id']
                    }
                }
            }
        },
        {
            'toolSpec': {
                'name': 'search_knowledge',
                'description': 'Search local AWS documentation and FAQs. Use this FIRST before web_search for AWS-related questions.',
                'inputSchema': {
                    'json': {
                        'type': 'object',
                        'properties': {
                            'query': {
                                'type': 'string',
                                'description': 'The search query'
                            }
                        },
                        'required': ['query']
                    }
                }
            }
        },
        {
            'toolSpec': {
                'name': 'web_search',
                'description': 'Search the web for information not available in local knowledge base. Use only when search_knowledge returns no results or for non-AWS questions.',
                'inputSchema': {
                    'json': {
                        'type': 'object',
                        'properties': {
                            'query': {
                                'type': 'string',
                                'description': 'The web search query'
                            }
                        },
                        'required': ['query']
                    }
                }
            }
        }
    ]


def execute_tools(content_blocks: List[Dict]) -> List[Dict]:
    """Execute tools requested by the agent"""
    tool_results = []

    for block in content_blocks:
        if 'toolUse' in block:
            tool_use = block['toolUse']
            tool_name = tool_use['name']
            tool_input = tool_use['input']

            print(f"Executing tool: {tool_name} with input: {tool_input}")

            # Handle web_search directly (no Lambda needed)
            if tool_name == 'web_search':
                query = tool_input.get('query', '')
                # Simple web search simulation - in production, use real API like SerpAPI or Tavily
                search_result = {
                    'query': query,
                    'answer': f'For detailed information about "{query}", please visit the official AWS documentation or Builder Center resources.',
                    'note': 'Web search capability coming soon. For AWS-specific questions, use the search_knowledge tool.'
                }
                tool_results.append({
                    'toolResult': {
                        'toolUseId': tool_use['toolUseId'],
                        'content': [{'json': search_result}]
                    }
                })
                continue

            # Map tool names to Lambda functions
            function_map = {
                'check_account': 'studentpathos-check-account',
                'check_credits': 'studentpathos-check-credits',
                'check_profile': 'studentpathos-check-profile',
                'search_knowledge': 'studentpathos-search-knowledge-base'
            }

            if tool_name in function_map:
                try:
                    # Invoke the Lambda function
                    response = lambda_client.invoke(
                        FunctionName=function_map[tool_name],
                        InvocationType='RequestResponse',
                        Payload=json.dumps(tool_input)
                    )

                    result = json.loads(response['Payload'].read())

                    tool_results.append({
                        'toolResult': {
                            'toolUseId': tool_use['toolUseId'],
                            'content': [{'json': result}]
                        }
                    })
                except Exception as e:
                    tool_results.append({
                        'toolResult': {
                            'toolUseId': tool_use['toolUseId'],
                            'content': [{'text': f'Error: {str(e)}'}],
                            'status': 'error'
                        }
                    })

    return tool_results


def load_conversation_history(user_id: str) -> List[Dict]:
    """Load conversation history from DynamoDB"""
    table = dynamodb.Table('studentpathos-conversations')

    try:
        response = table.get_item(
            Key={'user_id': user_id, 'conversation_id': 'active'}
        )

        if 'Item' in response:
            return response['Item'].get('messages', [])
    except:
        pass

    return []


def save_conversation_history(user_id: str, messages: List[Dict]):
    """Save conversation history to DynamoDB"""
    table = dynamodb.Table('studentpathos-conversations')

    # Keep only last 20 messages to avoid context limits
    if len(messages) > 20:
        messages = messages[-20:]

    table.put_item(Item={
        'user_id': user_id,
        'conversation_id': 'active',
        'messages': messages,
        'updated_at': datetime.now().isoformat(),
        'created_at': datetime.now().isoformat()
    })
