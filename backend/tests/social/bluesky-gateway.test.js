const blueskyGateway = require('../../src/services/social/bluesky/bluesky.gateway');
const BLUESKY_CONSTANTS = require('../../src/services/social/bluesky/bluesky.constants');

// Mock bluesky constants để test nhanh hơn
jest.mock('../../src/services/social/bluesky/bluesky.constants', () => {
  const original = jest.requireActual('../../src/services/social/bluesky/bluesky.constants');
  return {
    ...original,
    LIMITS: {
      ...original.LIMITS,
      VIDEO_JOB_POLL_INTERVAL_MS: 1, // Poll cực nhanh
      VIDEO_JOB_MAX_ATTEMPTS: 3 // Max 3 lần để test timeout nhanh
    }
  };
});

describe('BlueskyGateway uploadVideo Unit Tests', () => {
  let mockAgent;
  let originalFetch;
  let fetchMock;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = global.fetch;
    fetchMock = jest.fn();
    global.fetch = fetchMock;

    mockAgent = {
      dispatchUrl: new URL('https://bsky.social'),
      session: {
        did: 'did:plc:testuser123'
      },
      com: {
        atproto: {
          server: {
            getServiceAuth: jest.fn().mockResolvedValue({
              data: { token: 'mock-service-token' }
            })
          }
        }
      }
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should successfully upload and return blob on happy path', async () => {
    // 1st call: uploadVideo POST
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ jobId: 'job-happy' })
    });
    // 2nd call: getJobStatus polling
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        jobStatus: {
          state: 'JOB_STATE_COMPLETED',
          blob: { cid: 'cid-happy-video' }
        }
      })
    });

    const result = await blueskyGateway.uploadVideo(mockAgent, Buffer.from('fake-video'));
    expect(result).toEqual({ cid: 'cid-happy-video' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should bypass ok check and return blob if already_exists returns error response with blob', async () => {
    // 1st call: uploadVideo POST
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ jobId: 'job-exists' })
    });
    // 2nd call: getJobStatus polling returns HTTP 400 but has blob
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({
        jobStatus: {
          error: 'already_exists',
          blob: { cid: 'cid-existing-video' }
        }
      })
    });

    const result = await blueskyGateway.uploadVideo(mockAgent, Buffer.from('fake-video'));
    expect(result).toEqual({ cid: 'cid-existing-video' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should throw detailed error if status checking fails and does not contain blob', async () => {
    // 1st call: uploadVideo POST
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ jobId: 'job-fail' })
    });
    // 2nd call: getJobStatus polling returns HTTP 500 without blob
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({
        jobStatus: {
          error: 'InternalServerErr'
        }
      })
    });

    await expect(
      blueskyGateway.uploadVideo(mockAgent, Buffer.from('fake-video'))
    ).rejects.toThrow('Video job status check failed: HTTP 500 (InternalServerErr)');
  });

  it('should throw error when jobStatus state is JOB_STATE_FAILED', async () => {
    // 1st call: uploadVideo POST
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ jobId: 'job-failed-state' })
    });
    // 2nd call: getJobStatus polling
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        jobStatus: {
          state: 'JOB_STATE_FAILED',
          error: 'Invalid video format'
        }
      })
    });

    await expect(
      blueskyGateway.uploadVideo(mockAgent, Buffer.from('fake-video'))
    ).rejects.toThrow('Bluesky video processing failed: Invalid video format');
  });

  it('should throw timeout error when job stays processing after max attempts', async () => {
    // 1st call: uploadVideo POST
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ jobId: 'job-timeout' })
    });
    // Poll 1, 2, 3 return JOB_STATE_PROCESSING
    const processingResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        jobStatus: {
          state: 'JOB_STATE_PROCESSING'
        }
      })
    };
    fetchMock.mockResolvedValue(processingResponse);

    await expect(
      blueskyGateway.uploadVideo(mockAgent, Buffer.from('fake-video'))
    ).rejects.toThrow('Bluesky video processing timed out');
  });
});
