<!-- Trigger workflow: trivial change -->

# Frontend Integration Guide

## 🔗 Backend Integration Options

This backend can be integrated with any frontend framework. Here are detailed guides for the most common setups:

## 1. 📱 React/Next.js Frontend Integration

### Setup Supabase Client (Frontend) (optional)

> Note: Supabase is optional. The backend uses Prisma/Postgres for core data and Lambda functions may use DynamoDB for audit logging. If you don't use Supabase for frontend auth, you can skip this section. If you do, follow the steps below.

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Create `lib/supabase-client.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Authentication Integration

Create `hooks/useAuth.ts`:

```typescript
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { User } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "CUSTOMER" | "DRIVER" | "ADMIN";
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const response = await fetch("/api/user/profile", {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, firstName, lastName }),
    });
    return await response.json();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };
}
```

### API Integration Hook

Create `hooks/useAPI.ts`:

```typescript
import { supabase } from "@/lib/supabase-client";

export function useAPI() {
  const getAuthHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    };
  };

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const headers = await getAuthHeaders();

    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "API call failed");
    }

    return await response.json();
  };

  // Booking methods
  const createBooking = async (bookingData: any) => {
    return apiCall("/bookings", {
      method: "POST",
      body: JSON.stringify(bookingData),
    });
  };

  const getBookings = async (params?: any) => {
    const queryString = params ? `?${new URLSearchParams(params)}` : "";
    return apiCall(`/bookings${queryString}`);
  };

  const updateBooking = async (id: string, updates: any) => {
    return apiCall(`/bookings/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  };

  // Payment methods
  const createPayment = async (paymentData: any) => {
    return apiCall("/payments", {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
  };

  const confirmPayment = async (paymentId: string, confirmData: any) => {
    return apiCall(`/payments/${paymentId}`, {
      method: "PUT",
      body: JSON.stringify(confirmData),
    });
  };

  const getPayments = async () => {
    return apiCall("/payments");
  };

  return {
    createBooking,
    getBookings,
    updateBooking,
    createPayment,
    confirmPayment,
    getPayments,
  };
}
```

### Example Login Component

```typescript
'use client'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await signIn(email, password)
      if (error) {
        alert(error.message)
      } else {
        // Redirect to dashboard
        window.location.href = '/dashboard'
      }
    } catch (error) {
      alert('Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </button>
    </form>
  )
}
```

### Example Booking Component

```typescript
'use client'
import { useState } from 'react'
import { useAPI } from '@/hooks/useAPI'

export default function BookingForm() {
  const [formData, setFormData] = useState({
    vehicleId: '',
    pickupAddressId: '',
    dropoffAddressId: '',
    scheduledAt: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const { createBooking } = useAPI()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const booking = await createBooking(formData)
      alert('Booking created successfully!')
      // Redirect to booking details or payment
      window.location.href = `/bookings/${booking.booking.id}`
    } catch (error) {
      alert(`Booking failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Vehicle</label>
        <select
          value={formData.vehicleId}
          onChange={(e) => setFormData({...formData, vehicleId: e.target.value})}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select a vehicle</option>
          {/* Load vehicles from API */}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">Pickup Date & Time</label>
        <input
          type="datetime-local"
          value={formData.scheduledAt}
          onChange={(e) => setFormData({...formData, scheduledAt: e.target.value})}
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Special Requests</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          className="w-full p-2 border rounded"
          rows={3}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 disabled:opacity-50"
      >
        {loading ? 'Creating Booking...' : 'Book Ride'}
      </button>
    </form>
  )
}
```

## 2. 💳 Payment Integration (Stripe)

### Install Stripe SDK

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### Stripe Payment Component

```typescript
'use client'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useState } from 'react'
import { useAPI } from '@/hooks/useAPI'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function PaymentForm({ bookingId, amount }: { bookingId: string, amount: number }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const { createPayment, confirmPayment } = useAPI()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)

    try {
      // Create payment intent
      const { payment, clientSecret } = await createPayment({
        bookingId,
        provider: 'stripe'
      })

      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        }
      })

      if (error) {
        alert(`Payment failed: ${error.message}`)
      } else if (paymentIntent.status === 'succeeded') {
        // Confirm payment on backend
        await confirmPayment(payment.id, {
          paymentMethodId: paymentIntent.payment_method
        })
        alert('Payment successful!')
        // Redirect to success page
      }
    } catch (error) {
      alert(`Payment error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': { color: '#aab7c4' },
              },
            },
          }}
        />
      </div>

      <div className="text-lg font-semibold">
        Total: ${amount.toFixed(2)}
      </div>

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
      </button>
    </form>
  )
}

export default function PaymentPage({ bookingId, amount }: { bookingId: string, amount: number }) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm bookingId={bookingId} amount={amount} />
    </Elements>
  )
}
```

## 3. 📱 Mobile App Integration (React Native)

### Install Dependencies

```bash
npm install @supabase/supabase-js
npm install @stripe/stripe-react-native
```

### Supabase Setup (React Native)

```typescript
// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### API Service (React Native)

```typescript
// services/api.ts
import { supabase } from "../lib/supabase";

class APIService {
  private async getAuthHeaders() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    };
  }

  async createBooking(bookingData: any) {
    const headers = await this.getAuthHeaders();

    const response = await fetch("YOUR_API_URL/api/bookings", {
      method: "POST",
      headers,
      body: JSON.stringify(bookingData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    return response.json();
  }

  async getBookings() {
    const headers = await this.getAuthHeaders();

    const response = await fetch("YOUR_API_URL/api/bookings", {
      headers,
    });

    return response.json();
  }
}

export const apiService = new APIService();
```

## 4. 🌐 Vanilla JavaScript Integration

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Lux Ride</title>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="https://js.stripe.com/v3/"></script>
  </head>
  <body>
    <script>
      // Initialize Supabase
      const supabase = window.supabase.createClient(
        "YOUR_SUPABASE_URL",
        "YOUR_SUPABASE_ANON_KEY"
      );

      // Initialize Stripe
      const stripe = Stripe("YOUR_STRIPE_PUBLISHABLE_KEY");

      // Auth functions
      async function login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("Login error:", error);
          return;
        }

        console.log("Logged in:", data.user);
      }

      // API functions
      async function createBooking(bookingData) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const response = await fetch("/api/bookings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(bookingData),
        });

        return response.json();
      }

      // Payment function
      async function processPayment(bookingId, amount) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // Create payment intent
        const response = await fetch("/api/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            bookingId,
            provider: "stripe",
          }),
        });

        const { clientSecret } = await response.json();

        // Process payment with Stripe
        const { error } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: {
              // Card element
            },
          },
        });

        if (!error) {
          console.log("Payment successful!");
        }
      }
    </script>
  </body>
</html>
```

## 5. 🔄 Real-time Integration

### Supabase Realtime Setup

```typescript
// Real-time booking updates
useEffect(() => {
  const channel = supabase
    .channel("bookings")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bookings",
        filter: `customerId=eq.${user?.id}`,
      },
      (payload) => {
        console.log("Booking update:", payload);
        // Update local state
        setBookings((prev) => {
          // Update booking in list
          return prev.map((booking) =>
            booking.id === payload.new.id ? payload.new : booking
          );
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user?.id]);
```

## 6. 📊 Environment Configuration

### Frontend `.env.local`

```env
# Supabase env vars removed from default; set these only if you use Supabase for frontend auth
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-key
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 🚀 Quick Start Integration

1. **Copy the backend URL** from your deployment
2. **Set up Supabase client** on frontend with same credentials
3. **Use the API hooks** provided above
4. **Handle authentication state** with useAuth hook
5. **Implement payment flows** with Stripe/Square components

The backend provides standard REST APIs, so any frontend framework can integrate using fetch/axios with proper authentication headers.

## 🔧 Testing Integration

```bash
# Test API endpoints
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'

# Test with auth token
curl -X GET http://localhost:3000/api/bookings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

This integration guide provides everything needed to connect any frontend to your luxury ride backend!

## 🛠️ Troubleshooting: CORS Errors

If you see errors like:

```
Access to fetch at 'http://localhost:3001/api/auth/login' from origin 'http://localhost:3000' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Solution:**  
Make sure your backend server at `localhost:3001` sends the correct CORS headers.  
For Express.js, add this middleware:

```javascript
const cors = require("cors");
app.use(
  cors({
    origin: "http://localhost:3000", // or '*' for development
    credentials: true,
  })
);
```

If using another framework, ensure it allows requests from your frontend's origin and responds with `Access-Control-Allow-Origin` and other required headers.

**Note:**  
CORS errors are browser security features. They must be fixed on the backend API server, not the frontend.

## DynamoDB Audit Logging (Backend)

You can enable optional audit logging of payment events in the Payments Lambda by setting the `DYNAMO_PAYMENTS_TABLE` environment variable to a DynamoDB table name. When set, the Lambda writes a PutItem per event on a best‑effort basis and never fails the request if logging encounters an error.

Required IAM permission for the Lambda execution role:

- dynamodb:PutItem on the target table ARN

Item key pattern:

- pk: `BOOKING#{id}`, `PAYMENT#{id}`, or `INTENT#{id}`
- sk: `STRIPE_INTENT#{id}`, `CONFIRM#{timestamp}`, `SQUARE_PAYMENT#{id}`, `REFUND#{timestamp}`
