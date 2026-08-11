import { useState, useEffect } from "react";
import { usePostCreatorFormContext } from "../../context/PostCreatorFormContext";
import socialService from "../../services/social.service";
import { PLATFORMS } from "../../constants/platforms";

const MOCK_AUDIO_TRACKS = [
  { id: "viral_pop", name: "Trending Pop Hits (Viral)" },
  { id: "lofi_chill", name: "Chill Lofi Beats" },
  { id: "synthwave", name: "Epic Cinematic Synth" },
  { id: "acoustic", name: "Acoustic Sunset Moods" },
  { id: "tech_vibe", name: "Tech Startup Vibe" }
];

export function useInstagramPresetComposer() {
  const {
    instagramOpen,
    setInstagramOpen,
    instagramCollaborators,
    setInstagramCollaborators,
    instagramAudio,
    setInstagramAudio,
    instagramShowOnFeed,
    setInstagramShowOnFeed,
    activeBrand,
    selectedAccountIds,
    networkCustom,
    activeNetworkAccountId,
    updateNetworkSetting,
  } = usePostCreatorFormContext();

  const instagramAccounts = (activeBrand?.socialAccounts || []).filter(
    sa => (sa.platform || '').toUpperCase() === PLATFORMS.INSTAGRAM.toUpperCase() && selectedAccountIds.includes(sa.id)
  );

  // accountId must be null for the single-account case — matches the
  // convention every other write path uses (updateNetworkMedia/
  // updateNetworkCaption). Falling back to the account's real id here
  // instead of null would write settings into entry.perAccount[id] while
  // media/caption stay on the top-level entry — buildNetworkOverrides's
  // effectiveEntryFor prefers perAccount[id] when present, so it would then
  // read that shadow slot's empty useTemplate/mediaUrls instead of the real
  // customized content.
  const targetAccountId = instagramAccounts.length > 1 ? activeNetworkAccountId : null;

  const igEntry = networkCustom?.[PLATFORMS.INSTAGRAM];
  const accountSettings = targetAccountId
    ? (igEntry?.perAccount?.[targetAccountId]?.settings || igEntry?.settings || {})
    : (igEntry?.settings || {});

  const effectiveCollaborators = accountSettings.collaborators !== undefined ? accountSettings.collaborators : instagramCollaborators;
  const effectiveAudio = accountSettings.audio !== undefined ? accountSettings.audio : instagramAudio;
  const effectiveShowOnFeed = accountSettings.showOnFeed !== undefined ? accountSettings.showOnFeed : instagramShowOnFeed;

  const handleSettingChange = (key, flatSetter, value) => {
    updateNetworkSetting(PLATFORMS.INSTAGRAM, key, value, targetAccountId);
    if (!targetAccountId && flatSetter) flatSetter(value);
  };

  const [showAudioList, setShowAudioList] = useState(false);
  const [audioSearchQuery, setAudioSearchQuery] = useState("");
  const [audioTracks, setAudioTracks] = useState(MOCK_AUDIO_TRACKS);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  useEffect(() => {
    if (!showAudioList || !activeBrand) return;

    let isMounted = true;
    const fetchAudio = async () => {
      setIsLoadingAudio(true);
      try {
        const response = await socialService.searchInstagramAudio(activeBrand.id, audioSearchQuery);
        if (isMounted) {
          setAudioTracks(response.data || MOCK_AUDIO_TRACKS);
        }
      } catch (err) {
        console.error("Failed to search Instagram audio:", err);
        if (isMounted) {
          const filtered = MOCK_AUDIO_TRACKS.filter(t =>
            t.name.toLowerCase().includes(audioSearchQuery.toLowerCase())
          );
          setAudioTracks(filtered);
        }
      } finally {
        if (isMounted) {
          setIsLoadingAudio(false);
        }
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchAudio();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [audioSearchQuery, showAudioList, activeBrand]);

  return {
    isOpen: instagramOpen,
    onToggleOpen: () => setInstagramOpen(!instagramOpen),
    collaborators: { value: effectiveCollaborators, onChange: (v) => handleSettingChange('collaborators', setInstagramCollaborators, v) },
    audio: { value: effectiveAudio, onChange: (v) => handleSettingChange('audio', setInstagramAudio, v) },
    showOnFeed: { value: effectiveShowOnFeed, onChange: (v) => handleSettingChange('showOnFeed', setInstagramShowOnFeed, v) },
    audioTracks,
    isLoadingAudio,
    audioSearchQuery,
    onAudioSearchChange: setAudioSearchQuery,
    showAudioList,
    onToggleAudioList: () => setShowAudioList(v => !v),
  };
}
