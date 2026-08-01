import { apiV2 } from './api';

class AuthService {
  async getGoogleLoginUrl() {
    const data = await apiV2.get('/auth/google');
    return data;
  }

  async login(payload) {
    // Auth is established via the HttpOnly cookies the backend sets on this response.
    // apiV2 automatically unwraps the { message, data } response envelope.
    const data = await apiV2.post('/auth/login', payload);
    return data;
  }

  async register(payload) {
    const data = await apiV2.post('/auth/register', payload);
    return data;
  }

  async verifyOTP(payload) {
    const data = await apiV2.post('/auth/verify-otp', payload);
    return data;
  }

  async resendOTP(email) {
    const data = await apiV2.post('/auth/resend-otp', { email });
    return data;
  }

  async forgotPassword(email) {
    const data = await apiV2.post('/auth/forgot-password', { email });
    return data;
  }

  async resetPassword(payload) {
    const data = await apiV2.post('/auth/reset-password', payload);
    return data;
  }

  async verifyResetToken(token) {
    const data = await apiV2.get(`/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
    return data;
  }

  async setup2FA() {
    const data = await apiV2.post('/auth/2fa/setup');
    return data;
  }

  async verify2FA(code) {
    const data = await apiV2.post('/auth/2fa/verify', { code });
    return data;
  }

  async disable2FA(code) {
    const data = await apiV2.post('/auth/2fa/disable', { code });
    return data;
  }

  async loginVerify2FA(payload) {
    const data = await apiV2.post('/auth/2fa/login-verify', payload);
    return data;
  }

  async logout() {
    try {
      await apiV2.post('/auth/logout');
    } catch (error) {
      console.warn('Backend logout failed:', error.message);
    }
  }

  async refreshToken() {
    const data = await apiV2.post('/auth/refresh');
    return data;
  }
}

const authService = new AuthService();
export default authService;

