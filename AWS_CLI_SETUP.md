# AWS CLI Setup Guide for JP Luxury Ride Backend

## 🔐 Step-by-Step AWS CLI Configuration

### Step 1: Check AWS CLI Installation

First, let's verify AWS CLI is installed on your system:

```powershell
aws --version
```

If not installed, install it:
```powershell
# Using winget (recommended)
winget install Amazon.AWSCLI

# Or download from: https://aws.amazon.com/cli/
```

### Step 2: Create AWS IAM User for Development

1. **Go to AWS Console**: https://console.aws.amazon.com/
2. **Navigate to IAM** → Users → Create User
3. **User Details**:
   - Username: `lux-ride-dev-user`
   - Access type: ☑️ Programmatic access
4. **Attach Policies** (for development):
   ```
   ✅ PowerUserAccess (recommended for development)
   
   Or for more restrictive access:
   ✅ AmazonEC2FullAccess
   ✅ AmazonS3FullAccess  
   ✅ AmazonRDSFullAccess
   ✅ AWSLambdaFullAccess
   ✅ AmazonAPIGatewayAdministrator
   ✅ CloudFormationFullAccess
   ✅ IAMFullAccess
   ```
5. **Save Access Keys**:
   - Access Key ID: `AKIA...`
   - Secret Access Key: `abc123...`

### Step 3: Configure AWS CLI

Run this command in your backend directory:

```powershell
aws configure
```

**Enter your credentials:**
```
AWS Access Key ID [None]: YOUR_ACCESS_KEY_ID
AWS Secret Access Key [None]: YOUR_SECRET_ACCESS_KEY  
Default region name [None]: us-east-1
Default output format [None]: json
```

### Step 4: Test AWS Connection

```powershell
# Test AWS connection
aws sts get-caller-identity

# Should return something like:
# {
#     "UserId": "AIDACKCEVSQ6C2EXAMPLE",
#     "Account": "123456789012", 
#     "Arn": "arn:aws:iam::123456789012:user/lux-ride-dev-user"
# }
```

### Step 5: Set Up AWS Profile (Optional but Recommended)

Create a specific profile for your project:

```powershell
aws configure --profile lux-ride-dev
```

Then use it:
```powershell
# Set environment variable
$env:AWS_PROFILE = "lux-ride-dev"

# Or use --profile flag
aws s3 ls --profile lux-ride-dev
```

## 🎯 Backend-Specific Setup

### Create .aws-config file in your backend project

```powershell
# Navigate to your backend directory
cd C:\Users\diego_ng6p5py\OneDrive\Desktop\DpWebsite\lux-ride_backend

# Create AWS config file
New-Item -ItemType File -Path ".aws-config"
```

Add this content to `.aws-config`:
```ini
[default]
region = us-east-1
output = json

[profile lux-ride-dev]
region = us-east-1
output = json

[profile lux-ride-prod]  
region = us-east-1
output = json
```

### Update .env file with AWS configuration

Add to your `.env` file:
```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=lux-ride-dev
AWS_ACCOUNT_ID=123456789012

# S3 Configuration
AWS_S3_BUCKET=lux-ride-uploads-dev
AWS_S3_REGION=us-east-1

# Lambda Configuration  
AWS_LAMBDA_ROLE_ARN=arn:aws:iam::123456789012:role/lux-ride-lambda-role
```

## 🚀 Quick Deployment Test

### Test 1: Create S3 Bucket
```powershell
aws s3 mb s3://lux-ride-test-$(Get-Random) --region us-east-1
```

### Test 2: List Available Services
```powershell
aws ec2 describe-regions
aws rds describe-db-instances
```

### Test 3: Check IAM Permissions
```powershell
aws iam get-user
aws iam list-attached-user-policies --user-name lux-ride-dev-user
```

## 🔧 Troubleshooting

### Common Issues:

1. **Credentials not found**:
   ```powershell
   # Check credentials location
   Get-Content ~/.aws/credentials
   Get-Content ~/.aws/config
   ```

2. **Permission denied**:
   - Verify IAM policies are attached correctly
   - Check if MFA is required

3. **Region issues**:
   ```powershell
   # Set default region
   aws configure set region us-east-1
   ```

### Verify Setup:
```powershell
# Check current configuration
aws configure list

# Check all profiles
aws configure list-profiles

# Test specific service access
aws s3 ls
aws lambda list-functions
aws rds describe-db-instances
```

## 🔐 Security Best Practices

### 1. Use IAM Roles in Production
- Never use root account access keys
- Create specific roles for each service
- Use least privilege principle

### 2. Enable MFA
- Add MFA to your IAM user
- Use temporary credentials when possible

### 3. Rotate Access Keys
- Rotate keys every 90 days
- Use AWS Secrets Manager for application secrets

### 4. Monitor Usage
- Enable CloudTrail for API logging
- Set up billing alerts
- Monitor unusual activity

## 📋 Next Steps After Setup

1. ✅ AWS CLI configured and tested
2. ✅ IAM user created with proper permissions  
3. ✅ Backend environment variables updated
4. 🔄 Run infrastructure deployment script
5. 🔄 Deploy Lambda functions
6. 🔄 Set up monitoring and alerts

## 🎯 Ready for Deployment Commands

After setup is complete, you can run:

```powershell
# Deploy infrastructure
.\aws-deployment\deploy.sh

# Or step by step:
aws cloudformation deploy --template-file aws-deployment\infrastructure.yaml --stack-name lux-ride-dev

# Test Lambda deployment  
aws lambda list-functions

# Create S3 bucket for uploads
aws s3 mb s3://lux-ride-uploads-dev-$(Get-Random)
```

Your backend is now ready for AWS deployment! 🚀