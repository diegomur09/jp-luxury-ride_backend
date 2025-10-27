#!/bin/bash
# AWS Deployment Script for JP Luxury Ride
# This script automates the complete deployment to AWS

set -e  # Exit on any error

# Configuration
ENVIRONMENT="dev"
REGION="us-east-2"
DOMAIN_NAME="your-domain.com"  # Update this
AWS_ACCOUNT_ID="711588522246"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting AWS deployment for JP Luxury Ride...${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command_exists aws; then
    echo -e "${RED}❌ AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm not found. Please install Node.js first.${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}❌ AWS credentials not configured. Run 'aws configure' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Step 1: Deploy Infrastructure
echo -e "${BLUE}🏗️  Step 1: Deploying AWS Infrastructure...${NC}"

aws cloudformation deploy \
    --template-file infrastructure.yaml \
    --stack-name "${ENVIRONMENT}-lux-ride-infrastructure" \
    --parameter-overrides \
        Environment=${ENVIRONMENT} \
        DomainName=${DOMAIN_NAME} \
    --capabilities CAPABILITY_NAMED_IAM \
    --region ${REGION}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Infrastructure deployed successfully${NC}"
else
    echo -e "${RED}❌ Infrastructure deployment failed${NC}"
    exit 1
fi

# Get infrastructure outputs
echo -e "${YELLOW}📊 Getting infrastructure details...${NC}"

VPC_ID=$(aws cloudformation describe-stacks \
    --stack-name "${ENVIRONMENT}-lux-ride-infrastructure" \
    --query 'Stacks[0].Outputs[?OutputKey==`VPCId`].OutputValue' \
    --output text \
    --region ${REGION})

DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "${ENVIRONMENT}-lux-ride-infrastructure" \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
    --output text \
    --region ${REGION})

REDIS_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "${ENVIRONMENT}-lux-ride-infrastructure" \
    --query 'Stacks[0].Outputs[?OutputKey==`RedisEndpoint`].OutputValue' \
    --output text \
    --region ${REGION})

S3_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "${ENVIRONMENT}-lux-ride-infrastructure" \
    --query 'Stacks[0].Outputs[?OutputKey==`S3BucketName`].OutputValue' \
    --output text \
    --region ${REGION})

LAMBDA_ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name "${ENVIRONMENT}-lux-ride-infrastructure" \
    --query 'Stacks[0].Outputs[?OutputKey==`LambdaExecutionRoleArn`].OutputValue' \
    --output text \
    --region ${REGION})

API_URL=$(aws cloudformation describe-stacks \
    --stack-name "${ENVIRONMENT}-lux-ride-infrastructure" \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
    --output text \
    --region ${REGION})

echo -e "${GREEN}Infrastructure Details:${NC}"
echo -e "VPC ID: ${VPC_ID}"
echo -e "Database: ${DB_ENDPOINT}"
echo -e "Redis: ${REDIS_ENDPOINT}"
echo -e "S3 Bucket: ${S3_BUCKET}"
echo -e "API URL: ${API_URL}"

# Step 2: Prepare Lambda Functions
echo -e "${BLUE}📦 Step 2: Preparing Lambda functions...${NC}"

# Create lambda directory structure
mkdir -p lambda/{auth,bookings,payments,drivers,shared}

# Copy source files and install dependencies
cd lambda

# Create package.json for Lambda functions
cat > package.json << EOL
{
  "name": "lux-ride-lambda-functions",
  "version": "1.0.0",
  "description": "Lambda functions for Lux Ride",
    "dependencies": {
        "@prisma/client": "^5.6.0",
        "stripe": "^14.8.0",
        "squareup": "^1.0.0",
        "jsonwebtoken": "^9.0.2",
        "bcryptjs": "^2.4.3",
        "aws-sdk": "^2.1400.0"
    }
}
EOL

npm install --production

# Step 3: Create Lambda Functions
echo -e "${BLUE}⚡ Step 3: Creating Lambda functions...${NC}"

# Auth Login Lambda
cat > auth/login.js << 'EOL'
// Supabase removed from this repository. This placeholder Lambda returns 501
// to indicate the auth/login functionality should be implemented using
// your chosen auth provider (DynamoDB, Cognito, JWT, etc.).

exports.handler = async (event) => {
  console.error('auth/login invoked but Supabase auth was removed from the codebase');
  return {
    statusCode: 501,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ error: 'Auth not implemented. Supabase integration removed.' })
  };
};
EOL

# Create deployment packages
echo -e "${YELLOW}📦 Creating deployment packages...${NC}"

for dir in auth bookings payments drivers; do
    if [ -d "$dir" ]; then
        cd "$dir"
        zip -r "../${dir}-functions.zip" . ../node_modules
        cd ..
    fi
done

cd ..  # Back to main directory

# Step 4: Deploy Lambda Functions
echo -e "${BLUE}⚡ Step 4: Deploying Lambda functions...${NC}"

# Deploy Auth Login
aws lambda create-function \
    --function-name "${ENVIRONMENT}-lux-ride-auth-login" \
    --runtime nodejs18.x \
    --role "${LAMBDA_ROLE_ARN}" \
    --handler login.handler \
    --zip-file fileb://lambda/auth-functions.zip \
    --environment Variables="{
        DATABASE_URL=postgresql://luxride_admin:password@${DB_ENDPOINT}:5432/luxride,
        REDIS_URL=redis://${REDIS_ENDPOINT}:6379,
        S3_BUCKET=${S3_BUCKET},
        SUPABASE_SECRET_ARN=arn:aws:secretsmanager:${REGION}:${AWS_ACCOUNT_ID}:secret:${ENVIRONMENT}/lux-ride/supabase
    }" \
    --timeout 30 \
    --region ${REGION} || echo "Function might already exist, updating..."

# Update function if it exists
aws lambda update-function-code \
    --function-name "${ENVIRONMENT}-lux-ride-auth-login" \
    --zip-file fileb://lambda/auth-functions.zip \
    --region ${REGION}

# Step 5: Configure API Gateway
echo -e "${BLUE}🌐 Step 5: Configuring API Gateway...${NC}"

# This would typically be done through CloudFormation or Terraform
# For now, manual configuration is required

echo -e "${YELLOW}⚠️  Manual API Gateway configuration required:${NC}"
echo -e "1. Go to API Gateway console"
echo -e "2. Find API: ${ENVIRONMENT}-lux-ride-api"
echo -e "3. Create resources and methods"
echo -e "4. Connect Lambda functions"
echo -e "5. Deploy API"

# Step 6: Frontend Deployment Preparation
echo -e "${BLUE}🎨 Step 6: Preparing frontend deployment...${NC}"

cd ../lux-ride  # Navigate to frontend directory

# Update environment variables
cat > .env.production << EOL
NEXT_PUBLIC_API_URL=${API_URL}
NEXT_PUBLIC_AWS_REGION=${REGION}
NEXT_PUBLIC_S3_BUCKET=${S3_BUCKET}
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key
EOL

echo -e "${GREEN}✅ Frontend environment configured${NC}"

# Step 7: Initialize Amplify (if not already done)
if ! command_exists amplify; then
    echo -e "${YELLOW}📱 Installing Amplify CLI...${NC}"
    npm install -g @aws-amplify/cli
fi

echo -e "${BLUE}📱 Step 7: Amplify deployment preparation...${NC}"
echo -e "${YELLOW}Run the following commands to deploy frontend:${NC}"
echo -e "1. amplify init"
echo -e "2. amplify add hosting"
echo -e "3. amplify publish"

# Summary
echo -e "${GREEN}🎉 Deployment Summary:${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Infrastructure: ${GREEN}✅ Deployed${NC}"
echo -e "Database: ${GREEN}✅ Created${NC} (${DB_ENDPOINT})"
echo -e "Redis: ${GREEN}✅ Created${NC} (${REDIS_ENDPOINT})"
echo -e "S3 Bucket: ${GREEN}✅ Created${NC} (${S3_BUCKET})"
echo -e "Lambda Functions: ${GREEN}✅ Deployed${NC}"
echo -e "API Gateway: ${YELLOW}⚠️  Manual configuration needed${NC}"
echo -e "Frontend: ${YELLOW}⚠️  Amplify deployment pending${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${BLUE}Next Steps:${NC}"
echo -e "1. Configure API Gateway manually or run: ./configure-api.sh"
echo -e "2. Update Secrets Manager with real API keys"
echo -e "3. Deploy frontend with Amplify"
echo -e "4. Configure custom domain"
echo -e "5. Set up monitoring and alerts"

echo -e "${GREEN}🚀 Basic AWS deployment completed!${NC}"