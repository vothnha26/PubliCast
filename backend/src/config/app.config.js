/**
 * Application Configuration
 * Centralized config manager for environment settings and feature flags.
 * Follows SOLID: Single Responsibility (providing unified config state).
 */

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

const globalSandboxEnv = (process.env.GLOBAL_SANDBOX || '').trim();
const isSandboxGlobal = globalSandboxEnv === 'true' || 
                        ((isDev || isTest) && globalSandboxEnv !== 'false');

module.exports = {
  isDev,
  isTest,
  
  // Trạng thái sandbox cho các module khác nhau
  sandbox: {
    global: isSandboxGlobal,
    email: (process.env.EMAIL_SANDBOX || '').trim() === 'true' || isSandboxGlobal,
    publish: (process.env.PUBLISH_SANDBOX || '').trim() === 'true' || isSandboxGlobal,
    video: (process.env.VIDEO_SANDBOX || '').trim() === 'true' || isSandboxGlobal,
    billing: (process.env.BILLING_SANDBOX || '').trim() === 'true' || isSandboxGlobal,
    cloudinary: (process.env.CLOUDINARY_SANDBOX || '').trim() === 'true' || isSandboxGlobal,
  },

  port: parseInt(process.env.PORT, 10) || 3000
};
