const authService = require('../../services/auth/auth.service');
const jwtUtils = require('../../utils/jwt.utils');
const loginRateLimiter = require('../../middlewares/login-rate-limit.middleware');
const { setAuthCookies } = require('../../utils/cookie.utils');
const { ERROR_MESSAGES, ERROR_CODES, USER_ROLES } = require('../../utils/constants');

// Maps internal Error.code -> the ?error= slug the frontend route matches on
// (see frontend/src/constants/authErrors.js:GOOGLE_OAUTH_ERROR_CODES).
const OAUTH_CALLBACK_ERROR_REDIRECTS = {
  [ERROR_CODES.GOOGLE_ACCOUNT_NOT_LINKED]: 'google_account_not_linked'
};
const asyncHandler = require('../../utils/async-handler');
const appConfig = require('../../config/app.config');

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
    const baseUrl = process.env.BACKEND_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${baseUrl}/api/auth/google/callback`;
    const frontendUrl = appConfig.frontendUrl;

    let currentUserId = null;
    if (state === 'settings') {
      const token = req.cookies?.accessToken;
      if (token) {
        try {
          const decoded = jwtUtils.verifyAccessToken(token);
          currentUserId = decoded.id;
        } catch (err) {
          // Invalid/expired token while linking from Settings — proceed
          // without a currentUserId; handleGoogleCallback treats this as a
          // fresh login rather than an account-linking flow.
        }
      }
    }

    let result;
    try {
      result = await authService.handleGoogleCallback(code, redirectUri, currentUserId);
    } catch (err) {
      const redirectSlug = OAUTH_CALLBACK_ERROR_REDIRECTS[err.code];
      if (redirectSlug) {
        return res.redirect(`${frontendUrl}/login?error=${redirectSlug}`);
      }
      throw err;
    }

    setAuthCookies(res, result.accessToken, result.refreshToken);

    if (state === 'settings') {
      res.redirect(`${frontendUrl}/settings?tab=access&success=google_linked`);
    } else {
      // Auth is already established via the HttpOnly cookies set above —
      // the frontend never needed the raw tokens from the URL, and putting
      // them there leaked into browser history, server/proxy access logs,
      // and the Referrer header of the landing page's first request.
      res.redirect(`${frontendUrl}/dashboard?success=google_login`);
    }
  });

  register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    // Defensive input validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }
    if (!password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const user = await authService.register(name.trim(), email.trim(), password);
    res.status(201).json({
      message: ERROR_MESSAGES.REGISTRATION_SUCCESS,
      userId: user.id
    });
  });

  verifyOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    // Defensive input validation
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }
    if (!otp || typeof otp !== 'string' || !otp.trim()) {
      return res.status(400).json({ message: 'OTP is required' });
    }

    const result = await authService.verifyOTP(email.trim(), otp.trim());

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

    // Defensive input validation
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const result = await authService.resendOTP(email.trim());
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

    // Defensive input validation
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }
    if (!password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({ message: 'Password is required' });
    }

    try {
      const result = await authService.login(email.trim().toLowerCase(), password);

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
