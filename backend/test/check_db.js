'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.join(__dirname, '.env') });

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
    connectTimeout: 15000,
  });

  try {
    const [server] = await pool.query(
      'SELECT DATABASE() AS database_name, VERSION() AS mysql_version, NOW(3) AS server_time',
    );
    const [tables] = await pool.query(
      `SELECT TABLE_NAME AS table_name, TABLE_ROWS AS estimated_rows
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        ORDER BY TABLE_NAME`,
    );
    const [columns] = await pool.query(
      `SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name,
              COLUMN_TYPE AS column_type, IS_NULLABLE AS is_nullable
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN ('rice_pricing', 'rice_dispenses')
        ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    );
    const tableNames = tables.map((row) => row.table_name);
    const counts = {};
    for (const table of tableNames) {
      const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
      counts[table] = Number(rows[0].count);
    }
    const [reports] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM trash_deposits) AS total_detected,
        (SELECT COALESCE(SUM(CASE WHEN status = 'accepted' THEN points_awarded ELSE 0 END), 0) FROM trash_deposits) AS points_generated,
        (SELECT COALESCE(SUM(quantity), 0) FROM rice_dispenses WHERE status = 'confirmed') AS packs_redeemed,
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
    const [waste] = await pool.query(
      `SELECT reported_type AS type, COUNT(*) AS quantity, SUM(points_awarded) AS points
         FROM trash_deposits
        WHERE status = 'accepted'
        GROUP BY reported_type
        ORDER BY quantity DESC, type`,
    );

    console.log(JSON.stringify({ server: server[0], tables, counts, columns, reports: reports[0], waste }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`[check] ${error.code || 'FAILED'}: ${error.message}`);
  process.exitCode = 1;
});
