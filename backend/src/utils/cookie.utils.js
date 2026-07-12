/**
 * Token cookie configuration constants.
 * Centralized to avoid magic numbers duplicated across multiple controllers.
 */
const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Build cookie options for auth tokens.
 * @param {number} maxAge - Cookie max age in milliseconds
 * @returns {import('express').CookieOptions}
 */
function buildCookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: true, // Required for sameSite: 'none'
    sameSite: 'none', // Allow cross-origin requests (e.g. localhost -> ngrok)
    maxAge,
    path: '/'
  };
}

/**
 * Set access and refresh token cookies on the response.
 * @param {import('express').Response} res
 * @param {string} accessToken
 * @param {string} refreshToken
 */
function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie('accessToken', accessToken, buildCookieOptions(ACCESS_TOKEN_MAX_AGE_MS));
  res.cookie('refreshToken', refreshToken, buildCookieOptions(REFRESH_TOKEN_MAX_AGE_MS));
}

module.exports = {
  ACCESS_TOKEN_MAX_AGE_MS,
  REFRESH_TOKEN_MAX_AGE_MS,
  buildCookieOptions,
  setAuthCookies
};
