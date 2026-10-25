'use strict';

const crypto = require('crypto');
const { getPool, withTransaction } = require('../mysql');

const KIOSK_SESSION_TIMEOUT_SECONDS = 5 * 60;

function toIso(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value);
  if (text.includes('T')) return text;
  return `${text.replace(' ', 'T')}Z`;
}

function mapSession(row) {
  return {
    id: row.session_id,
    points: row.points_balance,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    last_seen_at: toIso(row.last_seen_at),
  };
}

function mapQr(row) {
  return {
    id: row.token_id,
    points: row.points,
    valid: row.status === 'active' ? 1 : 0,
    created_at: toIso(row.created_at),
    used_at: toIso(row.used_at),
  };
}

function hashShortCode(code) {
  return crypto
    .createHash('sha256')
    .update(String(code).trim().toUpperCase())
    .digest('hex');
}

function mapDeposit(row) {
  return {
    event_id: row.event_id,
    type: row.reported_type,
    label: row.label || row.reported_type,
    points: row.points_awarded,
    status: row.status,
    created_at: toIso(row.created_at),
  };
}

function dispensePayload(row, packSize = null) {
  return {
    dispensed: row.status === 'confirmed',
    quantity_dispensed: row.quantity,
    pack_size: packSize,
    points_per_pack: row.points_per_pack,
    points_used: row.points_used,
    points_remaining: row.points_remaining,
    rice_inventory: row.stock_after,
    dispense_status: row.status,
    message: packSize
      ? `Dispensed ${row.quantity} pack(s) of ${packSize} kg rice.`
      : `Dispensed ${row.quantity} rice pack(s).`,
  };
}

async function ensureSessionConnection(connection, sessionId) {
  const [rows] = await connection.query(
    `SELECT session_id, points_balance, created_at, updated_at, last_seen_at,
            (last_seen_at < (NOW(3) - INTERVAL ? SECOND)) AS expired
       FROM kiosk_sessions
      WHERE session_id = ?
      FOR UPDATE`,
    [KIOSK_SESSION_TIMEOUT_SECONDS, sessionId],
  );

  if (rows.length === 0) {
    await connection.query(
      `INSERT INTO kiosk_sessions
         (session_id, points_balance, created_at, updated_at, last_seen_at)
       VALUES (?, 0, NOW(3), NOW(3), NOW(3))`,
      [sessionId],
    );
  } else if (rows[0].expired) {
    await connection.query(
      `UPDATE kiosk_sessions
          SET points_balance = 0,
              created_at = NOW(3),
              updated_at = NOW(3),
              last_seen_at = NOW(3)
        WHERE session_id = ?`,
      [sessionId],
    );
  } else {
    await connection.query(
      `UPDATE kiosk_sessions
          SET updated_at = NOW(3), last_seen_at = NOW(3)
        WHERE session_id = ?`,
      [sessionId],
    );
  }

  const [fresh] = await connection.query(
    'SELECT * FROM kiosk_sessions WHERE session_id = ?',
    [sessionId],
  );
  return mapSession(fresh[0]);
}

async function depositExists(eventId) {
  const [rows] = await getPool().query(
    'SELECT 1 FROM trash_deposits WHERE event_id = ? LIMIT 1',
    [eventId],
  );
  return rows.length > 0;
}

async function saveDeposit(record, sessionId = null) {
  await getPool().query(
    `INSERT INTO trash_deposits
       (event_id, session_id, reported_type, points_awarded, status,
        detected_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW(3))
     ON DUPLICATE KEY UPDATE event_id = event_id`,
    [
      record.event_id,
      sessionId,
      record.type,
      record.points,
      record.status || 'accepted',
      record.created_at ? new Date(record.created_at) : new Date(),
    ],
  );
}

async function getDeposit(eventId) {
  const [rows] = await getPool().query(
    `SELECT d.*, m.label
       FROM trash_deposits d
       LEFT JOIN accepted_materials m ON m.id = d.material_id
      WHERE d.event_id = ?
      LIMIT 1`,
    [eventId],
  );
  return rows[0] ? mapDeposit(rows[0]) : null;
}

async function saveQr(qrRecord) {
  const tokenHash = crypto.createHash('sha256').update(qrRecord.token).digest('hex');

  await getPool().query(
    `INSERT INTO points_codes
       (token_id, token_hash, short_code_hash, points, status, created_at)
     VALUES (?, ?, ?, ?, 'active', ?)`,
    [
      qrRecord.id,
      tokenHash,
      hashShortCode(qrRecord.alphanumeric),
      qrRecord.points,
      qrRecord.created_at ? new Date(qrRecord.created_at) : new Date(),
    ],
  );
}

async function getQrById(id) {
  const [rows] = await getPool().query(
    'SELECT * FROM points_codes WHERE token_id = ? LIMIT 1',
    [id],
  );
  return rows[0] ? mapQr(rows[0]) : null;
}

async function redeemQr(id) {
  const [result] = await getPool().query(
    `UPDATE points_codes
        SET status = 'used', used_at = NOW(3)
      WHERE token_id = ? AND status = 'active'`,
    [id],
  );

  if (result.affectedRows > 0) return { redeemed: true };

  const [rows] = await getPool().query(
    'SELECT status FROM points_codes WHERE token_id = ? LIMIT 1',
    [id],
  );
  if (rows.length === 0) return { redeemed: false, reason: 'QR code not found.' };
  return { redeemed: false, reason: 'QR code has already been used.' };
}

/**
 * Redeem a points code and credit the session in one transaction. The code may
 * be addressed by signed token id or by its short fallback code.
 */
async function scanQrToSession({ qrId = null, shortCode = null, sessionId }) {
  return withTransaction(async (connection) => {
    const session = await ensureSessionConnection(connection, sessionId);

    const [rows] = qrId
      ? await connection.query(
          `SELECT token_id, points, status
             FROM points_codes
            WHERE token_id = ?
            LIMIT 1
              FOR UPDATE`,
          [qrId],
        )
      : await connection.query(
          `SELECT token_id, points, status
             FROM points_codes
            WHERE short_code_hash = ?
            LIMIT 1
              FOR UPDATE`,
          [hashShortCode(shortCode)],
        );

    const code = rows[0];
    if (!code) {
      return {
        ok: false,
        statusCode: 404,
        code: 'TOKEN_NOT_FOUND',
        message: 'Points code not found. Create a new points claim in this kiosk.',
      };
    }

    if (code.status !== 'active') {
      return {
        ok: false,
        statusCode: 409,
        code: 'ALREADY_REDEEMED',
        message: 'This points code has already been used.',
      };
    }

    await connection.query(
      `UPDATE points_codes
          SET status = 'used', used_at = NOW(3), used_session_id = ?
        WHERE token_id = ? AND status = 'active'`,
      [sessionId, code.token_id],
    );

    await connection.query(
      `UPDATE kiosk_sessions
          SET points_balance = points_balance + ?,
              updated_at = NOW(3),
              last_seen_at = NOW(3)
        WHERE session_id = ?`,
      [code.points, sessionId],
    );

    const [fresh] = await connection.query(
      'SELECT * FROM kiosk_sessions WHERE session_id = ?',
      [sessionId],
    );

    return {
      ok: true,
      points: code.points,
      session: mapSession(fresh[0] || session),
    };
  });
}

async function ensureSession(sessionId) {
  return withTransaction((connection) =>
    ensureSessionConnection(connection, sessionId),
  );
}

async function getSession(sessionId) {
  const [rows] = await getPool().query(
    'SELECT * FROM kiosk_sessions WHERE session_id = ? LIMIT 1',
    [sessionId],
  );
  return rows[0] ? mapSession(rows[0]) : null;
}

async function addSessionPoints(sessionId, points) {
  return withTransaction(async (connection) => {
    await ensureSessionConnection(connection, sessionId);
    await connection.query(
      `UPDATE kiosk_sessions
          SET points_balance = points_balance + ?,
              updated_at = NOW(3),
              last_seen_at = NOW(3)
        WHERE session_id = ?`,
      [points, sessionId],
    );
    const [rows] = await connection.query(
      'SELECT * FROM kiosk_sessions WHERE session_id = ?',
      [sessionId],
    );
    return mapSession(rows[0]);
  });
}

async function withdrawSessionPoints(sessionId) {
  return withTransaction(async (connection) => {
    const session = await ensureSessionConnection(connection, sessionId);
    await connection.query(
      `UPDATE kiosk_sessions
          SET points_balance = 0, updated_at = NOW(3)
        WHERE session_id = ?`,
      [sessionId],
    );
    return session.points;
  });
}

async function deductSessionPoints(sessionId, points) {
  return withTransaction(async (connection) => {
    await ensureSessionConnection(connection, sessionId);
    const [result] = await connection.query(
      `UPDATE kiosk_sessions
          SET points_balance = points_balance - ?,
              updated_at = NOW(3),
              last_seen_at = NOW(3)
        WHERE session_id = ? AND points_balance >= ?`,
      [points, sessionId, points],
    );
    if (result.affectedRows === 0) return null;
    const [rows] = await connection.query(
      'SELECT * FROM kiosk_sessions WHERE session_id = ?',
      [sessionId],
    );
    return mapSession(rows[0]);
  });
}

/**
 * Atomically dispense rice for a request id. The inventory row lock serialises
 * concurrent dispenses, so a retried request can only ever return the original
 * confirmation and can never double-dispense.
 */
async function dispenseRice({
  sessionId,
  quantity,
  requestId,
  packSize,
  pointsPerPack,
}) {
  if (!Number.isInteger(pointsPerPack) || pointsPerPack < 1) {
    return {
      ok: false,
      statusCode: 422,
      code: 'INVALID_PRICE',
      message: 'A valid rice price is required for this dispense.',
    };
  }

  return withTransaction(async (connection) => {
    const [inventoryRows] = await connection.query(
      'SELECT packs_available FROM rice_inventory WHERE id = 1 FOR UPDATE',
    );
    const stock = inventoryRows[0]?.packs_available ?? 0;

    const [existingRows] = await connection.query(
      'SELECT * FROM rice_dispenses WHERE request_id = ? LIMIT 1',
      [requestId],
    );
    if (existingRows[0]) {
      const existing = existingRows[0];
      if (existing.status === 'confirmed') {
        return { ok: true, payload: dispensePayload(existing) };
      }
      return {
        ok: false,
        statusCode: 409,
        code: 'DISPENSE_IN_PROGRESS',
        message: 'This dispense is still being confirmed. Retry in a moment.',
      };
    }

    if (stock < quantity) {
      return {
        ok: false,
        statusCode: 409,
        code: 'RICE_OUT_OF_STOCK',
        message:
          stock === 0
            ? 'The vendo is out of rice. Your points stay saved in this session.'
            : `Only ${stock} pack(s) remain. Choose a smaller quantity.`,
      };
    }

    const [sessionRows] = await connection.query(
      `SELECT *,
              (last_seen_at < (NOW(3) - INTERVAL ? SECOND)) AS expired
         FROM kiosk_sessions
        WHERE session_id = ?
        FOR UPDATE`,
      [KIOSK_SESSION_TIMEOUT_SECONDS, sessionId],
    );
    const pointsRequired = pointsPerPack * quantity;
    const session = sessionRows[0];
    const availablePoints = session?.expired ? 0 : (session?.points_balance ?? 0);

    if (availablePoints < pointsRequired) {
      return {
        ok: false,
        statusCode: 422,
        code: 'INSUFFICIENT_POINTS',
        message: `${pointsRequired} points are required for ${quantity} ${packSize} kg rice pack(s).`,
      };
    }

    const pointsRemaining = availablePoints - pointsRequired;
    const stockAfter = stock - quantity;

    await connection.query(
      'UPDATE rice_inventory SET packs_available = ?, updated_at = NOW(3) WHERE id = 1',
      [stockAfter],
    );
    await connection.query(
      `UPDATE kiosk_sessions
          SET points_balance = ?, updated_at = NOW(3), last_seen_at = NOW(3)
        WHERE session_id = ?`,
      [pointsRemaining, sessionId],
    );
    await connection.query(
      `INSERT INTO rice_dispenses
         (request_id, session_id, quantity, pack_size, points_per_pack, points_used,
          points_remaining, stock_before, stock_after, status, confirmed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', NOW(3))`,
      [
        requestId,
        sessionId,
        quantity,
        packSize,
        pointsPerPack,
        pointsRequired,
        pointsRemaining,
        stock,
        stockAfter,
      ],
    );

    return {
      ok: true,
      payload: {
        dispensed: true,
        quantity_dispensed: quantity,
        pack_size: packSize,
        points_per_pack: pointsPerPack,
        points_used: pointsRequired,
        points_remaining: pointsRemaining,
        rice_inventory: stockAfter,
        dispense_status: 'confirmed',
        message: `Dispensed ${quantity} pack(s) of ${packSize} kg rice.`,
      },
    };
  });
}

async function getRiceInventory() {
  const [rows] = await getPool().query(
    'SELECT packs_available FROM rice_inventory WHERE id = 1',
  );
  return rows[0]?.packs_available ?? 0;
}

async function addRiceInventory(amount) {
  return withTransaction(async (connection) => {
    await connection.query(
      `INSERT INTO rice_inventory (id, packs_available, updated_at)
       VALUES (1, ?, NOW(3))
       ON DUPLICATE KEY UPDATE
         packs_available = packs_available + VALUES(packs_available),
         updated_at = NOW(3)`,
      [amount],
    );
    const [rows] = await connection.query(
      'SELECT packs_available FROM rice_inventory WHERE id = 1',
    );
    return rows[0].packs_available;
  });
}

async function resetRiceInventory() {
  await getPool().query(
    'UPDATE rice_inventory SET packs_available = 0, updated_at = NOW(3) WHERE id = 1',
  );
  return 0;
}

module.exports = {
  depositExists,
  saveDeposit,
  getDeposit,
  saveQr,
  getQrById,
  redeemQr,
  scanQrToSession,
  ensureSession,
  getSession,
  addSessionPoints,
  withdrawSessionPoints,
  deductSessionPoints,
  dispenseRice,
  getRiceInventory,
  addRiceInventory,
  resetRiceInventory,
};
