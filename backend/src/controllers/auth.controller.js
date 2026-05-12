const authService = require('../services/auth.service');
const loginRateLimiter = require('../middlewares/login-rate-limit.middleware');
const { ERROR_MESSAGES } = require('../utils/constants');

class AuthController {
  async register(req, res) {
    try {
      const { name, email, password } = req.body;
      const user = await authService.register(name, email, password);
      res.status(201).json({
        message: ERROR_MESSAGES.REGISTRATION_SUCCESS,
        userId: user.id
      });
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json({ message: error.message });
    }
  }

  async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;
      const result = await authService.verifyOTP(email, otp);

      // Set HttpOnly cookies for tokens (Auto-login)
      if (result.accessToken && result.refreshToken) {
        const accessTokenMaxAge = 15 * 60 * 1000;
        const refreshTokenMaxAge = 7 * 24 * 60 * 60 * 1000;

        res.cookie('accessToken', result.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: accessTokenMaxAge,
          path: '/'
        });

        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: refreshTokenMaxAge,
          path: '/'
        });
      }

      res.status(200).json({
        message: result.message,
        user: result.user
      });
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json({ message: error.message });
    }
  }

  async resendOTP(req, res) {
    try {
      const { email } = req.body;
      const result = await authService.resendOTP(email);
      res.status(200).json(result);
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json({ message: error.message });
    }
  }

  /**
   * Request forgot password OTP.
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email.toLowerCase());
      res.status(200).json(result);
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json({ message: error.message });
    }
  }

  /**
   * Verify OTP and set a new password.
   * POST /api/auth/reset-password
   */
  async resetPassword(req, res) {
    try {
      const { email, otp, newPassword } = req.body;
      const result = await authService.resetPassword(email.toLowerCase(), otp, newPassword);
      res.status(200).json(result);
    } catch (error) {
      const status = error.status || 500;
      const body = { message: error.message };
      if (error.remainingAttempts !== undefined) {
        body.remainingAttempts = error.remainingAttempts;
      }
      res.status(status).json(body);
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Attempt login
      const result = await authService.login(email.toLowerCase(), password);

      // Reset rate limit on successful login
      if (req.rateLimit) {
        await loginRateLimiter.resetAttempts(req.rateLimit.email, req.rateLimit.ip);
      }

      // Set HttpOnly cookies for tokens
      const accessTokenMaxAge = 15 * 60 * 1000; // 15 minutes
      const refreshTokenMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: accessTokenMaxAge,
        path: '/'
      });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: refreshTokenMaxAge,
        path: '/'
      });

      res.status(200).json({
        message: ERROR_MESSAGES.LOGIN_SUCCESS,
        role: result.role,
        redirectUrl: result.role === 'ADMIN' ? '/admin/profile' : '/user/profile',
        user: result.user
      });
    } catch (error) {
      const status = error.status || 500;

      // Record failed login attempt if rate limiter data is available
      if (req.rateLimit) {
        await loginRateLimiter.recordFailedAttempt(req.rateLimit.email, req.rateLimit.ip);
      }

      res.status(status).json({ message: error.message });
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  async refreshToken(req, res) {
    try {
      const refreshToken = req.cookies?.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token required' });
      }

      // Extract user ID from refresh token (decode without verification to get ID)
      const jwtUtils = require('../utils/jwt.utils');
      let userId;
      try {
        const decoded = jwtUtils.verifyRefreshToken(refreshToken);
        userId = decoded.id;
      } catch (error) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }

      const result = await authService.refreshTokens(refreshToken, userId);

      // Set new tokens in cookies
      const accessTokenMaxAge = 15 * 60 * 1000; // 15 minutes
      const refreshTokenMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: accessTokenMaxAge,
        path: '/'
      });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: refreshTokenMaxAge,
        path: '/'
      });

      res.status(200).json({ message: 'Token refreshed successfully' });
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json({ message: error.message });
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  async logout(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      await authService.logout(userId);

      // Clear cookies
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = new AuthController();
