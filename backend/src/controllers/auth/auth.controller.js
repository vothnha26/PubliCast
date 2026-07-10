const authService = require('../../services/auth/auth.service');
const jwtUtils = require('../../utils/jwt.utils');
const loginRateLimiter = require('../../middlewares/login-rate-limit.middleware');
const { setAuthCookies } = require('../../utils/cookie.utils');
const { ERROR_MESSAGES, USER_ROLES } = require('../../utils/constants');
const asyncHandler = require('../../utils/async-handler');

class AuthController {
  /**
   * Get Google Login URL
   * GET /api/auth/google
   */
  googleLogin = asyncHandler(async (req, res) => {
    const { state } = req.query;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
    const url = await authService.getGoogleAuthUrl(redirectUri, state);
    res.json({ url });
  });

  /**
   * Google OAuth Callback
   * GET /api/auth/google/callback
   */
  googleCallback = asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const result = await authService.handleGoogleCallback(code, redirectUri);
    setAuthCookies(res, result.accessToken, result.refreshToken);

    if (state === 'settings') {
      res.redirect(`${frontendUrl}/settings?tab=access&success=google_linked`);
    } else {
      res.redirect(`${frontendUrl}/dashboard?success=google_login`);
    }
  });

  register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const user = await authService.register(name, email, password);
    res.status(201).json({
      message: ERROR_MESSAGES.REGISTRATION_SUCCESS,
      userId: user.id
    });
  });

  verifyOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    const result = await authService.verifyOTP(email, otp);

    if (result.accessToken && result.refreshToken) {
      setAuthCookies(res, result.accessToken, result.refreshToken);
    }

    res.status(200).json({
      message: result.message,
      user: result.user
    });
  });

  resendOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await authService.resendOTP(email);
    res.status(200).json(result);
  });

  /**
   * Request forgot password OTP.
   * POST /api/auth/forgot-password
   */
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await authService.forgotPassword(email.toLowerCase());
    res.status(200).json(result);
  });

  /**
   * Verify OTP and set a new password.
   * POST /api/auth/reset-password
   */
  resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;
    const result = await authService.resetPassword(email.toLowerCase(), otp, newPassword);
    res.status(200).json(result);
  });

  /**
   * Login user
   * POST /api/auth/login
   */
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    try {
      const result = await authService.login(email.toLowerCase(), password);

      // Reset rate limit on successful login
      if (req.rateLimit) {
        await loginRateLimiter.resetAttempts(req.rateLimit.email, req.rateLimit.ip);
      }

      // Set tokens via HttpOnly cookies only — do NOT return raw tokens in body (XSS risk)
      setAuthCookies(res, result.accessToken, result.refreshToken);

      res.status(200).json({
        message: ERROR_MESSAGES.LOGIN_SUCCESS,
        role: result.role,
        redirectUrl: result.role === USER_ROLES.ADMIN ? '/admin/profile' : '/user/profile',
        user: result.user
      });
    } catch (error) {
      if (req.rateLimit) {
        await loginRateLimiter.recordFailedAttempt(req.rateLimit.email, req.rateLimit.ip);
      }
      throw error;
    }
  });

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  refreshToken = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const decoded = jwtUtils.verifyRefreshToken(refreshToken);
    const userId = decoded.id;

    const result = await authService.refreshTokens(refreshToken, userId);
    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.status(200).json({ message: 'Token refreshed successfully' });
  });

  /**
   * Logout user
   * POST /api/auth/logout
   */
  logout = asyncHandler(async (req, res) => {
    let userId = null;
    try {
      const token = req.cookies?.accessToken || jwtUtils.extractToken(req.headers.authorization);
      if (token) {
        const decoded = jwtUtils.verifyAccessToken(token);
        userId = decoded?.id;
      }
    } catch (err) {
      // Bỏ qua lỗi verify token trong lúc logout
    }

    if (userId) {
      try {
        await authService.logout(userId);
      } catch (err) {
        // Bỏ qua lỗi trong DB clean up
      }
    }

    // Luôn luôn xóa cookies với các options chính xác
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    };

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    res.status(200).json({ message: 'Logout successful' });
  });
}

module.exports = new AuthController();
