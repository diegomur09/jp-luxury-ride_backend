# 🚀 Quick Frontend Setup Examples

## Option 1: Next.js Frontend (Recommended)

### 1. Create New Next.js App
```bash
npx create-next-app@latest lux-ride-frontend
cd lux-ride-frontend
npm install @supabase/supabase-js @supabase/ssr @stripe/stripe-js @stripe/react-stripe-js
```

### 2. Environment Setup
Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-key
NEXT_PUBLIC_API_URL=http://localhost:3001  # Your backend URL
```

### 3. Copy Integration Files
Copy these files to your frontend:
- `lib/supabase-client.ts` (from INTEGRATION.md)
- `hooks/useAuth.ts` 
- `hooks/useAPI.ts`

### 4. Create Simple Pages

**app/login/page.tsx**:
```typescript
import LoginForm from '@/components/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">Login to Lux Ride</h1>
        <LoginForm />
      </div>
    </div>
  )
}
```

**app/dashboard/page.tsx**:
```typescript
'use client'
import { useAuth } from '@/hooks/useAuth'
import { useAPI } from '@/hooks/useAPI'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const { user, profile, signOut } = useAuth()
  const { getBookings } = useAPI()
  const [bookings, setBookings] = useState([])

  useEffect(() => {
    if (user) {
      loadBookings()
    }
  }, [user])

  const loadBookings = async () => {
    try {
      const data = await getBookings()
      setBookings(data.bookings)
    } catch (error) {
      console.error('Failed to load bookings:', error)
    }
  }

  if (!user) {
    return <div>Please log in</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Lux Ride Dashboard</h1>
          <div className="flex items-center gap-4">
            <span>Welcome, {profile?.firstName}</span>
            <button onClick={signOut} className="bg-red-500 text-white px-4 py-2 rounded">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-bold mb-4">Recent Bookings</h2>
            {bookings.length > 0 ? (
              bookings.map((booking: any) => (
                <div key={booking.id} className="border-b py-2">
                  <div className="font-medium">{booking.vehicle?.make} {booking.vehicle?.model}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(booking.scheduledAt).toLocaleDateString()}
                  </div>
                  <div className="text-sm">Status: {booking.status}</div>
                </div>
              ))
            ) : (
              <p>No bookings yet</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600">
                Book New Ride
              </button>
              <button className="w-full bg-gray-500 text-white p-3 rounded hover:bg-gray-600">
                View Payment History
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
```

## Option 2: React SPA

### 1. Create React App
```bash
npx create-react-app lux-ride-frontend --template typescript
cd lux-ride-frontend
npm install @supabase/supabase-js @stripe/stripe-js @stripe/react-stripe-js
```

### 2. Simple Integration
**src/App.tsx**:
```typescript
import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
)

function App() {
  const [user, setUser] = useState(null)
  const [bookings, setBookings] = useState([])

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
  }

  const fetchBookings = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    const response = await fetch('YOUR_BACKEND_URL/api/bookings', {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`
      }
    })
    
    const data = await response.json()
    setBookings(data.bookings)
  }

  if (!user) {
    return (
      <div className="App">
        <h1>Lux Ride</h1>
        <button onClick={() => signIn('test@example.com', 'password')}>
          Login
        </button>
      </div>
    )
  }

  return (
    <div className="App">
      <h1>Welcome to Lux Ride</h1>
      <button onClick={() => supabase.auth.signOut()}>Sign Out</button>
      <button onClick={fetchBookings}>Load Bookings</button>
      
      <div>
        <h2>Your Bookings:</h2>
        {bookings.map((booking: any) => (
          <div key={booking.id}>
            {booking.vehicle?.make} {booking.vehicle?.model} - {booking.status}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
```

## Option 3: Vue.js Integration

### 1. Create Vue App
```bash
npm create vue@latest lux-ride-frontend
cd lux-ride-frontend
npm install @supabase/supabase-js
```

### 2. Supabase Composable
**composables/useSupabase.js**:
```javascript
import { createClient } from '@supabase/supabase-js'
import { ref, computed } from 'vue'

const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY')

const user = ref(null)

export function useSupabase() {
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (!error) user.value = data.user
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    user.value = null
  }

  const isLoggedIn = computed(() => !!user.value)

  return {
    user,
    signIn,
    signOut,
    isLoggedIn,
    supabase
  }
}
```

## 🌐 Simple HTML/JavaScript Integration

Create `index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lux Ride</title>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="https://js.stripe.com/v3/"></script>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .hidden { display: none; }
        .booking { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px; }
        button { background: #007cba; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #005a87; }
        input { padding: 8px; margin: 5px; border: 1px solid #ddd; border-radius: 4px; }
    </style>
</head>
<body>
    <div id="app">
        <h1>🚗 Lux Ride</h1>
        
        <!-- Login Form -->
        <div id="login-form">
            <h2>Login</h2>
            <form onsubmit="handleLogin(event)">
                <input type="email" id="email" placeholder="Email" required><br>
                <input type="password" id="password" placeholder="Password" required><br>
                <button type="submit">Login</button>
            </form>
        </div>

        <!-- Dashboard -->
        <div id="dashboard" class="hidden">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h2>Dashboard</h2>
                <button onclick="logout()">Logout</button>
            </div>
            
            <h3>Your Bookings</h3>
            <div id="bookings-list">Loading...</div>
            
            <button onclick="createSampleBooking()">Create Sample Booking</button>
        </div>
    </div>

    <script>
        // Initialize Supabase
        const supabase = window.supabase.createClient(
            'YOUR_SUPABASE_URL',
            'YOUR_SUPABASE_ANON_KEY'
        )

        const API_URL = 'YOUR_BACKEND_URL'

        // Check for existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                showDashboard()
                loadBookings()
            }
        })

        async function handleLogin(event) {
            event.preventDefault()
            const email = document.getElementById('email').value
            const password = document.getElementById('password').value

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (error) {
                alert('Login failed: ' + error.message)
            } else {
                showDashboard()
                loadBookings()
            }
        }

        async function logout() {
            await supabase.auth.signOut()
            showLogin()
        }

        function showLogin() {
            document.getElementById('login-form').classList.remove('hidden')
            document.getElementById('dashboard').classList.add('hidden')
        }

        function showDashboard() {
            document.getElementById('login-form').classList.add('hidden')
            document.getElementById('dashboard').classList.remove('hidden')
        }

        async function apiCall(endpoint, options = {}) {
            const { data: { session } } = await supabase.auth.getSession()
            
            const response = await fetch(`${API_URL}/api${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                    ...options.headers
                }
            })

            if (!response.ok) {
                throw new Error('API call failed')
            }

            return response.json()
        }

        async function loadBookings() {
            try {
                const data = await apiCall('/bookings')
                const bookingsList = document.getElementById('bookings-list')
                
                if (data.bookings && data.bookings.length > 0) {
                    bookingsList.innerHTML = data.bookings.map(booking => `
                        <div class="booking">
                            <strong>${booking.vehicle?.make} ${booking.vehicle?.model}</strong><br>
                            Status: ${booking.status}<br>
                            Scheduled: ${new Date(booking.scheduledAt).toLocaleDateString()}<br>
                            Total: $${booking.totalAmount}
                        </div>
                    `).join('')
                } else {
                    bookingsList.innerHTML = '<p>No bookings found.</p>'
                }
            } catch (error) {
                document.getElementById('bookings-list').innerHTML = '<p>Failed to load bookings.</p>'
            }
        }

        async function createSampleBooking() {
            try {
                // This would typically be selected from dropdowns
                const booking = await apiCall('/bookings', {
                    method: 'POST',
                    body: JSON.stringify({
                        vehicleId: 'sample-vehicle-id',
                        pickupAddressId: 'sample-pickup-id',
                        dropoffAddressId: 'sample-dropoff-id',
                        scheduledAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                        notes: 'Test booking from web interface'
                    })
                })
                alert('Booking created!')
                loadBookings()
            } catch (error) {
                alert('Failed to create booking: ' + error.message)
            }
        }
    </script>
</body>
</html>
```

## 📱 Mobile App Quick Start

### React Native Expo
```bash
npx create-expo-app LuxRideMobile
cd LuxRideMobile
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
```

**App.js**:
```javascript
import { useState, useEffect } from 'react'
import { View, Text, TextInput, Button, FlatList } from 'react-native'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY', {
  auth: { storage: AsyncStorage }
})

export default function App() {
  const [user, setUser] = useState(null)
  const [bookings, setBookings] = useState([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
  }, [])

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
  }

  const loadBookings = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    try {
      const response = await fetch('YOUR_BACKEND_URL/api/bookings', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      const data = await response.json()
      setBookings(data.bookings || [])
    } catch (error) {
      alert('Failed to load bookings')
    }
  }

  if (!user) {
    return (
      <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
        <Text style={{ fontSize: 24, marginBottom: 20 }}>Lux Ride</Text>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
        />
        <Button title="Sign In" onPress={signIn} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
        <Text style={{ fontSize: 20 }}>Your Bookings</Text>
        <Button title="Logout" onPress={() => supabase.auth.signOut()} />
      </View>
      
      <Button title="Load Bookings" onPress={loadBookings} />
      
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ padding: 15, borderWidth: 1, marginVertical: 5 }}>
            <Text>{item.vehicle?.make} {item.vehicle?.model}</Text>
            <Text>Status: {item.status}</Text>
            <Text>Total: ${item.totalAmount}</Text>
          </View>
        )}
      />
    </View>
  )
}
```

## 🚀 Deployment & Connection

### 1. Deploy Backend
```bash
# Deploy to Vercel
vercel --prod

# Or deploy to Railway
railway up

# Get your backend URL (e.g., https://your-app.vercel.app)
```

### 2. Update Frontend Environment
Replace `YOUR_BACKEND_URL` with your actual backend URL in all examples above.

### 3. Test Connection
```bash
# Test your deployed backend
curl https://your-backend.vercel.app/api/health
```

## 📋 Integration Checklist

- [ ] Backend deployed and accessible
- [ ] Supabase project created and configured
- [ ] Frontend environment variables set
- [ ] Supabase client initialized
- [ ] Auth hooks/services implemented
- [ ] API service layer created
- [ ] Payment integration added (Stripe/Square)
- [ ] Error handling implemented
- [ ] Real-time subscriptions set up

This gives you multiple ways to integrate your backend with any frontend technology!