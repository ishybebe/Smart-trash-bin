-- Smart Bin · Rice Vendo — MySQL 8 schema (Simplified)
-- Import into dbdiagram.io / drawSQL / MySQL Workbench to visualise the ERD.
--
-- Design notes:
--   * Idempotency keys: trash_deposits.event_id, rice_dispenses.request_id,
--     points_codes.token_hash.
--   * Balances and inventory are updated directly in their respective tables 
--     (kiosk_sessions, rice_inventory). Action tables (trash_deposits, 
--     rice_dispenses, points_codes) serve as the natural history and audit trail.
--   * QR tokens are never stored raw; only SHA-256 hashes are retained.

SET NAMES utf8mb4;

-- ── Reference data ───────────────────────────────────────────────────────────

CREATE TABLE accepted_materials (
  id          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code        VARCHAR(32)       NOT NULL,
  label       VARCHAR(64)       NOT NULL,
  points      SMALLINT UNSIGNED NOT NULL,
  is_active   TINYINT(1)        NOT NULL DEFAULT 1,
  created_at  DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_accepted_materials_code (code),
  CONSTRAINT chk_accepted_materials_points CHECK (points > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Kiosk sessions ───────────────────────────────────────────────────────────

CREATE TABLE kiosk_sessions (
  session_id      VARCHAR(64)  NOT NULL,
  points_balance  INT UNSIGNED NOT NULL DEFAULT 0,
  created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  last_seen_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (session_id),
  KEY idx_kiosk_sessions_last_seen (last_seen_at),
  CONSTRAINT chk_kiosk_sessions_id_length CHECK (CHAR_LENGTH(session_id) BETWEEN 8 AND 64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Deposits detected by the camera ──────────────────────────────────────────

CREATE TABLE trash_deposits (
  id                BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  event_id          VARCHAR(128)      NOT NULL,
  session_id        VARCHAR(64)       NULL,
  material_id       SMALLINT UNSIGNED NULL,
  reported_type     VARCHAR(64)       NOT NULL,
  confidence        DECIMAL(4,3)      NULL,
  points_awarded    INT UNSIGNED      NOT NULL DEFAULT 0,
  status            ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
  rejection_reason  VARCHAR(255)      NULL,
  sensor_context    JSON              NULL,
  detected_at       DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at        DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_trash_deposits_event_id (event_id),
  KEY idx_trash_deposits_session (session_id),
  KEY idx_trash_deposits_material (material_id),
  KEY idx_trash_deposits_status_created (status, created_at),
  KEY idx_trash_deposits_created (created_at),
  CONSTRAINT fk_trash_deposits_session
    FOREIGN KEY (session_id) REFERENCES kiosk_sessions (session_id) ON DELETE SET NULL,
  CONSTRAINT fk_trash_deposits_material
    FOREIGN KEY (material_id) REFERENCES accepted_materials (id) ON DELETE SET NULL,
  CONSTRAINT chk_trash_deposits_confidence
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Single-use points codes (QR / alphanumeric fallback) ─────────────────────

CREATE TABLE points_codes (
  token_id         CHAR(36)       NOT NULL,
  token_hash       CHAR(64)       NOT NULL,
  short_code_hash  CHAR(64)       NULL,
  points           INT UNSIGNED   NOT NULL,
  status           ENUM('active','used','revoked','expired') NOT NULL DEFAULT 'active',
  source_session_id VARCHAR(64)   NULL,
  used_session_id  VARCHAR(64)    NULL,
  created_at       DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at       DATETIME(3)    NULL,
  used_at          DATETIME(3)    NULL,
  PRIMARY KEY (token_id),
  UNIQUE KEY uq_points_codes_token_hash (token_hash),
  UNIQUE KEY uq_points_codes_short_code_hash (short_code_hash),
  KEY idx_points_codes_status (status),
  KEY idx_points_codes_created (created_at),
  KEY idx_points_codes_used_session (used_session_id),
  CONSTRAINT fk_points_codes_source_session
    FOREIGN KEY (source_session_id) REFERENCES kiosk_sessions (session_id) ON DELETE SET NULL,
  CONSTRAINT fk_points_codes_used_session
    FOREIGN KEY (used_session_id) REFERENCES kiosk_sessions (session_id) ON DELETE SET NULL,
  CONSTRAINT chk_points_codes_points CHECK (points > 0),
  CONSTRAINT chk_points_codes_used CHECK (status <> 'used' OR used_at IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Rice inventory ───────────────────────────────────────────────────────────

CREATE TABLE rice_inventory (
  id                   TINYINT UNSIGNED NOT NULL DEFAULT 1,
  packs_available      INT UNSIGNED     NOT NULL DEFAULT 0,
  low_stock_threshold  INT UNSIGNED     NOT NULL DEFAULT 5,
  updated_at           DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT chk_rice_inventory_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Rice pricing ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rice_pricing (
  id           SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pack_size    ENUM('1/8', '1/4', '1/2') NOT NULL,
  points_price SMALLINT UNSIGNED NOT NULL,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  updated_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_rice_pricing_size (pack_size)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rice_dispenses (
  id                BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  request_id        VARCHAR(64)      NOT NULL,
  session_id        VARCHAR(64)      NOT NULL,
  quantity          TINYINT UNSIGNED NOT NULL,
  pack_size         ENUM('1/8', '1/4', '1/2') NOT NULL,
  points_per_pack   SMALLINT UNSIGNED NOT NULL,
  points_used       INT UNSIGNED     NOT NULL,
  points_remaining  INT UNSIGNED     NOT NULL,
  stock_before      INT UNSIGNED     NOT NULL,
  stock_after       INT UNSIGNED     NOT NULL,
  status            ENUM('pending','dispensing','confirmed','failed','recovery_required')
                    NOT NULL DEFAULT 'pending',
  actuator_ref      VARCHAR(128)     NULL,
  failure_reason    VARCHAR(255)     NULL,
  created_at        DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  confirmed_at      DATETIME(3)      NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rice_dispenses_request_id (request_id),
  KEY idx_rice_dispenses_session (session_id),
  KEY idx_rice_dispenses_status_created (status, created_at),
  KEY idx_rice_dispenses_created (created_at),
  CONSTRAINT fk_rice_dispenses_session
    FOREIGN KEY (session_id) REFERENCES kiosk_sessions (session_id) ON DELETE RESTRICT,
  CONSTRAINT chk_rice_dispenses_quantity CHECK (quantity BETWEEN 1 AND 10),
  CONSTRAINT chk_rice_dispenses_points CHECK (points_used > 0),
  CONSTRAINT chk_rice_dispenses_stock CHECK (stock_after <= stock_before)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Hardware health ──────────────────────────────────────────────────────────

CREATE TABLE hardware_status (
  component     ENUM('kiosk','camera','esp32') NOT NULL,
  status        ENUM('online','offline','unknown') NOT NULL DEFAULT 'unknown',
  last_seen_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  details       JSON        NULL,
  updated_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (component)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Admin access and audit ───────────────────────────────────────────────────

CREATE TABLE admin_users (
  id            SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(64)       NOT NULL,
  password_hash VARCHAR(255)      NOT NULL,
  role          ENUM('admin','operator') NOT NULL DEFAULT 'admin',
  is_active     TINYINT(1)        NOT NULL DEFAULT 1,
  last_login_at DATETIME(3)       NULL,
  created_at    DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin_audit_log (
  id            BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  admin_user_id SMALLINT UNSIGNED NULL,
  action        VARCHAR(64)       NOT NULL,
  entity_type   VARCHAR(64)       NULL,
  entity_id     VARCHAR(64)       NULL,
  details       JSON              NULL,
  created_at    DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_admin_audit_log_user (admin_user_id, created_at),
  KEY idx_admin_audit_log_entity (entity_type, entity_id),
  KEY idx_admin_audit_log_created (created_at),
  CONSTRAINT fk_admin_audit_log_user
    FOREIGN KEY (admin_user_id) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE report_generations (
  report_id     CHAR(36)         NOT NULL,
  admin_user_id SMALLINT UNSIGNED NOT NULL,
  report_data   JSON             NOT NULL,
  created_at    DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (report_id),
  KEY idx_report_generations_admin_created (admin_user_id, created_at),
  KEY idx_report_generations_created (created_at),
  CONSTRAINT fk_report_generations_admin
    FOREIGN KEY (admin_user_id) REFERENCES admin_users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Seed data ────────────────────────────────────────────────────────────────

INSERT INTO accepted_materials (code, label, points) VALUES
  ('plastic_bottle', 'Plastic Bottle', 5),
  ('plastic_waste',  'Plastic Waste',  3),
  ('glass_bottle',   'Glass Bottle',   8),
  ('glass',          'Glass',          6),
  ('can',            'Aluminum Can',   7),
  ('cardboard',      'Cardboard',      4)
ON DUPLICATE KEY UPDATE label = VALUES(label), points = VALUES(points);

INSERT INTO rice_inventory (id, packs_available, low_stock_threshold)
VALUES (1, 50, 5)
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO rice_pricing (pack_size, points_price, is_active) VALUES
  ('1/4', 20, 1),
  ('1/8', 10, 0),
  ('1/2', 40, 0)
ON DUPLICATE KEY UPDATE
  points_price = VALUES(points_price),
  is_active = VALUES(is_active);

INSERT INTO hardware_status (component, status) VALUES
  ('kiosk',  'online'),
  ('camera', 'unknown'),
  ('esp32',  'unknown')
ON DUPLICATE KEY UPDATE component = component;
