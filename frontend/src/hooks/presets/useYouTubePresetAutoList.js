import { useState } from "react";
import { getNetworkEntrySlot } from "../../utils/networkEntrySlot";
import { PLATFORMS, PLATFORM_API_KEY } from "../../constants/platforms";

const YOUTUBE = PLATFORM_API_KEY[PLATFORMS.YOUTUBE];

/**
 * AutoList never fetches YouTube playlists/categories (no live Data API
 * calls from this standalone page) — canPickPlaylist stays false so
 * YouTubePresetFields renders its existing "not available" message instead
 * of a picker with no data, and categories fall back to the component's own
 * FALLBACK_CATEGORIES constant (empty array here triggers that fallback).
 */
export function useYouTubePresetAutoList(networkCustom, setNetworkSetting, activeAccountId) {
  const settings = getNetworkEntrySlot(networkCustom[YOUTUBE], activeAccountId).settings || {};
  const set = (key) => (v) => setNetworkSetting(YOUTUBE, key, v, activeAccountId);
  const [isOpen, setIsOpen] = useState(true);

  return {
    isOpen,
    onToggleOpen: () => setIsOpen(v => !v),
    title: { value: settings.title || '', onChange: set('title') },
    videoType: { value: settings.videoType || 'video', onChange: set('videoType') },
    madeForKids: { value: settings.madeForKids ?? null, onChange: set('madeForKids') },
    privacy: { value: settings.privacyStatus || 'public', onChange: set('privacyStatus') },
    category: { value: settings.categoryId || '22', onChange: set('categoryId') },
    playlist: { value: '', onChange: () => {} },
    tags: { value: settings.tags || '', onChange: set('tags') },
    firstComment: { value: settings.firstComment || '', onChange: set('firstComment') },
    playlists: [],
    isLoadingPlaylists: false,
    onRefetchPlaylists: () => {},
    canPickPlaylist: false,
    categories: [],
    isLoadingCategories: false,
    onRefetchCategories: () => {},
  };
}
