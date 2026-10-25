-- Smart Bin · Rice Vendo — local SQLite sandbox schema
-- Mirrors the transactional tables used by the live MySQL schema. Reference
-- data (accepted materials) is never copied here; it is read from MySQL.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS kiosk_sessions (
  session_id      TEXT    NOT NULL PRIMARY KEY,
  points_balance  INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  last_seen_at    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS trash_deposits (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id          TEXT    NOT NULL UNIQUE,
  session_id        TEXT    NULL REFERENCES kiosk_sessions (session_id) ON DELETE SET NULL,
  material_id       INTEGER NULL,
  reported_type     TEXT    NOT NULL,
  confidence        REAL    NULL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  points_awarded    INTEGER NOT NULL DEFAULT 0,
  status            TEXT    NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'rejected')),
  rejection_reason  TEXT    NULL,
  sensor_context    TEXT    NULL,
  detected_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS points_codes (
  token_id          TEXT    NOT NULL PRIMARY KEY,
  token_hash        TEXT    NOT NULL UNIQUE,
  short_code_hash   TEXT    NULL UNIQUE,
  points            INTEGER NOT NULL CHECK (points > 0),
  status            TEXT    NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'used', 'revoked', 'expired')),
  source_session_id TEXT    NULL REFERENCES kiosk_sessions (session_id) ON DELETE SET NULL,
  used_session_id   TEXT    NULL REFERENCES kiosk_sessions (session_id) ON DELETE SET NULL,
  created_at        TEXT    NOT NULL,
  expires_at        TEXT    NULL,
  used_at           TEXT    NULL,
  CHECK (status <> 'used' OR used_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS rice_inventory (
  id                   INTEGER NOT NULL PRIMARY KEY CHECK (id = 1),
  packs_available      INTEGER NOT NULL DEFAULT 0 CHECK (packs_available >= 0),
  low_stock_threshold  INTEGER NOT NULL DEFAULT 5,
  updated_at           TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS rice_dispenses (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id        TEXT    NOT NULL UNIQUE,
  session_id        TEXT    NOT NULL REFERENCES kiosk_sessions (session_id) ON DELETE RESTRICT,
  quantity          INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  pack_size         TEXT    NOT NULL CHECK (pack_size IN ('1/8', '1/4', '1/2')),
  points_per_pack   INTEGER NOT NULL,
  points_used       INTEGER NOT NULL CHECK (points_used > 0),
  points_remaining  INTEGER NOT NULL,
  stock_before      INTEGER NOT NULL,
  stock_after       INTEGER NOT NULL,
  status            TEXT    NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'dispensing', 'confirmed', 'failed', 'recovery_required')),
  actuator_ref      TEXT    NULL,
  failure_reason    TEXT    NULL,
  created_at        TEXT    NOT NULL,
  updated_at        TEXT    NOT NULL,
  confirmed_at      TEXT    NULL,
  CHECK (stock_after <= stock_before)
);

CREATE INDEX IF NOT EXISTS idx_trash_deposits_session ON trash_deposits (session_id);
CREATE INDEX IF NOT EXISTS idx_trash_deposits_status_created ON trash_deposits (status, created_at);
CREATE INDEX IF NOT EXISTS idx_points_codes_status ON points_codes (status);
CREATE INDEX IF NOT EXISTS idx_rice_dispenses_session ON rice_dispenses (session_id);

INSERT INTO rice_inventory (id, packs_available, low_stock_threshold, updated_at)
VALUES (1, 50, 5, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT (id) DO NOTHING;
