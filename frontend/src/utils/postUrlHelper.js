/**
 * Utility to construct direct native platform post URL from a post object.
 *
 * @param {Object} post - The post object from state/API
 * @returns {string|null} The direct platform post URL, or fallback platform URL, or null
 */
/**
 * Resolve which platform a post targets and its real platform-side post ID.
 *
 * post.platformPostId is a JSON map with two shapes in the wild (mirrors
 * backend/src/services/workspace/post/platform-post-id.util.js, which this
 * duplicates client-side since there's no API endpoint exposing it):
 *   Legacy:  { [PLATFORM]: id }
 *   Current: { [PLATFORM]: { [socialAccountId]: id } } — one id per
 *     (platform, account) pair, since a post can target multiple accounts
 *     of the same platform. Reading parsed[firstPlatform] directly without
 *     checking which shape it is returns the *inner object* under the
 *     current shape, not a string — String(thatObject) then produces the
 *     literal text "[object Object]" as the "id", which got baked straight
 *     into the post URL (e.g. facebook.com/[object%20Object]).
 *
 * @returns {{ platform: string, platformPostId: string|null }}
 */
export function resolvePlatformTarget(post) {
  if (!post) return { platform: '', platformPostId: null };

  const platforms = Array.isArray(post.platforms)
    ? post.platforms
    : post.targetPlatforms
    ? (Array.isArray(post.targetPlatforms) ? post.targetPlatforms : post.targetPlatforms.split(','))
    : [];

  const firstPlatform = (platforms[0] || post.platform || '').trim().toUpperCase();

  // A map entry is either a legacy plain string id, or the current
  // { socialAccountId: id } shape — resolve either down to a single id
  // string, same as getIdForAccount()/getFirstIdForPlatform() server-side.
  const firstIdFromEntry = (entry) => {
    if (entry == null) return null;
    if (typeof entry === 'string') return entry;
    if (typeof entry === 'object') {
      const values = Object.values(entry);
      return values.length > 0 ? values[0] : null;
    }
    return null;
  };

  let parsedMap = post.platformPostId;
  if (typeof parsedMap === 'string') {
    try {
      const parsed = JSON.parse(parsedMap);
      parsedMap = parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) {
      // Plain text ID, not JSON — not a per-platform map, so there's no
      // firstPlatform to key into; treat the whole string as the id itself.
      return { platform: firstPlatform, platformPostId: parsedMap.trim() || null };
    }
  }

  let platformPostId = null;
  if (parsedMap && typeof parsedMap === 'object') {
    platformPostId = firstIdFromEntry(parsedMap[firstPlatform]);
    if (platformPostId == null) {
      // No entry for the platform we resolved from post.platforms — fall
      // back to whichever platform's id happens to exist, same tolerance
      // the old code had for mismatched/missing platform metadata.
      for (const entry of Object.values(parsedMap)) {
        platformPostId = firstIdFromEntry(entry);
        if (platformPostId != null) break;
      }
    }
  }

  return { platform: firstPlatform, platformPostId: platformPostId ? String(platformPostId).trim() : null };
}

export function getPlatformPostUrl(post) {
  if (!post) return null;

  // 1. Direct permalink in metadata/options if available
  const options = typeof post.options === 'string' ? safeJsonParse(post.options) : post.options;
  if (options?.permalinkUrl) return options.permalinkUrl;
  if (post.permalinkUrl) return post.permalinkUrl;

  // 2. Extract platform and platformPostId
  const { platform: firstPlatform, platformPostId } = resolvePlatformTarget(post);

  // 3. Platform-specific URL patterns
  if (platformPostId) {
    const id = String(platformPostId).trim();
    if (id.startsWith('http://') || id.startsWith('https://')) {
      return id;
    }

    switch (firstPlatform) {
      case 'FACEBOOK':
        return `https://www.facebook.com/${id}`;
      case 'YOUTUBE':
        return `https://www.youtube.com/watch?v=${id}`;
      case 'INSTAGRAM':
        return `https://www.instagram.com/p/${id}/`;
      case 'TIKTOK':
        return `https://www.tiktok.com/video/${id}`;
      case 'TWITTER':
      case 'X':
        return `https://x.com/i/status/${id}`;
      case 'LINKEDIN':
        return `https://www.linkedin.com/feed/update/${id}`;
      case 'THREADS':
        return `https://www.threads.net/p/${id}`;
      case 'BLUESKY':
        return `https://bsky.app`;
      case 'REDDIT':
        return `https://www.reddit.com/comments/${id}`;
      case 'TWITCH':
        return `https://www.twitch.tv/videos/${id}`;
      case 'TELEGRAM':
        return `https://t.me/${id}`;
      default:
        break;
    }
  }

  // Fallback main platform domain if platform is known
  switch (firstPlatform) {
    case 'FACEBOOK': return 'https://www.facebook.com';
    case 'YOUTUBE': return 'https://www.youtube.com';
    case 'INSTAGRAM': return 'https://www.instagram.com';
    case 'TIKTOK': return 'https://www.tiktok.com';
    case 'TWITTER':
    case 'X': return 'https://x.com';
    case 'LINKEDIN': return 'https://www.linkedin.com';
    case 'THREADS': return 'https://www.threads.net';
    case 'BLUESKY': return 'https://bsky.app';
    case 'REDDIT': return 'https://www.reddit.com';
    case 'TWITCH': return 'https://www.twitch.tv';
    case 'TELEGRAM': return 'https://t.me';
    default: return null;
  }
}

function safeJsonParse(jsonStr) {
  try {
    return JSON.parse(jsonStr);
  } catch (_) {
    return null;
  }
}


