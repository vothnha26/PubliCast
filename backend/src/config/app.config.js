/**
 * Application Configuration
 * Centralized config manager for environment settings and feature flags.
 * Follows SOLID: Single Responsibility (providing unified config state).
 */

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

// Cờ sandbox tổng thể: Mặc định bật ở môi trường phát triển (development/test) trừ khi cấu hình GLOBAL_SANDBOX=false
const isSandboxGlobal = process.env.GLOBAL_SANDBOX === 'true' || 
                        ((isDev || isTest) && process.env.GLOBAL_SANDBOX !== 'false');

module.exports = {
  isDev,
  isTest,
  
  // Trạng thái sandbox cho các module khác nhau
  sandbox: {
    global: isSandboxGlobal,
    email: process.env.EMAIL_SANDBOX === 'true' || isSandboxGlobal,
    publish: process.env.PUBLISH_SANDBOX === 'true' || isSandboxGlobal,
    video: process.env.VIDEO_SANDBOX === 'true' || isSandboxGlobal,
    billing: process.env.BILLING_SANDBOX === 'true' || isSandboxGlobal,
    cloudinary: process.env.CLOUDINARY_SANDBOX === 'true' || isSandboxGlobal,
  },

  port: parseInt(process.env.PORT, 10) || 3000
};
