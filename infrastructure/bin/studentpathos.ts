#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DataStack } from '../lib/data-stack';
import { AuthStack } from '../lib/auth-stack';
import { LambdaStack } from '../lib/lambda-stack';
import { ApiStack } from '../lib/api-stack';

const app = new cdk.App();

// Deploy to us-east-1 for Bedrock availability
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'us-east-1'
};

// Data layer - DynamoDB tables
const dataStack = new DataStack(app, 'StudentPathOS-Data', { env });

// Auth layer - Cognito
const authStack = new AuthStack(app, 'StudentPathOS-Auth', { env });

// Compute layer - Lambda functions
const lambdaStack = new LambdaStack(app, 'StudentPathOS-Lambda', {
  env,
  journeysTable: dataStack.journeysTable,
  conversationsTable: dataStack.conversationsTable,
  celebrationsTable: dataStack.celebrationsTable
});

// API layer - REST + GraphQL
const apiStack = new ApiStack(app, 'StudentPathOS-API', {
  env,
  userPool: authStack.userPool,
  journeysTable: dataStack.journeysTable,
  conversationsTable: dataStack.conversationsTable,
  functions: lambdaStack.functions
});

// Dependencies
lambdaStack.addDependency(dataStack);
apiStack.addDependency(authStack);
apiStack.addDependency(lambdaStack);

// Tags
cdk.Tags.of(app).add('Project', 'StudentPathOS');
cdk.Tags.of(app).add('Environment', 'Production');
cdk.Tags.of(app).add('BuiltWith', 'Claude Code via Kiro');
