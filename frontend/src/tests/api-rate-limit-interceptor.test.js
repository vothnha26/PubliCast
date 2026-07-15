/* eslint-disable no-undef */
import apiService from '../services/api';
import { toast } from 'sonner';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn()
  }
}));

describe('Axios 429 Rate Limit Interceptor Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should trigger toast.error when request encounters a 429 status code', async () => {
    // We mock the inner api axios instance to throw a 429 error
    const error429 = {
      config: {},
      response: {
        status: 429,
        headers: {
          'retry-after': '30'
        },
        data: {
          message: 'Too Many Requests',
          retryAfterSeconds: 30
        }
      }
    };

    // Simulate rejection by interceptor chain
    try {
      // Find the response interceptor and execute it
      const responseInterceptor = apiService.api.interceptors.response.handlers[0].rejected;
      await responseInterceptor(error429);
    } catch (err) {
      // Handled and rejected
    }

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Yêu cầu quá nhanh (Rate Limit)'));
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('30 giây'));
  });
});
