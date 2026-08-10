import { useState } from "react";
import { getNetworkEntrySlot } from "../../utils/networkEntrySlot";
import { PLATFORMS, PLATFORM_API_KEY } from "../../constants/platforms";

const INSTAGRAM = PLATFORM_API_KEY[PLATFORMS.INSTAGRAM];

const MOCK_AUDIO_TRACKS = [
  { id: "viral_pop", name: "Trending Pop Hits (Viral)" },
  { id: "lofi_chill", name: "Chill Lofi Beats" },
  { id: "synthwave", name: "Epic Cinematic Synth" },
  { id: "acoustic", name: "Acoustic Sunset Moods" },
  { id: "tech_vibe", name: "Tech Startup Vibe" }
];

/**
 * AutoList never had live Instagram audio search (no API call) — static
 * mock list filtered client-side, matching its pre-existing behavior before
 * this extraction. No loading state since there's no async call to wait on.
 */
export function useInstagramPresetAutoList(networkCustom, setNetworkSetting, activeAccountId) {
  const settings = getNetworkEntrySlot(networkCustom[INSTAGRAM], activeAccountId).settings || {};
  const set = (key) => (v) => setNetworkSetting(INSTAGRAM, key, v, activeAccountId);

  const [showAudioList, setShowAudioList] = useState(false);
  const [audioSearchQuery, setAudioSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(true);

  const audioTracks = audioSearchQuery.trim()
    ? MOCK_AUDIO_TRACKS.filter(t => t.name.toLowerCase().includes(audioSearchQuery.toLowerCase()))
    : MOCK_AUDIO_TRACKS;

  return {
    isOpen,
    onToggleOpen: () => setIsOpen(v => !v),
    collaborators: { value: settings.collaborators || [], onChange: set('collaborators') },
    audio: { value: settings.audio || null, onChange: set('audio') },
    showOnFeed: { value: settings.showOnFeed !== false, onChange: set('showOnFeed') },
    contentType: { value: settings.contentType || 'post', onChange: set('contentType') },
    audioTracks,
    isLoadingAudio: false,
    audioSearchQuery,
    onAudioSearchChange: setAudioSearchQuery,
    showAudioList,
    onToggleAudioList: () => setShowAudioList(v => !v),
  };
}
