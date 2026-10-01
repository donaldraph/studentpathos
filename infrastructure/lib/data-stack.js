"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStack = void 0;
const cdk = require("aws-cdk-lib");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
class DataStack extends cdk.Stack {
    constructor(scope, id, props) {
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
exports.DataStack = DataStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRhdGEtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLHFEQUFxRDtBQUdyRCxNQUFhLFNBQVUsU0FBUSxHQUFHLENBQUMsS0FBSztJQUt0QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLDZEQUE2RDtRQUM3RCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQzdELFNBQVMsRUFBRSx3QkFBd0I7WUFDbkMsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxTQUFTO2dCQUNmLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7WUFDRCxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlO1lBQ2pELG1CQUFtQixFQUFFLElBQUk7WUFDekIsTUFBTSxFQUFFLFFBQVEsQ0FBQyxjQUFjLENBQUMsa0JBQWtCO1lBQ2xELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU07U0FDeEMsQ0FBQyxDQUFDO1FBRUgsMENBQTBDO1FBQzFDLElBQUksQ0FBQyxhQUFhLENBQUMsdUJBQXVCLENBQUM7WUFDekMsU0FBUyxFQUFFLDJCQUEyQjtZQUN0QyxZQUFZLEVBQUU7Z0JBQ1osSUFBSSxFQUFFLHFCQUFxQjtnQkFDM0IsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTTthQUNwQztZQUNELE9BQU8sRUFBRTtnQkFDUCxJQUFJLEVBQUUsWUFBWTtnQkFDbEIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTTthQUNwQztTQUNGLENBQUMsQ0FBQztRQUVILG9EQUFvRDtRQUNwRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUN2RSxTQUFTLEVBQUUsNkJBQTZCO1lBQ3hDLFlBQVksRUFBRTtnQkFDWixJQUFJLEVBQUUsU0FBUztnQkFDZixJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNO2FBQ3BDO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7WUFDRCxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlO1lBQ2pELG1CQUFtQixFQUFFLElBQUk7WUFDekIsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTTtTQUN4QyxDQUFDLENBQUM7UUFFSCx5Q0FBeUM7UUFDekMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLHVCQUF1QixDQUFDO1lBQzlDLFNBQVMsRUFBRSxrQkFBa0I7WUFDN0IsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxjQUFjO2dCQUNwQixJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNO2FBQ3BDO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxZQUFZO2dCQUNsQixJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNO2FBQ3BDO1NBQ0YsQ0FBQyxDQUFDO1FBRUgscURBQXFEO1FBQ3JELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQ3JFLFNBQVMsRUFBRSw0QkFBNEI7WUFDdkMsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxTQUFTO2dCQUNmLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7WUFDRCxPQUFPLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLFdBQVc7Z0JBQ2pCLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7WUFDRCxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlO1lBQ2pELG1CQUFtQixFQUFFLFlBQVk7WUFDakMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFFSCxVQUFVO1FBQ1YsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUMzQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTO1lBQ25DLFVBQVUsRUFBRSw2QkFBNkI7U0FDMUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUNoRCxLQUFLLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVM7WUFDeEMsVUFBVSxFQUFFLGtDQUFrQztTQUMvQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1lBQy9DLEtBQUssRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUN2QyxVQUFVLEVBQUUsaUNBQWlDO1NBQzlDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQS9GRCw4QkErRkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5leHBvcnQgY2xhc3MgRGF0YVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGpvdXJuZXlzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBwdWJsaWMgcmVhZG9ubHkgY29udmVyc2F0aW9uc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgcHVibGljIHJlYWRvbmx5IGNlbGVicmF0aW9uc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBKb3VybmV5IHN0YXRlIHRhYmxlIC0gdHJhY2tzIHVzZXIgcHJvZ3Jlc3MgdGhyb3VnaCA1IHN0ZXBzXG4gICAgdGhpcy5qb3VybmV5c1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdKb3VybmV5c1RhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiAnc3R1ZGVudHBhdGhvcy1qb3VybmV5cycsXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcbiAgICAgICAgbmFtZTogJ3VzZXJfaWQnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiB0cnVlLFxuICAgICAgc3RyZWFtOiBkeW5hbW9kYi5TdHJlYW1WaWV3VHlwZS5ORVdfQU5EX09MRF9JTUFHRVMsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU5cbiAgICB9KTtcblxuICAgIC8vIEdTSSBmb3IgcXVlcnlpbmcgYnkgdmVyaWZpY2F0aW9uIHN0YXR1c1xuICAgIHRoaXMuam91cm5leXNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICd2ZXJpZmljYXRpb24tc3RhdHVzLWluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiAndmVyaWZpY2F0aW9uX3N0YXR1cycsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9LFxuICAgICAgc29ydEtleToge1xuICAgICAgICBuYW1lOiAndXBkYXRlZF9hdCcsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBDb252ZXJzYXRpb25zIHRhYmxlIC0gc3RvcmVzIEFJIHR3aW4gY2hhdCBoaXN0b3J5XG4gICAgdGhpcy5jb252ZXJzYXRpb25zVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0NvbnZlcnNhdGlvbnNUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogJ3N0dWRlbnRwYXRob3MtY29udmVyc2F0aW9ucycsXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcbiAgICAgICAgbmFtZTogJ3VzZXJfaWQnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfSxcbiAgICAgIHNvcnRLZXk6IHtcbiAgICAgICAgbmFtZTogJ2NvbnZlcnNhdGlvbl9pZCcsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IHRydWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU5cbiAgICB9KTtcblxuICAgIC8vIEdTSSBmb3IgdGltZS1iYXNlZCBxdWVyaWVzIChhbmFseXRpY3MpXG4gICAgdGhpcy5jb252ZXJzYXRpb25zVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnY3JlYXRlZC1hdC1pbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcbiAgICAgICAgbmFtZTogJ2NyZWF0ZWRfZGF0ZScsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9LFxuICAgICAgc29ydEtleToge1xuICAgICAgICBuYW1lOiAnY3JlYXRlZF9hdCcsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBDZWxlYnJhdGlvbnMgdGFibGUgLSB0cmFja3MgbWlsZXN0b25lIGNlbGVicmF0aW9uc1xuICAgIHRoaXMuY2VsZWJyYXRpb25zVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0NlbGVicmF0aW9uc1RhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiAnc3R1ZGVudHBhdGhvcy1jZWxlYnJhdGlvbnMnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6ICd1c2VyX2lkJyxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkdcbiAgICAgIH0sXG4gICAgICBzb3J0S2V5OiB7XG4gICAgICAgIG5hbWU6ICdtaWxlc3RvbmUnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICB0aW1lVG9MaXZlQXR0cmlidXRlOiAnZXhwaXJlc19hdCcsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZXG4gICAgfSk7XG5cbiAgICAvLyBPdXRwdXRzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0pvdXJuZXlzVGFibGVOYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuam91cm5leXNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBleHBvcnROYW1lOiAnU3R1ZGVudFBhdGhPUy1Kb3VybmV5c1RhYmxlJ1xuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0NvbnZlcnNhdGlvbnNUYWJsZU5hbWUnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5jb252ZXJzYXRpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgZXhwb3J0TmFtZTogJ1N0dWRlbnRQYXRoT1MtQ29udmVyc2F0aW9uc1RhYmxlJ1xuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0NlbGVicmF0aW9uc1RhYmxlTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmNlbGVicmF0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIGV4cG9ydE5hbWU6ICdTdHVkZW50UGF0aE9TLUNlbGVicmF0aW9uc1RhYmxlJ1xuICAgIH0pO1xuICB9XG59XG4iXX0=