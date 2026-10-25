-- Migration: Link admin users to testing kiosk sessions
-- Run this against the TiDB Cloud database after restarting backend

USE smart_bin;

ALTER TABLE kiosk_sessions
  ADD COLUMN admin_user_id SMALLINT UNSIGNED NULL AFTER points_balance,
  ADD CONSTRAINT fk_kiosk_sessions_admin
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE SET NULL;

-- Verify the change
SHOW CREATE TABLE kiosk_sessions;
