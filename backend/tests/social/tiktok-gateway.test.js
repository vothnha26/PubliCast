jest.mock('fs');

const originalFetch = global.fetch;

describe('TikTokGateway video buffer resolution (B1)', () => {
  let tiktokGateway;
  let fs;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    // Re-require fs AFTER resetModules so this reference points at the same
    // mock instance the freshly-required gateway module resolves internally —
    // resetModules() clears the module registry, so a stale top-level `fs`
    // import here would silently mock a different fs instance than the one
    // tiktok.gateway.js actually calls.
    fs = require('fs');
    tiktokGateway = require('../../src/services/social/tiktok/tiktok.gateway');
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('_getVideoBuffer', () => {
    it('downloads and buffers a remote (Cloudinary) URL instead of treating it as a local path', async () => {
      const fakeBytes = new Uint8Array([1, 2, 3, 4]).buffer;
      global.fetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(fakeBytes)
      });

      const buffer = await tiktokGateway._getVideoBuffer('https://res.cloudinary.com/demo/video/upload/v1/sample.mp4');

      expect(global.fetch).toHaveBeenCalledWith('https://res.cloudinary.com/demo/video/upload/v1/sample.mp4');
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBe(4);
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    it('throws a descriptive error when the remote download fails', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 404 });

      await expect(
        tiktokGateway._getVideoBuffer('https://res.cloudinary.com/demo/video/upload/v1/missing.mp4')
      ).rejects.toThrow(/Failed to download video from URL/);
    });

    it('still reads local paths via fs.readFileSync, unchanged from before', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(Buffer.from('local-video-bytes'));

      const buffer = await tiktokGateway._getVideoBuffer('/uploads/video.mp4');

      expect(fs.readFileSync).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
      expect(buffer.toString()).toBe('local-video-bytes');
    });
  });

  describe('publishVideo', () => {
    it('publishes successfully using a Cloudinary URL without throwing "Media file not found"', async () => {
      const fakeBytes = new Uint8Array([9, 9, 9]).buffer;

      global.fetch.mockImplementation((url) => {
        if (url.includes('res.cloudinary.com')) {
          return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(fakeBytes) });
        }
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
