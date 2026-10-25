-- Smart Bin analytics sandbox data.
-- Run against the configured MySQL database only when demo data is desired.
-- The event/request/token identifiers are prefixed so this script can be
-- safely removed with the cleanup statements at the bottom.

SET NAMES utf8mb4;

INSERT INTO kiosk_sessions (session_id, points_balance, created_at, updated_at, last_seen_at)
VALUES
  ('analytics-seed-01', 0, NOW(3), NOW(3), NOW(3)),
  ('analytics-seed-02', 0, NOW(3), NOW(3), NOW(3)),
  ('analytics-seed-03', 0, NOW(3), NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE session_id = VALUES(session_id);

-- 60 accepted detections across the last seven days.
INSERT INTO trash_deposits
  (event_id, session_id, material_id, reported_type, confidence, points_awarded,
   status, detected_at, created_at)
WITH RECURSIVE numbers AS (
  SELECT 1 AS sequence_no
  UNION ALL
  SELECT sequence_no + 1 FROM numbers WHERE sequence_no < 60
)
SELECT
  CONCAT('analytics-seed-deposit-', seq.sequence_no),
  CASE MOD(seq.sequence_no, 3)
    WHEN 0 THEN 'analytics-seed-01'
    WHEN 1 THEN 'analytics-seed-02'
    ELSE 'analytics-seed-03'
  END,
  material.id,
  material.code,
  0.950,
  material.points,
  'accepted',
  DATE_SUB(NOW(3), INTERVAL MOD(seq.sequence_no * 7, 7 * 24 * 60 * 60) SECOND),
  DATE_SUB(NOW(3), INTERVAL MOD(seq.sequence_no * 7, 7 * 24 * 60 * 60) SECOND)
FROM numbers AS seq
JOIN accepted_materials AS material
  ON material.code = CASE MOD(seq.sequence_no, 3)
    WHEN 0 THEN 'plastic_bottle'
    WHEN 1 THEN 'glass_bottle'
    ELSE 'can'
  END
ON DUPLICATE KEY UPDATE event_id = VALUES(event_id);

-- 20 confirmed redemptions using the current pack-size enum.
INSERT INTO rice_dispenses
  (request_id, session_id, quantity, pack_size, points_per_pack, points_used,
   points_remaining, stock_before, stock_after, status, created_at, updated_at,
   confirmed_at)
WITH RECURSIVE numbers AS (
  SELECT 1 AS sequence_no
  UNION ALL
  SELECT sequence_no + 1 FROM numbers WHERE sequence_no < 20
)
SELECT
  CONCAT('analytics-seed-dispense-', seq.sequence_no),
  CASE MOD(seq.sequence_no, 3)
    WHEN 0 THEN 'analytics-seed-01'
    WHEN 1 THEN 'analytics-seed-02'
    ELSE 'analytics-seed-03'
  END,
  1,
  CASE MOD(seq.sequence_no, 3)
    WHEN 0 THEN '1/4'
    WHEN 1 THEN '1/8'
    ELSE '1/2'
  END,
  CASE MOD(seq.sequence_no, 3)
    WHEN 0 THEN 20
    WHEN 1 THEN 10
    ELSE 40
  END,
  CASE MOD(seq.sequence_no, 3)
    WHEN 0 THEN 20
    WHEN 1 THEN 10
    ELSE 40
  END,
  0,
  100 - seq.sequence_no,
  99 - seq.sequence_no,
  'confirmed',
  DATE_SUB(NOW(3), INTERVAL MOD(seq.sequence_no * 9, 7 * 24 * 60 * 60) SECOND),
  DATE_SUB(NOW(3), INTERVAL MOD(seq.sequence_no * 9, 7 * 24 * 60 * 60) SECOND),
  DATE_SUB(NOW(3), INTERVAL MOD(seq.sequence_no * 9, 7 * 24 * 60 * 60) SECOND)
FROM numbers AS seq
ON DUPLICATE KEY UPDATE request_id = VALUES(request_id);

-- 12 points codes: six active and six used, covering both QR lifecycle states.
INSERT INTO points_codes
  (token_id, token_hash, short_code_hash, points, status, source_session_id,
   used_session_id, created_at, expires_at, used_at)
WITH RECURSIVE numbers AS (
  SELECT 1 AS sequence_no
  UNION ALL
  SELECT sequence_no + 1 FROM numbers WHERE sequence_no < 12
)
SELECT
  UUID(),
  SHA2(CONCAT('analytics-seed-token-', seq.sequence_no), 256),
  SHA2(CONCAT('ANALYTICS-SEED-', seq.sequence_no), 256),
  20 + MOD(seq.sequence_no, 4) * 5,
  CASE WHEN seq.sequence_no <= 6 THEN 'used' ELSE 'active' END,
  'analytics-seed-01',
  CASE WHEN seq.sequence_no <= 6 THEN 'analytics-seed-02' ELSE NULL END,
  DATE_SUB(NOW(3), INTERVAL seq.sequence_no DAY),
  DATE_ADD(NOW(3), INTERVAL 30 DAY),
  CASE WHEN seq.sequence_no <= 6 THEN DATE_SUB(NOW(3), INTERVAL seq.sequence_no - 1 DAY) ELSE NULL END
FROM numbers AS seq
ON DUPLICATE KEY UPDATE
  points = VALUES(points),
  status = VALUES(status),
  source_session_id = VALUES(source_session_id),
  used_session_id = VALUES(used_session_id),
  expires_at = VALUES(expires_at),
  used_at = VALUES(used_at);

-- Optional cleanup for a later reset:
-- DELETE FROM points_codes WHERE token_hash LIKE SHA2('analytics-seed-token-%', 256);
-- DELETE FROM rice_dispenses WHERE request_id LIKE 'analytics-seed-dispense-%';
-- DELETE FROM trash_deposits WHERE event_id LIKE 'analytics-seed-deposit-%';
