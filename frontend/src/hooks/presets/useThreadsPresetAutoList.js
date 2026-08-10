import { useState } from "react";
import { getNetworkEntrySlot } from "../../utils/networkEntrySlot";
import { PLATFORMS, PLATFORM_API_KEY } from "../../constants/platforms";

const THREADS = PLATFORM_API_KEY[PLATFORMS.THREADS];

/**
 * AutoList-side adapter for ThreadsPresetFields — reads/writes
 * networkCustom[THREADS][.perAccount[accountId]].settings directly (no
 * flat/per-account split needed, unlike the Composer adapter, since
 * getNetworkEntrySlot/setNetworkEntrySlot already collapse that distinction
 * via accountId === null).
 */
export function useThreadsPresetAutoList(networkCustom, setNetworkSetting, activeAccountId) {
  const settings = getNetworkEntrySlot(networkCustom[THREADS], activeAccountId).settings || {};
  const [isOpen, setIsOpen] = useState(true);

  return {
    isOpen,
    onToggleOpen: () => setIsOpen(v => !v),
    whoCanReply: {
      value: settings.threadsWhoCanReply || 'everyone',
      onChange: (v) => setNetworkSetting(THREADS, 'threadsWhoCanReply', v, activeAccountId),
    },
  };
}
