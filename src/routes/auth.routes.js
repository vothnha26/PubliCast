const express = require('express');
const authController = require('../controllers/auth.controller');
const authRateLimiter = require('../middlewares/rate-limit.middleware');
const loginRateLimiter = require('../middlewares/login-rate-limit.middleware');
const { registerValidation, verifyOTPValidation, loginValidation } = require('../middlewares/validation.middleware');
const { verifyAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

// Registration
router.post('/register', authRateLimiter, registerValidation, authController.register);

// Email verification
router.post('/verify-otp', verifyOTPValidation, authController.verifyOTP);

// Login with rate limiting and validation
router.post('/login', loginRateLimiter.middleware(), loginValidation, authController.login);

// Refresh token
router.post('/refresh', authController.refreshToken);

// Logout
router.post('/logout', verifyAuth, authController.logout);

module.exports = router;
