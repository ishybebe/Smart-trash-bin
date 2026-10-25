'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const { errorResponse } = require('./response');

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication token required.');
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (!payload.isAdmin) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Admin privileges required.');
    }
    req.admin = payload;
    next();
  } catch {
    return errorResponse(res, 403, 'INVALID_TOKEN', 'Invalid or expired token.');
  }
}

module.exports = { authenticateAdmin };
