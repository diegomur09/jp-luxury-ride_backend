# JP Luxury Ride - AWS Deployment Guide

## 🏗️ AWS Architecture Overview

### Frontend Architecture

```
User → CloudFront CDN → AWS Amplify (Next.js) → API Gateway
```

### Backend Architecture

```
API Gateway → Lambda Functions → RDS PostgreSQL
                ↓
         ElastiCache Redis
                ↓
              S3 Storage
```

### Complete AWS Infrastructure Stack

#### Core Services

- **AWS Amplify**: Frontend hosting (Next.js)
- **API Gateway**: REST API endpoint management
- **Lambda Functions**: Serverless backend APIs
- **RDS PostgreSQL**: Primary database
- **ElastiCache Redis**: Session & caching layer
- **S3**: File storage (profile pics, documents)
- **CloudFront**: Global CDN
- **CloudWatch**: Monitoring & logging
- **WAF**: Security & DDoS protection

#### Supporting Services

- **Route 53**: DNS management
- **Certificate Manager**: SSL certificates
- **Secrets Manager**: API keys & credentials
- **IAM**: Security roles & policies
- **VPC**: Network isolation

---

## 📋 Prerequisites

### AWS Account Setup

1. **AWS Account** with billing enabled
2. **AWS CLI** installed and configured
3. **Domain name** (optional but recommended)
4. **Stripe & Square** API credentials
5. **Google Maps** API key

### Required Tools

```bash
# Install AWS CLI
winget install Amazon.AWSCLI

# Install AWS CDK (for infrastructure as code)
npm install -g aws-cdk

# Install Amplify CLI
npm install -g @aws-amplify/cli
```

---

## 🚀 Step-by-Step AWS Deployment

### Phase 1: Database & Infrastructure Setup

#### Step 1: Create RDS PostgreSQL Database

1. **Create VPC and Security Groups**

```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=lux-ride-vpc}]'

# Create subnets (replace vpc-xxxxx with your VPC ID)
aws ec2 create-subnet --vpc-id vpc-xxxxx --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id vpc-xxxxx --cidr-block 10.0.2.0/24 --availability-zone us-east-1b
```

2. **Create RDS Database**

```bash
# Create DB subnet group
aws rds create-db-subnet-group \
    --db-subnet-group-name lux-ride-subnet-group \
    --db-subnet-group-description "Subnet group for Lux Ride DB" \
    --subnet-ids subnet-xxxxx subnet-yyyyy

# Create PostgreSQL database
aws rds create-db-instance \
    --db-instance-identifier lux-ride-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 15.4 \
    --master-username luxride_admin \
    --master-user-password YOUR_SECURE_PASSWORD \
    --allocated-storage 20 \
    --storage-type gp2 \
    --db-subnet-group-name lux-ride-subnet-group \
    --vpc-security-group-ids sg-xxxxx \
    --backup-retention-period 7 \
    --no-multi-az \
    --no-publicly-accessible
```

#### Step 2: Create ElastiCache Redis Cluster

```bash
# Create Redis subnet group
aws elasticache create-cache-subnet-group \
    --cache-subnet-group-name lux-ride-redis-subnet \
    --cache-subnet-group-description "Redis subnet for Lux Ride" \
    --subnet-ids subnet-xxxxx subnet-yyyyy

# Create Redis cluster
aws elasticache create-cache-cluster \
    --cache-cluster-id lux-ride-redis \
    --cache-node-type cache.t3.micro \
    --engine redis \
    --num-cache-nodes 1 \
    --cache-subnet-group-name lux-ride-redis-subnet \
    --security-group-ids sg-xxxxx
```

#### Step 3: Create S3 Buckets

```bash
# Create S3 bucket for file uploads
aws s3 mb s3://lux-ride-uploads-YOUR_UNIQUE_ID

# Configure bucket policy for public read
aws s3api put-bucket-policy --bucket lux-ride-uploads-YOUR_UNIQUE_ID --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::lux-ride-uploads-YOUR_UNIQUE_ID/*"
    }
  ]
}'
```

### Phase 2: Backend Lambda Deployment

#### Step 1: Prepare Lambda Functions

Create `lambda/` directory structure:

```
lambda/
├── auth/
│   ├── login.js
│   └── register.js
├── bookings/
│   ├── create.js
│   ├── list.js
│   └── update.js
├── payments/
│   ├── create-intent.js
│   └── confirm.js
└── shared/
    ├── db.js
    └── middleware.js
```

#### Step 2: Convert API Routes to Lambda

Example Lambda function (`lambda/auth/login.js`):

```javascript
const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  try {
    const { email, password } = JSON.parse(event.body);

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user: data.user,
        session: data.session,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
```

#### Step 3: Deploy Lambda Functions

```bash
# Package and deploy each Lambda function
cd lambda/auth
zip -r login.zip login.js node_modules/

aws lambda create-function \
    --function-name lux-ride-auth-login \
    --runtime nodejs18.x \
    --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \
    --handler login.handler \
    --zip-file fileb://login.zip \
    --environment Variables='{
        SUPABASE_URL=your-supabase-url,
        SUPABASE_SERVICE_KEY=your-supabase-service-key,
        DATABASE_URL=postgresql://username:password@your-rds-endpoint:5432/luxride
    }'
```

#### Step 4: Create API Gateway

```bash
# Create REST API
aws apigateway create-rest-api \
    --name lux-ride-api \
    --description "Luxury Ride Sharing API"

# Create resources and methods
aws apigateway create-resource \
    --rest-api-id YOUR_API_ID \
    --parent-id ROOT_RESOURCE_ID \
    --path-part auth

# Set up Lambda integration
aws apigateway put-integration \
    --rest-api-id YOUR_API_ID \
    --resource-id RESOURCE_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:lux-ride-auth-login/invocations
```

### Phase 3: Frontend Amplify Deployment

#### Step 1: Initialize Amplify

```bash
# Navigate to frontend directory
cd C:\Users\diego_ng6p5py\OneDrive\Desktop\DpWebsite\lux-ride

# Initialize Amplify
amplify init
```

#### Step 2: Configure Amplify Settings

Create `amplify.yml`:

```yaml
version: 1
applications:
  - appRoot: /
    frontend:
      phases:
        preBuild:
          commands:
            - npm install
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - "**/*"
      cache:
        paths:
          - node_modules/**/*
          - .next/cache/**/*
    backend:
      phases:
        build:
          commands:
            - "# Execute Amplify CLI with the helper script"
```

#### Step 3: Deploy to Amplify

```bash
# Connect repository and deploy
amplify add hosting
amplify publish
```

### Phase 4: Environment Configuration

#### Step 1: Update Frontend Environment Variables

Update `lux-ride/.env.local`:

```env
# API Gateway Endpoints
NEXT_PUBLIC_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod

# Supabase (keep existing)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Stripe (keep existing)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-key

# AWS S3 for uploads
NEXT_PUBLIC_AWS_S3_BUCKET=lux-ride-uploads-YOUR_UNIQUE_ID
NEXT_PUBLIC_AWS_REGION=us-east-1
```

#### Step 2: Configure Backend Lambda Environment

Use AWS Secrets Manager:

```bash
# Store sensitive credentials
aws secretsmanager create-secret \
    --name lux-ride/database \
    --secret-string '{"username":"luxride_admin","password":"YOUR_SECURE_PASSWORD","host":"your-rds-endpoint","port":"5432","database":"luxride"}'

aws secretsmanager create-secret \
    --name lux-ride/stripe \
    --secret-string '{"secret_key":"sk_test_your_stripe_secret","webhook_secret":"whsec_your_webhook_secret"}'
```

---

## 🔧 API Gateway Configuration

### Complete API Structure

```
/prod
├── /auth
│   ├── POST /login
│   └── POST /register
├── /bookings
│   ├── GET /
│   ├── POST /
│   └── PUT /{id}
├── /payments
│   ├── POST /create-intent
│   └── POST /confirm
└── /drivers
    ├── GET /
    └── PUT /location
```

### CORS Configuration

For each method, add CORS headers:

```json
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
}
```

---

## 🔐 Security Configuration

### IAM Roles & Policies

#### Lambda Execution Role

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "rds:DescribeDBInstances",
        "elasticache:DescribeCacheClusters"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:*:*:secret:lux-ride/*"
    }
  ]
}
```

### VPC Security Groups

#### Database Security Group

- **Inbound**: Port 5432 from Lambda security group only
- **Outbound**: All traffic

#### Lambda Security Group

- **Inbound**: HTTPS (443) from API Gateway
- **Outbound**: All traffic

---

## 📊 Monitoring & Logging

### CloudWatch Configuration

```bash
# Create log groups for each Lambda function
aws logs create-log-group --log-group-name /aws/lambda/lux-ride-auth-login
aws logs create-log-group --log-group-name /aws/lambda/lux-ride-bookings-create

# Set up CloudWatch alarms
aws cloudwatch put-metric-alarm \
    --alarm-name lux-ride-high-error-rate \
    --alarm-description "High error rate on API Gateway" \
    --metric-name 4XXError \
    --namespace AWS/ApiGateway \
    --statistic Sum \
    --period 300 \
    --threshold 10 \
    --comparison-operator GreaterThanThreshold
```

---

## 💰 Cost Optimization

### Estimated Monthly Costs (USD)

| Service                  | Usage                     | Cost           |
| ------------------------ | ------------------------- | -------------- |
| **Amplify**              | 1 app, 100GB bandwidth    | $15            |
| **API Gateway**          | 1M requests               | $3.50          |
| **Lambda**               | 1M requests, 512MB        | $8.40          |
| **RDS t3.micro**         | 24/7 operation            | $12.41         |
| **ElastiCache t3.micro** | 24/7 operation            | $11.02         |
| **S3**                   | 10GB storage, 1k requests | $0.50          |
| **CloudFront**           | 100GB data transfer       | $8.50          |
| **Route 53**             | 1 hosted zone             | $0.50          |
| **Total**                |                           | **~$60/month** |

### Cost Optimization Tips

1. **Use Reserved Instances** for RDS in production
2. **Enable S3 Intelligent Tiering** for uploads
3. **Set up Lambda provisioned concurrency** only for critical functions
4. **Use CloudFront caching** aggressively
5. **Monitor with AWS Cost Explorer**

---

## 🚀 Deployment Commands Summary

### Quick Deploy Script

```bash
#!/bin/bash
# Complete AWS deployment script

echo "🚀 Deploying JP Luxury Ride to AWS..."

# 1. Deploy backend Lambda functions
echo "📦 Deploying Lambda functions..."
cd lambda && ./deploy-all.sh

# 2. Create API Gateway
echo "🌐 Setting up API Gateway..."
aws cloudformation deploy \
    --template-file cloudformation/api-gateway.yaml \
    --stack-name lux-ride-api \
    --capabilities CAPABILITY_IAM

# 3. Deploy frontend to Amplify
echo "🎨 Deploying frontend..."
cd ../lux-ride && amplify publish

# 4. Configure custom domain
echo "🌍 Setting up custom domain..."
aws route53 create-hosted-zone --name yourdomain.com

echo "✅ Deployment complete!"
echo "🌐 Frontend: https://yourdomain.com"
echo "🔗 API: https://api.yourdomain.com"
```

---

## 🔄 CI/CD Pipeline (Optional)

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS
on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm install
      - run: npm run build
      - uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - run: ./deploy-lambda.sh

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: amplify publish --yes
```

---

## 📱 Next Steps

1. **Complete Database Migration**: Move from Supabase to RDS
2. **Set up Custom Domain**: Configure Route 53 and Certificate Manager
3. **Enable WAF**: Add security rules for DDoS protection
4. **Performance Testing**: Load test with AWS X-Ray
5. **Backup Strategy**: Configure automated RDS backups
6. **Monitoring**: Set up comprehensive CloudWatch dashboards

---

## ❓ Troubleshooting

### Common Issues

1. **Lambda Cold Starts**: Use provisioned concurrency for critical functions
2. **Database Connections**: Use connection pooling (RDS Proxy)
3. **CORS Errors**: Ensure proper headers on all API Gateway methods
4. **Environment Variables**: Use AWS Parameter Store or Secrets Manager
5. **Build Failures**: Check CloudWatch logs for detailed error messages

### Support Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **Amplify Docs**: https://docs.amplify.aws/
- **Lambda Best Practices**: https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html

---

This guide provides a complete roadmap for deploying your luxury ride-sharing application to AWS with enterprise-grade scalability, security, and monitoring. 🚗☁️✨
