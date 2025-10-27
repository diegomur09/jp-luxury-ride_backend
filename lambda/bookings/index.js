const {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
} = require("@aws-sdk/client-dynamodb");
const { v4: uuidv4 } = require("uuid");
const jwt = require('jsonwebtoken');

const dynamo = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-2",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Content-Type": "application/json",
};

const createResponse = (statusCode, body) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, { message: "CORS preflight" });
  }

  try {
    const { httpMethod, path, body } = event;
    const requestBody = body ? JSON.parse(body) : {};
    const tableName = process.env.DYNAMO_BOOKINGS_TABLE || "Bookings";

    // Auth verification
    const authHeader =
      event.headers?.Authorization || event.headers?.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return createResponse(401, {
        success: false,
        error: "Authorization required",
      });
    }

    // Verify JWT and extract user id
    let user_id;
    try {
      const claims = jwt.verify(token, process.env.JWT_SECRET);
      user_id = claims.uid || claims.sub || claims.email;
    } catch (e) {
      return createResponse(401, { success: false, error: "Invalid token" });
    }

    switch (`${httpMethod}:${path}`) {
      case "POST:/bookings": {
        const {
          pickup_location,
          dropoff_location,
          scheduled_time,
          vehicle_type,
        } = requestBody;

        const bookingId = uuidv4();
        const created_at = new Date().toISOString();
        const item = {
          user_id: { S: user_id },
          created_at: { S: created_at },
          bookingId: { S: bookingId },
          pickup_location: { S: pickup_location },
          dropoff_location: { S: dropoff_location },
          scheduled_time: { S: scheduled_time },
          vehicle_type: { S: vehicle_type || "standard" },
          status: { S: "pending" },
        };

        await dynamo.send(new PutItemCommand({ TableName: tableName, Item: item }));

        return createResponse(201, {
          success: true,
          data: {
            bookingId,
            user_id,
            pickup_location,
            dropoff_location,
            scheduled_time,
            vehicle_type: vehicle_type || "standard",
            status: "pending",
            created_at,
          },
          message: "Booking created successfully",
        });
      }

      case "GET:/bookings": {
        const result = await dynamo.send(new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "user_id = :uid",
          ExpressionAttributeValues: { ":uid": { S: user_id } },
          ScanIndexForward: false,
        }));

        const bookings = (result.Items || []).map((item) => ({
          bookingId: item.bookingId.S,
          user_id: item.user_id.S,
          pickup_location: item.pickup_location.S,
          dropoff_location: item.dropoff_location.S,
          scheduled_time: item.scheduled_time.S,
          vehicle_type: item.vehicle_type.S,
          status: item.status.S,
          created_at: item.created_at.S,
        }));

        return createResponse(200, {
          success: true,
          data: bookings,
        });
      }

      case "GET:/health":
        return createResponse(200, {
          success: true,
          message: "Bookings service is healthy",
        });

      default:
        return createResponse(404, {
          success: false,
          error: `Route not found: ${httpMethod} ${path}`,
        });
    }
  } catch (error) {
    console.error("Bookings error:", error);
    return createResponse(500, {
      success: false,
      error: error.message,
    });
  }
};
