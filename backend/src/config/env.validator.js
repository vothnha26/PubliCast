/**
 * Environment Variable Validator
 * Validates all required env vars at startup — fail fast strategy.
 * Following SOLID: Single Responsibility (validation only).
 */

const REQUIRED_VARS = [
  'DATABASE_URL',
  'ACCESS_TOKEN_SECRET',
  'REFRESH_TOKEN_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'ENCRYPTION_KEY',
];

const WARNED_VARS = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'FACEBOOK_APP_ID',
  'FACEBOOK_APP_SECRET',
  'TIKTOK_CLIENT_KEY',
  'TIKTOK_CLIENT_SECRET',
  'EMAIL_USER',
  'EMAIL_PASS',
  'FRONTEND_URL',
  'BACKEND_BASE_URL',
];

/**
 * Validate environment variables.
 * @throws {Error} if any required variable is missing.
 */
function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `[EnvValidator] ❌ Missing required environment variables: ${missing.join(', ')}.\n` +
      'Please check your .env file.'
    );
  }

  const warned = WARNED_VARS.filter((key) => !process.env[key]);
  if (warned.length > 0) {
    console.warn(
      `[EnvValidator] ⚠️ Optional environment variables not set: ${warned.join(', ')}. ` +
      'Some features may be disabled.'
    );
  }

  // Validate JWT_SECRET strength
  const accessSecret = process.env.ACCESS_TOKEN_SECRET;
  if (accessSecret && accessSecret.length < 32) {
    throw new Error('[EnvValidator] ❌ ACCESS_TOKEN_SECRET must be at least 32 characters long.');
  }

  const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
  if (refreshSecret && refreshSecret.length < 32) {
    throw new Error('[EnvValidator] ❌ REFRESH_TOKEN_SECRET must be at least 32 characters long.');
  }

  // Validate ENCRYPTION_KEY strength
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (encryptionKey && encryptionKey.length < 32) {
    throw new Error('[EnvValidator] ❌ ENCRYPTION_KEY must be at least 32 characters long.');
  }

  // SePay webhook secret. An empty key makes webhook verification fail-open
  // (empty presented token would match an empty key), so it must be a
  // non-empty value in production. In dev/test it's only warned (billing
  // webhooks are typically not exercised there). See issue #116.
  const sepayKey = process.env.SEPAY_API_KEY;
  if (process.env.NODE_ENV === 'production' && !sepayKey) {
    throw new Error(
      '[EnvValidator] ❌ SEPAY_API_KEY is required in production (webhook auth fails open without it).'
    );
  }
  if (!sepayKey) {
    console.warn(
      '[EnvValidator] ⚠️ SEPAY_API_KEY not set — SePay payment webhooks will be rejected.'
    );
  }
}

module.exports = { validateEnv };
