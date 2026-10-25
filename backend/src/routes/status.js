'use strict';

const { Router } = require('express');
const { successResponse } = require('../middleware/response');
const { getRiceInventory } = require('../services/store');
const { getRicePricing } = require('../services/pricingService');
const { getAcceptedMaterials } = require('../services/materialsService');

const router = Router();

/**
 * GET /api/status
 *
 * System health check. Returns binary online/offline states for
 * kiosk, camera, and ESP32. Hardware flags are stubs until
 * the ESP32 polling integration is wired.
 */
router.get('/', async (req, res) => {
  let ricePricing = [];
  try {
    ricePricing = await getRicePricing();
  } catch {
    // Pricing failures must not take down the hardware status rail.
  }

  return successResponse(res, {
    system:  'online',
    kiosk:   'online',
    camera:  'unknown', // will reflect live heartbeat once camera integration is added
    esp32:   'unknown', // will reflect live heartbeat once ESP32 integration is added
    rice_inventory: await getRiceInventory(),
    rice_pricing: ricePricing,
    accepted_materials: Object.entries(await getAcceptedMaterials()).map(([code, material]) => ({
      code,
      ...material,
    })),
    checked_at: new Date().toISOString(),
  });
});

module.exports = router;
