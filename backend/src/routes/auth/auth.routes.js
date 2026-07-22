const express = require('express');
const authController = require('../../controllers/auth/auth.controller');
const authRateLimiter = require('../../middlewares/rate-limit.middleware');
const loginRateLimiter = require('../../middlewares/login-rate-limit.middleware');
const { forgotPasswordRateLimiter, resetPasswordRateLimiter } = require('../../middlewares/password-reset-rate-limit.middleware');
const {
  registerValidation,
  verifyOTPValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation
} = require('../../middlewares/validation.middleware');
const { verifyAuth } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Google Auth
router.get('/google', authController.googleLogin);
router.get('/google/callback', authController.googleCallback);

// Registration
router.post('/register', authRateLimiter, registerValidation, authController.register);

// Email verification
// authRateLimiter caps request volume per IP; the actual brute-force guard
// (capping wrong OTP guesses and burning the OTP once exceeded) lives in
// OtpVerificationStrategy.verify — see issue #58.
router.post('/verify-otp', authRateLimiter, verifyOTPValidation, authController.verifyOTP);
router.post('/resend-otp', authRateLimiter, forgotPasswordValidation, authController.resendOTP);

// Forgot password
router.post('/forgot-password', forgotPasswordRateLimiter, forgotPasswordValidation, authController.forgotPassword);
router.get('/verify-reset-token', authController.verifyResetToken);

// Reset password
router.post('/reset-password', resetPasswordRateLimiter, resetPasswordValidation, authController.resetPassword);

// Login with rate limiting and validation
router.post('/login', loginRateLimiter.middleware(), loginValidation, authController.login);

// Refresh token
router.post('/refresh', authController.refreshToken);

// Logout
router.post('/logout', verifyAuth, authController.logout);

// 2FA Routes
router.post('/2fa/setup', verifyAuth, authController.setup2FA);
router.post('/2fa/verify', verifyAuth, authController.verify2FA);
router.post('/2fa/disable', verifyAuth, authController.disable2FA);
// authRateLimiter caps request volume per IP; the actual brute-force guard
// (capping wrong TOTP guesses and invalidating preAuthToken once exceeded)
// lives in AuthService.loginVerify2FA — see issue #59.
router.post('/2fa/login-verify', authRateLimiter, authController.loginVerify2FA);

module.exports = router;
