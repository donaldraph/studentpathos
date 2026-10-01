"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiStack = void 0;
const cdk = require("aws-cdk-lib");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const appsync = require("aws-cdk-lib/aws-appsync");
class ApiStack extends cdk.Stack {
    constructor(scope, id, props) {
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
        const journeysDataSource = this.graphqlApi.addDynamoDbDataSource('JourneysDataSource', props.journeysTable);
        const conversationsDataSource = this.graphqlApi.addDynamoDbDataSource('ConversationsDataSource', props.conversationsTable);
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
            requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
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
    addLambdaEndpoint(resource, path, fn, authorizer) {
        const endpoint = resource.addResource(path);
        endpoint.addMethod('POST', new apigateway.LambdaIntegration(fn), {
            authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO
        });
    }
}
exports.ApiStack = ApiStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyx5REFBeUQ7QUFDekQsbURBQW1EO0FBYW5ELE1BQWEsUUFBUyxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBSXJDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBb0I7UUFDNUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsZ0NBQWdDO1FBQ2hDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUM5RCxXQUFXLEVBQUUsbUJBQW1CO1lBQ2hDLFdBQVcsRUFBRSxtREFBbUQ7WUFDaEUsMkJBQTJCLEVBQUU7Z0JBQzNCLFlBQVksRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLFdBQVc7Z0JBQ3pDLFlBQVksRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLFdBQVc7Z0JBQ3pDLFlBQVksRUFBRSxDQUFDLEdBQUcsQ0FBQzthQUNwQjtTQUNGLENBQUMsQ0FBQztRQUVILHFCQUFxQjtRQUNyQixNQUFNLFVBQVUsR0FBRyxJQUFJLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ2xGLGdCQUFnQixFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQztTQUNuQyxDQUFDLENBQUM7UUFFSCwrQkFBK0I7UUFDL0IsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ25FLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDOUYsSUFBSSxDQUFDLGlCQUFp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Y2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0ICogYXMgYXBwc3luYyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBwc3luYyc7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuaW50ZXJmYWNlIEFwaVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sO1xuICBqb3VybmV5c1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgY29udmVyc2F0aW9uc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgZnVuY3Rpb25zOiB7IFtrZXk6IHN0cmluZ106IGxhbWJkYS5GdW5jdGlvbiB9O1xufVxuXG5leHBvcnQgY2xhc3MgQXBpU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgcmVzdEFwaTogYXBpZ2F0ZXdheS5SZXN0QXBpO1xuICBwdWJsaWMgcmVhZG9ubHkgZ3JhcGhxbEFwaTogYXBwc3luYy5HcmFwaHFsQXBpO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBBcGlTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBSRVNUIEFQSSBmb3IgTGFtYmRhIGZ1bmN0aW9uc1xuICAgIHRoaXMucmVzdEFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ1N0dWRlbnRQYXRoT1NBcGknLCB7XG4gICAgICByZXN0QXBpTmFtZTogJ1N0dWRlbnRQYXRoT1MgQVBJJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIGZvciBTdHVkZW50UGF0aE9TIHZlcmlmaWNhdGlvbiBhbmQgdHdpbiB0b29scycsXG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBhcGlnYXRld2F5LkNvcnMuQUxMX09SSUdJTlMsXG4gICAgICAgIGFsbG93TWV0aG9kczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9NRVRIT0RTLFxuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnKiddXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBDb2duaXRvIGF1dGhvcml6ZXJcbiAgICBjb25zdCBhdXRob3JpemVyID0gbmV3IGFwaWdhdGV3YXkuQ29nbml0b1VzZXJQb29sc0F1dGhvcml6ZXIodGhpcywgJ0FwaUF1dGhvcml6ZXInLCB7XG4gICAgICBjb2duaXRvVXNlclBvb2xzOiBbcHJvcHMudXNlclBvb2xdXG4gICAgfSk7XG5cbiAgICAvLyBWZXJpZmljYXRpb24gdG9vbHMgZW5kcG9pbnRzXG4gICAgY29uc3QgdmVyaWZpY2F0aW9uID0gdGhpcy5yZXN0QXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3ZlcmlmaWNhdGlvbicpO1xuICAgIHRoaXMuYWRkTGFtYmRhRW5kcG9pbnQodmVyaWZpY2F0aW9uLCAnYWNjb3VudCcsIHByb3BzLmZ1bmN0aW9uc1snY2hlY2stYWNjb3VudCddLCBhdXRob3JpemVyKTtcbiAgICB0aGlzLmFkZExhbWJkYUVuZHBvaW50KHZlcmlmaWNhdGlvbiwgJ2NyZWRpdHMnLCBwcm9wcy5mdW5jdGlvbnNbJ2NoZWNrLWNyZWRpdHMnXSwgYXV0aG9yaXplcik7XG4gICAgdGhpcy5hZGRMYW1iZGFFbmRwb2ludCh2ZXJpZmljYXRpb24sICdwcm9maWxlJywgcHJvcHMuZnVuY3Rpb25zWydjaGVjay1wcm9maWxlJ10sIGF1dGhvcml6ZXIpO1xuICAgIHRoaXMuYWRkTGFtYmRhRW5kcG9pbnQodmVyaWZpY2F0aW9uLCAnc3R1ZGVudCcsIHByb3BzLmZ1bmN0aW9uc1snY2hlY2stc3R1ZGVudC1zdGF0dXMnXSwgYXV0aG9yaXplcik7XG5cbiAgICAvLyBUd2luIHRvb2xzIGVuZHBvaW50c1xuICAgIGNvbnN0IHR3aW4gPSB0aGlzLnJlc3RBcGkucm9vdC5hZGRSZXNvdXJjZSgndHdpbicpO1xuICAgIHRoaXMuYWRkTGFtYmRhRW5kcG9pbnQodHdpbiwgJ3NjcmVlbnNob3QnLCBwcm9wcy5mdW5jdGlvbnNbJ2FuYWx5emUtc2NyZWVuc2hvdCddLCBhdXRob3JpemVyKTtcbiAgICB0aGlzLmFkZExhbWJkYUVuZHBvaW50KHR3aW4sICdrbm93bGVkZ2UnLCBwcm9wcy5mdW5jdGlvbnNbJ3NlYXJjaC1rbm93bGVkZ2UtYmFzZSddLCBhdXRob3JpemVyKTtcbiAgICB0aGlzLmFkZExhbWJkYUVuZHBvaW50KHR3aW4sICdpbnNpZ2h0cycsIHByb3BzLmZ1bmN0aW9uc1snZ2V0LWNvbW11bml0eS1pbnNpZ2h0cyddLCBhdXRob3JpemVyKTtcbiAgICB0aGlzLmFkZExhbWJkYUVuZHBvaW50KHR3aW4sICdyZWNvbW1lbmQnLCBwcm9wcy5mdW5jdGlvbnNbJ3JlY29tbWVuZC1uZXh0LWFjdGlvbiddLCBhdXRob3JpemVyKTtcblxuICAgIC8vIFdvcmtmbG93IG9yY2hlc3RyYXRpb24gZW5kcG9pbnRcbiAgICBjb25zdCBvcmNoZXN0cmF0aW9uID0gdGhpcy5yZXN0QXBpLnJvb3QuYWRkUmVzb3VyY2UoJ29yY2hlc3RyYXRpb24nKTtcbiAgICB0aGlzLmFkZExhbWJkYUVuZHBvaW50KG9yY2hlc3RyYXRpb24sICd3b3JrZmxvdycsIHByb3BzLmZ1bmN0aW9uc1sndmVyaWZpY2F0aW9uLXdvcmtmbG93J10sIGF1dGhvcml6ZXIpO1xuXG4gICAgLy8gQXBwU3luYyBHcmFwaFFMIEFQSSBmb3IgcmVhbC10aW1lIHN1YnNjcmlwdGlvbnNcbiAgICB0aGlzLmdyYXBocWxBcGkgPSBuZXcgYXBwc3luYy5HcmFwaHFsQXBpKHRoaXMsICdTdHVkZW50UGF0aE9TR3JhcGhRTCcsIHtcbiAgICAgIG5hbWU6ICdTdHVkZW50UGF0aE9TLUdyYXBoUUwnLFxuICAgICAgZGVmaW5pdGlvbjogYXBwc3luYy5EZWZpbml0aW9uLmZyb21TY2hlbWEoYXBwc3luYy5TY2hlbWFGaWxlLmZyb21Bc3NldCgnc2NoZW1hLmdyYXBocWwnKSksXG4gICAgICBhdXRob3JpemF0aW9uQ29uZmlnOiB7XG4gICAgICAgIGRlZmF1bHRBdXRob3JpemF0aW9uOiB7XG4gICAgICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwcHN5bmMuQXV0aG9yaXphdGlvblR5cGUuVVNFUl9QT09MLFxuICAgICAgICAgIHVzZXJQb29sQ29uZmlnOiB7XG4gICAgICAgICAgICB1c2VyUG9vbDogcHJvcHMudXNlclBvb2xcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICB4cmF5RW5hYmxlZDogdHJ1ZVxuICAgIH0pO1xuXG4gICAgLy8gRHluYW1vREIgZGF0YSBzb3VyY2VzIGZvciByZWFsLXRpbWUgcXVlcmllc1xuICAgIGNvbnN0IGpvdXJuZXlzRGF0YVNvdXJjZSA9IHRoaXMuZ3JhcGhxbEFwaS5hZGREeW5hbW9EYkRhdGFTb3VyY2UoXG4gICAgICAnSm91cm5leXNEYXRhU291cmNlJyxcbiAgICAgIHByb3BzLmpvdXJuZXlzVGFibGVcbiAgICApO1xuXG4gICAgY29uc3QgY29udmVyc2F0aW9uc0RhdGFTb3VyY2UgPSB0aGlzLmdyYXBocWxBcGkuYWRkRHluYW1vRGJEYXRhU291cmNlKFxuICAgICAgJ0NvbnZlcnNhdGlvbnNEYXRhU291cmNlJyxcbiAgICAgIHByb3BzLmNvbnZlcnNhdGlvbnNUYWJsZVxuICAgICk7XG5cbiAgICAvLyBSZXNvbHZlcnNcbiAgICBqb3VybmV5c0RhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ0dldEpvdXJuZXlSZXNvbHZlcicsIHtcbiAgICAgIHR5cGVOYW1lOiAnUXVlcnknLFxuICAgICAgZmllbGROYW1lOiAnZ2V0Sm91cm5leScsXG4gICAgICByZXF1ZXN0TWFwcGluZ1RlbXBsYXRlOiBhcHBzeW5jLk1hcHBpbmdUZW1wbGF0ZS5keW5hbW9EYkdldEl0ZW0oJ3VzZXJfaWQnLCAndXNlcl9pZCcpLFxuICAgICAgcmVzcG9uc2VNYXBwaW5nVGVtcGxhdGU6IGFwcHN5bmMuTWFwcGluZ1RlbXBsYXRlLmR5bmFtb0RiUmVzdWx0SXRlbSgpXG4gICAgfSk7XG5cbiAgICBjb252ZXJzYXRpb25zRGF0YVNvdXJjZS5jcmVhdGVSZXNvbHZlcignTGlzdENvbnZlcnNhdGlvbnNSZXNvbHZlcicsIHtcbiAgICAgIHR5cGVOYW1lOiAnUXVlcnknLFxuICAgICAgZmllbGROYW1lOiAnbGlzdENvbnZlcnNhdGlvbnMnLFxuICAgICAgcmVxdWVzdE1hcHBpbmdUZW1wbGF0ZTogYXBwc3luYy5NYXBwaW5nVGVtcGxhdGUuZHluYW1vRGJTY2FuVGFibGUoKSxcbiAgICAgIHJlc3BvbnNlTWFwcGluZ1RlbXBsYXRlOiBhcHBzeW5jLk1hcHBpbmdUZW1wbGF0ZS5keW5hbW9EYlJlc3VsdExpc3QoKVxuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdSZXN0QXBpVXJsJywge1xuICAgICAgdmFsdWU6IHRoaXMucmVzdEFwaS51cmwsXG4gICAgICBleHBvcnROYW1lOiAnU3R1ZGVudFBhdGhPUy1SZXN0QXBpVXJsJ1xuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0dyYXBoUUxBcGlVcmwnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5ncmFwaHFsQXBpLmdyYXBocWxVcmwsXG4gICAgICBleHBvcnROYW1lOiAnU3R1ZGVudFBhdGhPUy1HcmFwaFFMVXJsJ1xuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0dyYXBoUUxBcGlLZXknLCB7XG4gICAgICB2YWx1ZTogdGhpcy5ncmFwaHFsQXBpLmFwaUlkLFxuICAgICAgZXhwb3J0TmFtZTogJ1N0dWRlbnRQYXRoT1MtR3JhcGhRTEFwaUlkJ1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhZGRMYW1iZGFFbmRwb2ludChcbiAgICByZXNvdXJjZTogYXBpZ2F0ZXdheS5SZXNvdXJjZSxcbiAgICBwYXRoOiBzdHJpbmcsXG4gICAgZm46IGxhbWJkYS5GdW5jdGlvbixcbiAgICBhdXRob3JpemVyOiBhcGlnYXRld2F5LkNvZ25pdG9Vc2VyUG9vbHNBdXRob3JpemVyXG4gICk6IHZvaWQge1xuICAgIGNvbnN0IGVuZHBvaW50ID0gcmVzb3VyY2UuYWRkUmVzb3VyY2UocGF0aCk7XG4gICAgZW5kcG9pbnQuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZm4pLCB7XG4gICAgICBhdXRob3JpemVyLFxuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuQ09HTklUT1xuICAgIH0pO1xuICB9XG59XG4iXX0=