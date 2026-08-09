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
export function resolvePlatformTarget(post, targetSocialAccountId = null) {
  if (!post) return { platform: '', platformPostId: null };

  const platforms = Array.isArray(post.platforms)
    ? post.platforms
    : post.targetPlatforms
    ? (Array.isArray(post.targetPlatforms) ? post.targetPlatforms : post.targetPlatforms.split(','))
    : [];

  const firstPlatform = (platforms[0] || post.platform || '').trim().toUpperCase();

  const getIdFromEntry = (entry) => {
    if (entry == null) return null;
    if (typeof entry === 'string') return entry;
    if (typeof entry === 'object') {
      if (targetSocialAccountId && entry[targetSocialAccountId]) {
        return entry[targetSocialAccountId];
      }
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
      return { platform: firstPlatform, platformPostId: parsedMap.trim() || null };
    }
  }

  let platformPostId = null;
  if (parsedMap && typeof parsedMap === 'object') {
    platformPostId = getIdFromEntry(parsedMap[firstPlatform]);
    if (platformPostId == null) {
      for (const entry of Object.values(parsedMap)) {
        platformPostId = getIdFromEntry(entry);
        if (platformPostId != null) break;
      }
    }
  }

  return { platform: firstPlatform, platformPostId: platformPostId ? String(platformPostId).trim() : null };
}

export function getPlatformPostUrl(post, targetSocialAccountId = null) {
  if (!post) return null;

  // 1. Direct permalink in metadata/options if available
  const options = typeof post.options === 'string' ? safeJsonParse(post.options) : post.options;
  if (options?.permalinkUrl) return options.permalinkUrl;
  if (post.permalinkUrl) return post.permalinkUrl;
  if (post.postUrl) return post.postUrl;
  if (post.permalink) return post.permalink;
  if (post.url) return post.url;

  // 2. Extract platform and platformPostId
  const { platform: firstPlatform, platformPostId } = resolvePlatformTarget(post, targetSocialAccountId);

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
      case 'THREADS': {
        if (id.startsWith('http://') || id.startsWith('https://')) return id;
        const username = post?.accountUsername || post?.username || (typeof post?.options === 'object' ? post.options?.username : null);
        if (username) {
          const cleanUser = username.replace(/^@/, '');
          return `https://www.threads.net/@${cleanUser}/post/${id}`;
        }
        return /^\d+$/.test(id) ? `https://www.threads.net/t/${id}` : `https://www.threads.net/p/${id}`;
      }
      case 'BLUESKY': {
        // platformPostId is the AT URI returned by publishPost
        // (bluesky.service.js: `return { id: result.id }`), shaped
        // at://did:plc:xxx/app.bsky.feed.post/{rkey} — not a bare post id.
        // The bsky.app web permalink needs the did and rkey pulled back
        // out of it; falling through to the bare bsky.app homepage (the
        // previous behavior) always linked to the wrong place instead of
        // the actual post.
        const match = id.match(/^at:\/\/(did:[^/]+)\/app\.bsky\.feed\.post\/([^/]+)$/);
        if (match) {
          const [, did, rkey] = match;
          return `https://bsky.app/profile/${did}/post/${rkey}`;
        }
        return `https://bsky.app`;
      }
      case 'REDDIT':
        return `https://www.reddit.com/comments/${id}`;
      case 'TWITCH':
        return `https://www.twitch.tv/videos/${id}`;
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


