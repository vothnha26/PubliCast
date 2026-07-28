const { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } = require('../../src/middlewares/csrf.middleware');

/**
 * Extracts the csrfToken value from a supertest response's Set-Cookie
 * header array. issueCsrfToken hands this out on every response, so any
 * prior request in a test (e.g. login) will have one available.
 */
function extractCsrfToken(res) {
  const setCookie = res.headers['set-cookie'] || [];
  const csrfCookie = setCookie.find(c => c.startsWith(`${CSRF_COOKIE_NAME}=`));
  if (!csrfCookie) return null;
  return csrfCookie.split(';')[0].split('=')[1];
}

/**
 * Returns { [CSRF_HEADER_NAME]: token } ready to spread into .set(...).
 * Usage: request(app).post(url).set(cookies).set(csrfHeaderFrom(priorRes))
 */
function csrfHeaderFrom(res) {
  const token = extractCsrfToken(res);
  return token ? { [CSRF_HEADER_NAME]: token } : {};
}

module.exports = { extractCsrfToken, csrfHeaderFrom, CSRF_HEADER_NAME };
