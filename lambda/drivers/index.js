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

// Haversine formula for distance calculation
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, { message: 'CORS preflight' });
  }
  
  try {
    const { httpMethod, path, body, queryStringParameters } = event;
    const requestBody = body ? JSON.parse(body) : {};
    const params = queryStringParameters || {};
    
    switch (`${httpMethod}:${path}`) {
      case 'GET:/drivers/available': {
        const { latitude, longitude, radius = 10 } = params;
        
        if (!latitude || !longitude) {
          return createResponse(400, {
            success: false,
            error: 'Latitude and longitude are required'
          });
        }
        
        const { data: drivers, error: fetchError } = await supabase
          .from('drivers')
          .select('*')
          .eq('status', 'available')
          .eq('is_active', true);
        
        if (fetchError) throw fetchError;
        
        // Filter drivers by distance
        const nearbyDrivers = drivers
          .map(driver => {
            const distance = calculateDistance(
              parseFloat(latitude),
              parseFloat(longitude),
              driver.current_latitude,
              driver.current_longitude
            );
            return { ...driver, distance };
          })
          .filter(driver => driver.distance <= parseFloat(radius))
          .sort((a, b) => a.distance - b.distance);
        
        return createResponse(200, {
          success: true,
          data: nearbyDrivers,
          count: nearbyDrivers.length
        });
      }
      
      case 'PUT:/drivers/{id}/location': {
        const driverId = event.pathParameters?.id;
        const { latitude: newLat, longitude: newLon } = requestBody;
        
        if (!driverId || !newLat || !newLon) {
          return createResponse(400, {
            success: false,
            error: 'Driver ID, latitude and longitude are required'
          });
        }
        
        const { data: updatedDriver, error: updateError } = await supabase
          .from('drivers')
          .update({
            current_latitude: newLat,
            current_longitude: newLon,
            last_location_update: new Date().toISOString()
          })
          .eq('id', driverId)
          .select()
          .single();
        
        if (updateError) throw updateError;
        
        return createResponse(200, {
          success: true,
          data: updatedDriver,
          message: 'Driver location updated successfully'
        });
      }
      
      case 'GET:/health':
        return createResponse(200, {
          success: true,
          message: 'Drivers service is healthy'
        });
      
      default:
        return createResponse(404, {
          success: false,
          error: `Route not found: ${httpMethod} ${path}`
        });
    }
  } catch (error) {
    console.error('Drivers error:', error);
    return createResponse(500, {
      success: false,
      error: error.message
    });
  }
};
