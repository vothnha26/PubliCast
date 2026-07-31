import { create } from 'zustand';
import authService from '../services/auth.service';
import profileService from '../services/profile.service';
import { toast } from 'sonner';

export const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  isAuthenticated: false,

  checkAuth: async () => {
    try {
      const res = await profileService.getUserProfile();
      // Handle both raw object (unwrapped by apiV2 interceptor) and legacy { data: ... }
      const userData = res?.data || res;
      if (userData && (userData.id || userData.email)) {
        set({ user: userData, isAuthenticated: true });
        try {
          const { socketClient } = await import('../services/socket');
          socketClient.connect();
        } catch (sErr) {
          console.error('Socket connection error:', sErr);
        }
      } else {
        set({ user: null, isAuthenticated: false });
      }
    } catch (error) {
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    try {
      const data = await authService.login({ email, password });
      if (data.require2FA) {
        return data;
      }
      await get().checkAuth();
      toast.success('Đăng nhập thành công!');
      return data;
    } catch (error) {
      toast.error(error.message || 'Đăng nhập thất bại');
      throw error;
    }
  },

  loginVerify2FA: async (preAuthToken, code) => {
    try {
      const data = await authService.loginVerify2FA({ preAuthToken, code });
      await get().checkAuth();
      toast.success('Đăng nhập thành công!');
      return data;
    } catch (error) {
      toast.error(error.message || 'Xác thực 2FA thất bại');
      throw error;
    }
  },

  register: async (userData) => {
    try {
      const data = await authService.register(userData);
      toast.success('Đăng ký thành công! Vui lòng kiểm tra email để nhận mã OTP.');
      return data;
    } catch (error) {
      toast.error(error.message || 'Đăng ký thất bại');
      throw error;
    }
  },

  verifyOTP: async (email, otp) => {
    try {
      const data = await authService.verifyOTP({ email, otp });
      await get().checkAuth();
      toast.success('Xác thực thành công!');
      return data;
    } catch (error) {
      toast.error(error.message || 'Xác thực thất bại');
      throw error;
    }
  },

  logout: async () => {
    try {
      try {
        const { socketClient } = await import('../services/socket');
        socketClient.disconnect();
      } catch (sErr) {
        console.error('Socket disconnect error:', sErr);
      }
      await authService.logout();
    } finally {
      set({ user: null, isAuthenticated: false });
      toast.info('Đã đăng xuất');
    }
  }
}));
