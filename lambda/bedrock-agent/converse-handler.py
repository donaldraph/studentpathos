import json
import boto3
import os
import urllib.request
import urllib.parse
import re
from typing import Dict, Any, List
from datetime import datetime
from decimal import Decimal

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
dynamodb = boto3.resource('dynamodb')
lambda_client = boto3.client('lambda')

MAX_TOOL_ROUNDS = 5

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
- crawl_url: After searching, if you find a relevant URL in the results, use this to read the full page content. This gives you much deeper information than search snippets alone. Use it to get details like leadership, events, contact info, etc.
- check_account: Check if specific AWS account exists (only if student provides email)
- check_credits: Check credit balance (only if student provides user ID)
- check_profile: Verify Builder Center profile status (only if student provides user ID)
- check_student_status: Check student verification status (only if student provides user ID)

## Conversation Context
You have access to the full conversation history. When the student asks a follow-up question like "who leads it?" or "tell me more", refer back to earlier messages to understand what "it" or "the chapter" refers to. Never ask the student to repeat context they already gave you.

## Agentic Workflow
You can use multiple tools in sequence. For example: search first, then crawl the most relevant URLs from the results to get comprehensive information. Do not settle for shallow answers when deeper information is available.

IMPORTANT: When you don't know something specific, SEARCH for it. When search results point to useful pages, CRAWL them for full details. Never make up information."""

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

        # Agentic loop: keep calling Bedrock until it stops requesting tools
        tools_used_count = 0
        for round_num in range(MAX_TOOL_ROUNDS + 1):
            response = bedrock.converse(
                modelId=MODEL_ID,
                messages=conversation_history,
                system=[{'text': SYSTEM_PROMPT}],
                toolConfig={'tools': get_tool_definitions()},
                inferenceConfig={'maxTokens': 2048, 'temperature': 0.7}
            )

            stop_reason = response['stopReason']
            output_message = response['output']['message']

            if stop_reason != 'tool_use' or round_num == MAX_TOOL_ROUNDS:
                break

            tool_results = execute_tools(output_message['content'])
            tools_used_count += len([b for b in output_message['content'] if 'toolUse' in b])

            conversation_history.append(output_message)
            conversation_history.append({'role': 'user', 'content': tool_results})

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
                'tools_used': tools_used_count > 0,
                'tool_rounds': tools_used_count
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
        },
        {
            'toolSpec': {
                'name': 'crawl_url',
                'description': 'Crawl a specific URL to read its full page content. Use this AFTER web_search when you find a relevant URL and need deeper details from that page. For example, search first, then crawl the most promising result URLs.',
                'inputSchema': {
                    'json': {
                        'type': 'object',
                        'properties': {
                            'url': {
                                'type': 'string',
                                'description': 'The URL to crawl and extract content from'
                            }
                        },
                        'required': ['url']
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

            if tool_name == 'web_search':
                search_result = do_web_search(tool_input.get('query', ''))
                tool_results.append({
                    'toolResult': {
                        'toolUseId': tool_use['toolUseId'],
                        'content': [{'json': search_result}]
                    }
                })
                continue

            if tool_name == 'crawl_url':
                crawl_result = do_crawl_url(tool_input.get('url', ''))
                tool_results.append({
                    'toolResult': {
                        'toolUseId': tool_use['toolUseId'],
                        'content': [{'json': crawl_result}]
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
    """Search the web using Exa AI -- same search engine from the BeSA workshop."""
    exa_key = os.environ.get('EXA_API_KEY', '')
    if not exa_key:
        return {'query': query, 'found': False, 'error': 'EXA_API_KEY not configured'}

    try:
        payload = json.dumps({
            'query': query,
            'type': 'auto',
            'numResults': 5,
            'contents': {
                'highlights': True,
                'text': {'maxCharacters': 500}
            }
        }).encode('utf-8')

        req = urllib.request.Request(
            'https://api.exa.ai/search',
            data=payload,
            headers={
                'x-api-key': exa_key,
                'Content-Type': 'application/json'
            },
            method='POST'
        )

        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))

        results = []
        for r in data.get('results', []):
            results.append({
                'title': r.get('title', ''),
                'url': r.get('url', ''),
                'highlights': r.get('highlights', []),
                'text': r.get('text', '')[:500] if r.get('text') else ''
            })

        return {
            'query': query,
            'found': len(results) > 0,
            'result_count': len(results),
            'results': results
        }

    except Exception as e:
        print(f"Exa search error: {str(e)}")
        return {
            'query': query,
            'found': False,
            'error': str(e),
            'note': 'Web search failed - answer from your own knowledge and be transparent about what you do and do not know'
        }


def do_crawl_url(url: str) -> Dict[str, Any]:
    """Crawl a URL using Exa's contents endpoint to get full page text."""
    exa_key = os.environ.get('EXA_API_KEY', '')
    if not exa_key:
        return {'url': url, 'success': False, 'error': 'EXA_API_KEY not configured'}

    try:
        payload = json.dumps({
            'urls': [url],
            'text': {'maxCharacters': 3000},
            'highlights': True
        }).encode('utf-8')

        req = urllib.request.Request(
            'https://api.exa.ai/contents',
            data=payload,
            headers={
                'x-api-key': exa_key,
                'Content-Type': 'application/json'
            },
            method='POST'
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))

        results = data.get('results', [])
        if results:
            r = results[0]
            return {
                'url': url,
                'success': True,
                'title': r.get('title', ''),
                'text': r.get('text', '')[:3000],
                'highlights': r.get('highlights', [])
            }
        return {'url': url, 'success': False, 'error': 'No content returned'}

    except Exception as e:
        print(f"Exa crawl error: {str(e)}")
        return {'url': url, 'success': False, 'error': str(e)}


def decimal_to_native(obj):
    """Convert DynamoDB Decimal types back to int/float for JSON serialization."""
    if isinstance(obj, Decimal):
        return int(obj) if obj == int(obj) else float(obj)
    if isinstance(obj, dict):
        return {k: decimal_to_native(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [decimal_to_native(i) for i in obj]
    return obj


def load_conversation_history(user_id: str) -> List[Dict]:
    """Load conversation history from DynamoDB, stored as JSON string to avoid Decimal issues."""
    table = dynamodb.Table('studentpathos-conversations')

    try:
        response = table.get_item(
            Key={'user_id': user_id, 'conversation_id': 'active'}
        )

        if 'Item' in response:
            raw = response['Item'].get('messages_json')
            if raw:
                return json.loads(raw)
            messages = response['Item'].get('messages', [])
            return decimal_to_native(messages)
    except Exception as e:
        print(f"Error loading history: {str(e)}")

    return []


def save_conversation_history(user_id: str, messages: List[Dict]):
    """Save conversation history to DynamoDB as JSON string for clean round-trips."""
    table = dynamodb.Table('studentpathos-conversations')

    if len(messages) > 20:
        messages = messages[-20:]

    table.put_item(Item={
        'user_id': user_id,
        'conversation_id': 'active',
        'messages_json': json.dumps(messages, default=str),
        'updated_at': datetime.now().isoformat(),
        'created_at': datetime.now().isoformat()
    })
