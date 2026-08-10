import { PLATFORM_API_KEY, PLATFORMS } from "../constants/platforms.js";
import { API_KEY_TO_PLATFORM, buildDefaultNetworkCustom } from "../constants/postComposerNetwork.js";
import { PLATFORM_SPECS } from "../constants/platformCapability.spec.js";

export function formatOverrideMediaUrls(mediaUrls) {
  return (mediaUrls || [])
    .map((item) => (typeof item === 'string' ? item : (item?.path || item?.url || item?.previewUrl)))
    .filter((url) => typeof url === 'string' && url.trim() !== '' && !url.startsWith('blob:'));
}

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

function findSpecForPlatform(platform) {
  const platUpper = platform.toUpperCase();
  const key = Object.keys(PLATFORM_SPECS).find(k => k.startsWith(`${platUpper}_`));
  return key ? PLATFORM_SPECS[key] : null;
}

const buildEntryFromOverride = (platform, override, rawMediaUrls) => {
  if (platform === PLATFORMS.THREADS) {
    const threadPosts = safeParseArray(override.threadPosts);
    if (threadPosts.length > 0) {
      return {
        useTemplate: override.useTemplate !== false,
        activeThreadIndex: 0,
        threadPosts: threadPosts.map((p) => ({
          text: typeof p === 'string' ? p : (p?.text || ''),
          mediaUrls: (Array.isArray(p?.mediaUrls) ? p.mediaUrls : []).map(normalizeMediaItem),
        })),
        mediaUrls: rawMediaUrls.map(normalizeMediaItem),
      };
    }
  }

  const formattedMediaUrls = rawMediaUrls.map(normalizeMediaItem);

  if (platform === PLATFORMS.THREADS) {
    return {
      useTemplate: override.useTemplate !== false,
      activeThreadIndex: 0,
      threadPosts: [{ text: override.caption || '', mediaUrls: formattedMediaUrls }],
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
 * Map mảng networkOverrides trả về từ backend (post.networkOverrides)
 * sang object networkCustom trong form state (INBOUND).
 */
export const mapNetworkOverridesToCustom = (networkOverrides) => {
  const result = buildDefaultNetworkCustom();
  (networkOverrides || []).forEach((override) => {
    if (!override?.platform) return;
    const platform = API_KEY_TO_PLATFORM[override.platform] || override.platform.toLowerCase();
    const rawMediaUrls = safeParseArray(override.mediaUrls);
    const entry = buildEntryFromOverride(platform, override, rawMediaUrls);

    result[platform] = { ...result[platform], ...entry };
    if (override.socialAccountId) {
      result[platform].perAccount = { ...(result[platform].perAccount || {}), [override.socialAccountId]: entry };
    }
  });
  return result;
};

/**
 * Pure function xây dựng danh sách networkOverrides gửi lên Backend.
 * Template Method runner gọi Strategy spec.buildOverride(entry, rawMediaUrls).
 */
export function buildNetworkOverrides({
  networkCustom = {},
  selectedPlatforms = [],
  selectedAccountIds = [],
  activeBrand = null,
}) {
  const overrides = [];

  Object.entries(networkCustom).forEach(([platform, entry]) => {
    if (!selectedPlatforms.includes(platform)) return;
    const apiKey = PLATFORM_API_KEY[platform];
    if (!apiKey) return;

    const spec = findSpecForPlatform(platform);
    if (!spec || !spec.buildOverride) return;

    const accountsForPlatform = activeBrand?.socialAccounts?.filter(
      sa => (sa.platform || '').toLowerCase() === apiKey.toLowerCase() && selectedAccountIds.includes(sa.id)
    ) || [];

    const hasAnySettingsFor = (accountId) => {
      const slot = accountId ? entry.perAccount?.[accountId] : entry;
      return slot?.settings && Object.keys(slot.settings).length > 0;
    };
    const hasAnyCaptionCustomizedFor = (accountId) => {
      const slot = accountId ? entry.perAccount?.[accountId] : entry;
      return slot?.useTemplate === false;
    };
    const isThreadsWithChain = platform === PLATFORMS.THREADS && (entry?.threadPosts?.length || 0) > 0;

    if (
      !isThreadsWithChain &&
      !hasAnyCaptionCustomizedFor(null) &&
      accountsForPlatform.every((acc) => !hasAnyCaptionCustomizedFor(acc.id) && !hasAnySettingsFor(acc.id)) &&
      !hasAnySettingsFor(null)
    ) {
      return;
    }

    const effectiveEntryFor = (accountId) =>
      entry.perAccount?.[accountId] || entry;

    if (accountsForPlatform.length > 0) {
      accountsForPlatform.forEach((acc) => {
        const accEntry = effectiveEntryFor(acc.id);
        const accMediaUrls = formatOverrideMediaUrls(accEntry.mediaUrls);
        const accSettings = entry.perAccount?.[acc.id]?.settings || accEntry.settings;
        const hasSettings = accSettings && Object.keys(accSettings).length > 0;
        const isCaptionCustomized = accEntry.useTemplate === false;
        if (!isCaptionCustomized && !hasSettings && !isThreadsWithChain) return;

        const built = spec.buildOverride({ ...accEntry, settings: accSettings }, accMediaUrls);
        if (built) {
          overrides.push({
            platform: apiKey,
            socialAccountId: acc.id,
            useTemplate: !isCaptionCustomized && !isThreadsWithChain,
            ...built
          });
        }
      });
    } else {
      const brandHasAccountsForPlatform = (activeBrand?.socialAccounts || []).some(
        sa => (sa.platform || '').toLowerCase() === apiKey.toLowerCase()
      );
      if (brandHasAccountsForPlatform) return;

      const formattedMediaUrls = formatOverrideMediaUrls(entry.mediaUrls);
      const built = spec.buildOverride(entry, formattedMediaUrls);
      if (built) {
        overrides.push({
          platform: apiKey,
          useTemplate: entry?.useTemplate !== false && !isThreadsWithChain,
          ...built
        });
      }
    }
  });

  return overrides;
}
