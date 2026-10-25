'use strict';

const bcrypt = require('bcryptjs');
const config = require('../config');
const { getPool } = require('./mysql');

/**
 * Seed the default admin user into the MySQL database if empty.
 * This should run once on startup.
 */
async function seedDefaultAdmin() {
  const pool = getPool();
  if (!pool) {
    console.warn('[db] No database configured, skipping admin seed');
    return;
  }

  try {
    // Check if admin_users table has any records
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM admin_users');
    
    if (rows[0].count > 0) {
      console.log('[db] Admin users already exist in database');
      return;
    }

    // Hash the default password
    const hashedPassword = await bcrypt.hash(config.defaultAdminPass, 10);

    // Insert default admin user
    await pool.query(
      `INSERT INTO admin_users (username, password_hash, role, is_active, created_at, updated_at)
       VALUES (?, ?, 'admin', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
      [config.defaultAdminUser, hashedPassword]
    );

    console.log(`[db] ✓ Seeded default admin user: ${config.defaultAdminUser}`);
  } catch (err) {
    console.error('[db] Failed to seed admin user:', err.message);
    throw err;
  }
}

/**
 * Find an admin user by username.
 * @param {string} username
 * @returns {Promise<object|null>}
 */
async function findAdminByUsername(username) {
  const pool = getPool();
  if (!pool) return null;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM admin_users WHERE username = ? AND is_active = 1',
      [username]
    );
    return rows[0] || null;
  } catch (err) {
    console.error('[db] Error finding admin user:', err.message);
    return null;
  }
}

/**
 * Verify password against stored hash.
 * @param {string} plainPassword
 * @param {string} hashedPassword
 * @returns {Promise<boolean>}
 */
async function verifyPassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Update admin's last login timestamp.
 * @param {number} adminId
 * @returns {Promise<void>}
 */
async function updateLastLogin(adminId) {
  const pool = getPool();
  if (!pool) return;

  try {
    await pool.query(
      'UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP(3), updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
      [adminId]
    );
  } catch (err) {
    console.error('[db] Error updating last login:', err.message);
  }
}

module.exports = {
  seedDefaultAdmin,
  findAdminByUsername,
  verifyPassword,
  updateLastLogin,
};
