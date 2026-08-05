import { PLATFORMS, PLATFORM_API_KEY } from './platforms';

/** Giá trị activeNetworkTab khi đang ở tab "Cài đặt chung" (không phải 1 platform cụ thể) */
export const NETWORK_TAB_TEMPLATE = 'TEMPLATE';

/** Reverse map: 'FACEBOOK' (backend) -> 'facebook' (frontend) */
export const API_KEY_TO_PLATFORM = Object.entries(PLATFORM_API_KEY).reduce((acc, [platformKey, apiKey]) => {
  acc[apiKey] = PLATFORMS[platformKey] || platformKey.toLowerCase();
  return acc;
}, {});

const buildDefaultNetworkEntry = (platform) => {
  if (platform === PLATFORMS.THREADS) {
    return { useTemplate: true, activeThreadIndex: 0, threadPosts: [{ text: '', mediaUrls: [] }], mediaUrls: [] };
  }
  // settings: platform-specific technical fields (YouTube category/privacy/
  // tags, TikTok duet/stitch, etc.) for this entry's account slot — kept
  // alongside caption/mediaUrls so a platform with ≥2 accounts can give each
  // one its own category/privacy instead of sharing one flat value across
  // every account (composer-audit P0.4 follow-up, see SRS FR-3.4).
  return { useTemplate: true, caption: '', mediaUrls: [], settings: {} };
};

/** Object rỗng mặc định cho toàn bộ platform hỗ trợ networkCustom */
export const buildDefaultNetworkCustom = () =>
  Object.values(PLATFORMS).reduce((acc, platform) => {
    acc[platform] = buildDefaultNetworkEntry(platform);
    return acc;
  }, {});

const safeParseArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeMediaItem = (item) => {
  if (typeof item === 'string') {
    return { file: null, previewUrl: item, path: item };
  }
  return {
    file: item?.file || null,
    previewUrl: item?.previewUrl || item?.path || '',
    path: item?.path || item?.previewUrl || '',
  };
};

const buildEntryFromOverride = (platform, override, formattedMediaUrls) => {
  if (platform === PLATFORMS.THREADS) {
    const threadPosts = safeParseArray(override.threadPosts);
    return {
      useTemplate: override.useTemplate !== false,
      activeThreadIndex: 0,
      threadPosts: threadPosts.length > 0
        ? threadPosts.map((p) => ({
            text: typeof p === 'string' ? p : (p?.text || ''),
            mediaUrls: (Array.isArray(p?.mediaUrls) ? p.mediaUrls : []).map(normalizeMediaItem),
          }))
        : [{ text: override.caption || '', mediaUrls: formattedMediaUrls }],
      mediaUrls: formattedMediaUrls,
    };
  }
  return {
    useTemplate: override.useTemplate !== false,
    caption: override.caption || '',
    mediaUrls: formattedMediaUrls,
    settings: (override.settings && typeof override.settings === 'object') ? override.settings : {},
  };
};

/**
 * Map mảng networkOverrides trả về từ backend (post.networkOverrides, mỗi phần tử
 * { platform: 'FACEBOOK', socialAccountId, useTemplate, caption, mediaUrls, threadPosts })
 * sang object networkCustom keyed theo platform id lowercase dùng trong form state.
 *
 * A platform can have multiple override rows (one per account, when that
 * platform has ≥2 selected accounts) — each is kept in entry.perAccount
 * keyed by socialAccountId instead of the last row silently overwriting the
 * others (composer-audit P0.4). entry itself (top-level, no accountId) still
 * gets set to *a* row so single-account platforms and any UI reading the
 * platform-level entry directly keep working unchanged.
 */
export const mapNetworkOverridesToCustom = (networkOverrides) => {
  const result = buildDefaultNetworkCustom();
  (networkOverrides || []).forEach((override) => {
    if (!override?.platform) return;
    const platform = API_KEY_TO_PLATFORM[override.platform] || override.platform.toLowerCase();
    const rawMediaUrls = safeParseArray(override.mediaUrls);
    const formattedMediaUrls = rawMediaUrls.map(normalizeMediaItem);
    const entry = buildEntryFromOverride(platform, override, formattedMediaUrls);

    result[platform] = { ...result[platform], ...entry };
    if (override.socialAccountId) {
      result[platform].perAccount = { ...(result[platform].perAccount || {}), [override.socialAccountId]: entry };
    }
  });
  return result;
};

/** true nếu có ít nhất 1 platform đang customize (useTemplate === false) */
export const hasAnyCustomNetwork = (networkCustom) =>
  Object.values(networkCustom || {}).some((entry) => entry?.useTemplate === false);
