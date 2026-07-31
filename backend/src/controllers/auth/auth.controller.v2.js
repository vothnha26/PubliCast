const authService = require('../../services/auth/auth.service');
const { v2Success, v2Error } = require('../../utils/response.helper');

/**
 * Auth Controller V2 - Enforces Standardized Envelope Responses: { message, data }
 */
class AuthControllerV2 {
  async register(req, res, next) {
    try {
      const result = await authService.registerUser(req.body);
      return v2Success(res, result, 'Registration initiated. OTP sent to email.', 201);
    } catch (err) {
      next(err);
    }
  }

  async verifyOTP(req, res, next) {
    try {
      const { email, otp } = req.body;
      const result = await authService.verifyOTP(email, otp);
      return v2Success(res, result, 'Email verified successfully.');
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
      const result = await authService.loginUser(req.body, res);
      return v2Success(res, result, 'Login successful.');
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      await authService.logoutUser(req.user?.id, refreshToken, res);
      return v2Success(res, null, 'Logged out successfully.');
    } catch (err) {
      next(err);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      const result = await authService.refreshAccessToken(token, res);
      return v2Success(res, result, 'Token refreshed successfully.');
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
      const result = await authService.resetPassword(token, newPassword);
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
      const { token } = req.body;
      const result = await authService.verify2FA(req.user.id, token);
      return v2Success(res, result, '2FA enabled successfully.');
    } catch (err) {
      next(err);
    }
  }

  async disable2FA(req, res, next) {
    try {
      const { password } = req.body;
      const result = await authService.disable2FA(req.user.id, password);
      return v2Success(res, result, '2FA disabled successfully.');
    } catch (err) {
      next(err);
    }
  }

  async loginVerify2FA(req, res, next) {
    try {
      const { preAuthToken, code } = req.body;
      const result = await authService.loginVerify2FA(preAuthToken, code, res);
      return v2Success(res, result, '2FA verification successful.');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthControllerV2();
