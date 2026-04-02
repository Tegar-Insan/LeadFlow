// src/middleware/errorHandler.js
// Centralized Express error handler — catches all unhandled errors

const logger = require('../utils/logger');
const { error } = require('../utils/responseHelper');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error(`[ErrorHandler] ${req.method} ${req.originalUrl} — ${err.message}`, {
    stack: err.stack,
    statusCode: err.statusCode,
  });

  // CORS error
  if (err.message?.startsWith('CORS blocked')) {
    return error(res, { message: err.message, statusCode: 403 });
  }

  // Known operational errors
  if (err.isOperational) {
    return error(res, { message: err.message, statusCode: err.statusCode || 400 });
  }

  // Unexpected errors — don't leak details in production
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred.'
      : err.message || 'Internal server error';

  return error(res, { message, statusCode: err.statusCode || 500 });
}

module.exports = errorHandler;
