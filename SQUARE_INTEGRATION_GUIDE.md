# 🟦 Square Payment Integration Guide

## JP Luxury Ride Backend - Square Setup

This guide will help you integrate Square payment processing into your JP Luxury Ride backend alongside the existing Stripe integration.

---

## 📋 **Square Integration Overview**

Your payment Lambda function now supports **dual payment processors**:

- **Stripe** - For credit/debit card processing
- **Square** - For comprehensive payment solutions including in-person payments

### **🔧 Supported Square Features:**

- ✅ **Card Payments** - Process credit/debit cards
- ✅ **Digital Wallet** - Apple Pay, Google Pay, etc.
- ✅ **Buy Now, Pay Later** - Afterpay integration
- ✅ **ACH Bank Transfers** - Direct bank payments
- ✅ **Gift Cards** - Square gift card processing
- ✅ **Refunds** - Full and partial refunds
- ✅ **Recurring Payments** - Subscription billing

---

## 🚀 **Quick Setup Steps**

### **1. Get Square Developer Account**

1. Go to [Square Developer Dashboard](https://developer.squareup.com/)
2. Sign up or log in with your Square account
3. Create a new application for "JP Luxury Ride"
4. Note down your **Application ID**

### **2. Get API Credentials**

#### **For Development (Sandbox):**

```
Application ID: sandbox-sq0idb-XXXXXXXX
Access Token: EAAAl...
Location ID: LXXXXXXXX (from sandbox)
Environment: sandbox
```

#### **For Production:**

```
Application ID: sq0idb-XXXXXXXX
Access Token: EAAAl...
Location ID: LXXXXXXXX (from live account)
Environment: production
```

### **3. Configure GitHub Secrets**

```bash
gh secret set SQUARE_ACCESS_TOKEN --body "EAAAl..."
gh secret set SQUARE_APPLICATION_ID --body "sq0idb-XXXXXXXX"
gh secret set SQUARE_LOCATION_ID --body "LXXXXXXXX"
gh secret set SQUARE_ENVIRONMENT --body "sandbox"  # or "production"
```

---

## 💻 **API Endpoints**

Your payment Lambda now supports these Square endpoints:

### **Process Square Payment**

```bash
POST /square/create-payment
Content-Type: application/json
Authorization: Bearer your-jwt-token

{
  "amount": 25.50,
  "sourceId": "cnon:card-nonce-ok",
  "locationId": "LXXXXXXXX",
  "description": "Luxury ride to airport",
  "bookingId": "booking_123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "payment_123",
    "status": "COMPLETED",
    "amount": 25.5,
    "currency": "USD",
    "processor": "square",
    "receiptUrl": "https://squareup.com/receipt/..."
  }
}
```

### **Refund Square Payment**

```bash
POST /refund
Content-Type: application/json
Authorization: Bearer your-jwt-token

{
  "processor": "square",
  "paymentId": "payment_123",
  "amount": 10.00,
  "reason": "Partial refund - route change"
}
```

### **Check Payment Status**

```bash
GET /payment/payment_123?processor=square
Authorization: Bearer your-jwt-token
```

---

## 🎨 **Frontend Integration Examples**

### **React Square Payment Form**

```jsx
import { PaymentForm, CreditCard } from "react-square-web-payments-sdk";

function SquarePaymentForm({ amount, onPayment }) {
  return (
    <PaymentForm
      applicationId="sq0idp-XXXXXXXX"
      locationId="LXXXXXXXX"
      cardTokenizeResponseReceived={async (token) => {
        const result = await fetch("/api/payments/square/create-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            sourceId: token.token,
            amount: amount,
            description: "JP Luxury Ride Payment",
          }),
        });

        const payment = await result.json();
        onPayment(payment);
      }}
    >
      <CreditCard />
    </PaymentForm>
  );
}
```

### **Next.js Square Integration**

```javascript
// pages/api/square-payment.js
export default async function handler(req, res) {
  if (req.method === "POST") {
    const { amount, sourceId, bookingId } = req.body;

    try {
      const response = await fetch(
        `${process.env.API_GATEWAY_URL}/square/create-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${req.headers.authorization}`,
          },
          body: JSON.stringify({
            amount,
            sourceId,
            bookingId,
            description: "JP Luxury Ride Service",
          }),
        }
      );

      const result = await response.json();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
```

---

## 🔐 **Security Best Practices**

### **1. Environment Configuration**

```bash
# Development
SQUARE_ENVIRONMENT=sandbox
SQUARE_ACCESS_TOKEN=EAAAl-sandbox-token

# Production
SQUARE_ENVIRONMENT=production
SQUARE_ACCESS_TOKEN=EAAAl-production-token
```

### **2. Token Validation**

- Always validate payment tokens on server-side
- Use HTTPS for all payment requests
- Implement rate limiting for payment endpoints
- Log all payment attempts for audit trails

### **3. Error Handling**

```javascript
// Robust error handling example
try {
  const payment = await processSquarePayment(params);
  return { success: true, data: payment };
} catch (error) {
  if (error.code === "PAYMENT_METHOD_NOT_SUPPORTED") {
    return { success: false, error: "Payment method not supported" };
  } else if (error.code === "INSUFFICIENT_FUNDS") {
    return { success: false, error: "Insufficient funds" };
  } else {
    // Log detailed error for debugging
    console.error("Square payment error:", error);
    return { success: false, error: "Payment processing failed" };
  }
}
```

---

## 📊 **Payment Flow Comparison**

| Feature                  | Stripe     | Square     | Notes                    |
| ------------------------ | ---------- | ---------- | ------------------------ |
| **Card Payments**        | ✅         | ✅         | Both support major cards |
| **Digital Wallets**      | ✅         | ✅         | Apple Pay, Google Pay    |
| **ACH/Bank Transfer**    | ✅         | ✅         | Direct bank payments     |
| **In-Person Payments**   | ❌         | ✅         | Square's advantage       |
| **Subscription Billing** | ✅         | ✅         | Both support recurring   |
| **International**        | ✅         | Limited    | Stripe has broader reach |
| **Transaction Fees**     | 2.9% + 30¢ | 2.6% + 10¢ | Square slightly lower    |

---

## 🧪 **Testing**

### **Square Sandbox Testing**

```bash
# Test successful payment
curl -X POST https://your-api-gateway.amazonaws.com/prod/square/create-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "amount": 1.00,
    "sourceId": "cnon:card-nonce-ok",
    "description": "Test payment"
  }'

# Test declined payment
curl -X POST https://your-api-gateway.amazonaws.com/prod/square/create-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "amount": 1.00,
    "sourceId": "cnon:card-nonce-declined",
    "description": "Test declined payment"
  }'
```

### **Test Card Numbers**

```
Successful Payment: 4111 1111 1111 1111
Declined Payment: 4000 0000 0000 0002
Insufficient Funds: 4000 0000 0000 9995
Processing Error: 4000 0000 0000 0119
```

---

## 🚨 **Troubleshooting**

### **Common Issues:**

#### ❌ **"Invalid Access Token"**

- Verify you're using the correct environment token (sandbox vs production)
- Check that the access token hasn't expired
- Ensure token has proper scopes: `PAYMENTS_WRITE`, `PAYMENTS_READ`

#### ❌ **"Location Not Found"**

- Confirm the Location ID exists in your Square account
- Verify you're using the correct location for the environment
- Check that the location is active and can accept payments

#### ❌ **"Payment Source Invalid"**

- Ensure the payment source token is fresh (expires quickly)
- Verify the source type is supported (card, bank, etc.)
- Check that the payment form is properly configured

### **Debug Mode:**

```javascript
// Enable detailed logging in Lambda
console.log("Square payment request:", {
  amount,
  sourceId,
  locationId,
  environment: process.env.SQUARE_ENVIRONMENT,
});
```

---

## 📈 **Monitoring & Analytics**

### **Payment Tracking**

Your Lambda function automatically logs all transactions to Supabase:

```sql
-- Check payment transactions
SELECT
  transaction_id,
  processor,
  amount,
  status,
  created_at
FROM payment_transactions
WHERE processor IN ('stripe', 'square')
ORDER BY created_at DESC;
```

### **Square Dashboard**

Monitor payments in real-time:

- Go to [Square Dashboard](https://squareup.com/dashboard)
- View **Transactions** → **Payments**
- Set up webhook notifications for payment events

---

## 🔄 **Migration Strategy**

### **Gradual Rollout**

1. **Phase 1**: Deploy with Square support (current)
2. **Phase 2**: A/B test payment processors
3. **Phase 3**: Allow users to choose preferred processor
4. **Phase 4**: Optimize based on success rates

### **Feature Flags**

```javascript
// Environment-based processor selection
const getPreferredProcessor = (userPreference, region) => {
  if (region === "US" && userPreference === "square") {
    return "square";
  }
  return "stripe"; // Default fallback
};
```

---

## ✅ **Next Steps**

1. **🔑 Add your Square credentials** to GitHub Secrets
2. **🚀 Deploy the updated Lambda functions** (push to main branch)
3. **🧪 Test payments** in sandbox environment
4. **🎨 Integrate Square payment forms** in your frontend
5. **📊 Monitor transactions** in Square Dashboard
6. **🚀 Go live** with production credentials

---

**🎉 Congratulations!** Your JP Luxury Ride backend now supports dual payment processing with both Stripe and Square, giving you maximum flexibility and payment success rates!
