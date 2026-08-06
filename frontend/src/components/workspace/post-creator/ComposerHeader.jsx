import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Lock, Plus, FileText, ChevronDown, Users, X
} from "lucide-react";
import { usePostCreatorFormContext } from "../../../context/PostCreatorFormContext";
import { PRODUCT_IDS } from "../../../constants/products";
import channelGroupService from "../../../services/channel-group.service";
import { toast } from "sonner";
import { RightPanelTabSwitcher } from "./RightPanelTabSwitcher";
import { ChannelPickerDropdown } from "./ChannelPickerDropdown";
import { ChannelAvatar } from "./ChannelAvatar";

/** Standard UI Configs for Platform Toolbar Buttons (Module Scope) */
const SUPPORTED_PLATFORM_BUTTONS = [
  {
    id: "facebook",
    label: "Facebook",
    productId: PRODUCT_IDS.FACEBOOK_MANAGEMENT,
    hasTypeDropdown: true,
    activeBgClass: "bg-[#1877F2] text-white shadow-md",
    inactiveBgClass: "bg-[#1877F2]/15 text-[#1877F2] hover:bg-[#1877F2]/25",
  },
  {
    id: "instagram",
    label: "Instagram",
    productId: PRODUCT_IDS.INSTAGRAM_MANAGEMENT || "instagram_management",
    hasTypeDropdown: true,
    activeBgClass: "bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white shadow-md",
    inactiveBgClass: "bg-[#DD2A7B]/10 text-[#DD2A7B] hover:bg-[#DD2A7B]/20",
  },
  {
    id: "tiktok",
    label: "TikTok",
    productId: PRODUCT_IDS.TIKTOK_CREATIVE,
    activeBgClass: "bg-black text-white shadow-md",
    inactiveBgClass: "bg-black/10 text-black hover:bg-black/20",
  },
  {
    id: "youtube",
    label: "YouTube",
    productId: PRODUCT_IDS.YOUTUBE_ANALYTICS,
    hasTypeDropdown: true,
    activeBgClass: "bg-[#FF0000] text-white shadow-md",
    inactiveBgClass: "bg-[#FF0000]/10 text-[#FF0000] hover:bg-[#FF0000]/20",
  },
  {
    id: "telegram",
    label: "Telegram",
    activeBgClass: "bg-[#0088cc] text-white shadow-md",
    inactiveBgClass: "bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/20",
  },
  {
    id: "threads",
    label: "Threads",
    activeBgClass: "bg-black text-white shadow-md",
    inactiveBgClass: "bg-black/10 text-black hover:bg-black/20",
  },
  {
    id: "bluesky",
    label: "Bluesky",
    activeBgClass: "bg-[#0085FF] text-white shadow-md",
    inactiveBgClass: "bg-[#0085FF]/20 text-[#0085FF] hover:bg-[#0085FF]/30",
  },
  {
    id: "reddit",
    label: "Reddit",
    activeBgClass: "bg-[#FF4500] text-white shadow-md",
    inactiveBgClass: "bg-[#FF4500]/20 text-[#FF4500] hover:bg-[#FF4500]/30",
  },
];

export function ComposerHeader() {
  const { t } = useTranslation(["planner", "common"]);
  const {
    selectedAccountIds,
    setSelectedAccountIds,
    isLockedToAccount,
    toggleAccount,
    platformLimits,
    facebookType,
    youtubeType,
    instagramType,
    activeBrand,
    setRightPanelTab,
    notes,
    setBlockedProductId,
  } = usePostCreatorFormContext();

  const [channelGroups, setChannelGroups] = useState([]);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showChannelPicker, setShowChannelPicker] = useState(false);

  const connectedAccounts = activeBrand?.socialAccounts?.filter(sa => sa.isConnected) || [];

  // Channel groups are a compose-time selection shortcut only — expanding
  // a group into selectedAccountIds is the entire integration, no
  // Post-to-group link exists (see ChannelGroupModal/channel-group.service).
  useEffect(() => {
    if (!activeBrand?.id) return;
    channelGroupService.list(activeBrand.id)
      .then((res) => setChannelGroups(res?.data || res || []))
      .catch((err) => console.error("Failed to fetch channel groups in composer:", err));
  }, [activeBrand?.id]);

  const applyChannelGroup = (group) => {
    const connectedIds = new Set(connectedAccounts.map((sa) => sa.id));
    const memberIds = group.members.map((m) => m.socialAccountId).filter((id) => connectedIds.has(id));
    setSelectedAccountIds(memberIds);
    setShowGroupDropdown(false);
  };

  // Hardcoded access variables to match PostCreator.jsx
  const hasFacebookAccess = true;
  const hasTiktokAccess = true;
  const hasYoutubeAccess = true;
  const hasInstagramAccess = true;

  const getPlatformLockInfo = (platformName) => {
    const platUpper = platformName.toUpperCase();
    const limits = platformLimits?.filter(l => l.platform === platUpper) || [];
    if (limits.length === 0) return { isLocked: false, isFullyLocked: false };
    
    const activeSubType = platformName === 'facebook' ? facebookType : platformName === 'instagram' ? instagramType : platformName === 'youtube' ? youtubeType : 'video';
    const activeLimit = limits.find(l => l.subType === activeSubType.toUpperCase());
    
    const isFullyLocked = limits.every(l => l.isLocked);
    const isActiveLocked = activeLimit ? activeLimit.isLocked : false;
    
    return {
      isLocked: isFullyLocked || isActiveLocked,
      reason: activeLimit?.lockReason || limits.find(l => l.isLocked)?.lockReason || "Tạm thời bảo trì",
      isFullyLocked
    };
  };

  const accessRightsStrategyMap = {
    facebook: hasFacebookAccess,
    instagram: hasInstagramAccess,
    tiktok: hasTiktokAccess,
    youtube: hasYoutubeAccess,
  };

  const getPlatformAccess = (platformId) => accessRightsStrategyMap[platformId] ?? true;

  // Shared guard for both the remove-click on a selected avatar and the
  // add/remove clicks inside ChannelPickerDropdown: block toggling a
  // channel on if its platform is fully locked or the brand lacks access,
  // same checks the old single avatar-click handler used to run.
  const handleToggleAccount = (accountId) => {
    const account = connectedAccounts.find((sa) => sa.id === accountId);
    const platformKey = (account?.platform || "").toLowerCase();
    const isCurrentlySelected = selectedAccountIds.includes(accountId);

    if (!isCurrentlySelected) {
      const lockInfo = getPlatformLockInfo(platformKey);
      if (lockInfo.isFullyLocked) {
        toast.error(t("planner:postCreator.composer.validation.platformLocked", { platform: platformKey.toUpperCase(), reason: lockInfo.reason }));
        return;
      }
      if (getPlatformAccess(platformKey) === false) {
        setBlockedProductId(SUPPORTED_PLATFORM_BUTTONS.find((p) => p.id === platformKey)?.productId);
        return;
      }
    }
    toggleAccount(accountId);
  };

  return (
    <div className="shrink-0 px-8 py-3 border-b border-border flex flex-col gap-3 bg-card z-10">

      {/* Channel avatar row — single source for both which ACCOUNTS are
          targeted and which PLATFORM is active (Buffer reference: one row
          of circular avatars with a platform-logo badge on the corner,
          click = select+activate; a "+" opens ChannelPickerDropdown to
          add/remove accounts). Replaces the old dual rows (a flat platform-
          icon toolbar above, a separate account-pill row below) that were
          two ways to do overlapping things and rendered confusingly next
          to each other. */}
      {isLockedToAccount ? (
        (() => {
          const lockedAccount = connectedAccounts.find((sa) => selectedAccountIds.includes(sa.id));
          if (!lockedAccount) return null;
          const platformKey = (lockedAccount.platform || "").toLowerCase();
          const accountName = lockedAccount.displayName || lockedAccount.username || lockedAccount.accountName || platformKey;
          return (
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <ChannelAvatar account={lockedAccount} platform={platformKey} size={40} badgeSize={16} className="border-2 border-border" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground">
                  <Lock size={8} />
                </span>
              </div>
              <span className="text-[11px] font-bold text-muted-foreground font-sans">{accountName}</span>
            </div>
          );
        })()
      ) : connectedAccounts.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {channelGroups.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowGroupDropdown((v) => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
              >
                <Users size={12} className="shrink-0" />
                <span className="font-sans text-[11px]">Chọn theo nhóm</span>
                <ChevronDown size={11} className="shrink-0" />
              </button>
              {showGroupDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowGroupDropdown(false)} />
                  <div className="absolute top-full left-0 mt-1 w-52 bg-card rounded-xl shadow-2xl border border-border py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                    {channelGroups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => applyChannelGroup(group)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold cursor-pointer border-none bg-transparent text-left hover:bg-muted transition-colors"
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: group.color || "var(--muted-foreground)" }} />
                        <span className="truncate flex-1 font-sans">{group.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{group.members.length}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Just channel selection here — no active-platform concept, no
              post-type dropdown. Click toggles a channel on/off; the type
              (Post/Reel/Story) and everything else per-platform is
              configured in NetworkCustomizeScreen ("Customize for each
              network"), not here. */}
          {connectedAccounts.filter((sa) => selectedAccountIds.includes(sa.id)).map((sa) => {
            const platformKey = (sa.platform || "").toLowerCase();
            const accountName = sa.displayName || sa.username || sa.accountName || platformKey;
            const lockInfo = getPlatformLockInfo(platformKey);

            return (
              <div
                key={sa.id}
                data-testid={`selected-channel-${platformKey}`}
                className="relative shrink-0 group/avatar"
              >
                <ChannelAvatar
                  account={sa}
                  platform={platformKey}
                  size={48}
                  badgeSize={18}
                  className={lockInfo.isFullyLocked ? "opacity-40" : ""}
                />
                <button
                  type="button"
                  data-testid={`selected-channel-remove-${platformKey}`}
                  onClick={() => handleToggleAccount(sa.id)}
                  title={t("planner:postCreator.channelPicker.removeChannel")}
                  className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-slate-800 text-white flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all cursor-pointer shadow-sm z-10"
                >
                  <X size={10} />
                </button>
              </div>
            );
          })}

          {/* Add/remove channels */}
          <div className="relative self-start">
            <button
              type="button"
              data-testid="channel-picker-open-btn"
              onClick={() => setShowChannelPicker((v) => !v)}
              title={t("planner:postCreator.channelPicker.addRemove")}
              className="w-12 h-12 rounded-xl bg-muted border border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-gray-400 hover:text-foreground transition-all cursor-pointer shrink-0"
            >
              <Plus size={18} />
            </button>
            {showChannelPicker && (
              <ChannelPickerDropdown
                accounts={activeBrand?.socialAccounts || []}
                selectedAccountIds={selectedAccountIds}
                onToggleAccount={handleToggleAccount}
                onClose={() => setShowChannelPicker(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
