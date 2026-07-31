import axios from 'axios';
import { toast } from 'sonner';

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
      withCredentials: true,
    });

    // Helper to extract cookie by name
    const getCookie = (name) => {
      if (typeof document === 'undefined') return null;
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? decodeURIComponent(match[2]) : null;
    };

    // ── Request interceptor: attach X-CSRF-Token header ───────────────────
    this.api.interceptors.request.use(
      (config) => {
        const csrfToken = getCookie('csrfToken');
        if (csrfToken && !['get', 'head', 'options'].includes((config.method || '').toLowerCase())) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // ── Response interceptor: auto-refresh on 401 ───────────────────
    // Auth is entirely cookie-based (withCredentials above sends the
    // HttpOnly accessToken/refreshToken cookies automatically) — no request
    // interceptor is needed to attach a token, since the backend never
    // issues one to store client-side.
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
        if (error.response?.status === 429) {
          const retryAfter = error.response?.data?.retryAfterSeconds || error.response?.headers?.['retry-after'];
          const retryMsg = retryAfter ? ` Vui lòng thử lại sau ${retryAfter} giây.` : '';
          toast.error(`Yêu cầu quá nhanh (Rate Limit).${retryMsg}`);
        }

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

// ── V2 Dedicated Axios Client Instance (Standardized Envelope Unwrapping) ─────────────
const v2BaseURL = (baseURL && baseURL.startsWith('http')) 
  ? `${baseURL.replace(/\/api\/?$/, '')}/api/v2` 
  : '/api/v2';

export const apiV2 = axios.create({
  baseURL: v2BaseURL,
  timeout: 15000,
  withCredentials: true,
});

// Helper to extract cookie by name for apiV2
const getCookieV2 = (name) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
};

// Request Interceptor: Attach CSRF Token
apiV2.interceptors.request.use(
  (config) => {
    const csrfToken = getCookieV2('csrfToken');
    if (csrfToken && !['get', 'head', 'options'].includes((config.method || '').toLowerCase())) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto Unwrap Envelope { message, data } & Handle 401 Refresh Token
apiV2.interceptors.response.use(
  (response) => {
    // Standardized V2 Envelope Unwrapping:
    // Backend response format: { message: "...", data: { ... } }
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return response.data.data;
    }
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    const data = error.response?.data;

    // Handle LIMIT_REACHED
    if (error.response?.status === 403 && data?.code === 'LIMIT_REACHED') {
      window.dispatchEvent(new CustomEvent('LIMIT_REACHED', { detail: data }));
    }

    // Auto-refresh on 401
      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url?.includes('/v2/auth/refresh') &&
        !originalRequest.url?.includes('/auth/refresh') &&
        !originalRequest.url?.includes('/auth/login') &&
        !originalRequest.url?.includes('/auth/logout')
      ) {
        if (isRefreshing) {
          return new Promise((resolve) => {
            addRefreshSubscriber(() => {
              resolve(apiV2(originalRequest));
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          await apiV2.post('/auth/refresh');
        isRefreshing = false;
        onRefreshed();
        return apiV2(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        refreshSubscribers = [];
        window.dispatchEvent(new CustomEvent('SESSION_EXPIRED'));
        const message = data?.message || error.message;
        const customError = new Error(message);
        customError.status = error.response?.status;
        return Promise.reject(customError);
      }
    }

    if (error.response?.status === 429) {
      const retryAfter = error.response?.data?.retryAfterSeconds || error.response?.headers?.['retry-after'];
      const retryMsg = retryAfter ? ` Vui lòng thử lại sau ${retryAfter} giây.` : '';
      toast.error(`Yêu cầu quá nhanh (Rate Limit).${retryMsg}`);
    }

    const message = data?.message || (data?.errors && data.errors[0] ? data.errors[0].msg : null) || error.message;
    const customError = new Error(message);
    customError.status = error.response?.status;
    customError.response = error.response;
    return Promise.reject(customError);
  }
);

export default apiService;