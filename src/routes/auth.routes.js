const express = require('express');
const authController = require('../controllers/auth.controller');
const authRateLimiter = require('../middlewares/rate-limit.middleware');
const { registerValidation, verifyOTPValidation } = require('../middlewares/validation.middleware');

const router = express.Router();

router.post('/register', authRateLimiter, registerValidation, authController.register);
router.post('/verify-otp', verifyOTPValidation, authController.verifyOTP);

module.exports = router;
