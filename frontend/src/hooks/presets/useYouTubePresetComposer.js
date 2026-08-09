import { usePostCreatorFormContext } from "../../context/PostCreatorFormContext";
import { PLATFORMS } from "../../constants/platforms";

export function useYouTubePresetComposer() {
  const {
    youtubeOpen,
    setYoutubeOpen,
    youtubeTitle,
    setYoutubeTitle,
    youtubeMadeForKids,
    setYoutubeMadeForKids,
    youtubePrivacy,
    setYoutubePrivacy,
    youtubeCategory,
    setYoutubeCategory,
    youtubePlaylistId,
    setYoutubePlaylistId,
    youtubeTags,
    setYoutubeTags,
    youtubeFirstComment,
    setYoutubeFirstComment,
    playlists,
    playlistsByAccount,
    isLoadingPlaylists,
    fetchPlaylists,
    categories,
    isLoadingCategories,
    fetchCategories,
    selectedAccountIds,
    activeBrand,
    networkCustom,
    activeNetworkAccountId,
    updateNetworkSetting,
  } = usePostCreatorFormContext();

  // A YouTube channel's technical settings (category/privacy/tags/madeForKids)
  // are per-account when the brand has ≥2 YouTube channels targeted — read
  // from/write into networkCustom.youtube.perAccount[accountId].settings
  // instead of the flat state, mirroring how caption/media already work
  // (composer-audit P0.4 / SRS FR-3.4). With exactly one account, or no
  // sub-tab selected yet, the flat state below remains the effective value —
  // it also still doubles as the "shared/global default" every account seeds
  // from on first customization.
  const youtubeAccounts = (activeBrand?.socialAccounts || []).filter(
    sa => (sa.platform || '').toUpperCase() === PLATFORMS.YOUTUBE.toUpperCase() && selectedAccountIds.includes(sa.id)
  );

  const targetAccountId = activeNetworkAccountId || (youtubeAccounts.length === 1 ? youtubeAccounts[0]?.id : null);

  const ytEntry = networkCustom?.[PLATFORMS.YOUTUBE];
  const accountSettings = targetAccountId
    ? (ytEntry?.perAccount?.[targetAccountId]?.settings || ytEntry?.settings || {})
    : (ytEntry?.settings || {});

  const effectiveTitle = accountSettings.title !== undefined ? accountSettings.title : youtubeTitle;
  const effectiveCategory = accountSettings.categoryId !== undefined ? accountSettings.categoryId : youtubeCategory;
  const effectivePrivacy = accountSettings.privacyStatus !== undefined ? accountSettings.privacyStatus : youtubePrivacy;
  const effectiveTags = accountSettings.tags !== undefined ? accountSettings.tags : youtubeTags;
  const effectiveMadeForKids = accountSettings.madeForKids !== undefined ? accountSettings.madeForKids : youtubeMadeForKids;
  const effectivePlaylistId = accountSettings.playlistId !== undefined ? accountSettings.playlistId : youtubePlaylistId;
  const effectiveFirstComment = accountSettings.firstComment !== undefined ? accountSettings.firstComment : youtubeFirstComment;

  const handleSettingChange = (key, flatSetter, value) => {
    updateNetworkSetting(PLATFORMS.YOUTUBE, key, value, targetAccountId);
    if (!targetAccountId && flatSetter) flatSetter(value);
  };

  const accountPlaylists = targetAccountId && playlistsByAccount?.[targetAccountId]
    ? playlistsByAccount[targetAccountId]
    : playlists;

  return {
    isOpen: youtubeOpen,
    onToggleOpen: () => setYoutubeOpen(!youtubeOpen),
    title: { value: effectiveTitle, onChange: (v) => handleSettingChange('title', setYoutubeTitle, v) },
    madeForKids: { value: effectiveMadeForKids, onChange: (v) => handleSettingChange('madeForKids', setYoutubeMadeForKids, v) },
    privacy: { value: effectivePrivacy, onChange: (v) => handleSettingChange('privacyStatus', setYoutubePrivacy, v) },
    category: { value: effectiveCategory, onChange: (v) => handleSettingChange('categoryId', setYoutubeCategory, v) },
    playlist: { value: effectivePlaylistId, onChange: (v) => handleSettingChange('playlistId', setYoutubePlaylistId, v) },
    tags: { value: effectiveTags, onChange: (v) => handleSettingChange('tags', setYoutubeTags, v) },
    firstComment: { value: effectiveFirstComment, onChange: (v) => handleSettingChange('firstComment', setYoutubeFirstComment, v) },
    playlists: accountPlaylists,
    isLoadingPlaylists,
    onRefetchPlaylists: (force = false) => fetchPlaylists(force, targetAccountId),
    canPickPlaylist: true,
    categories,
    isLoadingCategories,
    onRefetchCategories: fetchCategories,
  };
}
