const { FacebookRateLimitError } = require('../../src/services/social/facebook/facebook-reel.gateway');

describe('FacebookRateLimitError Tests', () => {
  it('should parse retry-after header correctly', () => {
    const error = new Error('Rate limit');
    error.response = {
      status: 429,
      headers: {
        'retry-after': '120'
      },
      data: {
        error: { message: 'Too many requests', code: 4 }
      }
    };

    const rateLimitError = new FacebookRateLimitError(error);

    expect(rateLimitError.message).toContain('Too many requests');
    expect(rateLimitError.retryAfterSeconds).toBe(120);
  });

  it('should parse x-app-usage header if retry-after is absent', () => {
    const error = new Error('Rate limit');
    error.response = {
      status: 429,
      headers: {
        'x-app-usage': '{"call_count":100,"total_cputime":50,"total_time":95}'
      },
      data: {
        error: { message: 'App usage limit reached', code: 4 }
      }
    };

    const rateLimitError = new FacebookRateLimitError(error);

    expect(rateLimitError.retryAfterSeconds).toBe(60); // Default to 60 since usage is high but no explicit retry-after
    expect(rateLimitError.rateLimitInfo).toEqual({
      call_count: 100,
      total_cputime: 50,
      total_time: 95
    });
  });

  it('should fallback to 60 seconds if no headers are provided', () => {
    const error = new Error('Rate limit');
    error.response = {
      status: 429,
      headers: {},
      data: {
        error: { message: 'Generic rate limit', code: 17 }
      }
    };

    const rateLimitError = new FacebookRateLimitError(error);

    expect(rateLimitError.retryAfterSeconds).toBe(60);
  });

  it('should identify rate limits based on error codes in the response body', () => {
    const error = new Error('Rate limit');
    error.response = {
      status: 400, // Sometimes Meta returns 400 with rate limit code in body
      headers: {},
      data: {
        error: { message: 'User request limit reached', code: 17, error_subcode: 80007 }
      }
    };

    const rateLimitError = new FacebookRateLimitError(error);
    expect(rateLimitError.retryAfterSeconds).toBe(60);
  });
});
