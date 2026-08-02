/**
 * Utility to construct direct native platform post URL from a post object.
 *
 * @param {Object} post - The post object from state/API
 * @returns {string|null} The direct platform post URL, or fallback platform URL, or null
 */
export function getPlatformPostUrl(post) {
  if (!post) return null;

  // 1. Direct permalink in metadata/options if available
  const options = typeof post.options === 'string' ? safeJsonParse(post.options) : post.options;
  if (options?.permalinkUrl) return options.permalinkUrl;
  if (post.permalinkUrl) return post.permalinkUrl;

  // 2. Extract platform and platformPostId
  const platforms = Array.isArray(post.platforms)
    ? post.platforms
    : post.targetPlatforms
    ? (Array.isArray(post.targetPlatforms) ? post.targetPlatforms : post.targetPlatforms.split(','))
    : [];

  const firstPlatform = (platforms[0] || post.platform || '').trim().toUpperCase();

  let platformPostId = post.platformPostId;
  if (typeof platformPostId === 'string') {
    try {
      const parsed = JSON.parse(platformPostId);
      if (parsed && typeof parsed === 'object') {
        platformPostId = parsed[firstPlatform] || Object.values(parsed)[0];
      }
    } catch (_) {
      // Keep as string if plain text ID
    }
  } else if (platformPostId && typeof platformPostId === 'object') {
    platformPostId = platformPostId[firstPlatform] || Object.values(platformPostId)[0];
  }

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

/**
 * Utility to extract target platform and platformPostId from a post object.
 *
 * @param {Object} post - The post object from state/API
 * @returns {{ platform: string, platformPostId: string|null }}
 */
export function resolvePlatformTarget(post) {
  if (!post) return { platform: 'YOUTUBE', platformPostId: null };

  const platforms = Array.isArray(post.platforms)
    ? post.platforms
    : post.targetPlatforms
    ? (Array.isArray(post.targetPlatforms) ? post.targetPlatforms : String(post.targetPlatforms).split(','))
    : [];

  const platform = (platforms[0] || post.platform || 'YOUTUBE').trim().toUpperCase();

  let platformPostId = post.platformPostId;
  if (typeof platformPostId === 'string') {
    try {
      const parsed = JSON.parse(platformPostId);
      if (parsed && typeof parsed === 'object') {
        platformPostId = parsed[platform] || Object.values(parsed)[0];
      }
    } catch (_) {
      // Keep as string if plain text ID
    }
  } else if (platformPostId && typeof platformPostId === 'object') {
    platformPostId = platformPostId[platform] || Object.values(platformPostId)[0];
  }

  return { platform, platformPostId: platformPostId ? String(platformPostId).trim() : null };
}

