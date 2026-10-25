'use strict';

const { getPool } = require('./mysql');
const { ACCEPTED_MATERIALS } = require('../config/rules');

const CACHE_TTL_MS = 60 * 1000;

let cache = null;
let cachedAt = 0;

function fallbackMaterials() {
  return ACCEPTED_MATERIALS;
}

/**
 * Reference data always comes from the live database, including while the
 * testing sandbox is active, so simulations use production point values.
 */
async function getAcceptedMaterials() {
  const now = Date.now();
  if (cache && now - cachedAt < CACHE_TTL_MS) return cache;

  const pool = getPool();
  if (!pool) return fallbackMaterials();

  try {
    const [rows] = await pool.query(
      'SELECT code, label, points FROM accepted_materials WHERE is_active = 1',
    );

    const materials = {};
    for (const row of rows) {
      materials[row.code] = { label: row.label, points: row.points };
    }

    cache = Object.keys(materials).length > 0 ? materials : fallbackMaterials();
    cachedAt = now;
    return cache;
  } catch (error) {
    console.error('[materials] Falling back to local rules:', error.message);
    return fallbackMaterials();
  }
}

async function findAcceptedMaterial(type) {
  const materials = await getAcceptedMaterials();
  const code = typeof type === 'string' ? type.toLowerCase() : '';
  return materials[code] ? { type: code, ...materials[code] } : null;
}

async function updateMaterialPoints(code, points) {
  const pool = getPool();
  if (!pool) {
    const error = new Error('Materials are temporarily unavailable.');
    error.statusCode = 503;
    error.code = 'MATERIALS_UNAVAILABLE';
    throw error;
  }

  const normalizedCode = typeof code === 'string' ? code.trim().toLowerCase() : '';
  const [result] = await pool.query(
    `UPDATE accepted_materials
        SET points = ?, updated_at = CURRENT_TIMESTAMP(3)
      WHERE code = ? AND is_active = 1`,
    [points, normalizedCode],
  );

  if (result.affectedRows === 0) {
    const error = new Error(`Material "${normalizedCode}" was not found.`);
    error.statusCode = 404;
    error.code = 'MATERIAL_NOT_FOUND';
    throw error;
  }

  cache = null;
  cachedAt = 0;
  return getAcceptedMaterials();
}

module.exports = { getAcceptedMaterials, findAcceptedMaterial, updateMaterialPoints };
