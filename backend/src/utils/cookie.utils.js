/**
 * Token cookie configuration constants.
 * Centralized to avoid magic numbers duplicated across multiple controllers.
 */
const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Build cookie options for auth tokens.
 * @param {number} maxAge - Cookie max age in milliseconds
 * @param {boolean} isSecureRequest - Whether the incoming request was HTTPS
 *   (req.secure, correct behind a proxy since app.js sets 'trust proxy').
 *   sameSite:'none' requires secure:true per spec, but a plain HTTP request
 *   (local dev on http://localhost) can't set a secure cookie at all — the
 *   browser silently drops it, breaking every subsequent authenticated
 *   request until the user is bounced back out. Falls back to secure/none
 *   when isSecureRequest isn't known (older call sites that don't pass
 *   req yet), keeping cross-origin/ngrok/production behavior unchanged.
 * @returns {import('express').CookieOptions}
 */
function buildCookieOptions(maxAge, isSecureRequest = true) {
  return {
    httpOnly: true,
    secure: isSecureRequest,
    sameSite: isSecureRequest ? 'none' : 'lax', // 'none' requires secure — plain HTTP falls back to 'lax' for same-site (localhost) requests
    maxAge,
    path: '/'
  };
}

/**
 * Set access and refresh token cookies on the response.
 * @param {import('express').Response} res
 * @param {string} accessToken
 * @param {string} refreshToken
 * @param {import('express').Request} [req] - Pass the current request so
 *   secure/sameSite can be derived from req.secure. Omit only for call
 *   sites that genuinely have no request in scope; behavior there is
 *   unchanged (secure:true/sameSite:'none').
 */
function setAuthCookies(res, accessToken, refreshToken, req = null) {
  const isSecureRequest = req ? req.secure : true;
  res.cookie('accessToken', accessToken, buildCookieOptions(ACCESS_TOKEN_MAX_AGE_MS, isSecureRequest));
  res.cookie('refreshToken', refreshToken, buildCookieOptions(REFRESH_TOKEN_MAX_AGE_MS, isSecureRequest));
}

module.exports = {
  ACCESS_TOKEN_MAX_AGE_MS,
  REFRESH_TOKEN_MAX_AGE_MS,
  buildCookieOptions,
  setAuthCookies
};
