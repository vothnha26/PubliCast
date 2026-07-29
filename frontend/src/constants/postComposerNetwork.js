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
    return { useTemplate: true, activeThreadIndex: 0, threadPosts: [''], mediaUrls: [] };
  }
  return { useTemplate: true, caption: '', mediaUrls: [] };
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

/**
 * Map mảng networkOverrides trả về từ backend (post.networkOverrides, mỗi phần tử
 * { platform: 'FACEBOOK', useTemplate, caption, mediaUrls, threadPosts }) sang
 * object networkCustom keyed theo platform id lowercase dùng trong form state.
 */
export const mapNetworkOverridesToCustom = (networkOverrides) => {
  const result = buildDefaultNetworkCustom();
  (networkOverrides || []).forEach((override) => {
    if (!override?.platform) return;
    const platform = API_KEY_TO_PLATFORM[override.platform] || override.platform.toLowerCase();
    if (platform === PLATFORMS.THREADS) {
      const threadPosts = safeParseArray(override.threadPosts);
      result[platform] = {
        useTemplate: override.useTemplate !== false,
        activeThreadIndex: 0,
        threadPosts: threadPosts.length > 0
          ? threadPosts.map((p) => (typeof p === 'string' ? p : p?.text || ''))
          : [override.caption || ''],
        mediaUrls: safeParseArray(override.mediaUrls),
      };
    } else {
      result[platform] = {
        useTemplate: override.useTemplate !== false,
        caption: override.caption || '',
        mediaUrls: safeParseArray(override.mediaUrls),
      };
    }
  });
  return result;
};

/** true nếu có ít nhất 1 platform đang customize (useTemplate === false) */
export const hasAnyCustomNetwork = (networkCustom) =>
  Object.values(networkCustom || {}).some((entry) => entry?.useTemplate === false);
