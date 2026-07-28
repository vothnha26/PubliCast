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

// Not httpOnly — issued specifically so the frontend can read it and echo
// it back in a header (double-submit pattern). An attacker page can't read
// it (blocked by same-origin policy on document.cookie), so it can't forge
// a matching header value even though the cookie itself rides along with
// any cross-site request.
const CSRF_COOKIE_NAME = 'csrfToken';

function readCsrfTokenFromCookie() {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

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

    // ── Request interceptor: attach CSRF token on side-effect requests ──
    // Backend rejects POST/PUT/PATCH/DELETE without a matching X-CSRF-Token
    // header (see backend/src/middlewares/csrf.middleware.js). GET requests
    // don't need it — CSRF only matters for requests with a side effect.
    this.api.interceptors.request.use((config) => {
      const method = config.method?.toUpperCase();
      if (method && method !== 'GET') {
        const token = readCsrfTokenFromCookie();
        if (token) {
          config.headers['X-CSRF-Token'] = token;
        }
      }
      return config;
    });

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
export default apiService;