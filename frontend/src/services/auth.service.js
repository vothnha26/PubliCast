import apiService from './api';
import { STORAGE_KEYS } from '../constants/storageKeys';

class AuthService {
  async getGoogleLoginUrl() {
    const response = await apiService.get('/auth/google');
    return response.data;
  }

  async login(payload) {
    const response = await apiService.post('/auth/login', payload);
    const token = response.data.accessToken || response.data.token;
    if (token) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    }
    return response.data;
  }

  async register(payload) {
    const response = await apiService.post('/auth/register', payload);
    return response.data;
  }

  async verifyOTP(payload) {
    const response = await apiService.post('/auth/verify-otp', payload);
    const token = response.data.accessToken || response.data.token;
    if (token) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    }
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

  async logout() {
    try {
      await apiService.post('/auth/logout');
    } catch (error) {
      console.warn('Backend logout failed:', error.message);
    } finally {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
    }
  }

  async refreshToken() {
    const response = await apiService.post('/auth/refresh');
    if (response.data.token) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, response.data.token);
    }
    return response.data;
  }
}

const authService = new AuthService();
export default authService;

