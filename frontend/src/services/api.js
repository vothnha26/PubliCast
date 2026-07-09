import axios from 'axios';
import { STORAGE_KEYS } from '../constants/storageKeys';

const baseURL = import.meta.env.VITE_API_BASE_URL;

// Flag to prevent multiple concurrent refresh attempts
let isRefreshing = false;
let refreshSubscribers = [];

const onRefreshed = () => {
  refreshSubscribers.forEach(cb => cb());
  refreshSubscribers = [];
};

const addRefreshSubscriber = (cb) => {
  refreshSubscribers.push(cb);
};

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL,
      timeout: 15000, // 15 giây timeout
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true', // Giữ lại của nhánh develop
      },
      withCredentials: true, // Sends HttpOnly cookies (accessToken + refreshToken) automatically
    });

    // ── Request interceptor ──────────────────────────────────────────
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // ── Response interceptor: auto-refresh on 401 ───────────────────
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle LIMIT_REACHED
        const data = error.response?.data;
        if (error.response?.status === 403 && data?.code === 'LIMIT_REACHED') {
          window.dispatchEvent(new CustomEvent('LIMIT_REACHED', { detail: data }));
        }

        // Auto-refresh on 401 (Access token expired)
        // Don't retry refresh endpoint itself to avoid infinite loop
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url?.includes('/auth/refresh') &&
          !originalRequest.url?.includes('/auth/login') &&
          !originalRequest.url?.includes('/auth/logout')
        ) {
          if (isRefreshing) {
            // Queue this request until refresh is done
            return new Promise((resolve, reject) => {
              addRefreshSubscriber(() => {
                resolve(this.api(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            // Call refresh — backend sets new accessToken cookie automatically
            await this.api.post('/auth/refresh');
            isRefreshing = false;
            onRefreshed();
            // Retry the original request (cookie is now updated)
            return this.api(originalRequest);
          } catch (refreshError) {
            isRefreshing = false;
            refreshSubscribers = [];
            // Refresh also failed — session truly expired, redirect to login
            window.dispatchEvent(new CustomEvent('SESSION_EXPIRED'));
            const message = data?.message || error.message;
            const customError = new Error(message);
            customError.status = error.response?.status;
            return Promise.reject(customError);
          }
        }

        // Xử lý lỗi thông thường (Gộp từ nhánh develop)
        const message = data?.message || (data?.errors && data.errors[0] ? data.errors[0].msg : null) || error.message;
        const customError = new Error(message);
        customError.status = error.response?.status;
        return Promise.reject(customError);
      }
    );
  }

  async get(url, config = {}) { return this.api.get(url, config); }
  async post(url, data = {}, config = {}) { return this.api.post(url, data, config); }
  async put(url, data = {}, config = {}) { return this.api.put(url, data, config); }
  async patch(url, data = {}, config = {}) { return this.api.patch(url, data, config); }
  async delete(url, config = {}) { return this.api.delete(url, config); }
}

const apiService = new ApiService();
export default apiService;