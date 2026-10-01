import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as path from 'path';

interface LambdaStackProps extends cdk.StackProps {
  journeysTable: dynamodb.Table;
  conversationsTable: dynamodb.Table;
  celebrationsTable: dynamodb.Table;
}

export class LambdaStack extends cdk.Stack {
  public readonly functions: { [key: string]: lambda.Function } = {};

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // Shared Lambda role with Bedrock and DynamoDB access
    const lambdaRole = new iam.Role(this, 'SharedLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ]
    });

    // Grant Bedrock access
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
        'bedrock-agent-runtime:Retrieve'
      ],
      resources: ['*']
    }));

    // Grant DynamoDB access
    props.journeysTable.grantReadWriteData(lambdaRole);
    props.conversationsTable.grantReadWriteData(lambdaRole);
    props.celebrationsTable.grantReadWriteData(lambdaRole);

    // Grant Polly access
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: ['polly:SynthesizeSpeech'],
      resources: ['*']
    }));

    // Grant SNS publish
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: ['sns:Publish'],
      resources: ['*']
    }));

    // Create all Lambda functions
    const lambdaFunctions = [
      // Verification tools
      { name: 'check-account', path: '../lambda/verification-tools/check-account' },
      { name: 'check-credits', path: '../lambda/verification-tools/check-credits' },
      { name: 'check-profile', path: '../lambda/verification-tools/check-profile' },
      { name: 'check-student-status', path: '../lambda/verification-tools/check-student-status' },

      // Twin tools
      { name: 'analyze-screenshot', path: '../lambda/twin-tools/analyze-screenshot' },
      { name: 'search-knowledge-base', path: '../lambda/twin-tools/search-knowledge-base' },
      { name: 'get-community-insights', path: '../lambda/twin-tools/get-community-insights' },
      { name: 'recommend-next-action', path: '../lambda/twin-tools/recommend-next-action' },

      // Analytics
      { name: 'aggregate-questions', path: '../lambda/analytics/aggregate-questions' },
      { name: 'generate-insights', path: '../lambda/analytics/generate-insights' },

      // Orchestration
      { name: 'celebration-trigger', path: '../lambda/orchestration/celebration-trigger' },
      { name: 'verification-workflow', path: '../lambda/orchestration/verification-workflow' }
    ];

    for (const fn of lambdaFunctions) {
      this.functions[fn.name] = new lambda.Function(this, `${fn.name}-function`, {
        functionName: `studentpathos-${fn.name}`,
        runtime: lambda.Runtime.PYTHON_3_12,
        handler: 'handler.lambda_handler',
        code: lambda.Code.fromAsset(path.join(__dirname, fn.path)),
        role: lambdaRole,
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
        environment: {
          JOURNEYS_TABLE: props.journeysTable.tableName,
          CONVERSATIONS_TABLE: props.conversationsTable.tableName,
          CELEBRATIONS_TABLE: props.celebrationsTable.tableName
        }
      });

      // Output each function ARN
      new cdk.CfnOutput(this, `${fn.name}-arn`, {
        value: this.functions[fn.name].functionArn,
        exportName: `StudentPathOS-${fn.name}-arn`
      });
    }
  }
}
