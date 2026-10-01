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
  functions: { [key: string]: lambda.Function };
}

export class ApiStack extends cdk.Stack {
  public readonly restApi: apigateway.RestApi;
  public readonly graphqlApi: appsync.GraphqlApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // REST API for Lambda functions
    this.restApi = new apigateway.RestApi(this, 'StudentPathOSApi', {
      restApiName: 'StudentPathOS API',
      description: 'API for StudentPathOS verification and twin tools',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['*']
      }
    });

    // Cognito authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'ApiAuthorizer', {
      cognitoUserPools: [props.userPool]
    });

    // Verification tools endpoints
    const verification = this.restApi.root.addResource('verification');
    this.addLambdaEndpoint(verification, 'account', props.functions['check-account'], authorizer);
    this.addLambdaEndpoint(verification, 'credits', props.functions['check-credits'], authorizer);
    this.addLambdaEndpoint(verification, 'profile', props.functions['check-profile'], authorizer);
    this.addLambdaEndpoint(verification, 'student', props.functions['check-student-status'], authorizer);

    // Twin tools endpoints
    const twin = this.restApi.root.addResource('twin');
    this.addLambdaEndpoint(twin, 'screenshot', props.functions['analyze-screenshot'], authorizer);
    this.addLambdaEndpoint(twin, 'knowledge', props.functions['search-knowledge-base'], authorizer);
    this.addLambdaEndpoint(twin, 'insights', props.functions['get-community-insights'], authorizer);
    this.addLambdaEndpoint(twin, 'recommend', props.functions['recommend-next-action'], authorizer);

    // Workflow orchestration endpoint
    const orchestration = this.restApi.root.addResource('orchestration');
    this.addLambdaEndpoint(orchestration, 'workflow', props.functions['verification-workflow'], authorizer);

    // AppSync GraphQL API for real-time subscriptions
    this.graphqlApi = new appsync.GraphqlApi(this, 'StudentPathOSGraphQL', {
      name: 'StudentPathOS-GraphQL',
      definition: appsync.Definition.fromSchema(appsync.SchemaFile.fromAsset('schema.graphql')),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: props.userPool
          }
        }
      },
      xrayEnabled: true
    });

    // DynamoDB data sources for real-time queries
    const journeysDataSource = this.graphqlApi.addDynamoDbDataSource(
      'JourneysDataSource',
      props.journeysTable
    );

    const conversationsDataSource = this.graphqlApi.addDynamoDbDataSource(
      'ConversationsDataSource',
      props.conversationsTable
    );

    // Resolvers
    journeysDataSource.createResolver('GetJourneyResolver', {
      typeName: 'Query',
      fieldName: 'getJourney',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem('user_id', 'user_id'),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem()
    });

    conversationsDataSource.createResolver('ListConversationsResolver', {
      typeName: 'Query',
      fieldName: 'listConversations',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbQuery(),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList()
    });

    // Outputs
    new cdk.CfnOutput(this, 'RestApiUrl', {
      value: this.restApi.url,
      exportName: 'StudentPathOS-RestApiUrl'
    });

    new cdk.CfnOutput(this, 'GraphQLApiUrl', {
      value: this.graphqlApi.graphqlUrl,
      exportName: 'StudentPathOS-GraphQLUrl'
    });

    new cdk.CfnOutput(this, 'GraphQLApiKey', {
      value: this.graphqlApi.apiId,
      exportName: 'StudentPathOS-GraphQLApiId'
    });
  }

  private addLambdaEndpoint(
    resource: apigateway.Resource,
    path: string,
    fn: lambda.Function,
    authorizer: apigateway.CognitoUserPoolsAuthorizer
  ): void {
    const endpoint = resource.addResource(path);
    endpoint.addMethod('POST', new apigateway.LambdaIntegration(fn), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO
    });
  }
}
