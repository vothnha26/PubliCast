import { useState } from "react";
import { getNetworkEntrySlot } from "../../utils/networkEntrySlot";
import { PLATFORMS, PLATFORM_API_KEY } from "../../constants/platforms";

const TIKTOK = PLATFORM_API_KEY[PLATFORMS.TIKTOK];

export function useTikTokPresetAutoList(networkCustom, setNetworkSetting, activeAccountId) {
  const settings = getNetworkEntrySlot(networkCustom[TIKTOK], activeAccountId).settings || {};
  const set = (key) => (v) => setNetworkSetting(TIKTOK, key, v, activeAccountId);
  const [isOpen, setIsOpen] = useState(true);

  return {
    isOpen,
    onToggleOpen: () => setIsOpen(v => !v),
    privacy: { value: settings.privacy || 'public', onChange: set('privacy') },
    allowComments: { value: settings.allowComments !== false, onChange: set('allowComments') },
    allowDuet: { value: settings.allowDuet !== false, onChange: set('allowDuet') },
    allowStitch: { value: settings.allowStitch !== false, onChange: set('allowStitch') },
    aiGenerated: { value: !!settings.aiGenerated, onChange: set('aiGenerated') },
    commercialContent: { value: !!settings.commercialContent, onChange: set('commercialContent') },
  };
}
