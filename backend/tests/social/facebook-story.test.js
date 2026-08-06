const facebookGateway = require('../../src/services/social/facebook/facebook.gateway');

describe('FacebookGateway.publishStory', () => {
  let originalFetch;
  let getMediaBufferSpy;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    global.fetch = jest.fn();
    getMediaBufferSpy = jest
      .spyOn(facebookGateway, '_getMediaBuffer')
      .mockResolvedValue({ buffer: Buffer.from('fake media'), filename: 'story.mp4' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('publishes a video story via the 3-phase video_stories session (start -> upload -> finish) and normalizes post_id to id', async () => {
    // Phase 1: start upload session
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ video_id: 'video_123', upload_url: 'https://rupload.facebook.com/video-upload/v25.0/video_123' })
    });
    // Phase 2: upload video binary
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true })
    });
    // Phase 3: finish — Meta returns post_id, not id
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true, post_id: 'story_456' })
    });

    const result = await facebookGateway.publishStory('page_1', 'token_1', 'https://example.com/video.mp4', 'caption');

    expect(result.id).toBe('story_456');
    expect(result.post_id).toBe('story_456');
    expect(global.fetch).toHaveBeenCalledTimes(3);

    // Start phase must hit /page_id/video_stories, not /page_id/videos
    expect(global.fetch).toHaveBeenNthCalledWith(1,
      'https://graph.facebook.com/v25.0/page_1/video_stories',
      expect.objectContaining({ method: 'POST' })
    );
    // Upload phase must hit the upload_url returned by the start phase
    expect(global.fetch).toHaveBeenNthCalledWith(2,
      'https://rupload.facebook.com/video-upload/v25.0/video_123',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('publishes a photo story and normalizes post_id to id', async () => {
    getMediaBufferSpy.mockResolvedValue({ buffer: Buffer.from('fake photo'), filename: 'story.jpg' });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'photo_123' })
    });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true, post_id: 'story_789' })
    });

    const result = await facebookGateway.publishStory('page_1', 'token_1', 'https://example.com/photo.jpg', 'caption');

    expect(result.id).toBe('story_789');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('throws instead of returning a fabricated success when the start-session step returns a non-OK response (#64)', async () => {
    // Previously: no res.ok check meant an error body like
    // { error: { message: 'Invalid OAuth access token' } } was returned
    // as if it were the successful response, producing
    // "Published successfully! platformPostId=undefined" downstream.
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({ error: { message: 'Invalid OAuth access token', code: 190 } })
    });

    await expect(
      facebookGateway.publishStory('page_1', 'token_1', 'https://example.com/video.mp4', 'caption')
    ).rejects.toThrow('Invalid OAuth access token');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('throws instead of returning a fabricated success when the finish step returns a non-OK response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ video_id: 'video_123', upload_url: 'https://rupload.facebook.com/video-upload/v25.0/video_123' })
    });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true })
    });
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({ error: { message: 'Video not yet ready for story publish' } })
    });

    await expect(
      facebookGateway.publishStory('page_1', 'token_1', 'https://example.com/video.mp4', 'caption')
    ).rejects.toThrow('Video not yet ready for story publish');
  });

  it('throws instead of returning a fabricated success when the photo upload step returns a non-OK response', async () => {
    getMediaBufferSpy.mockResolvedValue({ buffer: Buffer.from('fake photo'), filename: 'story.jpg' });

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({ error: { message: 'Unsupported photo format' } })
    });

    await expect(
      facebookGateway.publishStory('page_1', 'token_1', 'https://example.com/photo.jpg', 'caption')
    ).rejects.toThrow('Unsupported photo format');
  });
});
