jest.mock('fs');

// _getVideoBuffer now downloads remote URLs via network-security's
// downloadBufferSafely (axios + SSRF guard) instead of a bare fetch() — see
// issue #96. Mock the network-security module directly rather than axios,
// since the SSRF guard logic itself (DNS-rebinding-safe agents, private-IP
// rejection) is already covered by its own unit tests; these tests only
// need to assert the gateway calls it correctly and still falls back to
// fs.readFileSync for local paths.
jest.mock('../../src/utils/network-security', () => ({
  downloadBufferSafely: jest.fn()
}));

const originalFetch = global.fetch;

describe('TikTokGateway video buffer resolution (B1, #96)', () => {
  let tiktokGateway;
  let fs;
  let networkSecurity;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    // Re-require fs AFTER resetModules so this reference points at the same
    // mock instance the freshly-required gateway module resolves internally —
    // resetModules() clears the module registry, so a stale top-level `fs`
    // import here would silently mock a different fs instance than the one
    // tiktok.gateway.js actually calls.
    fs = require('fs');
    networkSecurity = require('../../src/utils/network-security');
    tiktokGateway = require('../../src/services/social/tiktok/tiktok.gateway');
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('_getVideoBuffer', () => {
    it('downloads a remote (Cloudinary) URL via the SSRF-safe helper instead of treating it as a local path', async () => {
      const fakeBuffer = Buffer.from([1, 2, 3, 4]);
      networkSecurity.downloadBufferSafely.mockResolvedValue(fakeBuffer);

      const buffer = await tiktokGateway._getVideoBuffer('https://res.cloudinary.com/demo/video/upload/v1/sample.mp4');

      expect(networkSecurity.downloadBufferSafely).toHaveBeenCalledWith(
        'https://res.cloudinary.com/demo/video/upload/v1/sample.mp4',
        expect.any(Number)
      );
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBe(4);
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    it('propagates the SSRF guard rejection (private/internal URL) instead of swallowing it', async () => {
      networkSecurity.downloadBufferSafely.mockRejectedValue(
        new Error('SSRF Blocked: Destination IP 169.254.169.254 resolved from metadata.internal is private or reserved.')
      );

      await expect(
        tiktokGateway._getVideoBuffer('http://metadata.internal/latest/meta-data/')
      ).rejects.toThrow(/SSRF Blocked/);
    });

    it('still reads local paths via fs.readFileSync, unchanged from before', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(Buffer.from('local-video-bytes'));

      const buffer = await tiktokGateway._getVideoBuffer('/uploads/video.mp4');

      expect(fs.readFileSync).toHaveBeenCalled();
      expect(networkSecurity.downloadBufferSafely).not.toHaveBeenCalled();
      expect(buffer.toString()).toBe('local-video-bytes');
    });
  });

  describe('publishVideo', () => {
    it('publishes successfully using a Cloudinary URL without throwing "Media file not found"', async () => {
      networkSecurity.downloadBufferSafely.mockResolvedValue(Buffer.from([9, 9, 9]));

      global.fetch.mockImplementation((url) => {
        if (url.includes('/creator_info/query/')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: {} }) });
        }
        if (url.includes('/video/init/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { publish_id: 'pub-1', upload_url: 'https://upload.tiktok.example/put' } })
          });
        }
        if (url === 'https://upload.tiktok.example/put') {
          return Promise.resolve({ ok: true });
        }
        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      });

      const result = await tiktokGateway.publishVideo(
        'access-token',
        'https://res.cloudinary.com/demo/video/upload/v1/sample.mp4',
        'My title'
      );

      expect(result).toEqual({ publish_id: 'pub-1', privacy_level: 'PUBLIC_TO_EVERYONE' });
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });
  });
});
