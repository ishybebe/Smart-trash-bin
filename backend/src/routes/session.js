'use strict';

const { Router } = require('express');
const { generateQrToken, verifyQrToken } = require('../services/qrService');
const {
  saveQr,
  scanQrToSession,
  ensureSession,
  withdrawSessionPoints,
  dispenseRice,
} = require('../services/store');
const { errorResponse, successResponse } = require('../middleware/response');
const { getActiveRicePricing } = require('../services/pricingService');

const router = Router();

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const SHORT_CODE_PATTERN = /^[A-F0-9]{6,12}$/;
const MAX_PACKS_PER_REQUEST = 10;

function isValidSessionId(sessionId) {
  return typeof sessionId === 'string' && SESSION_ID_PATTERN.test(sessionId);
}

function sessionPayload(session) {
  return {
    session_id: session.id,
    points: session.points,
    updated_at: session.updated_at,
  };
}

/**
 * GET /api/session/:sessionId
 *
 * Read the current redeemable points for a kiosk session.
 */
router.get('/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  if (!isValidSessionId(sessionId)) {
    return errorResponse(res, 422, 'INVALID_SESSION', 'sessionId is not valid.');
  }

  return successResponse(res, sessionPayload(await ensureSession(sessionId)));
});

/**
 * POST /api/session/scan
 *
 * Load a single-use points code into a kiosk session. Accepts either the signed
 * QR token or the short fallback code printed under the QR image.
 * Body: { session_id, token }
 */
router.post('/scan', async (req, res) => {
  const { session_id, token } = req.body || {};

  if (!isValidSessionId(session_id)) {
    return errorResponse(res, 422, 'INVALID_SESSION', 'session_id is not valid.');
  }

  const raw = typeof token === 'string' ? token.trim() : '';
  if (!raw) {
    return errorResponse(
      res, 422, 'INVALID_CODE',
      'Enter the code from your points claim, or scan the QR image.',
    );
  }

  let qrId = null;
  let shortCode = null;

  if (raw.includes('.')) {
    const verification = verifyQrToken(raw);
    if (!verification.valid) {
      return errorResponse(res, 401, 'INVALID_TOKEN', verification.reason);
    }
    qrId = verification.payload.id;
  } else {
    const normalized = raw.replace(/[\s-]/g, '').toUpperCase();
    if (!SHORT_CODE_PATTERN.test(normalized)) {
      return errorResponse(
        res, 422, 'INVALID_CODE',
        'That is not a points code. Enter the 8-character code or scan the QR image.',
      );
    }
    shortCode = normalized;
  }

  const result = await scanQrToSession({ qrId, shortCode, sessionId: session_id });
  if (!result.ok) {
    return errorResponse(res, result.statusCode, result.code, result.message);
  }

  return successResponse(res, {
    credited_points: result.points,
    ...sessionPayload(result.session),
    message: `Loaded ${result.points} points into this session.`,
  });
});

/**
 * POST /api/session/claim
 *
 * Withdraw all session points into a single-use points code.
 * Body: { session_id }
 */
router.post('/claim', async (req, res) => {
  const { session_id } = req.body || {};

  if (!isValidSessionId(session_id)) {
    return errorResponse(res, 422, 'INVALID_SESSION', 'session_id is not valid.');
  }

  const session = await ensureSession(session_id);
  if (session.points <= 0) {
    return errorResponse(
      res, 422, 'NO_SESSION_POINTS',
      'This session has no points to claim. Deposit accepted items first.'
    );
  }

  const qr = generateQrToken(session.points);
  await saveQr(qr);
  await withdrawSessionPoints(session_id);

  return successResponse(res, {
    token: qr.token,
    alphanumeric: qr.alphanumeric,
    points: qr.points,
    created_at: qr.created_at,
    session_points: 0,
  }, 201);
});

/**
 * POST /api/session/dispense
 *
 * Dispense rice using the session's available points. The points code is
 * scanned separately; it never travels with the dispense request.
  * Body: { session_id, quantity, request_id }
 */
router.post('/dispense', async (req, res) => {
  const {
    session_id,
    quantity,
    request_id,
  } = req.body || {};

  if (!isValidSessionId(session_id)) {
    return errorResponse(res, 422, 'INVALID_SESSION', 'session_id is not valid.');
  }

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_PACKS_PER_REQUEST) {
    return errorResponse(
      res, 422, 'INVALID_QUANTITY',
      `quantity must be a whole number between 1 and ${MAX_PACKS_PER_REQUEST}.`
    );
  }

  if (typeof request_id !== 'string' || request_id.length < 8 || request_id.length > 64) {
    return errorResponse(res, 422, 'INVALID_REQUEST_ID', 'request_id must be 8-64 characters.');
  }

  let pricing;
  try {
    pricing = await getActiveRicePricing();
  } catch {
    return errorResponse(
      res, 503, 'PRICING_UNAVAILABLE',
      'Rice pricing is temporarily unavailable. No points were deducted.'
    );
  }

  if (!pricing) {
    return errorResponse(
      res, 409, 'PACK_SIZE_UNAVAILABLE',
      'The vendo pack size is not configured right now. Ask an operator for help.'
    );
  }

  const result = await dispenseRice({
    sessionId: session_id,
    quantity,
    requestId: request_id,
    packSize: pricing.pack_size,
    pointsPerPack: pricing.points_price,
  });
  if (!result.ok) {
    return errorResponse(res, result.statusCode, result.code, result.message);
  }

  return successResponse(res, result.payload);
});

module.exports = router;
