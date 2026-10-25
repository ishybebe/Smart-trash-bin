'use strict';

const { ACCEPTED_MATERIALS, MIN_CONFIDENCE } = require('../config/rules');

/**
 * Validate a detection payload from the camera.
 *
 * Expected shape:
 * {
 *   event_id:   string  — unique idempotency key from the camera
 *   type:       string  — material type key
 *   confidence: number  — 0–1 ML confidence score
 * }
 *
 * Returns { valid: true, material, points } or { valid: false, reason }.
 */
function validateDetection(payload, acceptedMaterials = ACCEPTED_MATERIALS) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, reason: 'Payload must be a JSON object.' };
  }

  const { event_id, type, confidence } = payload;

  if (!event_id || typeof event_id !== 'string' || event_id.trim() === '') {
    return { valid: false, reason: 'event_id is required and must be a non-empty string.' };
  }

  if (!type || typeof type !== 'string') {
    return { valid: false, reason: 'type is required and must be a string.' };
  }

  const material = acceptedMaterials[type.toLowerCase()];
  if (!material) {
    return {
      valid: false,
      reason: `Material type "${type}" is not accepted. Accepted types: ${Object.keys(acceptedMaterials).join(', ')}.`,
    };
  }

  if (typeof confidence !== 'number' || confidence < MIN_CONFIDENCE) {
    return {
      valid: false,
      reason: `Confidence score ${confidence} is below the required threshold of ${MIN_CONFIDENCE}.`,
    };
  }

  return { valid: true, material: { type: type.toLowerCase(), ...material }, points: material.points };
}

module.exports = { validateDetection };
