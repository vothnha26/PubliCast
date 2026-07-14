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
    const baseUrl = process.env.BACKEND_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${baseUrl}/api/auth/google/callback`;
    const url = await authService.getGoogleAuthUrl(redirectUri, state);
    res.json({ url });
  });

  /**
   * Google OAuth Callback
   * GET /api/auth/google/callback
   */
  googleCallback = asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    console.log(`[BACKEND DEBUG googleCallback] query state: "${state}", cookies:`, req.cookies);
    const baseUrl = process.env.BACKEND_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${baseUrl}/api/auth/google/callback`;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    let currentUserId = null;
    if (state === 'settings') {
      const token = req.cookies?.accessToken;
      console.log(`[BACKEND DEBUG googleCallback] Found token in cookies: "${token ? 'YES' : 'NO'}"`);
      if (token) {
        try {
          const decoded = jwtUtils.verifyAccessToken(token);
          currentUserId = decoded.id;
          console.log(`[BACKEND DEBUG googleCallback] Token verified successfully, userId: "${currentUserId}"`);
        } catch (err) {
          console.error(`[BACKEND DEBUG googleCallback] Token verification failed:`, err.message);
        }
      }
    }

    const result = await authService.handleGoogleCallback(code, redirectUri, currentUserId);
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
   * Request forgot password Reset Link.
   * POST /api/auth/forgot-password
   */
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await authService.forgotPassword(email.toLowerCase());
    res.status(200).json(result);
  });

  /**
   * Verify Reset Token.
   * GET /api/auth/verify-reset-token
   */
  verifyResetToken = asyncHandler(async (req, res) => {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: 'Mã token khôi phục mật khẩu là bắt buộc.' });
    }
    const result = await authService.verifyResetToken(token);
    res.status(200).json(result);
  });

  /**
   * Reset password using Token.
   * POST /api/auth/reset-password
   */
  resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token và mật khẩu mới là bắt buộc.' });
    }
    const result = await authService.resetPasswordWithToken(token, newPassword);
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

      if (result.require2FA) {
        return res.status(200).json({
          require2FA: true,
          preAuthToken: result.preAuthToken
        });
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
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    await authService.logout(userId);

    // Clear cookies
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });

    res.status(200).json({ message: 'Logout successful' });
  });

  setup2FA = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await authService.setup2FA(userId);
    res.status(200).json(result);
  });

  verify2FA = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Mã OTP xác thực là bắt buộc.' });
    }
    const result = await authService.verify2FA(userId, code);
    res.status(200).json(result);
  });

  disable2FA = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Mã OTP xác thực là bắt buộc.' });
    }
    const result = await authService.disable2FA(userId, code);
    res.status(200).json(result);
  });

  loginVerify2FA = asyncHandler(async (req, res) => {
    const { preAuthToken, code } = req.body;
    if (!preAuthToken || !code) {
      return res.status(400).json({ message: 'Token xác thực tạm thời và mã OTP là bắt buộc.' });
    }

    const result = await authService.loginVerify2FA(preAuthToken, code);

    // Set cookies
    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.status(200).json({
      message: ERROR_MESSAGES.LOGIN_SUCCESS,
      role: result.role,
      redirectUrl: result.role === USER_ROLES.ADMIN ? '/admin/profile' : '/user/profile',
      user: result.user,
      isBackupUsed: result.isBackupUsed
    });
  });
}

module.exports = new AuthController();
