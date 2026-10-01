import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
export declare class DataStack extends cdk.Stack {
    readonly journeysTable: dynamodb.Table;
    readonly conversationsTable: dynamodb.Table;
    readonly celebrationsTable: dynamodb.Table;
    constructor(scope: Construct, id: string, props?: cdk.StackProps);
}
