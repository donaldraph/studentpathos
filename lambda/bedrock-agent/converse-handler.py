import json
import boto3
import os
import urllib.request
import urllib.parse
import re
from typing import Dict, Any, List
from datetime import datetime

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
dynamodb = boto3.resource('dynamodb')
lambda_client = boto3.client('lambda')

# Agent configuration
MODEL_ID = 'us.anthropic.claude-sonnet-4-6'  # Claude Sonnet 4.6 via US inference profile

SYSTEM_PROMPT = """You are the StudentPathOS AI Twin - a helpful, intelligent assistant helping AWS students with their onboarding journey.

## Core Knowledge - AWS Student Builder Program

### Correct Onboarding Flow
1. **Sign up on AWS Builder Center** (https://builder.aws.com) - No .edu email required for this step
2. **Verify student status** by connecting your university .edu email
3. **Claim Skill Builder Premium** subscription at https://builder.aws.com/student-rewards
4. **Sign up on AWS Console** (console.aws.amazon.com) to start building projects

### Portal Differences (Students often confuse these!)
- **AWS Builder Center**: Community hub for events, resources, and claiming student rewards. Sign up here FIRST.
- **AWS Skill Builder**: Training platform with courses and labs. Get Premium access through Student Rewards program.
- **AWS Console**: Where you actually build and deploy projects using AWS services.

### Student Builders Groups
AWS Student Builders is a community program that connects university students learning cloud computing. Local chapters at various universities organize:
- Study groups and workshops
- Hackathons and build challenges
- AWS certification prep
- Networking with other student builders
Students join through AWS Builder Center after signing up. Only mention specific universities if the student brings them up first.

### Key Facts
- AWS stands for Amazon Web Services - Amazon's cloud computing platform
- .edu email is NOT required for Builder Center signup, only for student verification
- Student verification typically takes 1-3 business days
- AWS credits appear in Billing console after verification is complete
- Student Rewards includes Skill Builder Premium (normally $29/month) + AWS credits

## How to Respond
- Write plain text only. No markdown, no asterisks, no bullet dashes, no headers. Just natural sentences and paragraphs.
- Be conversational and natural, like a real person chatting
- Keep responses concise (2-4 sentences for simple questions, more for complex ones)
- No emojis
- If you need to list things, use numbered sentences or just write them naturally in prose
- For questions you can answer from the knowledge above, just answer directly
- For questions about specific things you don't know (like a specific university's chapter, current events, or anything outside your training), USE the web_search tool to look it up. Do NOT fabricate or guess.
- If web_search returns no useful results, say honestly that you couldn't find specific info and suggest where they might look

## Available Tools
- web_search: Search the internet for information you don't have. USE THIS for any question about specific universities, current events, specific programs, or anything you're not 100% sure about.
- check_account: Check if specific AWS account exists (only if student provides email)
- check_credits: Check credit balance (only if student provides user ID)
- check_profile: Verify Builder Center profile status (only if student provides user ID)
- check_student_status: Check student verification status (only if student provides user ID)

IMPORTANT: When you don't know something specific, SEARCH for it. Never make up information."""

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
                'description': 'Check if the student has completed their AWS Builder Center profile. Only use if student provides their user ID or email.',
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
                'name': 'check_student_status',
                'description': 'Check student verification status. Only use if student provides their user ID or email.',
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
                'name': 'web_search',
                'description': 'Search the internet for real, current information. Use this when asked about specific universities, organizations, events, people, or anything you are not certain about. Always prefer searching over guessing.',
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

            # Handle web_search directly in this Lambda
            if tool_name == 'web_search':
                search_result = do_web_search(tool_input.get('query', ''))
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
                'check_student_status': 'studentpathos-check-student-status'
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


def do_web_search(query: str) -> Dict[str, Any]:
    """Search the web using DuckDuckGo HTML and parse results."""
    try:
        encoded_query = urllib.parse.quote_plus(query)
        url = f'https://html.duckduckgo.com/html/?q={encoded_query}'

        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (compatible; StudentPathOS/1.0)'
        })

        with urllib.request.urlopen(req, timeout=8) as resp:
            html = resp.read().decode('utf-8', errors='ignore')

        results = []
        # Parse result snippets from DuckDuckGo HTML
        snippets = re.findall(
            r'<a rel="nofollow" class="result__snippet"[^>]*>(.*?)</a>',
            html, re.DOTALL
        )
        titles = re.findall(
            r'<a rel="nofollow" class="result__a"[^>]*>(.*?)</a>',
            html, re.DOTALL
        )
        links = re.findall(
            r'<a rel="nofollow" class="result__a" href="([^"]*)"',
            html
        )

        for i in range(min(5, len(snippets))):
            clean_snippet = re.sub(r'<[^>]+>', '', snippets[i]).strip()
            clean_title = re.sub(r'<[^>]+>', '', titles[i]).strip() if i < len(titles) else ''
            link = links[i] if i < len(links) else ''
            if clean_snippet:
                results.append({
                    'title': clean_title,
                    'snippet': clean_snippet,
                    'url': link
                })

        if results:
            return {
                'query': query,
                'found': True,
                'result_count': len(results),
                'results': results
            }
        else:
            return {
                'query': query,
                'found': False,
                'result_count': 0,
                'results': [],
                'note': 'No results found for this query'
            }

    except Exception as e:
        print(f"Web search error: {str(e)}")
        return {
            'query': query,
            'found': False,
            'error': str(e),
            'note': 'Web search failed - answer based on your own knowledge and be transparent about what you do and do not know'
        }


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
