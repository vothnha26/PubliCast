const crypto = require('crypto');

/**
 * CSRF Double-Submit Cookie Middleware
 *
 * Implements double-submit cookie pattern for CSRF defense:
 * 1. issueCsrfToken: Generates a secure random CSRF token stored in a readable cookie if missing.
 * 2. verifyCsrfToken: Compares incoming X-CSRF-Token header against req.cookies.csrfToken for state-changing HTTP methods.
 */

const CSRF_COOKIE_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function issueCsrfToken(req, res, next) {
  if (!req.cookies || !req.cookies[CSRF_COOKIE_NAME]) {
    const token = crypto.randomBytes(32).toString('hex');
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be readable by frontend JavaScript to attach to X-CSRF-Token header
      secure: isProduction || req.protocol === 'https',
      sameSite: process.env.COOKIE_SAME_SITE || 'lax',
      path: '/'
    });
  }
  next();
}

function verifyCsrfToken(req, res, next) {
  // Safe methods (GET, HEAD, OPTIONS) do not require CSRF verification
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  const cookieToken = req.cookies ? req.cookies[CSRF_COOKIE_NAME] : null;
  const headerToken = req.headers[CSRF_HEADER_NAME] || req.headers[CSRF_HEADER_NAME.toLowerCase()];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      success: false,
      error: 'CSRF token missing or invalid',
      code: 'CSRF_TOKEN_MISSING'
    });
  }

  // Constant time comparison to prevent timing attacks
  try {
    const cookieBuffer = Buffer.from(cookieToken);
    const headerBuffer = Buffer.from(headerToken);

    if (cookieBuffer.length !== headerBuffer.length || !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
      return res.status(403).json({
        success: false,
        error: 'CSRF token mismatch',
        code: 'CSRF_TOKEN_MISMATCH'
      });
    }
  } catch (_) {
    return res.status(403).json({
      success: false,
      error: 'CSRF token validation failed',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  next();
}

module.exports = {
  issueCsrfToken,
  verifyCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME
};
