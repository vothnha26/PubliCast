/**
 * STORAGE_KEYS — Tập trung toàn bộ localStorage / sessionStorage keys.
 * Không dùng raw string 'token', 'activeBrandId' trực tiếp trong code.
 */
export const STORAGE_KEYS = {
  /** ID của brand đang active */
  ACTIVE_BRAND_ID: 'activeBrandId',
  /** Đánh dấu user đang ở bước xác thực OTP */
  IS_VERIFYING_OTP: 'isVerifyingOTP',
  /** Email đang chờ xác thực OTP */
  PENDING_VERIFY_EMAIL: 'pendingVerifyEmail',
  /** Mốc thời gian hết hạn nút resend OTP (verify flow) */
  RESEND_TIMER_EXPIRY: 'resendTimerExpiry',
  /** Mốc thời gian hết hạn nút resend OTP (forgot password flow) */
  FORGOT_RESEND_TIMER_EXPIRY: 'forgotResendTimerExpiry',
  /** Theme mode (light / dark) */
  THEME: 'publicast-theme',
  /** UI language preference (en / vi) */
  LANGUAGE: 'publicast-language',
};
