const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const { getUserByEmail, putUser } = require("./dynamo");

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Content-Type": "application/json",
};

// Standard response helper
const createResponse = (statusCode, body) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body),
});

// Error handler
const handleError = (error, context = "Authentication") => {
  console.error(`${context} error:`, error);
  return createResponse(500, {
    success: false,
    error: error.message || "Internal server error",
    context,
  });
};

// Main Lambda handler
exports.handler = async (event) => {
  console.log("Auth Lambda invoked:", JSON.stringify(event, null, 2));

  // Handle OPTIONS request for CORS
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, { message: "CORS preflight" });
  }

  try {
    const { httpMethod, path, body } = event;
    const requestBody = body ? JSON.parse(body) : {};
    const usersTable = process.env.DYNAMO_USERS_TABLE;

    // Route handling
    switch (`${httpMethod}:${path}`) {
      // User registration
      case "POST:/register": {
        const { email, password, firstName, lastName, phone } = requestBody;
        if (!email || !password || !firstName || !lastName) {
          return createResponse(400, { success: false, error: "Email, password, first name, and last name are required" });
        }
        const existing = await getUserByEmail(usersTable, email);
        if (existing) {
          return createResponse(409, { success: false, error: "User already exists" });
        }
        const userId = randomUUID();
        const passwordHash = await bcrypt.hash(password, 10);
        const user = { email, userId, firstName, lastName, phone: phone || null, passwordHash, createdAt: new Date().toISOString() };
        await putUser(usersTable, user);
        const token = jwt.sign({ sub: email, uid: userId, email, firstName, lastName }, process.env.JWT_SECRET, { expiresIn: "7d" });
        return createResponse(201, { success: true, data: { user: { email, userId, firstName, lastName, phone: phone || null }, accessToken: token }, message: "User registered successfully" });
      }

      // User login
      case "POST:/login": {
        const { email: loginEmail, password: loginPassword } = requestBody;
        if (!loginEmail || !loginPassword) {
          return createResponse(400, { success: false, error: "Email and password are required" });
        }
        const user = await getUserByEmail(usersTable, loginEmail);
        if (!user) return createResponse(401, { success: false, error: "Invalid credentials" });
        const ok = await bcrypt.compare(loginPassword, user.passwordHash || "");
        if (!ok) return createResponse(401, { success: false, error: "Invalid credentials" });
        const token = jwt.sign({ sub: user.email, uid: user.userId, email: user.email, firstName: user.firstName, lastName: user.lastName }, process.env.JWT_SECRET, { expiresIn: "7d" });
        return createResponse(200, { success: true, data: { user: { email: user.email, userId: user.userId, firstName: user.firstName, lastName: user.lastName, phone: user.phone || null }, accessToken: token }, message: "Login successful" });
      }

      // Token refresh
      case "POST:/refresh": {
        const { refreshToken } = requestBody;
        if (!refreshToken) return createResponse(400, { success: false, error: "Refresh token is required" });
        try {
          const claims = jwt.verify(refreshToken, process.env.JWT_SECRET);
          const newToken = jwt.sign({ sub: claims.sub, uid: claims.uid, email: claims.email, firstName: claims.firstName, lastName: claims.lastName }, process.env.JWT_SECRET, { expiresIn: "7d" });
          return createResponse(200, { success: true, data: { accessToken: newToken }, message: "Token refreshed successfully" });
        } catch (e) {
          return createResponse(401, { success: false, error: "Invalid refresh token" });
        }
      }

      // User logout
      case "POST:/logout": {
        return createResponse(200, { success: true, message: "Logout successful" });
      }

      // Get user profile
      case "GET:/profile": {
        const profileAuthHeader = event.headers?.Authorization || event.headers?.authorization;
        const profileToken = profileAuthHeader?.replace("Bearer ", "");
        if (!profileToken) return createResponse(401, { success: false, error: "Authorization token is required" });
        try {
          const claims = jwt.verify(profileToken, process.env.JWT_SECRET);
          const user = await getUserByEmail(usersTable, claims.sub);
          if (!user) return createResponse(404, { success: false, error: "User not found" });
          return createResponse(200, { success: true, data: { user: { email: user.email, userId: user.userId, firstName: user.firstName, lastName: user.lastName, phone: user.phone || null } }, message: "Profile retrieved successfully" });
        } catch (e) {
          return createResponse(401, { success: false, error: "Invalid or expired token" });
        }
      }

      // Health check
      case "GET:/health":
        return createResponse(200, {
          success: true,
          message: "Auth service is healthy",
          timestamp: new Date().toISOString(),
        });

      default:
        return createResponse(404, {
          success: false,
          error: `Route not found: ${httpMethod} ${path}`,
        });
    }
  } catch (error) {
    return handleError(error, "Auth Lambda");
  }
};
