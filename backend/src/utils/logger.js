/**
 * Centralized Logger Utility
 * Replaces raw console.log/warn/error with structured, level-aware logging.
 *
 * Design:
 * - In production: only INFO and above, outputs JSON for log aggregators.
 * - In development: pretty-prints with prefix, timestamps, and colors.
 * - Follows SRP — this module only handles formatting and output.
 *
 * Usage:
 *   const logger = require('./logger');
 *   logger.info('Server started', { port: 3000 });
 *   logger.warn('Redis not connected');
 *   logger.error('Unhandled error', error);
 */

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const IS_TEST = NODE_ENV === 'test';

/**
 * Format a log entry as JSON (for production) or human-readable (for dev).
 */
function formatEntry(level, message, meta) {
  const timestamp = new Date().toISOString();

  if (IS_PRODUCTION) {
    return JSON.stringify({ timestamp, level: level.toUpperCase(), message, ...meta });
  }

  const metaStr = meta && Object.keys(meta).length > 0
    ? ' ' + JSON.stringify(meta)
    : '';
  return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
}

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = IS_PRODUCTION ? 'info' : 'debug';

function shouldLog(level) {
  if (IS_TEST) return false; // Silence all logs in test mode
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

const logger = {
  debug(message, meta = {}) {
    if (shouldLog('debug')) {
      console.debug(formatEntry('debug', message, meta));
    }
  },

  info(message, meta = {}) {
    if (shouldLog('info')) {
      console.info(formatEntry('info', message, meta));
    }
  },

  warn(message, meta = {}) {
    if (shouldLog('warn')) {
      console.warn(formatEntry('warn', message, meta));
    }
  },

  error(message, errorOrMeta = {}) {
    if (shouldLog('error')) {
      const meta = errorOrMeta instanceof Error
        ? { error: errorOrMeta.message, stack: IS_PRODUCTION ? undefined : errorOrMeta.stack }
        : errorOrMeta;
      console.error(formatEntry('error', message, meta));
    }
  },

  /**
   * HTTP request logger — used as Express middleware.
   * Replaces the raw console.log in app.js.
   */
  httpMiddleware() {
    return (req, _res, next) => {
      if (shouldLog('info')) {
        logger.info('HTTP Request', {
          method: req.method,
          url: req.url,
          ip: req.ip || req.connection?.remoteAddress
        });
      }
      next();
    };
  }
};

module.exports = logger;
