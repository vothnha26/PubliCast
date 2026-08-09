/**
 * Shared per-account "settings slot" helpers for the networkCustom-style
 * shape: a platform entry either holds content directly (single-account
 * platforms) or, when ≥2 accounts of that platform are involved, an
 * entry.perAccount map keyed by socialAccountId so each account can carry
 * its own caption/mediaUrls/settings instead of silently sharing one flat
 * value (composer-audit P0.4, see SRS FR-3.4).
 *
 * Extracted from usePostCreatorForm.js (the Post Composer's original,
 * still-in-use implementation) so other features needing per-account
 * settings (e.g. AutoList presets) reuse the exact same shape instead of
 * inventing a parallel one.
 */

export function getNetworkEntrySlot(entry, accountId) {
  if (!accountId) return entry || { useTemplate: true, caption: "", mediaUrls: [] };
  return entry?.perAccount?.[accountId] || { useTemplate: true, caption: "", mediaUrls: [] };
}

export function setNetworkEntrySlot(entry, accountId, slot) {
  if (!accountId) return { ...entry, ...slot };
  return {
    ...entry,
    perAccount: { ...(entry?.perAccount || {}), [accountId]: { ...getNetworkEntrySlot(entry, accountId), ...slot } },
  };
}
