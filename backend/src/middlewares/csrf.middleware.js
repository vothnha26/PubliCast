const crypto = require('crypto');

const CSRF_COOKIE_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // matches refreshToken lifetime

/**
 * Double-submit cookie CSRF protection.
 *
 * Auth cookies use sameSite: 'none' to support cross-site frontends
 * (Vercel previews, ngrok) — CORS alone doesn't stop a third-party site from
 * submitting a form/fetch that carries those cookies along, since CORS only
 * blocks the attacker page from *reading* the response, not from *sending*
 * the request. This cookie is deliberately NOT httpOnly so the frontend can
 * read it and echo it back in a header; an attacker page can't read it
 * either (that's blocked by the browser's same-origin policy on
 * document.cookie), so it can't forge a matching header value.
 */
function buildCsrfCookieOptions() {
  return {
    httpOnly: false,
    secure: true,
    sameSite: 'none',
    maxAge: CSRF_TOKEN_MAX_AGE_MS,
    path: '/'
  };
}

/**
 * Issues a CSRF token cookie if the client doesn't already have one.
 * Mount globally, before verifyCsrfToken is enforced on any route.
 */
function issueCsrfToken(req, res, next) {
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, token, buildCsrfCookieOptions());
  }
  next();
}

/**
 * Verifies the X-CSRF-Token header matches the csrfToken cookie.
 * Mount on individual routes that perform a side effect (POST/PUT/PATCH/DELETE).
 */
function verifyCsrfToken(req, res, next) {
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ message: 'Invalid or missing CSRF token' });
  }
  next();
}

const SIDE_EFFECT_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Routes deliberately excluded from CSRF enforcement:
// - Pre-session auth endpoints (register/login/refresh/etc.) — the client
//   has no session yet at these steps, so it never had a chance to receive
//   the csrfToken cookie tied to an authenticated flow.
// - Webhooks and HMAC-signed integrations — authenticated by signature
//   verification (sepayAuth, HMAC), not by cookie session, so CSRF (an
//   attack that abuses a browser's ambient cookie) doesn't apply.
// - Public, unauthenticated tracking endpoints (SmartLink click) — no
//   session/cookie identity to forge in the first place.
const EXCLUDED_PATH_PREFIXES = [
  '/api/auth/register',
  '/api/auth/verify-otp',
  '/api/auth/resend-otp',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/2fa/login-verify',
  '/oauth',
  '/api/webhooks',
  '/api/payments', // alias for /api/webhooks — see app.js
  '/api/integrations',
  '/api/smart-links/click',
  '/api/social/facebook/webhook'
];

/**
 * Global CSRF enforcement: applies verifyCsrfToken to every side-effect
 * request (POST/PUT/PATCH/DELETE) except the pre-session/signature-verified
 * routes listed above. Mounted once in app.js rather than per-route, so a
 * newly added route is protected by default instead of requiring an
 * explicit opt-in that's easy to forget.
 */
function enforceCsrfGlobally(req, res, next) {
  if (!SIDE_EFFECT_METHODS.has(req.method)) {
    return next();
  }
  if (EXCLUDED_PATH_PREFIXES.some(prefix => req.path.startsWith(prefix))) {
    return next();
  }
  return verifyCsrfToken(req, res, next);
}

module.exports = {
  issueCsrfToken,
  verifyCsrfToken,
  enforceCsrfGlobally,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME
};
