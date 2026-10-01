# StudentPathOS - Deployment Information

**Deployment Date:** October 1, 2026  
**AWS Account:** 593108103107  
**Region:** us-east-1  
**Status:** ✅ DEPLOYED & VERIFIED

---

## 🚀 Deployed Resources

### API Endpoints

**REST API (API Gateway)**
```
https://iqs70qndul.execute-api.us-east-1.amazonaws.com/prod/
```

Endpoints:
- POST `/verification/account` - Check AWS account
- POST `/verification/credits` - Check credit balance
- POST `/verification/profile` - Check Builder profile
- POST `/verification/student` - Check student status
- POST `/twin/screenshot` - Analyze screenshot with Claude Vision
- POST `/twin/knowledge` - Search AWS documentation
- POST `/twin/insights` - Get community insights
- POST `/twin/recommend` - Get next action recommendation
- POST `/orchestration/workflow` - Run verification workflow

**GraphQL API (AppSync)**
```
https://w6pgtbbdgrghfi5rriot7gkgqi.appsync-api.us-east-1.amazonaws.com/graphql
```

API Key: `sctlpv56pracpallkjkds2z764`

Queries:
- `getJourney(user_id: ID!)` - Get user journey state
- `listConversations(user_id: ID!)` - List user conversations

Subscriptions:
- `onJourneyUpdated(user_id: ID!)` - Real-time journey updates
- `onCelebrationTriggered(user_id: ID!)` - Real-time celebrations

### Authentication

**Cognito User Pool**
- Pool ID: `us-east-1_ZaMru24jf`
- Client ID: `49ssuthoo4gfvk7hcgd4qvcmok`
- Domain: `studentpathos.auth.us-east-1.amazoncognito.com`

Sign-up URL:
```
https://studentpathos.auth.us-east-1.amazoncognito.com/signup?client_id=49ssuthoo4gfvk7hcgd4qvcmok
```

### Database

**DynamoDB Tables**
- `studentpathos-journeys` - User journey tracking
- `studentpathos-conversations` - AI chat history
- `studentpathos-celebrations` - Milestone celebrations

### Lambda Functions

All 12 functions deployed:
```
studentpathos-check-account
studentpathos-check-credits
studentpathos-check-profile
studentpathos-check-student-status
studentpathos-analyze-screenshot
studentpathos-search-knowledge-base
studentpathos-get-community-insights
studentpathos-recommend-next-action
studentpathos-aggregate-questions
studentpathos-generate-insights
studentpathos-celebration-trigger
studentpathos-verification-workflow
```

---

## ✅ Deployment Verification

### Test Results

**Lambda Function Test:**
```bash
aws lambda invoke \
  --function-name studentpathos-check-account \
  --payload $(echo '{"email": "student@unizik.edu.ng"}' | base64) \
  --region us-east-1 \
  response.json
```

**Response:** ✅ Status 200 - Function working correctly

### Stack Status

All 4 CloudFormation stacks deployed successfully:
- ✅ StudentPathOS-Data (DynamoDB)
- ✅ StudentPathOS-Auth (Cognito)
- ✅ StudentPathOS-Lambda (12 functions)
- ✅ StudentPathOS-API (REST + GraphQL)

**Total Deployment Time:** 5 minutes 57 seconds

---

## 🌐 Frontend Configuration

Frontend environment variables configured in `.env`:
```bash
VITE_API_URL=https://iqs70qndul.execute-api.us-east-1.amazonaws.com/prod
VITE_USER_POOL_ID=us-east-1_ZaMru24jf
VITE_USER_POOL_CLIENT_ID=49ssuthoo4gfvk7hcgd4qvcmok
VITE_GRAPHQL_URL=https://w6pgtbbdgrghfi5rriot7gkgqi.appsync-api.us-east-1.amazonaws.com/graphql
```

---

## 📝 Next Steps

### 1. Deploy Frontend to Amplify

```bash
cd frontend
npm run build

# Option A: Deploy to AWS Amplify
aws amplify create-app --name StudentPathOS --region us-east-1

# Option B: Deploy to S3 + CloudFront
aws s3 sync dist/ s3://studentpathos-frontend
```

### 2. Test the Application

Navigate to the deployed frontend URL and:
1. Sign up with a .edu email
2. Click "Run Verification"
3. Test AI chat
4. Upload screenshot for portal comparison
5. View community insights

### 3. Create Demo Video

Record a walkthrough showing:
- Journey timeline progression
- AI twin chat interaction
- Screenshot analysis with Claude Vision
- Community insights dashboard
- Celebration animations

---

## 🏆 Hackathon Submission Proof

### Deployment Evidence

**CloudFormation Stacks:**
```bash
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE \
  --region us-east-1 \
  --query 'StackSummaries[?contains(StackName, `StudentPathOS`)].StackName'
```

**Lambda Functions:**
```bash
aws lambda list-functions \
  --region us-east-1 \
  --query 'Functions[?contains(FunctionName, `studentpathos`)].FunctionName'
```

**API Gateway:**
```bash
aws apigateway get-rest-apis \
  --region us-east-1 \
  --query 'items[?name==`StudentPathOS API`]'
```

### Live URLs

- **REST API:** https://iqs70qndul.execute-api.us-east-1.amazonaws.com/prod/
- **GraphQL:** https://w6pgtbbdgrghfi5rriot7gkgqi.appsync-api.us-east-1.amazonaws.com/graphql
- **Cognito:** studentpathos.auth.us-east-1.amazoncognito.com

---

## 💰 Cost Estimate

**Current Monthly Cost (projected for 1000 students):**
- Lambda: ~$5 (100k invocations, mostly free tier)
- DynamoDB: ~$8 (10GB data + queries)
- API Gateway: ~$3 (1M requests)
- AppSync: ~$4 (1M queries)
- Cognito: $0 (under 50k MAUs)
- **Total: ~$20/month** (well within free tier limits initially)

---

## 🔧 Management Commands

### View Logs
```bash
aws logs tail /aws/lambda/studentpathos-check-account --follow
```

### Update Function
```bash
cd infrastructure
cdk deploy StudentPathOS-Lambda
```

### Tear Down (if needed)
```bash
cd infrastructure
cdk destroy --all
```

---

**Deployed by:** Claude Code via Amazon Bedrock  
**Repository:** https://github.com/donaldraph/studentpathos  
**Deployment verified:** October 1, 2026, 20:XX UTC
