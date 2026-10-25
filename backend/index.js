'use strict';

const app    = require('./src/app');
const config = require('./src/config');
const { seedDefaultAdmin } = require('./src/services/adminService');

// Seed default admin user on startup
seedDefaultAdmin().then(() => {
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[server] Smart Trash Bin API running on port ${config.port} (${config.nodeEnv})`);
  });
}).catch((err) => {
  console.error('[server] Failed to seed admin user:', err);
  process.exit(1);
});
