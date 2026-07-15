const { Readable } = require('stream');

jest.mock('fs');

const originalFetch = global.fetch;

describe('FacebookGateway resumable video upload streaming (B3)', () => {
  let facebookGateway;
  let fs;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    // Re-require fs AFTER resetModules so this reference points at the same
    // mock instance the freshly-required gateway resolves internally (see the
    // same fix in tests/social/tiktok-gateway.test.js for the full rationale).
    fs = require('fs');
    facebookGateway = require('../../src/services/social/facebook/facebook.gateway');
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('_getMediaStream', () => {
    it('HEADs a remote URL first to get content-length, then GETs the body as a stream', async () => {
      global.fetch.mockImplementation((url, options = {}) => {
        if (options.method === 'HEAD') {
          return Promise.resolve({ headers: { get: (h) => (h === 'content-length' ? '2048' : null) } });
        }
        return Promise.resolve({ ok: true, body: 'fake-web-stream' });
      });

      const result = await facebookGateway._getMediaStream('https://res.cloudinary.com/demo/video/upload/v1/sample.mp4');

      expect(result.contentLength).toBe(2048);
      expect(result.stream).toBe('fake-web-stream');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://res.cloudinary.com/demo/video/upload/v1/sample.mp4',
        expect.objectContaining({ method: 'HEAD' })
      );
    });

    it('throws when the remote URL has no content-length header', async () => {
      global.fetch.mockResolvedValue({ headers: { get: () => null } });

      await expect(
        facebookGateway._getMediaStream('https://res.cloudinary.com/demo/video/upload/v1/sample.mp4')
      ).rejects.toThrow(/Cannot determine content-length/);
    });

    it('reads local files via fs.createReadStream + Readable.toWeb, not fetch', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 512 });
      const fakeNodeStream = Readable.from(['abc']);
      fs.createReadStream.mockReturnValue(fakeNodeStream);

      const result = await facebookGateway._getMediaStream('/uploads/video.mp4');

      expect(result.contentLength).toBe(512);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(fs.createReadStream).toHaveBeenCalled();
    });
  });

  describe('publishVideo', () => {
    it('runs start -> transfer -> finish in order, sending the stream as a raw body (not FormData)', async () => {
      const calls = [];
      global.fetch.mockImplementation((url, options = {}) => {
        calls.push({ url, options });
        if (url.includes('upload_phase=start')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ video_id: 'vid-1', upload_url: 'https://upload.facebook.example/put' })
          });
        }
        if (url === 'https://upload.facebook.example/put') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }
        if (url.includes('upload_phase=finish')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'fb_video_123' }) });
        }
        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      });

      jest.spyOn(facebookGateway, '_getMediaStream').mockResolvedValue({
        stream: 'fake-web-stream',
        contentLength: 4096
      });

      const result = await facebookGateway.publishVideo(
        'page-1',
        'page-token',
        'https://res.cloudinary.com/demo/video/upload/v1/sample.mp4',
        'My Title',
        'My Description'
      );

      expect(result).toEqual({ id: 'fb_video_123' });
      expect(calls).toHaveLength(3);
      expect(calls[0].url).toContain('upload_phase=start');
      expect(calls[1].url).toBe('https://upload.facebook.example/put');
      expect(calls[1].options.body).toBe('fake-web-stream');
      expect(calls[1].options.duplex).toBe('half');
      expect(calls[1].options.headers['file_size']).toBe('4096');
      expect(calls[1].options.body).not.toBeInstanceOf(FormData);
      expect(calls[2].url).toContain('upload_phase=finish');
      expect(calls[2].url).toContain('video_id=vid-1');
    });

    it('throws a descriptive error if the start phase fails', async () => {
      global.fetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: { message: 'boom' } }) });

      await expect(
        facebookGateway.publishVideo('page-1', 'page-token', '/uploads/video.mp4', 'T', 'D')
      ).rejects.toThrow('boom');
    });
  });
});
