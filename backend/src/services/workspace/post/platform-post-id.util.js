/**
 * Post.platformPostId is a single TEXT column storing a JSON map of
 * per-platform published-content ids. Two shapes exist in the wild:
 *
 *   Legacy (pre multi-account fan-out): { [PLATFORM]: id }
 *     — one id per platform, written back when SocialPublishStep only
 *       ever published to the first account of each platform.
 *
 *   Current: { [PLATFORM]: { [socialAccountId]: id } }
 *     — one id per (platform, account) pair, since a post can target
 *       multiple accounts of the same platform and each publishes
 *       independently. socialAccountId is normalized to the string
 *       'null' for accounts resolved before PostTarget existed.
 *
 * All reads must accept both shapes (rows written under the legacy shape
 * are never migrated in place); all writes use the current shape.
 */

const NULL_ACCOUNT_KEY = 'null';

function parsePlatformPostId(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Returns the id for a specific (platform, socialAccountId) pair, reading
 * either shape. A legacy per-platform string id is treated as belonging to
 * every account of that platform — this is a deliberate over-match (see
 * getFirstIdForPlatform) so the YouTube "already published, don't
 * re-upload" short-circuit still fires for a post published before this
 * accountId dimension existed.
 */
function getIdForAccount(platformIdMap, platform, socialAccountId) {
  const entry = platformIdMap[platform];
  if (entry == null) return null;
  if (typeof entry === 'string') return entry; // legacy shape
  return entry[socialAccountId || NULL_ACCOUNT_KEY] || null;
}

/** First id present for a platform, regardless of which account it belongs
 * to — used where only "has this platform been published at all" matters
 * (e.g. surfacing a single representative link), not full account fidelity. */
function getFirstIdForPlatform(platformIdMap, platform) {
  const entry = platformIdMap[platform];
  if (entry == null) return null;
  if (typeof entry === 'string') return entry;
  const values = Object.values(entry);
  return values.length > 0 ? values[0] : null;
}

/** Sets the id for a (platform, socialAccountId) pair, upgrading a legacy
 * per-platform string entry (if present) to the current per-account shape
 * rather than discarding it. */
function setIdForAccount(platformIdMap, platform, socialAccountId, id) {
  const key = socialAccountId || NULL_ACCOUNT_KEY;
  const existing = platformIdMap[platform];
  const asObject = existing && typeof existing === 'object' ? { ...existing } : {};
  asObject[key] = id;
  return { ...platformIdMap, [platform]: asObject };
}

module.exports = {
  NULL_ACCOUNT_KEY,
  parsePlatformPostId,
  getIdForAccount,
  getFirstIdForPlatform,
  setIdForAccount
};
