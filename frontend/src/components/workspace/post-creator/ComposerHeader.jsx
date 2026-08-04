import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Lock, Instagram, Youtube, Plus, FileText, Globe,
  ChevronDown, Video, LayoutGrid, Film, PlusCircle, Check, Send, Settings, Users
} from "lucide-react";
import { usePostCreatorFormContext } from "../../../context/PostCreatorFormContext";
import { PlatformIcon } from "../../shared/PlatformIcon";
import { ShortsIcon } from "./ShortsIcon";
import { PRODUCT_IDS } from "../../../constants/products";
import { PLATFORMS, PLATFORM_API_KEY } from "../../../constants/platforms";
import { PLATFORM_CONFIGS } from "../../../constants/platformRegistry";
import channelGroupService from "../../../services/channel-group.service";
import { toast } from "sonner";

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
    selectedPlatforms,
    selectedAccountIds,
    setSelectedAccountIds,
    isLockedToAccount,
    toggleAccount,
    togglePlatform,
    activePlatform,
    setActivePlatform,
    platformLimits,
    facebookType,
    setFacebookType,
    youtubeType,
    setYoutubeType,
    instagramType,
    setInstagramType,
    activeBrand,
    setIsNotesOpen,
    notes,
    setBlockedProductId,
    isEditByNetwork,
    setIsEditByNetwork,
  } = usePostCreatorFormContext();

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [channelGroups, setChannelGroups] = useState([]);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);

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

  const isPlatformConnected = (platformId) => {
    if (!activeBrand || !activeBrand.socialAccounts) return false;
    if (platformId === PLATFORMS.TWITCH) return false;
    const targetApiKey = PLATFORM_API_KEY[platformId];
    if (!targetApiKey) return false;
    return activeBrand.socialAccounts.some(
      sa => sa.platform === targetApiKey && sa.isConnected
    );
  };

  const shouldShowPlatform = (platformId) => {
    // Locked to one channel account — only its own platform button is
    // relevant; other connected platforms on the brand have no bearing here.
    if (isLockedToAccount) return selectedPlatforms.includes(platformId);
    return isPlatformConnected(platformId) || selectedPlatforms.includes(platformId);
  };

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

  const activeConfig = PLATFORM_CONFIGS[activePlatform];
  const activeType = activePlatform === 'facebook' ? facebookType : activePlatform === 'instagram' ? instagramType : activePlatform === 'youtube' ? youtubeType : 'video';
  const setType = activePlatform === 'facebook' ? setFacebookType : activePlatform === 'instagram' ? setInstagramType : activePlatform === 'youtube' ? setYoutubeType : () => {};

  const handlePlatformClick = (platformName, hasAccess, productId) => {
    const lockInfo = getPlatformLockInfo(platformName);
    if (lockInfo.isFullyLocked) {
      toast.error(t("planner:postCreator.composer.validation.platformLocked", { platform: platformName.toUpperCase(), reason: lockInfo.reason }));
      return;
    }
    if (hasAccess !== undefined && !hasAccess) {
      setBlockedProductId(productId);
      return;
    }
    togglePlatform(platformName);
  };

  const renderTypeDropdown = () => {
    if (!activeConfig?.supportedTypes || activeConfig.supportedTypes.length <= 1) return null;
    return (
      <div className="relative">
        <button 
          type="button"
          onClick={() => setShowTypeDropdown(!showTypeDropdown)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border hover:bg-muted rounded-xl transition-all text-[10px] font-black text-muted-foreground uppercase tracking-wider cursor-pointer font-sans shadow-sm"
        >
          {activeType}
          <ChevronDown size={12} className="text-muted-foreground" />
        </button>

        {showTypeDropdown && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-card rounded-2xl shadow-2xl border border-border py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
            {activeConfig.supportedTypes.map((typeOption) => {
              let icon = <LayoutGrid size={16} className="text-muted-foreground" />;
              let subtitle = t("planner:postCreator.composer.publishType.standard");
              
              if (typeOption.id === 'reel') {
                icon = <Film size={16} className="text-muted-foreground" />;
                subtitle = t("planner:postCreator.composer.publishType.reel");
              } else if (typeOption.id === 'story') {
                icon = <PlusCircle size={16} className="text-muted-foreground" />;
                subtitle = t("planner:postCreator.composer.publishType.story");
              } else if (typeOption.id === 'short') {
                icon = <ShortsIcon size={14} className="text-[#FF0000]" />;
                subtitle = t("planner:postCreator.composer.publishType.short");
              } else if (typeOption.id === 'video') {
                icon = <Youtube size={14} className="text-[#FF0000] fill-[#FF0000]" />;
                subtitle = t("planner:postCreator.composer.publishType.video");
              } else if (typeOption.id === 'post') {
                if (activePlatform === 'instagram') {
                  subtitle = t("planner:postCreator.composer.publishType.instagramFeed");
                } else {
                  subtitle = t("planner:postCreator.composer.publishType.standard");
                }
              }

              return (
                <button
                  key={typeOption.id}
                  type="button"
                  onClick={() => {
                    setType(typeOption.id);
                    setShowTypeDropdown(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2 hover:bg-muted transition-all text-left cursor-pointer ${
                    activeType === typeOption.id ? 'bg-muted/80' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1 bg-muted rounded text-muted-foreground">
                      {icon}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground capitalize font-sans">{typeOption.label}</div>
                      <div className="text-[10px] text-muted-foreground font-medium font-sans">{subtitle}</div>
                    </div>
                  </div>
                  {activeType === typeOption.id && <Check size={14} className="text-foreground" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const accessRightsStrategyMap = {
    facebook: hasFacebookAccess,
    instagram: hasInstagramAccess,
    tiktok: hasTiktokAccess,
    youtube: hasYoutubeAccess,
  };

  const getPlatformAccess = (platformId) => accessRightsStrategyMap[platformId] ?? true;

  return (
    <div className="shrink-0 px-8 py-4 border-b border-border flex flex-col gap-3 bg-card z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Platform Icons Toolbar */}
          <div className="flex items-center gap-4">
            {SUPPORTED_PLATFORM_BUTTONS.filter(p => shouldShowPlatform(p.id)).map((p) => {
              const isSelected = selectedPlatforms.includes(p.id);
              const isActive = activePlatform === p.id;
              const lockInfo = getPlatformLockInfo(p.id);
              const hasAccess = getPlatformAccess(p.id);

              return (
                <div key={p.id} className="flex items-center gap-2 relative">
                  <button
                    type="button"
                    title={
                      isLockedToAccount
                        ? `Đang đăng riêng cho kênh này (${p.label})`
                        : lockInfo.isFullyLocked
                          ? `${p.label} hiện đang bị khóa: ${lockInfo.reason}`
                          : p.label
                    }
                    data-testid={`platform-select-${p.id}`}
                    onClick={() => !isLockedToAccount && handlePlatformClick(p.id, hasAccess, p.productId)}
                    disabled={isLockedToAccount}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all relative ${
                      isLockedToAccount
                        ? `${isActive ? p.activeBgClass : p.inactiveBgClass} cursor-default`
                        : lockInfo.isFullyLocked
                          ? 'bg-red-50 text-red-400 border border-red-200 opacity-60 cursor-not-allowed'
                          : isSelected
                            ? isActive
                              ? `${p.activeBgClass} cursor-pointer`
                              : `${p.inactiveBgClass} cursor-pointer`
                            : 'text-muted-foreground hover:text-muted-foreground hover:bg-muted cursor-pointer'
                    }`}
                  >
                    <PlatformIcon platform={p.id} size={16} variant="flat" className={isSelected && isActive ? 'text-white' : ''} />
                    {isSelected && isActive && p.hasTypeDropdown && (
                      <span className="absolute -bottom-1 -right-1 bg-card border border-border rounded-md p-0.5 text-foreground shadow-sm flex items-center justify-center">
                        <LayoutGrid size={8} strokeWidth={3} />
                      </span>
                    )}
                    {!hasAccess && !lockInfo.isFullyLocked && (
                      <span className="absolute -top-1 -right-1 bg-card border border-purple-100 text-purple-600 rounded-full p-0.5 shadow-sm">
                        <Lock size={7} strokeWidth={3} />
                      </span>
                    )}
                    {lockInfo.isFullyLocked && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                        <Lock size={7} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                  {isSelected && isActive && p.hasTypeDropdown && renderTypeDropdown()}
                </div>
              );
            })}

            {/* Plus Add Button — hidden when locked to a single channel account */}
            {!isLockedToAccount && (
              <button type="button" className="w-8 h-8 rounded-full bg-muted border border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-gray-400 hover:text-muted-foreground transition-all cursor-pointer">
                <Plus size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle: Cài đặt theo mạng */}
          <button
            type="button"
            onClick={() => setIsEditByNetwork(!isEditByNetwork)}
            title={isEditByNetwork ? "Tắt cài đặt theo mạng" : "Bật cài đặt theo mạng (Custom nội dung riêng theo platform)"}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl transition-all cursor-pointer font-sans shadow-sm text-[11px] font-bold uppercase tracking-wider ${
              isEditByNetwork
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            <Settings size={13} />
            <span className="hidden sm:inline">Theo mạng</span>
            {isEditByNetwork && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            )}
          </button>

          {/* Notes button */}
          <button 
            type="button"
            onClick={() => setIsNotesOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border bg-card hover:bg-muted text-muted-foreground rounded-xl transition-all cursor-pointer font-sans shadow-sm relative"
          >
            <FileText size={14} />
            <span className="text-[11px] font-bold uppercase tracking-wider font-sans">{t("planner:postCreator.header.notes")}</span>
            {notes && notes.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-black text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white animate-scale-in">
                {notes.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Per-Account Selection Bar — replaced by a fixed label when locked to a single channel account */}
      {isLockedToAccount ? (
        (() => {
          const lockedAccount = connectedAccounts.find((sa) => selectedAccountIds.includes(sa.id));
          if (!lockedAccount) return null;
          const platformKey = (lockedAccount.platform || "").toLowerCase();
          const accountName = lockedAccount.displayName || lockedAccount.username || lockedAccount.accountName || platformKey;
          const avatarUrl = lockedAccount.avatarUrl || lockedAccount.profilePictureUrl;
          return (
            <div className="flex items-center gap-2 pt-1.5 border-t border-gray-100">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider mr-1">Đăng riêng cho kênh:</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-slate-900 text-white border-slate-900 shadow-sm">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={accountName} className="w-4 h-4 rounded-full object-cover shrink-0" />
                ) : (
                  <PlatformIcon platform={platformKey} size={13} className="shrink-0" />
                )}
                <span className="truncate max-w-[160px] font-sans text-[11px]">{accountName}</span>
                <Lock size={10} className="shrink-0 opacity-70" />
              </div>
            </div>
          );
        })()
      ) : connectedAccounts.length > 0 && (
        <div className="flex items-center gap-2 pt-1.5 border-t border-gray-100 flex-wrap">
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider mr-1">Tài khoản đăng:</span>
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
          {connectedAccounts.map((sa) => {
            const isSelected = selectedAccountIds.includes(sa.id);
            const platformKey = (sa.platform || "").toLowerCase();
            const accountName = sa.displayName || sa.username || sa.accountName || platformKey;
            const avatarUrl = sa.avatarUrl || sa.profilePictureUrl;
            return (
              <button
                key={sa.id}
                type="button"
                onClick={() => toggleAccount(sa.id)}
                title={`Đăng bài lên: ${accountName}`}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-muted text-muted-foreground border-border hover:bg-gray-200"
                }`}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={accountName} className="w-4 h-4 rounded-full object-cover shrink-0" />
                ) : (
                  <PlatformIcon platform={platformKey} size={13} className="shrink-0" />
                )}
                <span className="truncate max-w-[120px] font-sans text-[11px]">{accountName}</span>
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] shrink-0 ${
                  isSelected ? "bg-white text-slate-900 font-extrabold" : "border border-gray-300"
                }`}>
                  {isSelected ? "✓" : ""}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
