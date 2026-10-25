'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../../config');

const KIOSK_SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const SCHEMA_PATH = path.join(__dirname, '../../../db/sqlite-schema.sql');

fs.mkdirSync(path.dirname(config.sqlitePath), { recursive: true });

const db = new DatabaseSync(config.sqlitePath);
db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));

const dispenseColumns = db.prepare('PRAGMA table_info(rice_dispenses)').all();
if (!dispenseColumns.some((column) => column.name === 'pack_size')) {
  db.exec(
    "ALTER TABLE rice_dispenses ADD COLUMN pack_size TEXT NOT NULL DEFAULT '1/4' CHECK (pack_size IN ('1/8', '1/4', '1/2'))",
  );
}

function nowIso() {
  return new Date().toISOString();
}

function mapSession(row) {
  return {
    id: row.session_id,
    points: row.points_balance,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_seen_at: row.last_seen_at,
  };
}

function mapQr(row) {
  if (!row) return null;
  return {
    id: row.token_id,
    points: row.points,
    valid: row.status === 'active' ? 1 : 0,
    created_at: row.created_at,
    used_at: row.used_at,
  };
}

function hashShortCode(code) {
  return crypto
    .createHash('sha256')
    .update(String(code).trim().toUpperCase())
    .digest('hex');
}

function mapDeposit(row) {
  if (!row) return null;
  return {
    event_id: row.event_id,
    type: row.reported_type,
    label: row.reported_type,
    points: row.points_awarded,
    status: row.status,
    created_at: row.created_at,
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

function ensureSessionSync(sessionId) {
  const now = nowIso();
  const row = db
    .prepare('SELECT * FROM kiosk_sessions WHERE session_id = ?')
    .get(sessionId);

  if (!row) {
    db.prepare(
      `INSERT INTO kiosk_sessions
         (session_id, points_balance, created_at, updated_at, last_seen_at)
       VALUES (?, 0, ?, ?, ?)`,
    ).run(sessionId, now, now, now);
    return {
      id: sessionId,
      points: 0,
      created_at: now,
      updated_at: now,
      last_seen_at: now,
    };
  }

  const expired = Date.now() - Date.parse(row.last_seen_at) > KIOSK_SESSION_TIMEOUT_MS;
  if (expired) {
    db.prepare(
      `UPDATE kiosk_sessions
          SET points_balance = 0, created_at = ?, updated_at = ?, last_seen_at = ?
        WHERE session_id = ?`,
    ).run(now, now, now, sessionId);
    return { ...mapSession(row), points: 0, created_at: now, updated_at: now, last_seen_at: now };
  }

  db.prepare(
    'UPDATE kiosk_sessions SET updated_at = ?, last_seen_at = ? WHERE session_id = ?',
  ).run(now, now, sessionId);
  return { ...mapSession(row), updated_at: now, last_seen_at: now };
}

function withImmediateTransaction(work) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Keep the original failure.
    }
    throw error;
  }
}

async function depositExists(eventId) {
  return Boolean(
    db.prepare('SELECT 1 FROM trash_deposits WHERE event_id = ? LIMIT 1').get(eventId),
  );
}

async function saveDeposit(record, sessionId = null) {
  db.prepare(
    `INSERT INTO trash_deposits
       (event_id, session_id, reported_type, points_awarded, status, detected_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (event_id) DO NOTHING`,
  ).run(
    record.event_id,
    sessionId,
    record.type,
    record.points,
    record.status || 'accepted',
    record.created_at || nowIso(),
    record.created_at || nowIso(),
  );
}

async function getDeposit(eventId) {
  return mapDeposit(
    db.prepare('SELECT * FROM trash_deposits WHERE event_id = ? LIMIT 1').get(eventId),
  );
}

async function saveQr(qrRecord) {
  const tokenHash = crypto.createHash('sha256').update(qrRecord.token).digest('hex');

  db.prepare(
    `INSERT INTO points_codes
       (token_id, token_hash, short_code_hash, points, status, created_at)
     VALUES (?, ?, ?, ?, 'active', ?)`,
  ).run(
    qrRecord.id,
    tokenHash,
    hashShortCode(qrRecord.alphanumeric),
    qrRecord.points,
    qrRecord.created_at || nowIso(),
  );
}

async function getQrById(id) {
  return mapQr(
    db.prepare('SELECT * FROM points_codes WHERE token_id = ? LIMIT 1').get(id),
  );
}

async function redeemQr(id) {
  const result = db
    .prepare(
      `UPDATE points_codes
          SET status = 'used', used_at = ?
        WHERE token_id = ? AND status = 'active'`,
    )
    .run(nowIso(), id);

  if (result.changes > 0) return { redeemed: true };

  const row = db
    .prepare('SELECT status FROM points_codes WHERE token_id = ? LIMIT 1')
    .get(id);
  if (!row) return { redeemed: false, reason: 'QR code not found.' };
  return { redeemed: false, reason: 'QR code has already been used.' };
}

/**
 * Redeem a points code and credit the session in one sandbox transaction.
 * The code may be addressed by signed token id or by its short fallback code.
 */
async function scanQrToSession({ qrId = null, shortCode = null, sessionId }) {
  return withImmediateTransaction(() => {
    ensureSessionSync(sessionId);

    const row = qrId
      ? db
          .prepare(
            'SELECT token_id, points, status FROM points_codes WHERE token_id = ? LIMIT 1',
          )
          .get(qrId)
      : db
          .prepare(
            `SELECT token_id, points, status
               FROM points_codes
              WHERE short_code_hash = ?
              LIMIT 1`,
          )
          .get(hashShortCode(shortCode));

    if (!row) {
      return {
        ok: false,
        statusCode: 404,
        code: 'TOKEN_NOT_FOUND',
        message: 'Points code not found. Create a new points claim in this kiosk.',
      };
    }

    if (row.status !== 'active') {
      return {
        ok: false,
        statusCode: 409,
        code: 'ALREADY_REDEEMED',
        message: 'This points code has already been used.',
      };
    }

    const now = nowIso();
    db.prepare(
      `UPDATE points_codes
          SET status = 'used', used_at = ?, used_session_id = ?
        WHERE token_id = ? AND status = 'active'`,
    ).run(now, sessionId, row.token_id);

    db.prepare(
      `UPDATE kiosk_sessions
          SET points_balance = points_balance + ?, updated_at = ?, last_seen_at = ?
        WHERE session_id = ?`,
    ).run(row.points, now, now, sessionId);

    const session = mapSession(
      db.prepare('SELECT * FROM kiosk_sessions WHERE session_id = ?').get(sessionId),
    );

    return { ok: true, points: row.points, session };
  });
}

async function ensureSession(sessionId) {
  return ensureSessionSync(sessionId);
}

async function getSession(sessionId) {
  const row = db
    .prepare('SELECT * FROM kiosk_sessions WHERE session_id = ? LIMIT 1')
    .get(sessionId);
  return row ? mapSession(row) : null;
}

async function addSessionPoints(sessionId, points) {
  return withImmediateTransaction(() => {
    ensureSessionSync(sessionId);
    db.prepare(
      `UPDATE kiosk_sessions
          SET points_balance = points_balance + ?, updated_at = ?, last_seen_at = ?
        WHERE session_id = ?`,
    ).run(points, nowIso(), nowIso(), sessionId);
    return mapSession(
      db.prepare('SELECT * FROM kiosk_sessions WHERE session_id = ?').get(sessionId),
    );
  });
}

async function withdrawSessionPoints(sessionId) {
  return withImmediateTransaction(() => {
    const session = ensureSessionSync(sessionId);
    db.prepare(
      'UPDATE kiosk_sessions SET points_balance = 0, updated_at = ? WHERE session_id = ?',
    ).run(nowIso(), sessionId);
    return session.points;
  });
}

async function deductSessionPoints(sessionId, points) {
  return withImmediateTransaction(() => {
    ensureSessionSync(sessionId);
    const result = db
      .prepare(
        `UPDATE kiosk_sessions
            SET points_balance = points_balance - ?, updated_at = ?, last_seen_at = ?
          WHERE session_id = ? AND points_balance >= ?`,
      )
      .run(points, nowIso(), nowIso(), sessionId, points);
    if (result.changes === 0) return null;
    return mapSession(
      db.prepare('SELECT * FROM kiosk_sessions WHERE session_id = ?').get(sessionId),
    );
  });
}

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

  return withImmediateTransaction(() => {
    const inventory = db
      .prepare('SELECT packs_available FROM rice_inventory WHERE id = 1')
      .get();
    const stock = inventory?.packs_available ?? 0;

    const existing = db
      .prepare('SELECT * FROM rice_dispenses WHERE request_id = ? LIMIT 1')
      .get(requestId);
    if (existing) {
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

    const session = db
      .prepare('SELECT * FROM kiosk_sessions WHERE session_id = ?')
      .get(sessionId);
    const pointsRequired = pointsPerPack * quantity;
    const expired = session
      ? Date.now() - Date.parse(session.last_seen_at) > KIOSK_SESSION_TIMEOUT_MS
      : true;
    const availablePoints = expired ? 0 : session.points_balance;

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
    const timestamp = nowIso();

    db.prepare(
      'UPDATE rice_inventory SET packs_available = ?, updated_at = ? WHERE id = 1',
    ).run(stockAfter, timestamp);
    db.prepare(
      `UPDATE kiosk_sessions
          SET points_balance = ?, updated_at = ?, last_seen_at = ?
        WHERE session_id = ?`,
    ).run(pointsRemaining, timestamp, timestamp, sessionId);
    db.prepare(
      `INSERT INTO rice_dispenses
         (request_id, session_id, quantity, pack_size, points_per_pack, points_used,
          points_remaining, stock_before, stock_after, status, created_at,
          updated_at, confirmed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?)`,
    ).run(
      requestId,
      sessionId,
      quantity,
      packSize,
      pointsPerPack,
      pointsRequired,
      pointsRemaining,
      stock,
      stockAfter,
      timestamp,
      timestamp,
      timestamp,
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
  const row = db
    .prepare('SELECT packs_available FROM rice_inventory WHERE id = 1')
    .get();
  return row?.packs_available ?? 0;
}

async function addRiceInventory(amount) {
  return withImmediateTransaction(() => {
    db.prepare(
      `INSERT INTO rice_inventory (id, packs_available, updated_at)
       VALUES (1, ?, ?)
       ON CONFLICT (id) DO UPDATE
         SET packs_available = packs_available + excluded.packs_available,
             updated_at = excluded.updated_at`,
    ).run(amount, nowIso());
    return db
      .prepare('SELECT packs_available FROM rice_inventory WHERE id = 1')
      .get().packs_available;
  });
}

async function resetRiceInventory() {
  return withImmediateTransaction(() => {
    db.prepare(
      'UPDATE rice_inventory SET packs_available = 50, updated_at = ? WHERE id = 1',
    ).run(nowIso());
    return 50;
  });
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
