import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
interface LambdaStackProps extends cdk.StackProps {
    journeysTable: dynamodb.Table;
    conversationsTable: dynamodb.Table;
    celebrationsTable: dynamodb.Table;
}
export declare class LambdaStack extends cdk.Stack {
    readonly functions: {
        [key: string]: lambda.Function;
    };
    constructor(scope: Construct, id: string, props: LambdaStackProps);
}
export {};
