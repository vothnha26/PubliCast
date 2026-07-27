/**
 * Trích xuất error code/reason có cấu trúc từ GaxiosError (thư viện googleapis).
 * @param {Error} err
 * @returns {{status: number|string|null, reason: string|null, message: string}}
 */
function parseGoogleApiError(err) {
  if (!err) {
    return { status: null, reason: null, message: '' };
  }
  const status = err.code || err.response?.status || null;
  const reason = err.response?.data?.error?.errors?.[0]?.reason || null;
  return { status, reason, message: err.message || '' };
}

module.exports = { parseGoogleApiError };
