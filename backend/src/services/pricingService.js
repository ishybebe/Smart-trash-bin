'use strict';

const { getPool, withTransaction } = require('./mysql');
const { logAdminAction } = require('./auditService');
const { RICE_PACK_SIZES, isRicePackSize } = require('../config/rules');

function mapPricingRow(row) {
  return {
    pack_size: row.pack_size,
    points_price: Number(row.points_price),
    is_active: Boolean(row.is_active),
    updated_at: row.updated_at,
  };
}

function sortPricing(rows) {
  return rows.sort(
    (a, b) =>
      RICE_PACK_SIZES.indexOf(a.pack_size) -
      RICE_PACK_SIZES.indexOf(b.pack_size),
  );
}

function pricingUnavailable() {
  const error = new Error('Rice pricing is temporarily unavailable.');
  error.statusCode = 503;
  error.code = 'PRICING_UNAVAILABLE';
  return error;
}

async function getRicePricing({ includeInactive = false } = {}) {
  const pool = getPool();
  if (!pool) throw pricingUnavailable();

  const [rows] = await pool.query(
    `SELECT pack_size, points_price, is_active, updated_at
       FROM rice_pricing
      ${includeInactive ? '' : 'WHERE is_active = 1'}`,
  );

  return sortPricing(rows).map(mapPricingRow);
}

async function getActiveRicePricing() {
  const pool = getPool();
  if (!pool) throw pricingUnavailable();

  const [rows] = await pool.query(
    `SELECT pack_size, points_price, is_active, updated_at
       FROM rice_pricing
      WHERE is_active = 1
      ORDER BY updated_at DESC, id DESC
      LIMIT 1`,
  );

  return rows[0] ? mapPricingRow(rows[0]) : null;
}

async function findActiveRicePrice(packSize) {
  if (!isRicePackSize(packSize)) return null;

  const pool = getPool();
  if (!pool) throw pricingUnavailable();

  const [rows] = await pool.query(
    `SELECT pack_size, points_price, is_active, updated_at
       FROM rice_pricing
      WHERE pack_size = ? AND is_active = 1
      LIMIT 1`,
    [packSize],
  );

  return rows[0] ? mapPricingRow(rows[0]) : null;
}

async function updateRicePricing({
  packSize,
  pointsPrice,
  isActive,
  adminUserId = null,
}) {
  if (!isRicePackSize(packSize)) {
    return {
      ok: false,
      statusCode: 422,
      code: 'INVALID_PACK_SIZE',
      message: `pack_size must be one of: ${RICE_PACK_SIZES.join(', ')}.`,
    };
  }

  if (!Number.isInteger(pointsPrice) || pointsPrice < 1 || pointsPrice > 65535) {
    return {
      ok: false,
      statusCode: 422,
      code: 'INVALID_PRICE',
      message: 'points_price must be a whole number between 1 and 65535.',
    };
  }

  if (isActive !== undefined && typeof isActive !== 'boolean') {
    return {
      ok: false,
      statusCode: 422,
      code: 'INVALID_ACTIVE_FLAG',
      message: 'is_active must be true or false.',
    };
  }

  if (isActive === false) {
    return {
      ok: false,
      statusCode: 422,
      code: 'ACTIVE_PACK_REQUIRED',
      message: 'One active pack size must remain configured for the vendo.',
    };
  }

  return withTransaction(async (connection) => {
    const [rows] = await connection.query(
      'SELECT * FROM rice_pricing WHERE pack_size = ? FOR UPDATE',
      [packSize],
    );

    const current = rows[0];
    if (!current) {
      return {
        ok: false,
        statusCode: 404,
        code: 'PACK_SIZE_NOT_FOUND',
        message: `No rice pricing row exists for ${packSize} kg.`,
      };
    }

    const [activeRows] = await connection.query(
      'SELECT pack_size FROM rice_pricing WHERE is_active = 1 FOR UPDATE',
    );
    const oldPrice = Number(current.points_price);
    const oldActive = Boolean(current.is_active);
    const newActive = true;
    const changed =
      oldPrice !== pointsPrice ||
      oldActive !== newActive ||
      (newActive && (activeRows.length !== 1 || activeRows[0].pack_size !== packSize));

    if (changed) {
      if (newActive) {
        await connection.query(
          'UPDATE rice_pricing SET is_active = 0 WHERE is_active = 1',
        );
      }
      await connection.query(
        `UPDATE rice_pricing
            SET points_price = ?, is_active = ?
          WHERE pack_size = ?`,
        [pointsPrice, newActive ? 1 : 0, packSize],
      );

      await logAdminAction(connection, {
        adminUserId,
        action: 'UPDATE_RICE_PRICE',
        entityType: 'rice_pricing',
        entityId: packSize,
        details: {
          pack_size: packSize,
          old_price: oldPrice,
          new_price: pointsPrice,
          old_active: oldActive,
          new_active: newActive,
          previous_active_sizes: activeRows.map((row) => row.pack_size),
        },
      });
    }

    return {
      ok: true,
      changed,
      pricing: {
        pack_size: packSize,
        points_price: pointsPrice,
        is_active: newActive,
        updated_at: changed ? new Date().toISOString() : current.updated_at,
      },
    };
  });
}

module.exports = {
  getRicePricing,
  getActiveRicePricing,
  findActiveRicePrice,
  updateRicePricing,
};
