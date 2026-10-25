'use strict';

const fs = require('fs');
const mysql = require('mysql2/promise');
const config = require('../config');

let pool = null;

function isConfigured() {
  return Boolean(config.db.host);
}

function getPool() {
  if (!pool && isConfigured()) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      dateStrings: true,
      ssl: config.db.sslCa
        ? { rejectUnauthorized: true, ca: fs.readFileSync(config.db.sslCa) }
        : { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    console.log('[db] MySQL connection pool created');
  }
  return pool;
}

async function withTransaction(work) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // The original error is more useful than a rollback failure.
    }
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { getPool, isConfigured, withTransaction };
