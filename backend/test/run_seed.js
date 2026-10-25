'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.join(__dirname, '.env') });

const required = ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_DATABASE'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing database configuration: ${missing.join(', ')}`);
}

function splitSqlStatements(sql) {
  return sql
    .replace(/^\s*--.*$/gm, '')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: process.env.DB_SSL_CA
      ? { rejectUnauthorized: true, ca: fs.readFileSync(process.env.DB_SSL_CA) }
      : { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 2,
    connectTimeout: 15000,
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS report_generations (
        report_id CHAR(36) NOT NULL,
        admin_user_id SMALLINT UNSIGNED NOT NULL,
        report_data JSON NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (report_id),
        KEY idx_report_generations_admin_created (admin_user_id, created_at),
        KEY idx_report_generations_created (created_at),
        CONSTRAINT fk_report_generations_admin
          FOREIGN KEY (admin_user_id) REFERENCES admin_users (id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[schema] verified report_generations');

    const [tables] = await pool.query(
      `SELECT TABLE_NAME
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN ('rice_pricing', 'rice_dispenses')`,
    );
    const tableNames = new Set(tables.map((row) => row.TABLE_NAME));

    if (!tableNames.has('rice_pricing')) {
      await pool.query(`
        CREATE TABLE rice_pricing (
          id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          pack_size ENUM('1/8', '1/4', '1/2') NOT NULL,
          points_price SMALLINT UNSIGNED NOT NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          UNIQUE KEY uq_rice_pricing_size (pack_size)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('[schema] created rice_pricing');
    }

    if (!tableNames.has('rice_dispenses')) {
      throw new Error('rice_dispenses is missing. Apply backend/db/schema.sql before seeding.');
    }

    const [columns] = await pool.query(
      `SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'rice_dispenses'
          AND COLUMN_NAME = 'pack_size'`,
    );
    if (columns.length === 0) {
      await pool.query(
        "ALTER TABLE rice_dispenses ADD COLUMN pack_size ENUM('1/8', '1/4', '1/2') NOT NULL AFTER quantity",
      );
      console.log('[schema] added rice_dispenses.pack_size');
    }

    await pool.query(`
      INSERT INTO rice_pricing (pack_size, points_price, is_active) VALUES
        ('1/8', 10, 0),
        ('1/4', 20, 1),
        ('1/2', 40, 0)
      ON DUPLICATE KEY UPDATE
        points_price = VALUES(points_price),
        is_active = VALUES(is_active)
    `);

    const seedSql = fs.readFileSync(
      path.join(__dirname, 'db', 'seed_analytics.sql'),
      'utf8',
    );
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const statement of splitSqlStatements(seedSql)) {
        await connection.query(statement);
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const [counts] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM trash_deposits WHERE event_id LIKE 'analytics-seed-deposit-%') AS seeded_deposits,
        (SELECT COUNT(*) FROM rice_dispenses WHERE request_id LIKE 'analytics-seed-dispense-%') AS seeded_dispenses,
        (SELECT COUNT(*) FROM points_codes WHERE token_hash IN (
          SELECT SHA2(CONCAT('analytics-seed-token-', n), 256)
          FROM (
            SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
            UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8
            UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
          ) AS numbers
        )) AS seeded_codes
    `);
    const [inventory] = await pool.query(
      'SELECT packs_available FROM rice_inventory WHERE id = 1',
    );
    const [pricing] = await pool.query(
      'SELECT pack_size, points_price, is_active FROM rice_pricing ORDER BY pack_size',
    );

    console.log(JSON.stringify({ counts: counts[0], inventory: inventory[0], pricing }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`[seed] ${error.code || 'FAILED'}: ${error.message}`);
  process.exitCode = 1;
});
