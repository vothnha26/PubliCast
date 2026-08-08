import { PLATFORMS, PLATFORM_API_KEY } from './platforms.js';

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

import { mapNetworkOverridesToCustom } from '../utils/buildNetworkOverrides.js';

export { mapNetworkOverridesToCustom };

/** true nếu có ít nhất 1 platform đang customize (useTemplate === false) */
export const hasAnyCustomNetwork = (networkCustom) =>
  Object.values(networkCustom || {}).some((entry) => entry?.useTemplate === false);
