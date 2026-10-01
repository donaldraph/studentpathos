"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LambdaStack = void 0;
const cdk = require("aws-cdk-lib");
const lambda = require("aws-cdk-lib/aws-lambda");
const iam = require("aws-cdk-lib/aws-iam");
const path = require("path");
class LambdaStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        this.functions = {};
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
exports.LambdaStack = LambdaStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibGFtYmRhLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyxpREFBaUQ7QUFDakQsMkNBQTJDO0FBRzNDLDZCQUE2QjtBQVE3QixNQUFhLFdBQVksU0FBUSxHQUFHLENBQUMsS0FBSztJQUd4QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXVCO1FBQy9ELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBSFYsY0FBUyxHQUF1QyxFQUFFLENBQUM7UUFLakUsc0RBQXNEO1FBQ3RELE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDeEQsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDO1lBQzNELGVBQWUsRUFBRTtnQkFDZixHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLDBDQUEwQyxDQUFDO2FBQ3ZGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsdUJBQXVCO1FBQ3ZCLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQzdDLE9BQU8sRUFBRTtnQkFDUCxxQkFBcUI7Z0JBQ3JCLHVDQUF1QztnQkFDdkMsZ0NBQWdDO2FBQ2pDO1lBQ0QsU0FBUyxFQUFFLENBQUMsR0FBRyxDQUFDO1NBQ2pCLENBQUMsQ0FBQyxDQUFDO1FBRUosd0JBQXdCO1FBQ3hCLEtBQUssQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDbkQsS0FBSyxDQUFDLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3hELEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV2RCxxQkFBcUI7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LENBQUMsQ0FBQyxXQUFXO2dCQUMxQyxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLE1BQU07YUFDM0MsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNILENBQUM7Q0FDRjtBQXZGRCxrQ0F1RkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuaW50ZXJmYWNlIExhbWJkYVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIGpvdXJuZXlzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBjb252ZXJzYXRpb25zVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBjZWxlYnJhdGlvbnNUYWJsZTogZHluYW1vZGIuVGFibGU7XG59XG5cbmV4cG9ydCBjbGFzcyBMYW1iZGFTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBmdW5jdGlvbnM6IHsgW2tleTogc3RyaW5nXTogbGFtYmRhLkZ1bmN0aW9uIH0gPSB7fTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogTGFtYmRhU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gU2hhcmVkIExhbWJkYSByb2xlIHdpdGggQmVkcm9jayBhbmQgRHluYW1vREIgYWNjZXNzXG4gICAgY29uc3QgbGFtYmRhUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnU2hhcmVkTGFtYmRhUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZScpXG4gICAgICBdXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBCZWRyb2NrIGFjY2Vzc1xuICAgIGxhbWJkYVJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbCcsXG4gICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsV2l0aFJlc3BvbnNlU3RyZWFtJyxcbiAgICAgICAgJ2JlZHJvY2stYWdlbnQtcnVudGltZTpSZXRyaWV2ZSdcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFsnKiddXG4gICAgfSkpO1xuXG4gICAgLy8gR3JhbnQgRHluYW1vREIgYWNjZXNzXG4gICAgcHJvcHMuam91cm5leXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobGFtYmRhUm9sZSk7XG4gICAgcHJvcHMuY29udmVyc2F0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShsYW1iZGFSb2xlKTtcbiAgICBwcm9wcy5jZWxlYnJhdGlvbnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobGFtYmRhUm9sZSk7XG5cbiAgICAvLyBHcmFudCBQb2xseSBhY2Nlc3NcbiAgICBsYW1iZGFSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFsncG9sbHk6U3ludGhlc2l6ZVNwZWVjaCddLFxuICAgICAgcmVzb3VyY2VzOiBbJyonXVxuICAgIH0pKTtcblxuICAgIC8vIEdyYW50IFNOUyBwdWJsaXNoXG4gICAgbGFtYmRhUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbJ3NuczpQdWJsaXNoJ10sXG4gICAgICByZXNvdXJjZXM6IFsnKiddXG4gICAgfSkpO1xuXG4gICAgLy8gQ3JlYXRlIGFsbCBMYW1iZGEgZnVuY3Rpb25zXG4gICAgY29uc3QgbGFtYmRhRnVuY3Rpb25zID0gW1xuICAgICAgLy8gVmVyaWZpY2F0aW9uIHRvb2xzXG4gICAgICB7IG5hbWU6ICdjaGVjay1hY2NvdW50JywgcGF0aDogJy4uL2xhbWJkYS92ZXJpZmljYXRpb24tdG9vbHMvY2hlY2stYWNjb3VudCcgfSxcbiAgICAgIHsgbmFtZTogJ2NoZWNrLWNyZWRpdHMnLCBwYXRoOiAnLi4vbGFtYmRhL3ZlcmlmaWNhdGlvbi10b29scy9jaGVjay1jcmVkaXRzJyB9LFxuICAgICAgeyBuYW1lOiAnY2hlY2stcHJvZmlsZScsIHBhdGg6ICcuLi9sYW1iZGEvdmVyaWZpY2F0aW9uLXRvb2xzL2NoZWNrLXByb2ZpbGUnIH0sXG4gICAgICB7IG5hbWU6ICdjaGVjay1zdHVkZW50LXN0YXR1cycsIHBhdGg6ICcuLi9sYW1iZGEvdmVyaWZpY2F0aW9uLXRvb2xzL2NoZWNrLXN0dWRlbnQtc3RhdHVzJyB9LFxuXG4gICAgICAvLyBUd2luIHRvb2xzXG4gICAgICB7IG5hbWU6ICdhbmFseXplLXNjcmVlbnNob3QnLCBwYXRoOiAnLi4vbGFtYmRhL3R3aW4tdG9vbHMvYW5hbHl6ZS1zY3JlZW5zaG90JyB9LFxuICAgICAgeyBuYW1lOiAnc2VhcmNoLWtub3dsZWRnZS1iYXNlJywgcGF0aDogJy4uL2xhbWJkYS90d2luLXRvb2xzL3NlYXJjaC1rbm93bGVkZ2UtYmFzZScgfSxcbiAgICAgIHsgbmFtZTogJ2dldC1jb21tdW5pdHktaW5zaWdodHMnLCBwYXRoOiAnLi4vbGFtYmRhL3R3aW4tdG9vbHMvZ2V0LWNvbW11bml0eS1pbnNpZ2h0cycgfSxcbiAgICAgIHsgbmFtZTogJ3JlY29tbWVuZC1uZXh0LWFjdGlvbicsIHBhdGg6ICcuLi9sYW1iZGEvdHdpbi10b29scy9yZWNvbW1lbmQtbmV4dC1hY3Rpb24nIH0sXG5cbiAgICAgIC8vIEFuYWx5dGljc1xuICAgICAgeyBuYW1lOiAnYWdncmVnYXRlLXF1ZXN0aW9ucycsIHBhdGg6ICcuLi9sYW1iZGEvYW5hbHl0aWNzL2FnZ3JlZ2F0ZS1xdWVzdGlvbnMnIH0sXG4gICAgICB7IG5hbWU6ICdnZW5lcmF0ZS1pbnNpZ2h0cycsIHBhdGg6ICcuLi9sYW1iZGEvYW5hbHl0aWNzL2dlbmVyYXRlLWluc2lnaHRzJyB9LFxuXG4gICAgICAvLyBPcmNoZXN0cmF0aW9uXG4gICAgICB7IG5hbWU6ICdjZWxlYnJhdGlvbi10cmlnZ2VyJywgcGF0aDogJy4uL2xhbWJkYS9vcmNoZXN0cmF0aW9uL2NlbGVicmF0aW9uLXRyaWdnZXInIH0sXG4gICAgICB7IG5hbWU6ICd2ZXJpZmljYXRpb24td29ya2Zsb3cnLCBwYXRoOiAnLi4vbGFtYmRhL29yY2hlc3RyYXRpb24vdmVyaWZpY2F0aW9uLXdvcmtmbG93JyB9XG4gICAgXTtcblxuICAgIGZvciAoY29uc3QgZm4gb2YgbGFtYmRhRnVuY3Rpb25zKSB7XG4gICAgICB0aGlzLmZ1bmN0aW9uc1tmbi5uYW1lXSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgYCR7Zm4ubmFtZX0tZnVuY3Rpb25gLCB7XG4gICAgICAgIGZ1bmN0aW9uTmFtZTogYHN0dWRlbnRwYXRob3MtJHtmbi5uYW1lfWAsXG4gICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLFxuICAgICAgICBoYW5kbGVyOiAnaGFuZGxlci5sYW1iZGFfaGFuZGxlcicsXG4gICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCBmbi5wYXRoKSksXG4gICAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgICAgbWVtb3J5U2l6ZTogNTEyLFxuICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgIEpPVVJORVlTX1RBQkxFOiBwcm9wcy5qb3VybmV5c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgICBDT05WRVJTQVRJT05TX1RBQkxFOiBwcm9wcy5jb252ZXJzYXRpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICAgIENFTEVCUkFUSU9OU19UQUJMRTogcHJvcHMuY2VsZWJyYXRpb25zVGFibGUudGFibGVOYW1lXG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICAvLyBPdXRwdXQgZWFjaCBmdW5jdGlvbiBBUk5cbiAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIGAke2ZuLm5hbWV9LWFybmAsIHtcbiAgICAgICAgdmFsdWU6IHRoaXMuZnVuY3Rpb25zW2ZuLm5hbWVdLmZ1bmN0aW9uQXJuLFxuICAgICAgICBleHBvcnROYW1lOiBgU3R1ZGVudFBhdGhPUy0ke2ZuLm5hbWV9LWFybmBcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuIl19