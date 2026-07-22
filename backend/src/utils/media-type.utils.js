/**
 * Returns the portion of a media URL/path that should be matched against a
 * file extension — i.e. with any query string / hash stripped.
 *
 * `mediaUrl.endsWith('.mp4')` breaks on any CDN/S3 signed URL carrying a
 * query string (`https://cdn/.../clip.mp4?token=abc&exp=...`), since the
 * string doesn't end in `.mp4` anymore — it ends in the token. That silently
 * routed videos to an image publish strategy across every platform's
 * publish-strategy.factory.js (Facebook, Instagram, LinkedIn, Telegram,
 * Discord — see issues #65/#119).
 *
 * Local file paths (e.g. `/uploads/video.mp4`) aren't valid absolute URLs,
 * so `new URL()` throws on them — fall back to the raw string in that case,
 * which preserves the previous (correct) behavior for local paths.
 */
function getMediaPathForExtensionMatch(mediaUrl) {
  if (!mediaUrl) return '';
  try {
    return new URL(mediaUrl).pathname;
  } catch (err) {
    return mediaUrl;
  }
}

/**
 * @param {string} mediaUrl
 * @param {string[]} extensions - lowercase extensions including the dot, e.g. MEDIA_EXTENSIONS.VIDEO
 * @returns {boolean}
 */
function matchesExtension(mediaUrl, extensions) {
  const path = getMediaPathForExtensionMatch(mediaUrl).toLowerCase();
  return extensions.some(ext => path.endsWith(ext));
}

module.exports = { getMediaPathForExtensionMatch, matchesExtension };
