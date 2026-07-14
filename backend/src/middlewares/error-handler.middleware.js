const logger = require('../utils/logger');

/**
 * Global Error Handling Middleware
 * Catches all errors passed via next(err) and returns standardized JSON.
 * Never leaks stack traces or internal details in production.
 */
const errorHandler = (err, req, res, _next) => {
  console.error("💥 GLOBAL ERROR CATCHED:", err);
  const statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // ── Prisma-specific error mapping ──────────────────────────────────────
  if (err.code === 'P2002') {
    message = 'A record with these details already exists.';
    return res.status(409).json({ message, status: 409 });
  }
  if (err.code === 'P2025') {
    message = 'Record not found.';
    return res.status(404).json({ message, status: 404 });
  }
  if (err.code === 'P2003') {
    message = 'Related record not found (foreign key constraint).';
    return res.status(400).json({ message, status: 400 });
  }

  // ── Log the error with context ─────────────────────────────────────────
  if (statusCode >= 500) {
    logger.error('Unhandled server error', {
      method: req.method,
      url: req.url,
      statusCode,
      error: err.message,
      stack: err.stack
    });
  } else {
    logger.warn('Client error', { method: req.method, url: req.url, statusCode, message });
  }

  const response = { message, status: statusCode };

  // Include stack trace only in development or test environment
  if (process.env.NODE_ENV === 'development' || process.env.JEST_WORKER_ID) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;

