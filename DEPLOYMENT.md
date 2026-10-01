# StudentPathOS Deployment Guide

Complete guide to deploy StudentPathOS to AWS production.

## Prerequisites

### Required Tools
- AWS Account with admin access
- AWS CLI v2+ configured (`aws configure`)
- Node.js 18+ and npm
- Python 3.12
- Git

### Required AWS Services Access
- Amazon Bedrock (us-east-1)
- Lambda, DynamoDB, API Gateway
- Cognito, AppSync, S3
- IAM permissions to create resources

## Step 1: Enable Amazon Bedrock

Bedrock is not enabled by default. You need to request model access first.

```bash
# Open Bedrock console
aws bedrock get-foundation-models --region us-east-1

# If error, go to AWS Console → Bedrock → Model Access
# Request access to:
# - Claude 3.5 Sonnet
# - Claude 3.5 Haiku
```

Wait 5-10 minutes for approval (usually instant).

## Step 2: Deploy Infrastructure

```bash
cd infrastructure

# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap aws://ACCOUNT-ID/us-east-1

# Synthesize CloudFormation templates
cdk synth

# Deploy all stacks
cdk deploy --all --require-approval never

# Or deploy one at a time:
cdk deploy StudentPathOS-Data
cdk deploy StudentPathOS-Auth
cdk deploy StudentPathOS-Lambda
cdk deploy StudentPathOS-API
```

**Deployment time:** ~8 minutes

**Outputs:** Save these values!
```
StudentPathOS-Auth.UserPoolId = us-east-1_XXXXXXX
StudentPathOS-Auth.UserPoolClientId = XXXXXXXXXXXXXXXXXXXXX
StudentPathOS-API.RestApiUrl = https://xxxxxx.execute-api.us-east-1.amazonaws.com/prod/
StudentPathOS-API.GraphQLUrl = https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql
```

## Step 3: Configure Environment Variables

Create `frontend/.env`:

```bash
VITE_API_URL=<RestApiUrl from CDK output>
VITE_USER_POOL_ID=<UserPoolId from CDK output>
VITE_USER_POOL_CLIENT_ID=<UserPoolClientId from CDK output>
VITE_GRAPHQL_URL=<GraphQLUrl from CDK output>
VITE_REGION=us-east-1
```

## Step 4: Deploy Frontend

### Option A: AWS Amplify (Recommended)

```bash
cd frontend
npm install
npm run build

# Create Amplify app
aws amplify create-app --name StudentPathOS --region us-east-1

# Connect GitHub repo
# Go to: AWS Console → Amplify → StudentPathOS → Connect repository
# Select: donaldraph/studentpathos
# Branch: main

# Amplify auto-deploys on every push to main!
```

**URL:** `https://main.XXXXXX.amplifyapp.com`

### Option B: S3 + CloudFront

```bash
cd frontend
npm install
npm run build

# Create S3 bucket
aws s3 mb s3://studentpathos-frontend --region us-east-1

# Upload build
aws s3 sync dist/ s3://studentpathos-frontend --delete

# Make public (for demo)
aws s3 website s3://studentpathos-frontend --index-document index.html
```

## Step 5: Create First User

```bash
# Sign up via frontend, or via CLI:
aws cognito-idp sign-up \
  --client-id <UserPoolClientId> \
  --username student@unizik.edu.ng \
  --password Password123! \
  --user-attributes Name=email,Value=student@unizik.edu.ng

# Confirm user (admin)
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id <UserPoolId> \
  --username student@unizik.edu.ng
```

## Step 6: Verify Deployment

### Test Lambda Functions

```bash
# Test account checker
aws lambda invoke \
  --function-name studentpathos-check-account \
  --payload '{"email": "student@unizik.edu.ng"}' \
  response.json

cat response.json
```

### Test API Gateway

```bash
# Get auth token
TOKEN=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id <UserPoolClientId> \
  --auth-parameters USERNAME=student@unizik.edu.ng,PASSWORD=Password123! \
  --query 'AuthenticationResult.IdToken' \
  --output text)

# Call API
curl -X POST <RestApiUrl>/verification/account \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "student@unizik.edu.ng"}'
```

### Test Frontend

1. Open Amplify URL in browser
2. Sign up with .edu email
3. Click "Run Verification"
4. Check journey timeline updates
5. Chat with AI twin
6. Upload screenshot to portal comparison

## Step 7: Configure Bedrock Knowledge Base (Optional)

For the `search-knowledge-base` Lambda to work with RAG:

```bash
# Create S3 bucket for docs
aws s3 mb s3://studentpathos-docs --region us-east-1

# Upload AWS documentation
aws s3 cp docs/ s3://studentpathos-docs/aws-docs/ --recursive

# Create knowledge base
aws bedrock-agent create-knowledge-base \
  --name StudentPathOS-Docs \
  --role-arn <bedrock-kb-role-arn> \
  --storage-configuration type=S3,s3Configuration={bucketArn=arn:aws:s3:::studentpathos-docs}

# Get knowledge base ID
KNOWLEDGE_BASE_ID=$(aws bedrock-agent list-knowledge-bases \
  --query 'knowledgeBaseSummaries[0].knowledgeBaseId' \
  --output text)

# Update Lambda environment variable
aws lambda update-function-configuration \
  --function-name studentpathos-search-knowledge-base \
  --environment "Variables={KNOWLEDGE_BASE_ID=$KNOWLEDGE_BASE_ID}"
```

## Step 8: Monitoring

### CloudWatch Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/studentpathos-check-account --follow

# View API Gateway logs
aws logs tail /aws/apigateway/StudentPathOS-API --follow
```

### Metrics Dashboard

Go to CloudWatch → Dashboards → Create Dashboard

Add widgets for:
- Lambda invocations (all functions)
- DynamoDB read/write capacity
- API Gateway 4xx/5xx errors
- Bedrock model invocations

### X-Ray Tracing

Go to X-Ray → Traces to see distributed tracing across:
- API Gateway → Lambda → DynamoDB
- Lambda → Bedrock → S3

## Troubleshooting

### "AccessDeniedException: Could not invoke model"

Bedrock model access not enabled. Go to Bedrock console and request access.

### "User does not exist"

User not confirmed. Run:
```bash
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id <UserPoolId> \
  --username <email>
```

### Lambda timeout errors

Increase timeout in CDK:
```typescript
timeout: cdk.Duration.seconds(60)
```

Redeploy with `cdk deploy StudentPathOS-Lambda`.

### AppSync unauthorized

Check Cognito token is valid and not expired. Tokens expire after 1 hour.

## Cost Management

### Set Up Billing Alerts

```bash
# Create SNS topic
aws sns create-topic --name billing-alerts

# Subscribe email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:billing-alerts \
  --protocol email \
  --notification-endpoint you@email.com

# Create budget
aws budgets create-budget \
  --account-id ACCOUNT \
  --budget file://budget.json
```

Create `budget.json`:
```json
{
  "BudgetName": "StudentPathOS-Monthly",
  "BudgetLimit": {
    "Amount": "50",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
```

### Monitor Costs

```bash
# Current month spend
aws ce get-cost-and-usage \
  --time-period Start=2026-10-01,End=2026-10-31 \
  --granularity DAILY \
  --metrics BlendedCost \
  --filter file://filter.json
```

## Teardown

To delete everything:

```bash
cd infrastructure

# Delete all stacks
cdk destroy --all

# Delete Amplify app
aws amplify delete-app --app-id <app-id>

# Delete S3 buckets (if used)
aws s3 rb s3://studentpathos-frontend --force
aws s3 rb s3://studentpathos-docs --force
```

**Warning:** This deletes all data! Export DynamoDB tables first if needed.

## Production Checklist

Before going live with real students:

- [ ] Enable DynamoDB backups
- [ ] Set up CloudWatch alarms
- [ ] Configure WAF rules for API Gateway
- [ ] Enable CloudTrail for audit logs
- [ ] Add domain name (Route 53 + ACM certificate)
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Add rate limiting to API Gateway
- [ ] Test with 10+ concurrent users
- [ ] Document runbook for incidents

## Support

If you encounter issues deploying:

1. Check [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
2. Review CDK synth output: `cdk synth > template.yaml`
3. Check CloudFormation events in AWS Console
4. Review Lambda logs in CloudWatch

## Hackathon Submission

For "Zero to Shipped" hackathon:

1. Deploy to AWS ✅
2. Record demo video showing:
   - Journey timeline working
   - AI chat responding
   - Portal comparison with screenshot
   - Community insights dashboard
   - Celebration animations
3. Include this README as proof of deployment
4. Show Git commits proving "built with claude code"

---

**Built entirely with Claude Code (via Kiro)**  
**Repository:** https://github.com/donaldraph/studentpathos  
**Live Demo:** (add Amplify URL after deployment)
