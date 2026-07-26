import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Lock, Instagram, Youtube, Plus, FileText, Globe,
  ChevronDown, Video, LayoutGrid, Film, PlusCircle, Check, Send
} from "lucide-react";
import { usePostCreatorFormContext } from "../../../context/PostCreatorFormContext";
import { PlatformIcon } from "../../shared/PlatformIcon";
import { ShortsIcon } from "./ShortsIcon";
import { PRODUCT_IDS } from "../../../constants/products";
import { PLATFORM_CONFIGS } from "../../../constants/platformRegistry";
import { toast } from "sonner";

export function ComposerHeader() {
  const { t } = useTranslation(["planner", "common"]);
  const {
    selectedPlatforms,
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
    setBlockedProductId
  } = usePostCreatorFormContext();

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Hardcoded access variables to match PostCreator.jsx
  const hasFacebookAccess = true;
  const hasTiktokAccess = true;
  const hasYoutubeAccess = true;
  const hasInstagramAccess = true;

  const isPlatformConnected = (platformId) => {
    if (!activeBrand || !activeBrand.socialAccounts) return false;
    const mapping = {
      facebook: "FACEBOOK",
      instagram: "INSTAGRAM",
      youtube: "YOUTUBE",
      tiktok: "TIKTOK",
      telegram: "TELEGRAM",
      threads: "THREADS",
      bluesky: "BLUESKY",
      reddit: "REDDIT"
      // Twitch intentionally excluded: it has no post-publishing API (stream-only
      // platform), so it must never appear as a selectable Post Creator target —
      // see twitch.service.js publishPost().
    };
    const targetPlatform = mapping[platformId];
    if (!targetPlatform) return false;
    return activeBrand.socialAccounts.some(
      sa => sa.platform === targetPlatform && sa.isConnected
    );
  };

  const shouldShowPlatform = (platformId) => {
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
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl transition-all text-[10px] font-black text-gray-600 uppercase tracking-wider cursor-pointer font-sans shadow-sm"
        >
          {activeType}
          <ChevronDown size={12} className="text-gray-500" />
        </button>

        {showTypeDropdown && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
            {activeConfig.supportedTypes.map((typeOption) => {
              let icon = <LayoutGrid size={16} className="text-gray-600" />;
              let subtitle = t("planner:postCreator.composer.publishType.standard");
              
              if (typeOption.id === 'reel') {
                icon = <Film size={16} className="text-gray-600" />;
                subtitle = t("planner:postCreator.composer.publishType.reel");
              } else if (typeOption.id === 'story') {
                icon = <PlusCircle size={16} className="text-gray-600" />;
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
                  className={`w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition-all text-left cursor-pointer ${
                    activeType === typeOption.id ? 'bg-gray-100/80' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1 bg-gray-100 rounded text-gray-600">
                      {icon}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-800 capitalize font-sans">{typeOption.label}</div>
                      <div className="text-[10px] text-gray-400 font-medium font-sans">{subtitle}</div>
                    </div>
                  </div>
                  {activeType === typeOption.id && <Check size={14} className="text-gray-800" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="shrink-0 px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-white z-10">
      <div className="flex items-center gap-6">
        {/* Platform Icons Toolbar */}
        <div className="flex items-center gap-4">
          {/* Facebook */}
          {shouldShowPlatform("facebook") && (
            <div className="flex items-center gap-2 relative">
              <button 
                type="button"
                title={getPlatformLockInfo("facebook").isFullyLocked ? `Facebook hiện đang bị khóa: ${getPlatformLockInfo("facebook").reason}` : "Facebook"}
                data-testid="platform-select-facebook" onClick={() => handlePlatformClick("facebook", hasFacebookAccess, PRODUCT_IDS.FACEBOOK_MANAGEMENT)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                  getPlatformLockInfo("facebook").isFullyLocked
                    ? 'bg-red-50 text-red-400 border border-red-200 opacity-60 cursor-not-allowed'
                    : selectedPlatforms.includes('facebook')
                      ? activePlatform === 'facebook'
                        ? 'bg-[#1877F2] text-white shadow-md'
                        : 'bg-[#1877F2]/15 text-[#1877F2] hover:bg-[#1877F2]/25'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                {selectedPlatforms.includes('facebook') && activePlatform === 'facebook' && (
                  <span className="absolute -bottom-1 -right-1 bg-white border border-gray-200 rounded-md p-0.5 text-gray-700 shadow-sm flex items-center justify-center">
                    <LayoutGrid size={8} strokeWidth={3} />
                  </span>
                )}
                {!hasFacebookAccess && !getPlatformLockInfo("facebook").isFullyLocked && (
                  <span className="absolute -top-1 -right-1 bg-white border border-purple-100 text-purple-600 rounded-full p-0.5 shadow-sm">
                    <Lock size={7} strokeWidth={3} />
                  </span>
                )}
                {getPlatformLockInfo("facebook").isFullyLocked && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                    <Lock size={7} strokeWidth={3} />
                  </span>
                )}
              </button>
              {selectedPlatforms.includes('facebook') && activePlatform === 'facebook' && renderTypeDropdown()}
            </div>
          )}

          {/* Instagram */}
          {shouldShowPlatform("instagram") && (
            <div className="flex items-center gap-2 relative">
              <button 
                type="button"
                title={getPlatformLockInfo("instagram").isFullyLocked ? `Instagram hiện đang bị khóa: ${getPlatformLockInfo("instagram").reason}` : "Instagram"}
                data-testid="platform-select-instagram" onClick={() => handlePlatformClick("instagram", hasInstagramAccess, PRODUCT_IDS.INSTAGRAM_MANAGEMENT || 'instagram_management')}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                  getPlatformLockInfo("instagram").isFullyLocked
                    ? 'bg-red-50 text-red-400 border border-red-200 opacity-60 cursor-not-allowed'
                    : selectedPlatforms.includes('instagram')
                      ? activePlatform === 'instagram'
                        ? 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white shadow-md'
                        : 'bg-[#DD2A7B]/10 text-[#DD2A7B] hover:bg-[#DD2A7B]/20'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Instagram size={18} />
                {selectedPlatforms.includes('instagram') && activePlatform === 'instagram' && (
                  <span className="absolute -bottom-1 -right-1 bg-white border border-gray-200 rounded-md p-0.5 text-gray-700 shadow-sm flex items-center justify-center">
                    <LayoutGrid size={8} strokeWidth={3} />
                  </span>
                )}
                {!hasInstagramAccess && !getPlatformLockInfo("instagram").isFullyLocked && (
                  <span className="absolute -top-1 -right-1 bg-white border border-purple-100 text-purple-600 rounded-full p-0.5 shadow-sm">
                    <Lock size={7} strokeWidth={3} />
                  </span>
                )}
                {getPlatformLockInfo("instagram").isFullyLocked && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                    <Lock size={7} strokeWidth={3} />
                  </span>
                )}
              </button>
              {selectedPlatforms.includes('instagram') && activePlatform === 'instagram' && renderTypeDropdown()}
            </div>
          )}

          {/* TikTok */}
          {shouldShowPlatform("tiktok") && (
            <div className="flex items-center gap-2 relative">
              <button 
                type="button"
                title={getPlatformLockInfo("tiktok").isFullyLocked ? `TikTok hiện đang bị khóa: ${getPlatformLockInfo("tiktok").reason}` : "TikTok"}
                data-testid="platform-select-tiktok" onClick={() => handlePlatformClick("tiktok", hasTiktokAccess, PRODUCT_IDS.TIKTOK_CREATIVE)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                  getPlatformLockInfo("tiktok").isFullyLocked
                    ? 'bg-red-50 text-red-400 border border-red-200 opacity-60 cursor-not-allowed'
                    : selectedPlatforms.includes('tiktok')
                      ? activePlatform === 'tiktok'
                        ? 'bg-black text-white shadow-md'
                        : 'bg-black/10 text-black hover:bg-black/20'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-[16px] h-[16px] fill-current" viewBox="0 0 24 24">
                  <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.5-1.1-1.02-1.7-2.48-1.9-3.96-.03 2.49 0 4.99 0 7.48-.02 1.9-.38 3.82-1.39 5.43-1.46 2.42-4.13 3.84-6.93 3.55-3.05-.2-5.78-2.44-6.39-5.46-.73-3.27.97-6.9 4.13-7.91 1.09-.34 2.24-.39 3.37-.2v4.02c-1.22-.32-2.58-.09-3.55.74-.95.83-1.29 2.19-1.03 3.4.31 1.65 1.84 2.91 3.53 2.78 1.94-.04 3.42-1.8 3.25-3.73-.02-2.91 0-5.83 0-8.74.02-3.11-.02-6.22.02-9.33z"/>
                </svg>
                {!hasTiktokAccess && !getPlatformLockInfo("tiktok").isFullyLocked && (
                  <span className="absolute -top-1 -right-1 bg-white border border-purple-100 text-purple-600 rounded-full p-0.5 shadow-sm">
                    <Lock size={7} strokeWidth={3} />
                  </span>
                )}
                {getPlatformLockInfo("tiktok").isFullyLocked && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                    <Lock size={7} strokeWidth={3} />
                  </span>
                )}
              </button>
            </div>
          )}

          {/* YouTube */}
          {shouldShowPlatform("youtube") && (
            <div className="flex items-center gap-2 relative">
              <button 
                type="button"
                title={getPlatformLockInfo("youtube").isFullyLocked ? `YouTube hiện đang bị khóa: ${getPlatformLockInfo("youtube").reason}` : "YouTube"}
                data-testid="platform-select-youtube" onClick={() => handlePlatformClick("youtube", hasYoutubeAccess, PRODUCT_IDS.YOUTUBE_ANALYTICS)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                  getPlatformLockInfo("youtube").isFullyLocked
                    ? 'bg-red-50 text-red-400 border border-red-200 opacity-60 cursor-not-allowed'
                    : selectedPlatforms.includes('youtube')
                      ? activePlatform === 'youtube'
                        ? 'bg-[#FF0000] text-white shadow-md'
                        : 'bg-[#FF0000]/10 text-[#FF0000] hover:bg-[#FF0000]/20'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Youtube size={18} />
                {selectedPlatforms.includes('youtube') && activePlatform === 'youtube' && (
                  <span className="absolute -bottom-1 -right-1 bg-white border border-gray-200 rounded-md p-0.5 text-gray-700 shadow-sm flex items-center justify-center">
                    <LayoutGrid size={8} strokeWidth={3} />
                  </span>
                )}
                {!hasYoutubeAccess && !getPlatformLockInfo("youtube").isFullyLocked && (
                  <span className="absolute -top-1 -right-1 bg-white border border-purple-100 text-purple-600 rounded-full p-0.5 shadow-sm">
                    <Lock size={7} strokeWidth={3} />
                  </span>
                )}
                {getPlatformLockInfo("youtube").isFullyLocked && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                    <Lock size={7} strokeWidth={3} />
                  </span>
                )}
              </button>
              {selectedPlatforms.includes('youtube') && activePlatform === 'youtube' && renderTypeDropdown()}
            </div>
          )}

          {/* Telegram */}
          {shouldShowPlatform("telegram") && (
            <div className="flex items-center gap-2 relative">
              <button 
                type="button"
                title={getPlatformLockInfo("telegram").isFullyLocked ? `Telegram hiện đang bị khóa: ${getPlatformLockInfo("telegram").reason}` : "Telegram"}
                data-testid="platform-select-telegram" onClick={() => handlePlatformClick("telegram", true)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                  getPlatformLockInfo("telegram").isFullyLocked
                    ? 'bg-red-50 text-red-400 border border-red-200 opacity-60 cursor-not-allowed'
                    : selectedPlatforms.includes('telegram')
                      ? activePlatform === 'telegram'
                        ? 'bg-[#0088cc] text-white shadow-md'
                        : 'bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/20'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Send size={16} className={`rotate-45 translate-x-[-1px]`} />
                {getPlatformLockInfo("telegram").isFullyLocked && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                    <Lock size={7} strokeWidth={3} />
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Threads */}
          {shouldShowPlatform("threads") && (
            <div className="flex items-center gap-2 relative">
              <button 
                type="button"
                title={getPlatformLockInfo("threads").isFullyLocked ? `Threads hiện đang bị khóa: ${getPlatformLockInfo("threads").reason}` : "Threads"}
                data-testid="platform-select-threads" onClick={() => handlePlatformClick("threads", true)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                  getPlatformLockInfo("threads").isFullyLocked
                    ? 'bg-red-50 text-red-400 border border-red-200 opacity-60 cursor-not-allowed'
                    : selectedPlatforms.includes('threads')
                      ? activePlatform === 'threads'
                        ? 'bg-black text-white shadow-md'
                        : 'bg-black/10 text-black hover:bg-black/20'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                <PlatformIcon platform="Threads" size={16} variant="flat" />
                {getPlatformLockInfo("threads").isFullyLocked && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                    <Lock size={7} strokeWidth={3} />
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Bluesky */}
          {shouldShowPlatform("bluesky") && (
            <div className="flex items-center gap-2 relative">
              <button 
                type="button"
                title={getPlatformLockInfo("bluesky").isFullyLocked ? `Bluesky hiện đang bị khóa: ${getPlatformLockInfo("bluesky").reason}` : "Bluesky"}
                data-testid="platform-select-bluesky" onClick={() => handlePlatformClick("bluesky", true)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                  getPlatformLockInfo("bluesky").isFullyLocked
                    ? 'bg-red-50 text-red-400 border border-red-200 opacity-60 cursor-not-allowed'
                    : selectedPlatforms.includes('bluesky')
                      ? activePlatform === 'bluesky'
                        ? 'bg-[#0085FF] text-white shadow-md'
                        : 'bg-[#0085FF]/20 text-[#0085FF] hover:bg-[#0085FF]/30'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                <PlatformIcon platform="bluesky" variant="flat" size={16} className={selectedPlatforms.includes('bluesky') && activePlatform === 'bluesky' ? 'text-white' : ''} />
                {getPlatformLockInfo("bluesky").isFullyLocked && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                    <Lock size={7} strokeWidth={3} />
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Reddit */}
          {shouldShowPlatform("reddit") && (
            <div className="flex items-center gap-2 relative">
              <button 
                type="button"
                title={getPlatformLockInfo("reddit").isFullyLocked ? `Reddit hiện đang bị khóa: ${getPlatformLockInfo("reddit").reason}` : "Reddit"}
                data-testid="platform-select-reddit" onClick={() => handlePlatformClick("reddit", true)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                  getPlatformLockInfo("reddit").isFullyLocked
                    ? 'bg-red-50 text-red-400 border border-red-200 opacity-60 cursor-not-allowed'
                    : selectedPlatforms.includes('reddit')
                      ? activePlatform === 'reddit'
                        ? 'bg-[#FF4500] text-white shadow-md'
                        : 'bg-[#FF4500]/20 text-[#FF4500] hover:bg-[#FF4500]/30'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Globe size={16} />
                {getPlatformLockInfo("reddit").isFullyLocked && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                    <Lock size={7} strokeWidth={3} />
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Plus Add Button */}
          <button type="button" className="w-8 h-8 rounded-full bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-all cursor-pointer">
            <Plus size={16} />
          </button>
        </div>
      </div>
      <button 
        type="button"
        onClick={() => setIsNotesOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-xl transition-all cursor-pointer font-sans shadow-sm relative"
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
  );
}
