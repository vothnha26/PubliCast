/**
 * Regression tests for issue #65: media-type detection must strip query
 * strings before matching a file extension, since signed CDN/S3 URLs
 * commonly carry one (e.g. `clip.mp4?token=abc&exp=...`).
 */
const { matchesExtension, getMediaPathForExtensionMatch } = require('../../src/utils/media-type.utils');

const VIDEO_EXT = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];

describe('media-type.utils (#65)', () => {
  describe('matchesExtension', () => {
    test('matches a plain URL with no query string', () => {
      expect(matchesExtension('https://cdn.example.com/clip.mp4', VIDEO_EXT)).toBe(true);
    });

    test('matches a signed CDN URL with a query string (the core #65 bug)', () => {
      expect(matchesExtension('https://cdn.example.com/clip.mp4?token=abc&exp=12345', VIDEO_EXT)).toBe(true);
    });

    test('matches with a URL fragment as well', () => {
      expect(matchesExtension('https://cdn.example.com/clip.mp4#t=10', VIDEO_EXT)).toBe(true);
    });

    test('does not match an image URL with a query string', () => {
      expect(matchesExtension('https://cdn.example.com/photo.jpg?token=abc', VIDEO_EXT)).toBe(false);
    });

    test('still matches a local file path with no scheme (falls back to raw string)', () => {
      expect(matchesExtension('/uploads/brand-1/video.mp4', VIDEO_EXT)).toBe(true);
    });

    test('is case-insensitive', () => {
      expect(matchesExtension('https://cdn.example.com/CLIP.MP4?x=1', VIDEO_EXT)).toBe(true);
    });

    test('returns false for empty/falsy input', () => {
      expect(matchesExtension('', VIDEO_EXT)).toBe(false);
      expect(matchesExtension(null, VIDEO_EXT)).toBe(false);
    });
  });

  describe('getMediaPathForExtensionMatch', () => {
    test('strips query string and host from an absolute URL', () => {
      expect(getMediaPathForExtensionMatch('https://cdn.example.com/a/b/clip.mp4?x=1')).toBe('/a/b/clip.mp4');
    });

    test('returns the raw string when it is not a valid absolute URL', () => {
      expect(getMediaPathForExtensionMatch('/uploads/clip.mp4')).toBe('/uploads/clip.mp4');
    });
  });
});
