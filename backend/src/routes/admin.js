'use strict';

const { Router } = require('express');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const config = require('../config');
const { errorResponse, successResponse } = require('../middleware/response');
const { authenticateAdmin } = require('../middleware/auth');
const { forceTestingContext } = require('../middleware/privilegeContext');
const {
  findAdminByUsername,
  verifyPassword,
  updateLastLogin,
} = require('../services/adminService');
const {
  findAcceptedMaterial,
  getAcceptedMaterials,
  updateMaterialPoints,
} = require('../services/materialsService');
const {
  getRicePricing,
  updateRicePricing,
} = require('../services/pricingService');
const { generateReport, getReportAuditLog } = require('../services/reportService');
const {
  getRiceInventory,
  addRiceInventory,
  resetRiceInventory,
  ensureSession,
  addSessionPoints,
  withdrawSessionPoints,
  saveDeposit,
} = require('../services/store');

const router = Router();

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const MAX_TEST_POINTS = 10000;

function sessionPayload(session) {
  return {
    session_id: session.id,
    points: session.points,
    updated_at: session.updated_at,
  };
}

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return errorResponse(res, 400, 'MISSING_CREDENTIALS', 'Username and password are required.');
  }

  const admin = await findAdminByUsername(username);
  if (!admin) {
    return errorResponse(res, 401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
  }

  const isValid = await verifyPassword(password, admin.password_hash);
  if (!isValid) {
    return errorResponse(res, 401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
  }

  if (!admin.is_active) {
    return errorResponse(res, 403, 'ACCOUNT_DISABLED', 'This account has been disabled.');
  }

  await updateLastLogin(admin.id);

  const token = jwt.sign(
    { username: admin.username, user_id: admin.id, role: admin.role, isAdmin: true },
    config.jwtSecret,
    { expiresIn: '10m' }
  );

  return successResponse(res, { token, username: admin.username, role: admin.role });
});

router.post('/refresh', authenticateAdmin, async (req, res) => {
  const admin = await findAdminByUsername(req.admin.username);
  if (!admin || !admin.is_active) {
    return errorResponse(res, 403, 'ACCOUNT_DISABLED', 'This account is no longer active.');
  }

  const { username, user_id, role, isAdmin } = req.admin;
  const token = jwt.sign(
    { username, user_id, role, isAdmin },
    config.jwtSecret,
    { expiresIn: '10m' }
  );

  return successResponse(res, { token });
});

router.get('/inventory', authenticateAdmin, async (req, res) => {
  return successResponse(res, { riceInventory: await getRiceInventory() });
});

router.post('/inventory', authenticateAdmin, async (req, res) => {
  const { amount } = req.body || {};
  if (typeof amount !== 'number' || amount <= 0) {
    return errorResponse(res, 422, 'INVALID_AMOUNT', 'Amount must be a positive number.');
  }
  return successResponse(res, { riceInventory: await addRiceInventory(amount) });
});

router.put('/inventory/reset', authenticateAdmin, async (req, res) => {
  return successResponse(res, { riceInventory: await resetRiceInventory() });
});

router.put('/materials', authenticateAdmin, async (req, res) => {
  const { code, points } = req.body || {};
  if (typeof code !== 'string' || !Number.isInteger(points) || points < 1) {
    return errorResponse(
      res,
      422,
      'INVALID_MATERIAL_POINTS',
      'code and a positive whole-number points value are required.',
    );
  }

  try {
    const acceptedMaterials = await updateMaterialPoints(code, points);
    return successResponse(res, { acceptedMaterials });
  } catch (error) {
    return errorResponse(
      res,
      error.statusCode || 503,
      error.code || 'MATERIALS_UNAVAILABLE',
      error.message || 'Materials are temporarily unavailable.',
    );
  }
});

router.get('/rice-pricing', authenticateAdmin, async (req, res) => {
  try {
    const ricePricing = await getRicePricing({ includeInactive: true });
    return successResponse(res, { ricePricing });
  } catch (error) {
    return errorResponse(
      res,
      error.statusCode || 503,
      error.code || 'PRICING_UNAVAILABLE',
      'Rice pricing is temporarily unavailable.',
    );
  }
});

router.post('/rice-pricing', authenticateAdmin, async (req, res) => {
  const { pack_size, points_price, is_active } = req.body || {};

  let result;
  try {
    result = await updateRicePricing({
      packSize: pack_size,
      pointsPrice: points_price,
      isActive: is_active,
      adminUserId: req.admin?.user_id ?? null,
    });
  } catch {
    return errorResponse(
      res, 503, 'PRICING_UNAVAILABLE',
      'Rice pricing is temporarily unavailable.',
    );
  }

  if (!result.ok) {
    return errorResponse(res, result.statusCode, result.code, result.message);
  }

  let ricePricing;
  try {
    ricePricing = await getRicePricing({ includeInactive: true });
  } catch {
    return successResponse(res, { updated: result.pricing, ricePricing: [] });
  }

  return successResponse(res, {
    updated: result.pricing,
    ricePricing,
  });
});

router.get('/reports', authenticateAdmin, async (req, res) => {
  try {
    const generated = await generateReport(req.admin.user_id);
    return successResponse(res, {
      reports: generated.report,
      report_id: generated.report_id,
      created_at: generated.created_at,
      created_by_admin_id: generated.created_by_admin_id,
      created_by_admin: generated.created_by_admin,
    });
  } catch {
    return errorResponse(res, 503, 'REPORTS_UNAVAILABLE', 'Reports are temporarily unavailable.');
  }
});

router.get('/reports/audit', authenticateAdmin, async (req, res) => {
  try {
    const auditLog = await getReportAuditLog();
    return successResponse(res, auditLog);
  } catch {
    return errorResponse(res, 503, 'REPORTS_UNAVAILABLE', 'Report audit log is temporarily unavailable.');
  }
});

// ── Testing-only controls ─────────────────────────────────────────────────────
// These routes always run against the local SQLite sandbox. They never persist
// to the live database.

router.post(
  '/testing/points',
  authenticateAdmin,
  forceTestingContext,
  async (req, res) => {
    const { session_id, points } = req.body || {};

    if (typeof session_id !== 'string' || !SESSION_ID_PATTERN.test(session_id)) {
      return errorResponse(res, 422, 'INVALID_SESSION', 'session_id is not valid.');
    }

    if (!Number.isInteger(points) || points < 1 || points > MAX_TEST_POINTS) {
      return errorResponse(
        res, 422, 'INVALID_POINTS',
        `points must be a whole number between 1 and ${MAX_TEST_POINTS}.`
      );
    }

    const session = await addSessionPoints(session_id, points);
    return successResponse(res, { testing: true, session: sessionPayload(session) });
  },
);

router.post(
  '/testing/deposit',
  authenticateAdmin,
  forceTestingContext,
  async (req, res) => {
    const { session_id, type } = req.body || {};

    if (typeof session_id !== 'string' || !SESSION_ID_PATTERN.test(session_id)) {
      return errorResponse(res, 422, 'INVALID_SESSION', 'session_id is not valid.');
    }

    // Reference data still comes from the live database.
    const material = await findAcceptedMaterial(type);
    if (!material) {
      return errorResponse(
        res, 422, 'UNKNOWN_MATERIAL',
        `Material type "${type}" is not accepted.`
      );
    }

    await ensureSession(session_id);

    const record = {
      event_id: `test-${randomUUID()}`,
      type: material.type,
      label: material.label,
      points: material.points,
      status: 'accepted',
      created_at: new Date().toISOString(),
    };

    await saveDeposit(record, session_id);
    const session = await addSessionPoints(session_id, material.points);

    return successResponse(res, {
      testing: true,
      deposit: record,
      session: sessionPayload(session),
    }, 201);
  },
);

router.post(
  '/testing/reset',
  authenticateAdmin,
  forceTestingContext,
  async (req, res) => {
    const { session_id } = req.body || {};

    if (typeof session_id !== 'string' || !SESSION_ID_PATTERN.test(session_id)) {
      return errorResponse(res, 422, 'INVALID_SESSION', 'session_id is not valid.');
    }

    await ensureSession(session_id);
    await withdrawSessionPoints(session_id);
    const session = await ensureSession(session_id);
    const riceInventory = await resetRiceInventory();

    return successResponse(res, {
      testing: true,
      session: sessionPayload(session),
      rice_inventory: riceInventory,
    });
  },
);

module.exports = router;
