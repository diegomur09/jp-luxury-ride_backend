const Stripe = require("stripe");
const { Client, Environment } = require("square");
const jwt = require("jsonwebtoken");

const { logPaymentEvent } = require('./dynamo');

// Initialize payment processors
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const square = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment:
    process.env.NODE_ENV === "production"
      ? Environment.Production
      : Environment.Sandbox,
});

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
const handleError = (error, context = "Payment processing") => {
  console.error(`${context} error:`, error);
  return createResponse(500, {
    success: false,
    error: error.message || "Internal server error",
    context,
  });
};

// Stripe payment functions
const stripePayments = {
  async createPaymentIntent(amount, currency = "usd", metadata = {}) {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        processor: "stripe",
        ...metadata,
      },
    });

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      processor: "stripe",
    };
  },

  async confirmPayment(paymentIntentId) {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);

    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      processor: "stripe",
    };
  },

  async refundPayment(paymentIntentId, amount = null) {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });

    return {
      id: refund.id,
      status: refund.status,
      amount: refund.amount / 100,
      currency: refund.currency,
      processor: "stripe",
    };
  },
};

// Square payment functions
const squarePayments = {
  async createPayment(
    amount,
    currency = "USD",
    sourceId,
    locationId = null,
    metadata = {}
  ) {
    const paymentsApi = square.paymentsApi;

    const payment = await paymentsApi.createPayment({
      sourceId,
      locationId: locationId || process.env.SQUARE_LOCATION_ID,
      amountMoney: {
        amount: BigInt(Math.round(amount * 100)), // Convert to cents
        currency,
      },
      note: metadata.description || "JP Luxury Ride payment",
      referenceId: metadata.bookingId || `payment_${Date.now()}`,
    });

    return {
      id: payment.result.payment.id,
      status: payment.result.payment.status,
      amount: Number(payment.result.payment.amountMoney.amount) / 100,
      currency: payment.result.payment.amountMoney.currency,
      processor: "square",
      receiptUrl: payment.result.payment.receiptUrl,
    };
  },

  async refundPayment(paymentId, amount = null, reason = "Customer request") {
    const refundsApi = square.refundsApi;

    const refund = await refundsApi.refundPayment({
      paymentId,
      amountMoney: amount
        ? {
            amount: BigInt(Math.round(amount * 100)),
            currency: "USD",
          }
        : undefined,
      reason,
    });

    return {
      id: refund.result.refund.id,
      status: refund.result.refund.status,
      amount: Number(refund.result.refund.amountMoney.amount) / 100,
      currency: refund.result.refund.amountMoney.currency,
      processor: "square",
    };
  },

  async getPayment(paymentId) {
    const paymentsApi = square.paymentsApi;
    const payment = await paymentsApi.getPayment(paymentId);

    return {
      id: payment.result.payment.id,
      status: payment.result.payment.status,
      amount: Number(payment.result.payment.amountMoney.amount) / 100,
      currency: payment.result.payment.amountMoney.currency,
      processor: "square",
    };
  },
};

// Payment service orchestrator
const paymentService = {
  async processPayment(processor, method, params) {
    try {
      let result;

      switch (processor) {
        case "stripe":
          switch (method) {
            case "create_intent":
              result = await stripePayments.createPaymentIntent(
                params.amount,
                params.currency,
                params.metadata
              );
              break;
            case "confirm":
              result = await stripePayments.confirmPayment(
                params.paymentIntentId
              );
              break;
            case "refund":
              result = await stripePayments.refundPayment(
                params.paymentIntentId,
                params.amount
              );
              break;
            default:
              throw new Error(`Unknown Stripe method: ${method}`);
          }
          break;

        case "square":
          switch (method) {
            case "create_payment":
              result = await squarePayments.createPayment(
                params.amount,
                params.currency,
                params.sourceId,
                params.locationId,
                params.metadata
              );
              break;
            case "refund":
              result = await squarePayments.refundPayment(
                params.paymentId,
                params.amount,
                params.reason
              );
              break;
            case "get_payment":
              result = await squarePayments.getPayment(params.paymentId);
              break;
            default:
              throw new Error(`Unknown Square method: ${method}`);
          }
          break;

        default:
          throw new Error(`Unknown payment processor: ${processor}`);
      }

      return result;
    } catch (error) {
      console.error(`Payment processing error (${processor}):`, error);
      throw error;
    }
  },
};

// dynamo logger imported above

// Main Lambda handler
exports.handler = async (event) => {
  console.log("Payment Lambda invoked:", JSON.stringify(event, null, 2));

  // Handle OPTIONS request for CORS
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, { message: "CORS preflight" });
  }

  try {
    const { httpMethod, path, body, queryStringParameters } = event;
    const requestBody = body ? JSON.parse(body) : {};
    const params = queryStringParameters || {};

    // Extract authorization token
    const authHeader =
      event.headers?.Authorization || event.headers?.authorization;
    const token = authHeader?.replace("Bearer ", "");

    // Verify user authentication for protected endpoints (JWT)
    if (token) {
      try {
        const claims = jwt.verify(token, process.env.JWT_SECRET);
        requestBody.userId = claims.uid || claims.sub || null;
      } catch (e) {
        return createResponse(401, { success: false, error: "Invalid authentication token" });
      }
    }

    // Route handling
    const paymentsLogTable = process.env.DYNAMO_PAYMENTS_TABLE;
    switch (`${httpMethod}:${path}`) {
      // Create Stripe Payment Intent
      case "POST:/stripe/create-intent": {
        const { amount, currency = "usd", bookingId } = requestBody;

        if (!amount || amount <= 0) {
          return createResponse(400, {
            success: false,
            error: "Valid amount is required",
          });
        }

        const stripeIntent = await paymentService.processPayment(
          "stripe",
          "create_intent",
          {
            amount,
            currency,
            metadata: { bookingId, userId: requestBody.userId },
          }
        );

        // Log to Dynamo (best-effort)
        logPaymentEvent(paymentsLogTable, {
          pk: `BOOKING#${bookingId || 'unknown'}`,
          sk: `STRIPE_INTENT#${stripeIntent?.id || 'unknown'}`,
          processor: 'stripe',
          action: 'create_intent',
          amount,
          currency,
          userId: requestBody.userId || null,
          timestamp: new Date().toISOString(),
        }).catch(() => {});

        return createResponse(200, {
          success: true,
          data: stripeIntent,
          message: "Stripe payment intent created successfully",
        });
      }

      // Confirm Stripe Payment
      case "POST:/stripe/confirm": {
        const { paymentIntentId } = requestBody;

        if (!paymentIntentId) {
          return createResponse(400, {
            success: false,
            error: "Payment intent ID is required",
          });
        }

        const confirmedPayment = await paymentService.processPayment(
          "stripe",
          "confirm",
          {
            paymentIntentId,
          }
        );

        logPaymentEvent(paymentsLogTable, {
          pk: `INTENT#${paymentIntentId}`,
          sk: `CONFIRM#${new Date().toISOString()}`,
          processor: 'stripe',
          action: 'confirm',
          userId: requestBody.userId || null,
          timestamp: new Date().toISOString(),
        }).catch(() => {});

        logPaymentEvent(paymentsLogTable, {
          pk: `INTENT#${paymentIntentId}`,
          sk: `CONFIRM#${new Date().toISOString()}`,
          processor: 'stripe',
          action: 'confirm',
          userId: requestBody.userId || null,
          timestamp: new Date().toISOString(),
        }).catch(() => {});

        return createResponse(200, {
          success: true,
          data: confirmedPayment,
          message: "Payment confirmed successfully",
        });
      }

      // Process Square Payment
      case "POST:/square/create-payment": {
        const {
          amount: sqAmount,
          sourceId,
          locationId,
          description,
          bookingId: sqBookingId,
        } = requestBody;

        if (!sqAmount || sqAmount <= 0) {
          return createResponse(400, {
            success: false,
            error: "Valid amount is required",
          });
        }

        if (!sourceId) {
          return createResponse(400, {
            success: false,
            error: "Payment source ID is required",
          });
        }

        const squarePayment = await paymentService.processPayment(
          "square",
          "create_payment",
          {
            amount: sqAmount,
            currency: "USD",
            sourceId,
            locationId,
            metadata: {
              bookingId: sqBookingId,
              description,
              userId: requestBody.userId,
            },
          }
        );

        logPaymentEvent(paymentsLogTable, {
          pk: `BOOKING#${sqBookingId || 'unknown'}`,
          sk: `SQUARE_PAYMENT#${squarePayment?.id || squarePayment?.payment?.id || 'unknown'}`,
          processor: 'square',
          action: 'create_payment',
          amount: sqAmount,
          currency: 'USD',
          description: description || null,
          userId: requestBody.userId || null,
          locationId: locationId || null,
          timestamp: new Date().toISOString(),
        }).catch(() => {});

        return createResponse(200, {
          success: true,
          data: squarePayment,
          message: "Square payment processed successfully",
        });
      }

      // Refund Payment (both processors)
      case "POST:/refund": {
        const {
          processor,
          paymentId,
          amount: refundAmount,
          reason,
        } = requestBody;

        if (!processor || !paymentId) {
          return createResponse(400, {
            success: false,
            error: "Processor and payment ID are required",
          });
        }

        let refundResult;
        if (processor === "stripe") {
          refundResult = await paymentService.processPayment(
            "stripe",
            "refund",
            {
              paymentIntentId: paymentId,
              amount: refundAmount,
            }
          );
        } else if (processor === "square") {
          refundResult = await paymentService.processPayment(
            "square",
            "refund",
            {
              paymentId,
              amount: refundAmount,
              reason,
            }
          );
        } else {
          return createResponse(400, {
            success: false,
            error: "Invalid processor specified",
          });
        }

        logPaymentEvent(paymentsLogTable, {
          pk: `PAYMENT#${paymentId}`,
          sk: `REFUND#${new Date().toISOString()}`,
          processor,
          action: 'refund',
          amount: refundAmount || null,
          reason: reason || null,
          userId: requestBody.userId || null,
          timestamp: new Date().toISOString(),
        }).catch(() => {});

        return createResponse(200, {
          success: true,
          data: refundResult,
          message: "Refund processed successfully",
        });
      }

      // Get Payment Status
      case "GET:/payment/{id}": {
        const paymentIdFromPath = event.pathParameters?.id;
        const processorParam = params.processor;

        if (!paymentIdFromPath || !processorParam) {
          return createResponse(400, {
            success: false,
            error: "Payment ID and processor are required",
          });
        }

        let paymentStatus;
        if (processorParam === "square") {
          paymentStatus = await paymentService.processPayment(
            "square",
            "get_payment",
            {
              paymentId: paymentIdFromPath,
            }
          );
        } else {
          // For Stripe, we'd need to implement getPaymentIntent
          return createResponse(400, {
            success: false,
            error: "Payment status retrieval not implemented for Stripe",
          });
        }

        return createResponse(200, {
          success: true,
          data: paymentStatus,
          message: "Payment status retrieved successfully",
        });
      }

      // Health check
      case "GET:/health":
        return createResponse(200, {
          success: true,
          message: "Payment service is healthy",
          timestamp: new Date().toISOString(),
          processors: ["stripe", "square"],
        });

      default:
        return createResponse(404, {
          success: false,
          error: `Route not found: ${httpMethod} ${path}`,
        });
    }
  } catch (error) {
    return handleError(error, "Payment Lambda");
  }
};
