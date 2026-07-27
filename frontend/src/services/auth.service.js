import apiService from './api';

class AuthService {
  async getGoogleLoginUrl() {
    const response = await apiService.get('/auth/google');
    return response.data;
  }

  async login(payload) {
    // Auth is established via the HttpOnly cookies the backend sets on this
    // response (see api.js's withCredentials) — the backend never returns a
    // raw token in the body here, so there was nothing to store client-side.
    const response = await apiService.post('/auth/login', payload);
    return response.data;
  }

  async register(payload) {
    const response = await apiService.post('/auth/register', payload);
    return response.data;
  }

  async verifyOTP(payload) {
    const response = await apiService.post('/auth/verify-otp', payload);
    return response.data;
  }

  async resendOTP(email) {
    const response = await apiService.post('/auth/resend-otp', { email });
    return response.data;
  }

  async forgotPassword(email) {
    const response = await apiService.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(payload) {
    const response = await apiService.post('/auth/reset-password', payload);
    return response.data;
  }

  async verifyResetToken(token) {
    const response = await apiService.get(`/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
    return response.data;
  }

  async setup2FA() {
    const response = await apiService.post('/auth/2fa/setup');
    return response.data;
  }

  async verify2FA(code) {
    const response = await apiService.post('/auth/2fa/verify', { code });
    return response.data;
  }

  async disable2FA(code) {
    const response = await apiService.post('/auth/2fa/disable', { code });
    return response.data;
  }

  async loginVerify2FA(payload) {
    const response = await apiService.post('/auth/2fa/login-verify', payload);
    return response.data;
  }

  async logout() {
    try {
      await apiService.post('/auth/logout');
    } catch (error) {
      console.warn('Backend logout failed:', error.message);
    }
  }

  async refreshToken() {
    // Backend sets a fresh accessToken cookie on this response; nothing to
    // store client-side.
    const response = await apiService.post('/auth/refresh');
    return response.data;
  }
}

const authService = new AuthService();
export default authService;

