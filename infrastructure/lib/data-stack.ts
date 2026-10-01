import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DataStack extends cdk.Stack {
  public readonly journeysTable: dynamodb.Table;
  public readonly conversationsTable: dynamodb.Table;
  public readonly celebrationsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Journey state table - tracks user progress through 5 steps
    this.journeysTable = new dynamodb.Table(this, 'JourneysTable', {
      tableName: 'studentpathos-journeys',
      partitionKey: {
        name: 'user_id',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // GSI for querying by verification status
    this.journeysTable.addGlobalSecondaryIndex({
      indexName: 'verification-status-index',
      partitionKey: {
        name: 'verification_status',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'updated_at',
        type: dynamodb.AttributeType.STRING
      }
    });

    // Conversations table - stores AI twin chat history
    this.conversationsTable = new dynamodb.Table(this, 'ConversationsTable', {
      tableName: 'studentpathos-conversations',
      partitionKey: {
        name: 'user_id',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'conversation_id',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // GSI for time-based queries (analytics)
    this.conversationsTable.addGlobalSecondaryIndex({
      indexName: 'created-at-index',
      partitionKey: {
        name: 'created_date',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'created_at',
        type: dynamodb.AttributeType.STRING
      }
    });

    // Celebrations table - tracks milestone celebrations
    this.celebrationsTable = new dynamodb.Table(this, 'CelebrationsTable', {
      tableName: 'studentpathos-celebrations',
      partitionKey: {
        name: 'user_id',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'milestone',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expires_at',
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Outputs
    new cdk.CfnOutput(this, 'JourneysTableName', {
      value: this.journeysTable.tableName,
      exportName: 'StudentPathOS-JourneysTable'
    });

    new cdk.CfnOutput(this, 'ConversationsTableName', {
      value: this.conversationsTable.tableName,
      exportName: 'StudentPathOS-ConversationsTable'
    });

    new cdk.CfnOutput(this, 'CelebrationsTableName', {
      value: this.celebrationsTable.tableName,
      exportName: 'StudentPathOS-CelebrationsTable'
    });
  }
}
