'use strict';

/**
 * Error response helper — always returns a consistent shape.
 * { success: false, error: { code, message } }
 */
function errorResponse(res, statusCode, code, message) {
  return res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
}

/**
 * Success response helper.
 * { success: true, data: { ... } }
 */
function successResponse(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

module.exports = { errorResponse, successResponse };
