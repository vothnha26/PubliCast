/**
 * Helper utilities for standardizing API responses across v1 and v2.
 */

/**
 * Send a standardized success response for API v2.
 * Output format: { message: string, data: any }
 * 
 * @param {import('express').Response} res 
 * @param {any} data - Payload to return inside data field
 * @param {string} message - Human readable message
 * @param {number} statusCode - HTTP Status code (default: 200)
 */
function v2Success(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    message,
    data
  });
}

/**
 * Send a standardized error response for API v2.
 * Output format: { message: string, errors?: any }
 * 
 * @param {import('express').Response} res 
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP Status code (default: 400)
 * @param {any} errors - Detailed errors or validation issues
 */
function v2Error(res, message = 'An error occurred', statusCode = 400, errors = null) {
  const payload = { message };
  if (errors !== null && errors !== undefined) {
    payload.errors = errors;
  }
  return res.status(statusCode).json(payload);
}

module.exports = {
  v2Success,
  v2Error
};
