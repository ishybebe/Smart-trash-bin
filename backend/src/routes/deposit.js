'use strict';

const { Router } = require('express');
const { validateDetection } = require('../services/detectionService');
const { getAcceptedMaterials } = require('../services/materialsService');
const { saveDeposit, depositExists, getDeposit } = require('../services/store');
const { errorResponse, successResponse } = require('../middleware/response');

const router = Router();

/**
 * POST /api/deposit
 *
 * Receives a detection payload from the smartphone camera.
 * Body: { event_id, type, confidence }
 */
router.post('/', async (req, res) => {
  const { event_id } = req.body || {};

  // Idempotency — return the same accepted response for duplicate event IDs.
  if (event_id && (await depositExists(event_id))) {
    const existing = await getDeposit(event_id);
    return successResponse(res, { duplicate: true, deposit: existing });
  }

  const materials = await getAcceptedMaterials();
  const result = validateDetection(req.body, materials);

  if (!result.valid) {
    return errorResponse(res, 422, 'VALIDATION_FAILED', result.reason);
  }

  const record = {
    event_id,
    type: result.material.type,
    label: result.material.label,
    points: result.points,
    status: 'accepted',
    created_at: new Date().toISOString(),
  };

  await saveDeposit(record);

  return successResponse(res, { deposit: record }, 201);
});

module.exports = router;
