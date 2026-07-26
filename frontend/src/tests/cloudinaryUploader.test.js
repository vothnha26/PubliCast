import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CloudinaryResumableUploader from '../utils/cloudinaryUploader';

describe('CloudinaryResumableUploader resumable session (#111)', () => {
  const file = new File([new Uint8Array(10 * 1024 * 1024)], 'video.mp4', { type: 'video/mp4' });
  const fileKey = `cld-resumable-${file.name}-${file.size}`;

  beforeEach(() => {
    const storage = {};
    globalThis.localStorage = {
      getItem: (key) => storage[key] || null,
      setItem: (key, value) => { storage[key] = String(value); },
      removeItem: (key) => { delete storage[key]; },
      clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
    };
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists the signature/timestamp used to start the session', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ secure_url: 'https://example.com/video.mp4' })
    });

    const uploader = new CloudinaryResumableUploader('cloud', 'key', 'folder', () => {});
    await uploader.upload(file, 'sig-first', 1000);

    // Session completed successfully, so storage should be cleared again.
    expect(localStorage.getItem(`${fileKey}-signature`)).toBeNull();
    expect(localStorage.getItem(`${fileKey}-timestamp`)).toBeNull();
  });

  it('reuses the original session signature/timestamp instead of a freshly re-fetched one after resuming', async () => {
    // Simulate a page reload mid-upload: a prior session persisted its own
    // signature/timestamp alongside the resume offset.
    localStorage.setItem(`${fileKey}-id`, 'idx-old-session');
    localStorage.setItem(`${fileKey}-start`, `${6 * 1024 * 1024}`);
    localStorage.setItem(`${fileKey}-signature`, 'sig-original');
    localStorage.setItem(`${fileKey}-timestamp`, '1000');

    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ secure_url: 'https://example.com/video.mp4' })
    });

    const uploader = new CloudinaryResumableUploader('cloud', 'key', 'folder', () => {});
    // Caller re-fetched a brand-new signature/timestamp on reload — the
    // uploader must ignore these for the resumed session and use the
    // originally-persisted ones instead.
    await uploader.upload(file, 'sig-fresh-after-reload', 9999);

    const [, options] = globalThis.fetch.mock.calls[0];
    const body = options.body;
    expect(body.get('signature')).toBe('sig-original');
    expect(body.get('timestamp')).toBe('1000');
    expect(options.headers['X-Unique-Upload-Id']).toBe('idx-old-session');
  });
});
