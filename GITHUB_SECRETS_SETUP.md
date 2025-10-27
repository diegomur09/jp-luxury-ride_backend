# 🔐 GitHub Secrets Setup Guide

## JP Luxury Ride Backend Deployment

This guide will help you configure the required GitHub Secrets for automatic deployment of your JP Luxury Ride backend to AWS.

---

## 📋 **Required Secrets Overview**

Your GitHub Actions workflow needs these secrets to deploy successfully:

### **🔑 AWS Credentials**

```
Name: AWS_ACCESS_KEY_ID
Value: [Your AWS Access Key ID - starts with AKIA]

Name: AWS_SECRET_ACCESS_KEY
Value: [Your AWS Secret Access Key - from AWS Console]
```

### **🏗️ AWS Infrastructure**

```
Name: AWS_ACCOUNT_ID
Value: [Your 12-digit AWS Account ID]

Name: AWS_REGION
Value: us-east-2
```

### **🗄️ Supabase Database**

```
Name: SUPABASE_URL
Value: [Your Supabase project URL - https://xyz.supabase.co]

Name: SUPABASE_ANON_KEY
Value: [Your Supabase anonymous key]

Name: SUPABASE_SERVICE_ROLE_KEY
Value: [Your Supabase service role key]
```

### **💳 Payment Processors**

#### **Stripe Payments**

```
Name: STRIPE_SECRET_KEY
Value: [Your Stripe secret key - starts with sk_]

Name: STRIPE_PUBLISHABLE_KEY
Value: [Your Stripe publishable key - starts with pk_]
```

#### **Square Payments**

```
Name: SQUARE_ACCESS_TOKEN
Value: [Your Square access token]

Name: SQUARE_APPLICATION_ID
Value: [Your Square application ID]

Name: SQUARE_LOCATION_ID
Value: [Your Square location ID]

Name: SQUARE_ENVIRONMENT
Value: [sandbox or production]
```

### **🔒 Security**

```
Name: JWT_SECRET
Value: [Random secure string for JWT signing]

Name: CORS_ORIGIN
Value: [Your frontend URL - e.g., https://yourdomain.com]
```

---

## 🚀 **Quick Setup Methods**

### **Method 1: GitHub CLI (Recommended)**

First, install GitHub CLI: https://cli.github.com/

```bash
# Navigate to your repository
cd /path/to/jp-luxury-ride_backend

# Set AWS credentials (replace with your actual values)
gh secret set AWS_ACCESS_KEY_ID --body "YOUR_ACCESS_KEY_ID"
gh secret set AWS_SECRET_ACCESS_KEY --body "YOUR_SECRET_ACCESS_KEY"

# Set database secrets
gh secret set SUPABASE_URL --body "https://your-project.supabase.co"
gh secret set SUPABASE_ANON_KEY --body "eyJ..."
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "eyJ..."

# Set payment processor secrets
gh secret set STRIPE_SECRET_KEY --body "sk_test_your_stripe_key"
gh secret set STRIPE_PUBLISHABLE_KEY --body "pk_test_your_stripe_key"
gh secret set SQUARE_ACCESS_TOKEN --body "your-square-access-token"
gh secret set SQUARE_APPLICATION_ID --body "your-square-app-id"
gh secret set SQUARE_LOCATION_ID --body "your-square-location-id"
gh secret set SQUARE_ENVIRONMENT --body "sandbox"

# Set security secrets
gh secret set JWT_SECRET --body "your-jwt-secret"
gh secret set CORS_ORIGIN --body "https://yourdomain.com"
```

### **Method 2: GitHub Web Interface**

1. Go to your repository: https://github.com/diegomur09/jp-luxury-ride_backend
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with its name and value

---

## 📝 **Detailed Setup Instructions**

### **1. AWS Credentials Setup**

#### Get your AWS credentials:

1. Log into AWS Console
2. Go to **IAM** → **Users** → **Your User**
3. Click **Security credentials** tab
4. Click **Create access key**
5. Copy the **Access Key ID** and **Secret Access Key**

#### Add to GitHub:

```bash
gh secret set AWS_ACCESS_KEY_ID --body "AKIA..."
gh secret set AWS_SECRET_ACCESS_KEY --body "your-secret-key"
gh secret set AWS_ACCOUNT_ID --body "711588522246"
gh secret set AWS_REGION --body "us-east-2"
```

### **2. Supabase Database Setup**

#### Get your Supabase credentials:

1. Go to your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy the **URL**, **anon public**, and **service_role** keys

#### Add to GitHub:

```bash
gh secret set SUPABASE_URL --body "https://your-project.supabase.co"
gh secret set SUPABASE_ANON_KEY --body "eyJ..."
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "eyJ..."
```

### **3. Payment Processor Setup**

#### **Stripe Configuration:**

1. Log into Stripe Dashboard
2. Go to **Developers** → **API keys**
3. Copy **Publishable key** and **Secret key**

```bash
gh secret set STRIPE_SECRET_KEY --body "sk_test_..."
gh secret set STRIPE_PUBLISHABLE_KEY --body "pk_test_..."
```

#### **Square Configuration:**

1. Log into Square Developer Dashboard
2. Go to your application
3. Navigate to **Credentials** tab
4. Copy the required keys for your environment (Sandbox/Production)

```bash
gh secret set SQUARE_ACCESS_TOKEN --body "your-square-access-token"
gh secret set SQUARE_APPLICATION_ID --body "your-square-app-id"
gh secret set SQUARE_LOCATION_ID --body "your-square-location-id"
gh secret set SQUARE_ENVIRONMENT --body "sandbox"  # or "production"
```

**📝 Square Setup Notes:**

- Use **Sandbox** credentials for development/testing
- Use **Production** credentials only for live payments
- Location ID is required for processing payments
- Access token format varies by environment

### **4. Security Configuration**

#### Generate JWT Secret:

```bash
# Generate a secure random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Add security secrets:

```bash
gh secret set JWT_SECRET --body "your-generated-secret"
gh secret set CORS_ORIGIN --body "https://your-frontend-domain.com"
```

---

## ✅ **Verification**

### **Check All Secrets Are Set:**

```bash
gh secret list
```

You should see all these secrets:

**AWS Infrastructure:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_ACCOUNT_ID`
- `AWS_REGION`

**Database:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Payment Processors:**
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `SQUARE_ACCESS_TOKEN`
- `SQUARE_APPLICATION_ID`
- `SQUARE_LOCATION_ID`
- `SQUARE_ENVIRONMENT`

**Security:**
- `JWT_SECRET`
- `CORS_ORIGIN`

### **Test Deployment:**

1. Push code to main branch
2. Check **Actions** tab in GitHub
3. Watch the deployment workflow run
4. Verify all jobs complete successfully

---

## 🔧 **Troubleshooting**

### **Common Issues:**

#### ❌ **AWS Access Denied**

- Verify your AWS credentials are correct
- Ensure your AWS user has `AdministratorAccess` policy
- Check the AWS region is set to `us-east-2`

#### ❌ **Lambda Function Creation Failed**

- Verify `AWS_ACCOUNT_ID` is correct (12 digits)
- Ensure Lambda execution role exists in your AWS account
- Check CloudFormation stack deployed successfully

#### ❌ **Database Connection Failed**

- Verify Supabase URL format: `https://project.supabase.co`
- Ensure Supabase keys are copied correctly (they're long!)
- Check your Supabase project is active

#### ❌ **Payment Processing Failed**

- Verify Stripe keys start with `sk_` and `pk_`
- Ensure you're using test keys for development
- Check Stripe webhook endpoints are configured

### **Debug Commands:**

```bash
# Check secret values (doesn't show actual values)
gh secret list

# View workflow runs
gh run list

# View specific workflow run details
gh run view [RUN_ID]
```

---

## 🎯 **Next Steps**

After setting up secrets:

1. **Push your code** to trigger automatic deployment
2. **Monitor the Actions tab** for deployment progress
3. **Test your API endpoints** once deployed
4. **Set up monitoring** in AWS CloudWatch
5. **Configure custom domain** in API Gateway (optional)

---

## 🆘 **Support**

If you encounter issues:

1. Check the **Actions** tab for detailed error logs
2. Verify all secrets are set correctly
3. Ensure your AWS account has sufficient permissions
4. Check service quotas in AWS (Lambda functions, API Gateway, etc.)

---

**🎉 Happy deploying!** Your JP Luxury Ride backend will be automatically deployed to AWS on every push to the main branch.
