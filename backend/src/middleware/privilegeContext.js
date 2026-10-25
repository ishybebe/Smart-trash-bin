'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const { errorResponse } = require('./response');
const { runWithContext } = require('../services/requestContext');

/**
 * Select the transactional backend for the request.
 *
 * Only a valid admin token plus an explicit X-Testing-Mode: true header may
 * enter the SQLite sandbox. Everything else talks to the live MySQL database.
 */
function privilegeContext(req, res, next) {
  const wantsTesting = req.headers['x-testing-mode'] === 'true';

  if (!wantsTesting) {
    return runWithContext({ testing: false, admin: null }, () => next());
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(
      res,
      401,
      'UNAUTHORIZED',
      'Testing mode requires an admin session.',
    );
  }

  try {
    const payload = jwt.verify(authHeader.slice(7), config.jwtSecret);
    if (!payload.isAdmin) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Admin privileges required.');
    }
    return runWithContext({ testing: true, admin: payload }, () => next());
  } catch {
    return errorResponse(res, 403, 'INVALID_TOKEN', 'Invalid or expired token.');
  }
}

/** Force the SQLite sandbox for admin testing routes. */
function forceTestingContext(req, res, next) {
  return runWithContext({ testing: true, admin: req.admin || null }, () => next());
}

module.exports = { privilegeContext, forceTestingContext };
