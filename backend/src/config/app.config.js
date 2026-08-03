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

  port: parseInt(process.env.PORT, 10) || 3000,

  // Public URLs — single source of truth so every OAuth callback, email
  // link, and webhook URL builder falls back to the same dev defaults.
  // Previously duplicated ad hoc across ~10 call sites, one of which
  // (internal-smart-link.strategy.js) drifted to the wrong port (5000
  // instead of the actual PORT default of 3000).
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  backendBaseUrl: process.env.BACKEND_BASE_URL || 'http://localhost:3000'
};
