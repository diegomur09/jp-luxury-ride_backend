# 🚀 Deployment Guide

## Backend Deployment Options

### Option 1: Vercel (Recommended)

#### 1. Prepare for Deployment
```bash
# Make sure your project is in a Git repository
git init
git add .
git commit -m "Initial commit"

# Push to GitHub/GitLab
git remote add origin https://github.com/yourusername/lux-ride-backend.git
git push -u origin main
```

#### 2. Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name: lux-ride-backend
# - Directory: ./
# - Override settings? No

# Deploy to production
vercel --prod
```

#### 3. Environment Variables in Vercel
Go to your Vercel dashboard → Project → Settings → Environment Variables

Add these variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_supabase_postgres_url
DIRECT_URL=your_supabase_direct_url
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable
SQUARE_APPLICATION_ID=your_square_app_id
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_ENVIRONMENT=production
GOOGLE_MAPS_API_KEY=your_google_maps_key
JWT_SECRET=your_jwt_secret
```

#### 4. Database Migration
After deployment, run migrations:
```bash
# Using Vercel CLI
vercel env pull .env.local
npm run db:push
npm run db:seed
```

### Option 2: Railway

#### 1. Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

#### 2. Deploy
```bash
# Initialize Railway project
railway init

# Set environment variables
railway variables set NEXT_PUBLIC_SUPABASE_URL=your_url
railway variables set DATABASE_URL=your_database_url
# ... add all other env vars

# Deploy
railway up
```

### Option 3: AWS (Advanced)

#### 1. Create Lambda Function
```bash
# Install Serverless Framework
npm install -g serverless

# Create serverless.yml
```

**serverless.yml**:
```yaml
service: lux-ride-backend

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    NEXT_PUBLIC_SUPABASE_URL: ${env:NEXT_PUBLIC_SUPABASE_URL}
    DATABASE_URL: ${env:DATABASE_URL}
    # Add other env vars

functions:
  api:
    handler: .next/standalone/server.js
    events:
      - http:
          path: /{proxy+}
          method: ANY
      - http:
          path: /
          method: ANY

plugins:
  - serverless-nextjs-plugin
```

## Database Setup (Supabase)

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Choose region (closer to your users)
4. Wait for setup to complete

### 2. Get Connection Details
```bash
# From Supabase Dashboard → Settings → Database
# Connection string format:
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# For connection pooling (recommended for serverless):
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true&connection_limit=1
```

### 3. Set up Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE-ROLE-KEY]

# Database URLs
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### 4. Run Database Migrations
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed initial data
npm run db:seed
```

## Payment Provider Setup

### Stripe Setup

1. **Create Stripe Account**: [dashboard.stripe.com](https://dashboard.stripe.com)

2. **Get API Keys**:
   - Test keys: `pk_test_...` and `sk_test_...`
   - Live keys: `pk_live_...` and `sk_live_...`

3. **Set up Webhooks** (Optional):
   ```
   Webhook URL: https://your-domain.com/api/webhooks/stripe
   Events: payment_intent.succeeded, payment_intent.payment_failed
   ```

### Square Setup

1. **Create Square Developer Account**: [developer.squareup.com](https://developer.squareup.com)

2. **Create Application**:
   - Get Application ID and Access Token
   - Sandbox vs Production environment

3. **Configure Environment**:
   ```env
   SQUARE_APPLICATION_ID=your_app_id
   SQUARE_ACCESS_TOKEN=your_access_token
   SQUARE_ENVIRONMENT=sandbox  # or production
   ```

## Google Maps Setup (Optional)

1. **Google Cloud Console**: [console.cloud.google.com](https://console.cloud.google.com)

2. **Enable APIs**:
   - Maps JavaScript API
   - Places API
   - Directions API
   - Geocoding API

3. **Create API Key**:
   ```env
   GOOGLE_MAPS_API_KEY=your_api_key
   ```

4. **Restrict API Key** (Recommended):
   - Application restrictions: HTTP referrers
   - API restrictions: Only selected APIs

## Production Checklist

### Security
- [ ] Environment variables properly set
- [ ] Database connection secured (SSL)
- [ ] API rate limiting configured
- [ ] CORS properly configured
- [ ] JWT secrets are secure and unique
- [ ] Supabase RLS policies enabled

### Performance
- [ ] Database indexes created
- [ ] Connection pooling enabled
- [ ] CDN configured for static assets
- [ ] Error monitoring set up (Sentry)
- [ ] Logging configured

### Monitoring
```bash
# Add Sentry for error tracking
npm install @sentry/nextjs

# Configure in next.config.js
const { withSentryConfig } = require('@sentry/nextjs')

module.exports = withSentryConfig({
  // existing config
}, {
  org: 'your-org',
  project: 'lux-ride-backend'
})
```

### Environment Variables for Production

```env
# Production Environment Variables
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_prod_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_prod_service_key

# Database (Production)
DATABASE_URL="postgresql://postgres:[PROD-PASSWORD]@db.[PROD-REF].supabase.co:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[PROD-PASSWORD]@db.[PROD-REF].supabase.co:5432/postgres"

# Stripe (Production)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Square (Production)
SQUARE_APPLICATION_ID=your_prod_square_app_id
SQUARE_ACCESS_TOKEN=your_prod_square_access_token
SQUARE_ENVIRONMENT=production

# Other Services
GOOGLE_MAPS_API_KEY=your_google_maps_key
SENTRY_DSN=your_sentry_dsn
JWT_SECRET=your_secure_jwt_secret
```

## Testing Deployment

### 1. Health Check
```bash
curl https://your-deployed-backend.vercel.app/api/health
```

### 2. Test Authentication
```bash
# Register user
curl -X POST https://your-backend.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST https://your-backend.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

### 3. Test API with Auth
```bash
# Use token from login response
curl -X GET https://your-backend.vercel.app/api/bookings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Scaling Considerations

### Database
- **Connection Limits**: Use connection pooling (PgBouncer)
- **Read Replicas**: For heavy read workloads
- **Caching**: Redis for frequently accessed data

### API Performance
- **Rate Limiting**: Prevent abuse
- **Caching**: Response caching where appropriate
- **Database Optimization**: Proper indexes and queries

### Monitoring & Alerts
```javascript
// Example monitoring setup
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
})

// In your API routes
export default async function handler(req, res) {
  try {
    // API logic
  } catch (error) {
    Sentry.captureException(error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
```

## Rollback Strategy

### Vercel
```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote [deployment-url] --scope [team]
```

### Railway
```bash
# Rollback to previous deployment
railway rollback
```

Your backend is now production-ready! 🚀

## Next Steps After Deployment

1. **Update Frontend**: Point your frontend to the new backend URL
2. **Set up Monitoring**: Configure alerts for errors and performance
3. **Documentation**: Update API documentation with production URLs
4. **Security Audit**: Review all security configurations
5. **Performance Testing**: Load test your APIs
6. **Backup Strategy**: Ensure database backups are configured