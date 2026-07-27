const { parseGoogleApiError } = require('../../src/services/social/youtube/youtube-error.util');

describe('parseGoogleApiError Unit Tests', () => {
  it('should parse GaxiosError structure with response data error details', () => {
    const mockError = new Error('API Error');
    mockError.code = 403;
    mockError.response = {
      status: 403,
      data: {
        error: {
          errors: [
            {
              reason: 'quotaExceeded',
              message: 'Quota exceeded'
            }
          ],
          code: 403,
          message: 'The request cannot be completed.'
        }
      }
    };

    const parsed = parseGoogleApiError(mockError);
    expect(parsed.status).toBe(403);
    expect(parsed.reason).toBe('quotaExceeded');
    expect(parsed.message).toBe('API Error');
  });

  it('should handle system errors safely without response object', () => {
    const sysError = new Error('connect ECONNREFUSED 127.0.0.1:443');
    sysError.code = 'ECONNREFUSED';

    const parsed = parseGoogleApiError(sysError);
    expect(parsed.status).toBe('ECONNREFUSED');
    expect(parsed.reason).toBeNull();
    expect(parsed.message).toBe('connect ECONNREFUSED 127.0.0.1:443');
  });

  it('should handle regular JS Error safely without code or response object', () => {
    const error = new Error('Unexpected error');

    const parsed = parseGoogleApiError(error);
    expect(parsed.status).toBeNull();
    expect(parsed.reason).toBeNull();
    expect(parsed.message).toBe('Unexpected error');
  });

  it('should handle undefined or null input safely', () => {
    const parsed = parseGoogleApiError(null);
    expect(parsed.status).toBeNull();
    expect(parsed.reason).toBeNull();
    expect(parsed.message).toBe('');
  });
});
