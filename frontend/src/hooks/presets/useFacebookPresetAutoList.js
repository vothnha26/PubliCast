import { useState } from "react";
import { getNetworkEntrySlot } from "../../utils/networkEntrySlot";
import { PLATFORMS, PLATFORM_API_KEY } from "../../constants/platforms";

const FACEBOOK = PLATFORM_API_KEY[PLATFORMS.FACEBOOK];

export function useFacebookPresetAutoList(networkCustom, setNetworkSetting, activeAccountId) {
  const settings = getNetworkEntrySlot(networkCustom[FACEBOOK], activeAccountId).settings || {};
  const [isOpen, setIsOpen] = useState(true);

  return {
    isOpen,
    onToggleOpen: () => setIsOpen(v => !v),
    title: {
      value: settings.title || '',
      onChange: (v) => setNetworkSetting(FACEBOOK, 'title', v, activeAccountId),
    },
    contentType: {
      value: settings.contentType || 'post',
      onChange: (v) => setNetworkSetting(FACEBOOK, 'contentType', v, activeAccountId),
    },
    reelThumbnail: {
      value: settings.reelThumbnail || '',
      onChange: (v) => setNetworkSetting(FACEBOOK, 'reelThumbnail', v, activeAccountId),
    },
  };
}
