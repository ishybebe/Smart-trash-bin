'use strict';

require('dotenv').config();

const path = require('path');

const requiredEnv = ['QR_SECRET', 'JWT_SECRET'];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`[config] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  qrSecret: process.env.QR_SECRET,
  corsOrigin: corsOrigins[0],
  corsOrigins,
  jwtSecret: process.env.JWT_SECRET,
  defaultAdminUser: process.env.DEFAULT_ADMIN_USER || 'admin',
  defaultAdminPass: process.env.DEFAULT_ADMIN_PASS || 'change_me',
  sqlitePath:
    process.env.SQLITE_PATH || path.join(__dirname, '../../.data/testing.sqlite'),
  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    sslCa: process.env.DB_SSL_CA || null,
  },
};
