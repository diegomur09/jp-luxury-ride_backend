# 🔧 Step-by-Step Frontend Integration Guide

## Prerequisites Check

Before starting, make sure you have:

- Your existing frontend project folder
- Backend deployed and running (this project)
- Supabase project created
- Payment provider accounts (Stripe/Square)

---

## 📋 Step 1: Identify Your Frontend Type

First, tell me what type of frontend you have by checking your `package.json`:

### Check Frontend Framework:

```bash
cd your-frontend-folder
cat package.json | grep -E '"react"|"next"|"vue"|"angular"|"svelte"'
```

**Common Frameworks:**

- **Next.js**: Look for `"next"` in dependencies
- **React**: Look for `"react"` and `"react-scripts"`
- **Vue**: Look for `"vue"` and `"@vue/cli"`
- **Angular**: Look for `"@angular/core"`
- **Vanilla JS**: No major framework dependencies

---

## 📦 Step 2: Install Required Dependencies

### For Next.js/React Projects:

```powershell
cd your-frontend-folder
npm install @supabase/supabase-js @stripe/stripe-js @stripe/react-stripe-js axios
```

### For Vue Projects:

```powershell
cd your-frontend-folder
npm install @supabase/supabase-js @stripe/stripe-js axios
```

### For React Native:

```powershell
cd your-frontend-folder
npm install @supabase/supabase-js @react-native-async-storage/async-storage axios
```

---

## 🔐 Step 3: Environment Configuration

Create or update your frontend `.env` file:

### For Next.js (`.env.local`):

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3001
# Or your deployed backend: https://your-backend.vercel.app

# Supabase (same as backend)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Stripe (public key only)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Square (if using Square payments)
NEXT_PUBLIC_SQUARE_APPLICATION_ID=your_square_application_id
NEXT_PUBLIC_SQUARE_ENVIRONMENT=sandbox
```

### For React/Vue (`.env`):

```env
# Backend API
REACT_APP_API_URL=http://localhost:3001
# Or: VUE_APP_API_URL for Vue

# Supabase
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key

# Stripe
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

---

## 🛠 Step 4: Create Integration Files

### A. Supabase Client (`lib/supabase.js` or `lib/supabase.ts`)

**For Next.js/React:**

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!; // or REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // or REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**For Vue:**

```javascript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VUE_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.VUE_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### B. API Service (`lib/api.js` or `lib/api.ts`)

```typescript
import { supabase } from "./supabase";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.REACT_APP_API_URL ||
  process.env.VUE_APP_API_URL;

class ApiService {
  private async getAuthHeaders() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      Authorization: session?.access_token
        ? `Bearer ${session.access_token}`
        : "",
    };
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers = await this.getAuthHeaders();

    const config: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    };

    const response = await fetch(`${API_URL}/api${endpoint}`, config);

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Network error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Authentication
  async register(userData: any) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  async logout() {
    return supabase.auth.signOut();
  }

  // Bookings
  async getBookings(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : "";
    return this.request(`/bookings${query}`);
  }

  async createBooking(bookingData: any) {
    return this.request("/bookings", {
      method: "POST",
      body: JSON.stringify(bookingData),
    });
  }

  async getBooking(id: string) {
    return this.request(`/bookings/${id}`);
  }

  async updateBooking(id: string, updates: any) {
    return this.request(`/bookings/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  // Payments
  async createPayment(paymentData: any) {
    return this.request("/payments", {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
  }

  async confirmPayment(paymentId: string, confirmData: any) {
    return this.request(`/payments/${paymentId}`, {
      method: "PUT",
      body: JSON.stringify(confirmData),
    });
  }

  async getPayments() {
    return this.request("/payments");
  }

  // Vehicles (if you need to list them)
  async getVehicles() {
    return this.request("/vehicles");
  }
}

export const apiService = new ApiService();
```

### C. Auth Hook/Composable

**For React/Next.js (`hooks/useAuth.js`):**

```typescript
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { apiService } from "../lib/api";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile();
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchUserProfile();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async () => {
    try {
      // You might need to implement a /api/user/profile endpoint
      const response = await apiService.request("/user/profile");
      setUser(response.user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // If profile fetch fails, we still have the Supabase user
      const {
        data: { user: supabaseUser },
      } = await supabase.auth.getUser();
      if (supabaseUser) {
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || "",
          firstName: supabaseUser.user_metadata?.first_name || "",
          lastName: supabaseUser.user_metadata?.last_name || "",
          role: supabaseUser.user_metadata?.role || "CUSTOMER",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const result = await apiService.login(email, password);
    return result;
  };

  const register = async (userData: any) => {
    return apiService.register(userData);
  };

  const logout = async () => {
    await apiService.logout();
    setUser(null);
  };

  return {
    user,
    loading,
    login,
    register,
    logout,
  };
}
```

**For Vue (`composables/useAuth.js`):**

```javascript
import { ref, onMounted } from "vue";
import { supabase } from "../lib/supabase";
import { apiService } from "../lib/api";

export function useAuth() {
  const user = ref(null);
  const loading = ref(true);

  onMounted(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchUserProfile();
    } else {
      loading.value = false;
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchUserProfile();
      } else {
        user.value = null;
        loading.value = false;
      }
    });
  });

  const fetchUserProfile = async () => {
    try {
      const response = await apiService.request("/user/profile");
      user.value = response.user;
    } catch (error) {
      const {
        data: { user: supabaseUser },
      } = await supabase.auth.getUser();
      if (supabaseUser) {
        user.value = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          firstName: supabaseUser.user_metadata?.first_name || "",
          lastName: supabaseUser.user_metadata?.last_name || "",
          role: supabaseUser.user_metadata?.role || "CUSTOMER",
        };
      }
    } finally {
      loading.value = false;
    }
  };

  const login = (email, password) => apiService.login(email, password);
  const register = (userData) => apiService.register(userData);
  const logout = async () => {
    await apiService.logout();
    user.value = null;
  };

  return {
    user,
    loading,
    login,
    register,
    logout,
  };
}
```

---

## 🔄 Step 5: Update Your Existing Components

### A. Login Component Example

**React/Next.js:**

```typescript
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useRouter } from 'next/router' // Next.js only

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { login } = useAuth()
  const router = useRouter() // Next.js only

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await login(email, password)
      router.push('/dashboard') // Next.js - or use your routing method
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}

      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}
```

### B. Booking Creation Example

```typescript
import { useState, useEffect } from 'react'
import { apiService } from '../lib/api'

export default function BookingForm() {
  const [vehicles, setVehicles] = useState([])
  const [formData, setFormData] = useState({
    vehicleId: '',
    pickupAddressId: '',
    dropoffAddressId: '',
    scheduledAt: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadVehicles()
  }, [])

  const loadVehicles = async () => {
    try {
      const data = await apiService.getVehicles()
      setVehicles(data.vehicles || [])
    } catch (error) {
      console.error('Failed to load vehicles:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const booking = await apiService.createBooking(formData)
      alert('Booking created successfully!')
      // Redirect to booking details or reset form
      console.log('Created booking:', booking)
    } catch (error: any) {
      alert(`Booking failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Vehicle:</label>
        <select
          value={formData.vehicleId}
          onChange={(e) => setFormData({...formData, vehicleId: e.target.value})}
          required
        >
          <option value="">Select a vehicle</option>
          {vehicles.map((vehicle: any) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.make} {vehicle.model} - ${vehicle.pricePerHour}/hr
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Pickup Date & Time:</label>
        <input
          type="datetime-local"
          value={formData.scheduledAt}
          onChange={(e) => setFormData({...formData, scheduledAt: e.target.value})}
          required
        />
      </div>

      <div>
        <label>Notes:</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Book Ride'}
      </button>
    </form>
  )
}
```

---

## 💳 Step 6: Payment Integration

### Stripe Payment Component:

```typescript
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useState } from 'react'
import { apiService } from '../lib/api'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function PaymentForm({ bookingId, amount, onSuccess }: any) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError('')

    try {
      // Create payment intent on your backend
      const { payment, clientSecret } = await apiService.createPayment({
        bookingId,
        provider: 'stripe'
      })

      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        }
      })

      if (stripeError) {
        setError(stripeError.message || 'Payment failed')
      } else if (paymentIntent.status === 'succeeded') {
        // Confirm on backend
        await apiService.confirmPayment(payment.id, {
          paymentMethodId: paymentIntent.payment_method
        })

        onSuccess?.(paymentIntent)
        alert('Payment successful!')
      }
    } catch (err: any) {
      setError(err.message || 'Payment error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div style={{color: 'red'}}>{error}</div>}

      <div style={{padding: '16px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '16px'}}>
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': { color: '#aab7c4' },
            },
          },
        }} />
      </div>

      <div>Total: ${amount.toFixed(2)}</div>

      <button type="submit" disabled={!stripe || loading}>
        {loading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
      </button>
    </form>
  )
}

export default function PaymentWrapper({ bookingId, amount, onSuccess }: any) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm bookingId={bookingId} amount={amount} onSuccess={onSuccess} />
    </Elements>
  )
}
```

---

## 🔧 Step 7: Update Your Routing

### For Next.js - Add Auth Protection:

```typescript
// middleware.ts (if using App Router)
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes
  if (req.nextUrl.pathname.startsWith("/dashboard") && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}
```

### For React Router:

```typescript
import { Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return <div>Loading...</div>

  return user ? <>{children}</> : <Navigate to="/login" />
}

// In your App.js
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
```

---

## 🚀 Step 8: Test Integration

### 1. Start Both Servers:

```powershell
# Terminal 1 - Backend (this project)
cd lux-ride_backend
npm run dev

# Terminal 2 - Frontend
cd your-frontend-folder
npm run dev  # or npm start
```

### 2. Test Authentication:

1. Go to your frontend login page
2. Register a new user
3. Login with those credentials
4. Check if you can access protected pages

### 3. Test API Calls:

```javascript
// In browser console
console.log("Testing API...");

// Test getting bookings (should work after login)
fetch("/api/bookings", {
  headers: {
    Authorization: "Bearer " + localStorage.getItem("supabase.auth.token"),
  },
})
  .then((r) => r.json())
  .then(console.log);
```

---

## 🐛 Troubleshooting

### Common Issues:

1. **CORS Errors:**
   - Make sure your backend is running on a different port than frontend
   - Check backend CORS configuration

2. **Authentication Issues:**
   - Verify Supabase URL and keys match between frontend and backend
   - Check that tokens are being passed correctly

3. **API Connection:**
   - Verify `NEXT_PUBLIC_API_URL` points to running backend
   - Check network tab in browser dev tools

4. **Environment Variables:**
   - Make sure they start with `NEXT_PUBLIC_`, `REACT_APP_`, or `VUE_APP_`
   - Restart dev server after adding new env vars

### Debug Steps:

```javascript
// Add this to check auth status
console.log("Auth debug:", {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  hasToken: !!localStorage.getItem("sb-refresh-token"),
});
```

---

## ✅ Verification Checklist

- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Supabase client setup
- [ ] API service created
- [ ] Auth hook/composable implemented
- [ ] Login/Register components updated
- [ ] Protected routes working
- [ ] Can create bookings
- [ ] Payment integration working
- [ ] Both frontend and backend running
- [ ] API calls successful

---

Your frontend should now be fully integrated with the backend! 🎉

Let me know which frontend framework you're using and I can provide more specific instructions for your setup.
