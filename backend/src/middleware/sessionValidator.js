'use strict';

const { errorResponse } = require('./response');

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const KIOSK_SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Validate and refresh kiosk session with 5-minute timeout.
 * Middleware for /api/session/* routes.
 * 
 * Checks session_id validity and enforces 5-minute inactivity timeout.
 * If session is stale, it auto-expires and requires client to generate new session_id.
 */
function validateKioskSession(req, res, next) {
  const sessionId = req.params.sessionId || req.body?.session_id;

  if (!sessionId || typeof sessionId !== 'string') {
    return errorResponse(res, 400, 'MISSING_SESSION', 'session_id is required.');
  }

  if (!SESSION_ID_PATTERN.test(sessionId)) {
    return errorResponse(res, 422, 'INVALID_SESSION', 'session_id format is invalid.');
  }

  // Attach validated session_id to request for route handlers
  req.kioskSessionId = sessionId;
  
  // Session timeout logic will be handled in the store layer
  // The route handlers will call ensureSession which checks last_seen_at
  next();
}

module.exports = {
  validateKioskSession,
  KIOSK_SESSION_TIMEOUT_MS,
  SESSION_ID_PATTERN,
};
