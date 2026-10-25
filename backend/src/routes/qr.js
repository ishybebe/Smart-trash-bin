'use strict';

const { Router } = require('express');
const { generateQrToken, verifyQrToken } = require('../services/qrService');
const { saveQr, getQrById, redeemQr } = require('../services/store');
const { errorResponse, successResponse } = require('../middleware/response');
const { findActiveRicePrice } = require('../services/pricingService');

const router = Router();

/**
 * POST /api/qr/claim
 *
 * Generate a single-use QR token for a given points value.
 * Body: { points: number }
 */
router.post('/claim', async (req, res) => {
  const { points } = req.body || {};

  if (typeof points !== 'number' || points <= 0 || !Number.isInteger(points)) {
    return errorResponse(res, 422, 'INVALID_POINTS', 'points must be a positive integer.');
  }

  const qr = generateQrToken(points);
  await saveQr(qr);

  return successResponse(res, {
    token:       qr.token,
    alphanumeric: qr.alphanumeric,
    points:      qr.points,
    created_at:  qr.created_at,
  }, 201);
});

/**
 * POST /api/qr/redeem
 *
 * Verify and redeem a single-use QR token.
 * Body: { token: string, quantity?: number }
 */
router.post('/redeem', async (req, res) => {
  const { token, quantity = 1 } = req.body || {};

  // 1. Verify signature.
  const verification = verifyQrToken(token);
  if (!verification.valid) {
    return errorResponse(res, 401, 'INVALID_TOKEN', verification.reason);
  }

  const { payload } = verification;

  if (!Number.isInteger(quantity) || quantity < 1) {
    return errorResponse(res, 422, 'INVALID_QUANTITY', 'quantity must be a positive integer.');
  }

  let pricing;
  try {
    pricing = await findActiveRicePrice('1/4');
  } catch {
    return errorResponse(
      res, 503, 'PRICING_UNAVAILABLE',
      'Rice pricing is temporarily unavailable. The code was not redeemed.'
    );
  }

  if (!pricing) {
    return errorResponse(
      res, 409, 'PACK_SIZE_UNAVAILABLE',
      'The 1/4 kg pack is not available right now.'
    );
  }

  const pointsRequired = pricing.points_price * quantity;

  // 2. Check sufficient points for redemption.
  if (payload.points < pointsRequired) {
    return errorResponse(
      res, 422, 'INSUFFICIENT_POINTS',
      `This token has ${payload.points} points. ${pointsRequired} points are required for ${quantity} rice packs.`
    );
  }

  // 3. Look up in store and enforce single-use.
  const stored = await getQrById(payload.id);
  if (!stored) {
    return errorResponse(res, 404, 'TOKEN_NOT_FOUND', 'QR code not found in the system.');
  }

  const result = await redeemQr(payload.id);
  if (!result.redeemed) {
    return errorResponse(res, 409, 'ALREADY_REDEEMED', result.reason);
  }

  // 4. Backend would trigger actuator here.
  return successResponse(res, {
    redeemed:        true,
    points_used:     pointsRequired,
    quantity_dispensed: quantity,
    dispense_status: 'confirmed',
    message:         `Successfully dispensed ${quantity} rice pack(s)! Actuator triggered.`,
  });
});

module.exports = router;
