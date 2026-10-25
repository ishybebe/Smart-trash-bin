'use strict';

const { errorResponse } = require('./response');

/**
 * Central error handler — must be registered last in Express.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const code   = err.code   || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred.';

  // Never leak stack traces to the client in production.
  if (process.env.NODE_ENV !== 'production') {
    console.error('[error]', err);
  }

  return errorResponse(res, status, code, message);
}

module.exports = { errorHandler };
