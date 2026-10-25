'use strict';

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

/**
 * Generate a high-entropy, HMAC-signed QR token.
 *
 * Token format (base64url-encoded JSON + signature):
 *   payload.signature
 *
 * Payload: { id, points, created_at, nonce }
 */
function generateQrToken(points) {
  const id         = uuidv4();
  const nonce      = crypto.randomBytes(16).toString('hex');
  const created_at = new Date().toISOString();

  // 8-character alphanumeric fallback code (uppercase).
  const alphanumeric = crypto.randomBytes(4).toString('hex').toUpperCase();

  const payload = JSON.stringify({ id, points, created_at, nonce });
  const payloadB64 = Buffer.from(payload).toString('base64url');

  const signature = crypto
    .createHmac('sha256', config.qrSecret)
    .update(payloadB64)
    .digest('hex');

  const token = `${payloadB64}.${signature}`;

  return { id, token, alphanumeric, points, created_at };
}

/**
 * Verify and decode a QR token.
 * Returns { valid: true, payload } or { valid: false, reason }.
 */
function verifyQrToken(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'Token is required.' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Malformed token.' };
  }

  const [payloadB64, signature] = parts;

  const expectedSig = crypto
    .createHmac('sha256', config.qrSecret)
    .update(payloadB64)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks.
  const sigBuffer      = Buffer.from(signature,    'hex');
  const expectedBuffer = Buffer.from(expectedSig, 'hex');

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return { valid: false, reason: 'Invalid token signature.' };
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return { valid: false, reason: 'Token payload could not be decoded.' };
  }

  return { valid: true, payload };
}

module.exports = { generateQrToken, verifyQrToken };
