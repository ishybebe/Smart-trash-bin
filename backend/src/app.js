'use strict';

const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const config   = require('./config');

const depositRouter = require('./routes/deposit');
const qrRouter      = require('./routes/qr');
const sessionRouter = require('./routes/session');
const statusRouter  = require('./routes/status');
const adminRouter   = require('./routes/admin');
const { errorHandler } = require('./middleware/errorHandler');
const { privilegeContext } = require('./middleware/privilegeContext');

const app = express();

// Local-network kiosk testing: development builds accept loopback and private
// LAN origins so a tablet can reach the API by IP. Production stays on the
// explicit CORS_ORIGIN list.
const PRIVATE_HOST_PATTERN =
  /^(localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|\[::1\])$/;

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (config.corsOrigins.includes(origin)) return true;
  if (config.nodeEnv === 'production') return false;

  try {
    return PRIVATE_HOST_PATTERN.test(new URL(origin).hostname);
  } catch {
    return false;
  }
}

// ── Security & parsing ────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin));
    },
  }),
);
app.use(express.json());

// ── Request logging (dev only) ────────────────────────────────────────────────
if (config.nodeEnv !== 'production') {
  app.use(morgan('dev'));
}

// ── Privilege routing (live MySQL vs. admin testing SQLite) ───────────────────
app.use('/api', privilegeContext);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/deposit', depositRouter);
app.use('/api/qr',      qrRouter);
app.use('/api/session', sessionRouter);
app.use('/api/status',  statusRouter);
app.use('/api/admin',   adminRouter);

// ── 404 fallthrough ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found.' } });
});

// ── Central error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
