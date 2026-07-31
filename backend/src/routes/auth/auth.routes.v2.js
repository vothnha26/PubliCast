const express = require('express');
const authControllerV2 = require('../../controllers/auth/auth.controller.v2');
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

/**
 * @openapi
 * tags:
 *   name: Auth V2
 *   description: Standardized Authentication endpoints (v2 Envelope API)
 */

/**
 * @openapi
 * /v2/auth/register:
 *   post:
 *     summary: Register a new user account
 *     tags: [Auth V2]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email: { type: string, example: user@example.com }
 *               password: { type: string, example: Password123! }
 *               name: { type: string, example: John Doe }
 *     responses:
 *       201:
 *         description: User registered successfully, OTP sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 *       400:
 *         description: Validation error or Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', authRateLimiter, registerValidation, authControllerV2.register);

/**
 * @openapi
 * /v2/auth/verify-otp:
 *   post:
 *     summary: Verify email OTP code
 *     tags: [Auth V2]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email: { type: string, example: user@example.com }
 *               otp: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/verify-otp', authRateLimiter, verifyOTPValidation, authControllerV2.verifyOTP);

/**
 * @openapi
 * /v2/auth/resend-otp:
 *   post:
 *     summary: Resend OTP code to email
 *     tags: [Auth V2]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: user@example.com }
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/resend-otp', authRateLimiter, forgotPasswordValidation, authControllerV2.resendOTP);

/**
 * @openapi
 * /v2/auth/login:
 *   post:
 *     summary: Log in with credentials
 *     tags: [Auth V2]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: user@example.com }
 *               password: { type: string, example: Password123! }
 *     responses:
 *       200:
 *         description: Login successful (sets HTTP-only cookie accessToken/refreshToken)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/login', loginRateLimiter.middleware(), loginValidation, authControllerV2.login);

/**
 * @openapi
 * /v2/auth/logout:
 *   post:
 *     summary: Log out user and clear auth cookies
 *     tags: [Auth V2]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/logout', verifyAuth, authControllerV2.logout);

/**
 * @openapi
 * /v2/auth/refresh:
 *   post:
 *     summary: Refresh access token using refreshToken cookie
 *     tags: [Auth V2]
 *     responses:
 *       200:
 *         description: Access token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/refresh', authControllerV2.refreshToken);

/**
 * @openapi
 * /v2/auth/forgot-password:
 *   post:
 *     summary: Request password reset email
 *     tags: [Auth V2]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: user@example.com }
 *     responses:
 *       200:
 *         description: Reset email sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/forgot-password', forgotPasswordRateLimiter, forgotPasswordValidation, authControllerV2.forgotPassword);

/**
 * @openapi
 * /v2/auth/verify-reset-token:
 *   get:
 *     summary: Verify password reset token validity
 *     tags: [Auth V2]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/verify-reset-token', authControllerV2.verifyResetToken);

/**
 * @openapi
 * /v2/auth/reset-password:
 *   post:
 *     summary: Reset password with valid token
 *     tags: [Auth V2]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string, example: NewPassword123! }
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/reset-password', resetPasswordRateLimiter, resetPasswordValidation, authControllerV2.resetPassword);

/**
 * @openapi
 * /v2/auth/2fa/setup:
 *   post:
 *     summary: Setup 2FA (Generates QR code secret)
 *     tags: [Auth V2]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: 2FA setup initiated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/2fa/setup', verifyAuth, authControllerV2.setup2FA);

/**
 * @openapi
 * /v2/auth/2fa/verify:
 *   post:
 *     summary: Verify 2FA token to enable 2FA
 *     tags: [Auth V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: 2FA enabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/2fa/verify', verifyAuth, authControllerV2.verify2FA);

/**
 * @openapi
 * /v2/auth/2fa/disable:
 *   post:
 *     summary: Disable 2FA with current password
 *     tags: [Auth V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: 2FA disabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/2fa/disable', verifyAuth, authControllerV2.disable2FA);

/**
 * @openapi
 * /v2/auth/2fa/login-verify:
 *   post:
 *     summary: Complete 2FA login step with TOTP code
 *     tags: [Auth V2]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [preAuthToken, code]
 *             properties:
 *               preAuthToken: { type: string }
 *               code: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: 2FA Login verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/2fa/login-verify', authRateLimiter, authControllerV2.loginVerify2FA);

module.exports = router;
