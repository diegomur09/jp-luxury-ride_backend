const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

// Standard response helper
const createResponse = (statusCode, body) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body)
});

// Error handler
const handleError = (error, context = 'Authentication') => {
  console.error(`${context} error:`, error);
  return createResponse(500, {
    success: false,
    error: error.message || 'Internal server error',
    context
  });
};

// Main Lambda handler
exports.handler = async (event) => {
  console.log('Auth Lambda invoked:', JSON.stringify(event, null, 2));
  
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, { message: 'CORS preflight' });
  }
  
  try {
    const { httpMethod, path, body } = event;
    const requestBody = body ? JSON.parse(body) : {};
    
    // Route handling
    switch (`${httpMethod}:${path}`) {
      
      // User registration
      case 'POST:/register':
        const { email, password, firstName, lastName, phone } = requestBody;
        
        if (!email || !password || !firstName || !lastName) {
          return createResponse(400, {
            success: false,
            error: 'Email, password, first name, and last name are required'
          });
        }
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              phone: phone || null
            }
          }
        });
        
        if (signUpError) {
          return createResponse(400, {
            success: false,
            error: signUpError.message
          });
        }
        
        return createResponse(201, {
          success: true,
          data: {
            user: signUpData.user,
            session: signUpData.session
          },
          message: 'User registered successfully'
        });
      
      // User login
      case 'POST:/login':
        const { email: loginEmail, password: loginPassword } = requestBody;
        
        if (!loginEmail || !loginPassword) {
          return createResponse(400, {
            success: false,
            error: 'Email and password are required'
          });
        }
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword
        });
        
        if (signInError) {
          return createResponse(401, {
            success: false,
            error: signInError.message
          });
        }
        
        return createResponse(200, {
          success: true,
          data: {
            user: signInData.user,
            session: signInData.session,
            accessToken: signInData.session.access_token
          },
          message: 'Login successful'
        });
      
      // Token refresh
      case 'POST:/refresh':
        const { refreshToken } = requestBody;
        
        if (!refreshToken) {
          return createResponse(400, {
            success: false,
            error: 'Refresh token is required'
          });
        }
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
          refresh_token: refreshToken
        });
        
        if (refreshError) {
          return createResponse(401, {
            success: false,
            error: refreshError.message
          });
        }
        
        return createResponse(200, {
          success: true,
          data: {
            session: refreshData.session,
            user: refreshData.user
          },
          message: 'Token refreshed successfully'
        });
      
      // User logout
      case 'POST:/logout':
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        const token = authHeader?.replace('Bearer ', '');
        
        if (!token) {
          return createResponse(400, {
            success: false,
            error: 'Authorization token is required'
          });
        }
        
        const { error: signOutError } = await supabase.auth.signOut(token);
        
        if (signOutError) {
          return createResponse(400, {
            success: false,
            error: signOutError.message
          });
        }
        
        return createResponse(200, {
          success: true,
          message: 'Logout successful'
        });
      
      // Get user profile
      case 'GET:/profile':
        const profileAuthHeader = event.headers?.Authorization || event.headers?.authorization;
        const profileToken = profileAuthHeader?.replace('Bearer ', '');
        
        if (!profileToken) {
          return createResponse(401, {
            success: false,
            error: 'Authorization token is required'
          });
        }
        
        const { data: userData, error: userError } = await supabase.auth.getUser(profileToken);
        
        if (userError || !userData.user) {
          return createResponse(401, {
            success: false,
            error: 'Invalid or expired token'
          });
        }
        
        return createResponse(200, {
          success: true,
          data: {
            user: userData.user
          },
          message: 'Profile retrieved successfully'
        });
      
      // Health check
      case 'GET:/health':
        return createResponse(200, {
          success: true,
          message: 'Auth service is healthy',
          timestamp: new Date().toISOString()
        });
      
      default:
        return createResponse(404, {
          success: false,
          error: `Route not found: ${httpMethod} ${path}`
        });
    }
    
  } catch (error) {
    return handleError(error, 'Auth Lambda');
  }
};