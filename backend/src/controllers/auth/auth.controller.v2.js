const authService = require('../../services/auth/auth.service');
const { v2Success } = require('../../utils/response.helper');
const { setAuthCookies } = require('../../utils/cookie.utils');
const jwtUtils = require('../../utils/jwt.utils');

/**
 * Auth Controller V2 - Enforces Standardized Envelope Responses: { message, data }
 */
class AuthControllerV2 {
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;
      const user = await authService.register(name, email, password);
      return v2Success(res, { userId: user.id }, 'Registration initiated. OTP sent to email.', 201);
    } catch (err) {
      next(err);
    }
  }

  async verifyOTP(req, res, next) {
    try {
      const { email, otp } = req.body;
      const result = await authService.verifyOTP(email, otp);
      if (result.accessToken && result.refreshToken) {
        setAuthCookies(res, result.accessToken, result.refreshToken, req);
      }
      return v2Success(res, { user: result.user }, 'Email verified successfully.');
    } catch (err) {
      next(err);
    }
  }

  async resendOTP(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.resendOTP(email);
      return v2Success(res, result, 'OTP resent successfully.');
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      if (result.require2FA) {
        return v2Success(res, { require2FA: true, preAuthToken: result.preAuthToken }, '2FA required.');
      }

      setAuthCookies(res, result.accessToken, result.refreshToken, req);
      return v2Success(res, { user: result.user, role: result.role }, 'Login successful.');
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      const userId = req.user?.id;
      if (userId) {
        await authService.logout(userId);
      }
      res.clearCookie('accessToken', { path: '/' });
      res.clearCookie('refreshToken', { path: '/' });
      return v2Success(res, null, 'Logged out successfully.');
    } catch (err) {
      next(err);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        const error = new Error('Refresh token required');
        error.status = 401;
        throw error;
      }
      const decoded = jwtUtils.verifyRefreshToken(refreshToken);
      const result = await authService.refreshTokens(refreshToken, decoded.id);
      setAuthCookies(res, result.accessToken, result.refreshToken, req);
      return v2Success(res, null, 'Token refreshed successfully.');
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      return v2Success(res, result, 'Password reset link sent to email.');
    } catch (err) {
      next(err);
    }
  }

  async verifyResetToken(req, res, next) {
    try {
      const { token } = req.query;
      const result = await authService.verifyResetToken(token);
      return v2Success(res, result, 'Token is valid.');
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      const result = await authService.resetPasswordWithToken(token, newPassword);
      return v2Success(res, result, 'Password reset successfully.');
    } catch (err) {
      next(err);
    }
  }

  async setup2FA(req, res, next) {
    try {
      const result = await authService.setup2FA(req.user.id);
      return v2Success(res, result, '2FA setup initiated.');
    } catch (err) {
      next(err);
    }
  }

  async verify2FA(req, res, next) {
    try {
      const { code } = req.body;
      const result = await authService.verify2FA(req.user.id, code);
      return v2Success(res, result, '2FA enabled successfully.');
    } catch (err) {
      next(err);
    }
  }

  async disable2FA(req, res, next) {
    try {
      const { code } = req.body;
      const result = await authService.disable2FA(req.user.id, code);
      return v2Success(res, result, '2FA disabled successfully.');
    } catch (err) {
      next(err);
    }
  }

  async loginVerify2FA(req, res, next) {
    try {
      const { preAuthToken, code } = req.body;
      const result = await authService.loginVerify2FA(preAuthToken, code);
      setAuthCookies(res, result.accessToken, result.refreshToken, req);
      return v2Success(res, { user: result.user, role: result.role, isBackupUsed: result.isBackupUsed }, '2FA verification successful.');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthControllerV2();
