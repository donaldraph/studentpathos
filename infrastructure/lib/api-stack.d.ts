import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
interface ApiStackProps extends cdk.StackProps {
    userPool: cognito.UserPool;
    journeysTable: dynamodb.Table;
    conversationsTable: dynamodb.Table;
    functions: {
        [key: string]: lambda.Function;
    };
}
export declare class ApiStack extends cdk.Stack {
    readonly restApi: apigateway.RestApi;
    readonly graphqlApi: appsync.GraphqlApi;
    constructor(scope: Construct, id: string, props: ApiStackProps);
    private addLambdaEndpoint;
}
export {};
