# JP Luxury Ride - Backend API

A comprehensive luxury ride-sharing backend built with Next.js, Supabase, and dual payment processing (Stripe + Square).

## 🚀 Features

- **Multi-Provider Authentication**: Supabase Auth with JWT tokens and role-based access
- **Dual Payment Processing**: Both Stripe and Square payment integration
- **Real-time Capabilities**: Supabase Realtime for live tracking and updates
- **Comprehensive Booking System**: Full ride management with stops, scheduling, and pricing
- **Role-Based Access Control**: Customer, Driver, and Admin roles with appropriate permissions
- **Database Management**: Prisma ORM with PostgreSQL via Supabase

## 📋 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Authentication**: Supabase Auth
- **Payments**: Stripe + Square
- **Real-time**: Supabase Realtime
- **Validation**: Zod
- **TypeScript**: Full type safety

## 🛠 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Fill in your environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Database
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres?schema=public&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres?schema=public"

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Square
SQUARE_APPLICATION_ID=your_square_application_id
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_ENVIRONMENT=sandbox
```

### 3. Database Setup

Generate Prisma client and run migrations:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 4. Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000/api`

## 📚 API Reference

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login user |
| `/api/auth/login` | DELETE | Logout user |

### Bookings

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bookings` | GET | Get user bookings |
| `/api/bookings` | POST | Create new booking |
| `/api/bookings/[id]` | GET | Get booking details |
| `/api/bookings/[id]` | PUT | Update booking |
| `/api/bookings/[id]` | DELETE | Cancel booking |

### Payments

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payments` | GET | Get payment history |
| `/api/payments` | POST | Create payment intent |
| `/api/payments/[id]` | GET | Get payment details |
| `/api/payments/[id]` | PUT | Confirm payment |
| `/api/payments/[id]` | DELETE | Refund payment |

### Example API Calls

#### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "customer@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CUSTOMER"
  }'
```

#### Create Booking
```bash
curl -X POST http://localhost:3000/api/bookings \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{
    "vehicleId": "uuid-here",
    "pickupAddressId": "uuid-here",
    "dropoffAddressId": "uuid-here",
    "scheduledAt": "2025-10-27T10:00:00Z"
  }'
```

#### Create Payment (Stripe)
```bash
curl -X POST http://localhost:3000/api/payments \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{
    "bookingId": "uuid-here",
    "provider": "stripe",
    "paymentMethodId": "pm_card_visa"
  }'
```

#### Create Payment (Square)
```bash
curl -X POST http://localhost:3000/api/payments \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{
    "bookingId": "uuid-here",
    "provider": "square",
    "sourceId": "cnon:card-nonce-ok"
  }'
```

## 🔧 Database Schema

### Key Models

- **User**: Customer/Driver/Admin profiles with Supabase Auth integration
- **Booking**: Ride requests with pickup/dropoff, scheduling, and pricing
- **Vehicle**: Fleet management with types, pricing, and features
- **Driver**: Driver profiles with status, ratings, and location tracking
- **Payment**: Multi-provider payment processing with full transaction history
- **Address**: Location management with geocoding support

### Relationships

- Users can have multiple Bookings and Payments
- Drivers belong to Users and can have assigned Vehicles
- Bookings connect Customers, Drivers, Vehicles, and Addresses
- Payments are linked to specific Bookings

## 🔐 Security Features

- **JWT Authentication**: Secure token-based auth via Supabase
- **Role-Based Access Control**: Customer, Driver, Admin permissions
- **Route Protection**: Middleware validates all protected endpoints
- **Input Validation**: Zod schemas for all API inputs
- **Ownership Checks**: Users can only access their own resources

## 💳 Payment Integration

### Supported Providers

1. **Stripe**: Recommended for online payments
   - Credit/Debit cards
   - Apple Pay, Google Pay
   - Payment intents with 3D Secure
   - Fee: 2.9% + $0.30

2. **Square**: Optimized for in-person payments
   - Card payments
   - Contactless payments
   - Lower processing fees
   - Fee: 2.6% + $0.10

### Payment Flow

1. Create booking
2. Generate payment intent with chosen provider
3. Frontend collects payment method
4. Confirm payment with provider
5. Update booking status automatically

## 🔄 Real-time Features (Coming Soon)

- Live driver location tracking
- Booking status updates
- Push notifications
- Real-time chat between customer and driver

## 📱 Frontend Integration

This backend is designed to work with any frontend framework. Key integration points:

1. **Authentication**: Use Supabase client for auth state management
2. **API Calls**: Standard REST API with JSON responses
3. **Real-time**: Subscribe to Supabase Realtime channels
4. **Payments**: Integrate Stripe/Square SDKs on frontend

## 🚀 Deployment

### Vercel Deployment

1. Connect your GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Database Migration

For production:

```bash
npm run db:migrate
npm run db:seed
```

## 🔍 Testing

Run tests (when implemented):

```bash
npm test
npm run test:coverage
```

## 📊 Monitoring

- **Error Tracking**: Sentry integration (to be configured)
- **Performance**: Built-in Next.js analytics
- **Database**: Prisma query logging
- **Payments**: Provider-specific dashboards

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

## 🆘 Support

For setup issues or questions:

1. Check the API documentation above
2. Review the Supabase and Prisma documentation
3. Check provider documentation (Stripe/Square)
4. Open an issue in the repository

## 🎯 Next Steps

1. Implement driver endpoints and real-time tracking
2. Add admin dashboard APIs
3. Set up comprehensive testing
4. Add monitoring and analytics
5. Deploy to production

The backend is production-ready for core functionality (auth, bookings, payments) and can be extended with additional features as needed.