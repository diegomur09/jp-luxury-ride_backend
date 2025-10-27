const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

const createResponse = (statusCode, body) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, { message: 'CORS preflight' });
  }
  
  try {
    const { httpMethod, path, body } = event;
    const requestBody = body ? JSON.parse(body) : {};
    
    // Auth verification
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return createResponse(401, { success: false, error: 'Authorization required' });
    }
    
    const { data: user, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return createResponse(401, { success: false, error: 'Invalid token' });
    }
    
    switch (`${httpMethod}:${path}`) {
      case 'POST:/bookings': {
        const { pickup_location, dropoff_location, scheduled_time, vehicle_type } = requestBody;
        
        const { data: booking, error: createError } = await supabase
          .from('bookings')
          .insert({
            user_id: user.user.id,
            pickup_location,
            dropoff_location,
            scheduled_time,
            vehicle_type: vehicle_type || 'standard',
            status: 'pending'
          })
          .select()
          .single();
        
        if (createError) throw createError;
        
        return createResponse(201, {
          success: true,
          data: booking,
          message: 'Booking created successfully'
        });
      }
      
      case 'GET:/bookings': {
        const { data: bookings, error: fetchError } = await supabase
          .from('bookings')
          .select('*')
          .eq('user_id', user.user.id)
          .order('created_at', { ascending: false });
        
        if (fetchError) throw fetchError;
        
        return createResponse(200, {
          success: true,
          data: bookings
        });
      }
      
      case 'GET:/health':
        return createResponse(200, {
          success: true,
          message: 'Bookings service is healthy'
        });
      
      default:
        return createResponse(404, {
          success: false,
          error: `Route not found: ${httpMethod} ${path}`
        });
    }
  } catch (error) {
    console.error('Bookings error:', error);
    return createResponse(500, {
      success: false,
      error: error.message
    });
  }
};
