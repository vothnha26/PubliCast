import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, Calendar, AlertCircle, Plus,
  ChevronDown, Check, Film, PlusCircle, LayoutGrid, Youtube, Globe, X,
  Maximize2, Minimize2, Tag
} from "lucide-react";
import { usePostCreatorFormContext } from "../../../context/PostCreatorFormContext";
import { RightPanelTabSwitcher } from "./RightPanelTabSwitcher";
import { ChannelAvatar } from "./ChannelAvatar";
import { PreviewHeader } from "./previews/PreviewHeader";
import { PreviewBody } from "./previews/PreviewBody";
import { TemplatesSidebar } from "./TemplatesSidebar";
import { NotesPanel } from "./NotesPanel";
import { ConfirmExitModal } from "./ConfirmExitModal";
import { AICopilotPopover } from "./popovers/AICopilotPopover";
import { CaptionToolbar } from "./CaptionToolbar";
import { ChannelPickerDropdown } from "./ChannelPickerDropdown";
import { PublishSplitButton } from "./PublishSplitButton";
import { ComposerFooter } from "./ComposerFooter";
import { PRESET_REGISTRY } from "../../../constants/presetRegistry";
import { PLATFORM_CONFIGS } from "../../../constants/platformRegistry";
import { MEDIA_FILTER_TYPES } from "../../../constants/mediaAcceptStrategy";
import { PLATFORMS } from "../../../constants/platforms";
import { MediaThumbnailGrid } from "./MediaThumbnailGrid";
import { ShortsIcon } from "./ShortsIcon";

/**
 * Fullscreen "Customize post per network" overlay (Figma 4:289-4:512).
 * Reuses the same per-network data model ComposerBody/NetworkTabSwitcher
 * already drive (networkCustom, updateNetworkCaption/Media, presets
 * registry) rather than reimplementing per-platform state.
 */
export function NetworkCustomizeScreen({ onClose }) {
  const { t } = useTranslation(["planner", "common"]);
  const {
    activeBrand,
    caption,
    closePostCreator,
    selectedPlatforms,
    selectedAccountIds,
    toggleAccount,
    activeNetworkTab,
    setNetworkTab,
    activeNetworkAccountId,
    setActiveNetworkAccountId,
    networkCustom,
    updateNetworkCaption,
    updateNetworkMedia,
    updateThreadPostText,
    updateThreadPostMedia,
    addThreadPost,
    removeThreadPost,
    setThreadActiveIndex,
    toggleUseTemplate,
    setActivePlatform,
    facebookType,
    setFacebookType,
    instagramType,
    setInstagramType,
    youtubeType,
    setYoutubeType,
    rightPanelTab,
    setRightPanelTab,
    setShowUploadModal,
    setUploadModalTab,
    setMediaTypeFilter,
    getValidationErrors,
    selectedPublishId,
    scheduledDate,
    setScheduledDate,
    createAnother,
    setCreateAnother,
    postMedia,
    videoFile,
    videoFileUrl,
    uploadedVideoPath,
    setEditingPostMediaIndex,
    setShowImageEditor,
    setShowVideoEditor,
    setShowAltTextModal,
    isFullScreen,
    setIsFullScreen
  } = usePostCreatorFormContext();

  const [activePopover, setActivePopover] = useState(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showChannelPicker, setShowChannelPicker] = useState(false);

  // Flat list of tabs — one per connected+targeted CHANNEL (account), not
  // one per platform. A brand with 2 TikTok accounts selected gets 2 tabs,
  // each independently editable, matching Figma's per-channel tab row.
  const channelTabs = (activeBrand?.socialAccounts || [])
    .filter((sa) => selectedAccountIds.includes(sa.id) && sa.platform !== PLATFORMS.GOOGLE_DRIVE)
    .map((sa) => ({
      accountId: sa.id,
      platform: (sa.platform || "").toLowerCase(),
      account: sa,
    }));

  // Whether a given platform has more than one targeted account — only
  // then does that platform's networkCustom entry actually need a
  // perAccount slot; a single-account platform writes straight to the
  // platform-level entry (mirrors updateNetworkCaption/toggleUseTemplate's
  // own accountId-optional contract).
  const isMultiAccountPlatform = (platform) =>
    channelTabs.filter((c) => c.platform === platform).length > 1;

  const activeChannel = channelTabs.find((c) => c.accountId === activeNetworkAccountId)
    || channelTabs[0]
    || null;
  const activePlatform = activeChannel?.platform;

  const applyCustomModeFor = (channel) => {
    const accountId = isMultiAccountPlatform(channel.platform) ? channel.accountId : null;
    const entry = networkCustom[channel.platform];
    const slot = accountId ? entry?.perAccount?.[accountId] : entry;
    if (slot?.useTemplate !== false) {
      toggleUseTemplate(channel.platform, true, accountId);
    }
  };

  // Land on the first targeted channel when this screen opens, since
  // Figma's per-network screen has no "shared" tab. Does NOT touch the
  // composer's own "Theo mạng" toggle (isEditByNetwork) — that's a
  // separate, user-controlled setting for the main composer view.
  // MediaUploadModal's onAccept routing checks isNetworkCustomizeOpen as an
  // alternate gate (see PostCreator.jsx) so uploads still land in the
  // right per-network slot without mutating that toggle.
  useEffect(() => {
    if (!activeChannel) return;
    // setNetworkTab resets activeNetworkAccountId as a side effect — call it
    // first so the account id set right after actually sticks.
    if (activeNetworkTab !== activeChannel.platform) {
      setNetworkTab(activeChannel.platform);
    }
    if (activeNetworkAccountId !== activeChannel.accountId) {
      setActiveNetworkAccountId(activeChannel.accountId);
    }
    setActivePlatform(activeChannel.platform);
    applyCustomModeFor(activeChannel);
  }, []);

  // The top-right "X" (and Escape) exit the whole Post Creator, not just
  // this overlay — unlike the back-arrow, which only returns to the main
  // composer screen underneath. If the post has any content, confirm first
  // so an accidental click doesn't silently drop it.
  const hasUnsavedChanges = () => {
    if (caption?.trim()) return true;
    if (postMedia && postMedia.length > 0) return true;
    return Object.values(networkCustom || {}).some((entry) => {
      if (!entry) return false;
      const slots = entry.perAccount ? Object.values(entry.perAccount) : [entry];
      return slots.some((slot) => slot?.caption?.trim() || (slot?.mediaUrls?.length > 0));
    });
  };

  const [showConfirmExit, setShowConfirmExit] = useState(false);

  const handleExit = () => {
    if (hasUnsavedChanges()) {
      setShowConfirmExit(true);
      return;
    }
    closePostCreator();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") handleExit();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChannel = (channel) => {
    // setNetworkTab (the shared wrapper in usePostCreatorForm) always resets
    // activeNetworkAccountId to null as a side effect — it was written for
    // the old platform-tab-first flow. Call it BEFORE setting the account id
    // here so this screen's per-channel selection wins, not gets clobbered.
    setNetworkTab(channel.platform);
    setActiveNetworkAccountId(channel.accountId);
    setActivePlatform(channel.platform);
    setActivePopover(null);
    setShowTypeDropdown(false);
    applyCustomModeFor(channel);
  };

  // If the channel currently being viewed gets removed (via the "+" picker
  // or the per-tab "x") activeNetworkAccountId still points at a stale id —
  // channelTabs.find() no longer matches it, so re-point the whole screen at
  // whatever channelTabs[0] fell back to.
  useEffect(() => {
    if (!activeChannel) return;
    if (activeNetworkAccountId !== null && !channelTabs.some((c) => c.accountId === activeNetworkAccountId)) {
      handleSelectChannel(activeChannel);
    }
  }, [selectedAccountIds.join(',')]);

  const effectiveAccountId = activeChannel && isMultiAccountPlatform(activeChannel.platform)
    ? activeChannel.accountId
    : null;

  // Threads models its content as a chain of posts (threadPosts[]), not a
  // flat caption string like every other platform — updateNetworkCaption/
  // updateNetworkMedia don't understand that shape, so it needs its own
  // read/write path via updateThreadPostText/updateThreadPostMedia
  // (mirrors ComposerBody's isThreadsTab branch).
  const isThreadsChannel = activePlatform === 'threads';
  const threadsEntry = networkCustom['threads'];
  const activeThreadIndex = threadsEntry?.activeThreadIndex || 0;
  const activeThreadPost = isThreadsChannel
    ? threadsEntry?.threadPosts?.[activeThreadIndex]
    : null;

  const activePlatformEntry = activeChannel ? networkCustom[activeChannel.platform] : null;
  const activeEntry = effectiveAccountId
    ? (activePlatformEntry?.perAccount?.[effectiveAccountId] || { caption: "", mediaUrls: [] })
    : activePlatformEntry;

  // Mirrors globalMedia below: while a channel is still "using template"
  // (useTemplate !== false, i.e. hasn't been individually customized yet),
  // show the shared composer caption instead of the per-network slot, which
  // stays empty until toggleUseTemplate(false) seeds it. Without this, text
  // silently appeared blank here even though media (which always falls
  // back to globalMedia) showed up fine.
  // Threads' first post falls back to the shared caption the same way, but
  // only for index 0 — posts after the first only ever exist as manually
  // added chain entries, so there's no "shared" content for them to show.
  const captionValue = isThreadsChannel
    ? (activeThreadPost !== undefined
        ? (typeof activeThreadPost === 'string' ? activeThreadPost : activeThreadPost?.text || '')
        : (activeThreadIndex === 0 ? caption || '' : ''))
    : (activeEntry?.useTemplate === false ? (activeEntry?.caption || "") : (activeEntry?.caption || caption || ""));

  const globalMedia = (postMedia && postMedia.length > 0)
    ? postMedia
    : (videoFileUrl || uploadedVideoPath)
      ? [{ previewUrl: videoFileUrl, path: uploadedVideoPath, file: videoFile }]
      : [];

  const rawCustomMedia = isThreadsChannel
    ? ((typeof activeThreadPost === 'object' ? activeThreadPost?.mediaUrls : []) || [])
    : (activeEntry?.mediaUrls || []);

  // Must NOT also require rawCustomMedia.length > 0 — removing the last
  // customized media item (down to 0) previously made this fall back to
  // globalMedia, silently un-deleting it and making the remove button look
  // broken for a channel with exactly one media item.
  const isCustomMedia = activeEntry?.useTemplate === false;
  const mediaItems = isCustomMedia ? rawCustomMedia : globalMedia;

  const handleCaptionChange = (val) => {
    if (!activePlatform) return;
    if (isThreadsChannel) {
      updateThreadPostText(activeThreadIndex, val);
    } else {
      updateNetworkCaption(activePlatform, val, effectiveAccountId);
    }
  };

  const handleRemoveMediaItem = (index) => {
    if (!activePlatform) return;
    const updated = mediaItems.filter((_, i) => i !== index);
    if (isThreadsChannel) {
      updateThreadPostMedia(activeThreadIndex, updated);
    } else {
      updateNetworkMedia(activePlatform, updated, effectiveAccountId);
    }
  };

  const validationErrors = getValidationErrors();
  const parsedErrors = validationErrors
    .map((err) => {
      const match = err.match(/^\[([A-Z_]+)(?:\s*-\s*[A-Z_]+)?\]\s*(.*)$/);
      return match ? { platform: match[1].toLowerCase(), message: match[2] } : null;
    })
    .filter(Boolean);
  const platformErrors = parsedErrors.filter((e) => e.platform === activePlatform);
  const hasErrorForPlatform = (platform) => parsedErrors.some((e) => e.platform === platform);

  const PresetComponent = activePlatform ? PRESET_REGISTRY[activePlatform]?.Component : null;
  const shouldRenderPreset = activePlatform
    ? PRESET_REGISTRY[activePlatform]?.shouldRender?.(selectedPlatforms, { facebookType })
    : false;

  // Post-type dropdown (Feed Post / Reel / Story / ...) — mirrors
  // ComposerHeader's renderTypeDropdown, bound to the same global
  // facebookType/instagramType/youtubeType state (type is per-platform,
  // not per-account, matching how the main composer already models it).
  const activeConfig = activePlatform ? PLATFORM_CONFIGS[activePlatform] : null;
  const activeType = activePlatform === 'facebook' ? facebookType
    : activePlatform === 'instagram' ? instagramType
    : activePlatform === 'youtube' ? youtubeType
    : null;
  const setActiveType = activePlatform === 'facebook' ? setFacebookType
    : activePlatform === 'instagram' ? setInstagramType
    : activePlatform === 'youtube' ? setYoutubeType
    : () => {};

  const getTypeIcon = (typeId) => {
    if (typeId === 'reel') return <Film size={16} className="text-muted-foreground" />;
    if (typeId === 'story') return <PlusCircle size={16} className="text-muted-foreground" />;
    if (typeId === 'short') return <ShortsIcon size={14} className="text-[#FF0000]" />;
    if (typeId === 'video') return <Youtube size={14} className="text-[#FF0000] fill-[#FF0000]" />;
    return <LayoutGrid size={16} className="text-muted-foreground" />;
  };

  // NOTE: "Create Another" is checkbox-only for now — handleCreatePost's
  // success path always calls closePostCreator() unconditionally for new
  // posts (see usePostCreatorForm.js), and there's no "stay open and reset"
  // branch to hook into without changing that shared submit handler, which
  // is out of scope here. Matches Figma visually; wiring real
  // stay-open-after-submit behavior is a follow-up.

  return (
    <>
    <div className={`fixed inset-0 z-[2500] bg-slate-900/60 backdrop-blur-sm flex flex-col overflow-hidden animate-in fade-in duration-300 ${
      isFullScreen ? 'p-0' : 'p-3 md:p-5'
    }`}>
      {/* Main Unified Workspace Card */}
      <div className={`flex-1 w-full mx-auto bg-card shadow-2xl flex flex-col overflow-hidden min-h-0 ${
        isFullScreen ? 'max-w-none rounded-none border-0' : 'max-w-[1530px] rounded-[24px] border border-border/40'
      }`}>

        {/* Unified Top Headbar matching Figma / User Reference */}
        <div className="shrink-0 px-6 py-3.5 border-b border-border/60 bg-card flex items-center justify-between z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
              title="Quay lại"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-base font-bold text-foreground tracking-tight font-sans">
              {t("planner:postCreator.networkCustomize.title", "Customize per network")}
            </h1>

            {/* Tags Dropdown Button */}
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer font-sans shadow-xs"
            >
              <Tag size={13} className="text-muted-foreground" />
              <span>{t("planner:postCreator.header.tags", "Tags")}</span>
              <ChevronDown size={12} className="text-muted-foreground" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <RightPanelTabSwitcher />

            <div className="h-4 w-px bg-border/60 shrink-0" />

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                title={isFullScreen ? "Thu nhỏ" : "Toàn màn hình"}
              >
                {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                type="button"
                onClick={handleExit}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                title="Đóng"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Main 2-Column Content Body */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Column: Workspace & Channels & Footer */}
          <div className="flex-[1.1] flex flex-col min-h-0">

          {/* Unified Header matching ComposerHeader layout & single border-b */}
          <div className="shrink-0 px-8 py-3 border-b border-border flex flex-col gap-3 bg-card z-10">

          {/* Per-channel avatars matching ComposerHeader account selection row */}
          <div className="flex items-center gap-3 flex-wrap py-2.5">
            {channelTabs.map((channel) => {
              const isActive = activeChannel?.accountId === channel.accountId;
              const accountId = isMultiAccountPlatform(channel.platform) ? channel.accountId : null;
              const entry = networkCustom[channel.platform];
              const slot = accountId ? entry?.perAccount?.[accountId] : entry;
              const isCustomized = slot?.useTemplate === false;
              const hasError = hasErrorForPlatform(channel.platform);
              const account = channel.account;
              const accountName = account?.displayName || account?.username || account?.accountName || "";

              return (
                <div key={channel.accountId} className="relative shrink-0 group/avatar">
                  <button
                    type="button"
                    onClick={() => handleSelectChannel(channel)}
                    title={accountName}
                    className={`relative rounded-xl transition-all cursor-pointer block ${
                      isActive
                        ? "ring-2 ring-composer-accent ring-offset-2 ring-offset-card shadow-md scale-105"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <ChannelAvatar
                      account={account}
                      platform={channel.platform}
                      size={48}
                      badgeSize={18}
                    />
                    {hasError && (
                      <span
                        className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black shadow-sm z-20 border border-card"
                        title={t("planner:postCreator.networkCustomize.hasErrors")}
                      >
                        !
                      </span>
                    )}
                    {!hasError && isCustomized && (
                      <span
                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 shadow-sm z-20 border border-card"
                        title="Customized"
                      />
                    )}
                  </button>

                  {channelTabs.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAccount(channel.accountId);
                      }}
                      title={t("planner:postCreator.channelPicker.removeChannel")}
                      className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-slate-800 text-white flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all cursor-pointer shadow-sm z-20"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Add/remove channels button - matching ComposerHeader size */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowChannelPicker((v) => !v)}
                title={t("planner:postCreator.channelPicker.addRemove")}
                className="w-12 h-12 rounded-xl bg-muted border border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-gray-400 hover:text-foreground transition-all cursor-pointer shrink-0"
              >
                <Plus size={18} />
              </button>
              {showChannelPicker && (
                <ChannelPickerDropdown
                  accounts={(activeBrand?.socialAccounts || []).filter(sa => sa.platform !== PLATFORMS.GOOGLE_DRIVE)}
                  selectedAccountIds={selectedAccountIds}
                  onToggleAccount={toggleAccount}
                  onClose={() => setShowChannelPicker(false)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Main workspace matching ComposerBody px-8 py-6 space-y-6 */}
        <div className="flex-1 min-w-0 overflow-y-auto scrollbar-thin px-8 py-6 space-y-6">
            {platformErrors.length > 0 && (
              <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  {platformErrors.map((err, idx) => (
                    <p key={idx} className="text-sm text-amber-800 font-medium font-sans">{err.message}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* Threads chain — numbered pills joined by a connector line,
                  each pill a separate post in the thread. Unlike other
                  platforms, Threads' chain isn't gated behind
                  useTemplate === false: threadPosts[] is the only shape its
                  content ever has (there's no flat "shared caption" mode to
                  fall back to), so the chain always shows once a Threads
                  channel is active. */}
              {isThreadsChannel && (threadsEntry?.threadPosts?.length || 0) > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground font-sans">
                    {t("planner:postCreator.networkCustomize.threadChain", "Thread")}
                  </label>
                  <div className="flex items-center gap-0 overflow-x-auto scrollbar-thin pb-1">
                    {(threadsEntry?.threadPosts || []).map((_, index) => {
                      const isActive = activeThreadIndex === index;
                      const isLast = index === (threadsEntry?.threadPosts?.length || 0) - 1;
                      return (
                        <div key={index} className="flex items-center shrink-0">
                          <button
                            type="button"
                            onClick={() => setThreadActiveIndex(index)}
                            title={t("planner:postCreator.networkCustomize.threadPost", "Post {{n}}", { n: index + 1 })}
                            className={`group relative flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full text-[11px] font-bold font-sans transition-all cursor-pointer border ${
                              isActive
                                ? "bg-composer-accent text-composer-accent-foreground border-composer-accent shadow-sm"
                                : "bg-muted text-muted-foreground border-transparent hover:bg-muted/70 hover:text-foreground"
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                isActive ? "bg-card/25" : "bg-card border border-border"
                              }`}
                            >
                              {index + 1}
                            </span>
                            <span>{t("planner:postCreator.networkCustomize.threadPost", "Post {{n}}", { n: index + 1 })}</span>
                            {(threadsEntry?.threadPosts?.length || 0) > 1 && (
                              <span
                                role="button"
                                title={t("planner:postCreator.networkCustomize.threadRemove", "Remove this post")}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeThreadPost(index);
                                }}
                                className={`ml-0.5 w-4 h-4 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                  isActive
                                    ? "hover:bg-card/30 text-composer-accent-foreground/70 hover:text-composer-accent-foreground"
                                    : "hover:bg-muted-foreground/20 text-muted-foreground/70 hover:text-foreground"
                                }`}
                              >
                                <X size={10} strokeWidth={3} />
                              </span>
                            )}
                          </button>
                          {!isLast && (
                            <span className="w-3 h-px bg-border shrink-0" aria-hidden="true" />
                          )}
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={addThreadPost}
                      title={t("planner:postCreator.networkCustomize.threadAdd", "Add a post to the thread")}
                      className="ml-1 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground bg-muted hover:bg-muted/70 hover:text-foreground border border-dashed border-border transition-all cursor-pointer shrink-0"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* Caption Textarea Box */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-muted-foreground font-sans">
                    {isThreadsChannel && threadsEntry?.useTemplate === false
                      ? t("planner:postCreator.networkCustomize.threadPost", "Post {{n}}", { n: activeThreadIndex + 1 })
                      : t("planner:postCreator.networkCustomize.caption")}
                  </label>
                  {activeConfig?.supportedTypes?.length > 1 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowTypeDropdown((v) => !v)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border hover:bg-muted rounded-xl transition-all text-[10px] font-black text-muted-foreground uppercase tracking-wider cursor-pointer font-sans shadow-sm"
                      >
                        {getTypeIcon(activeType)}
                        {activeConfig.supportedTypes.find((o) => o.id === activeType)?.label || activeType}
                        <ChevronDown size={12} className="text-muted-foreground" />
                      </button>
                      {showTypeDropdown && (
                        <div className="absolute top-full right-0 mt-1 w-56 bg-card rounded-2xl shadow-2xl border border-border py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                          {activeConfig.supportedTypes.map((typeOption) => (
                            <button
                              key={typeOption.id}
                              type="button"
                              onClick={() => {
                                setActiveType(typeOption.id);
                                setShowTypeDropdown(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-muted transition-all text-left cursor-pointer ${
                                activeType === typeOption.id ? 'bg-muted/80' : ''
                              }`}
                            >
                              <div className="p-1 bg-muted rounded text-muted-foreground">
                                {getTypeIcon(typeOption.id)}
                              </div>
                              <span className="text-xs font-bold text-foreground capitalize font-sans flex-1">{typeOption.label}</span>
                              {activeType === typeOption.id && <Check size={14} className="text-foreground" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="border border-border/40 rounded-2xl focus-within:ring-2 focus-within:ring-composer-accent/40 transition-all bg-card/60 relative shadow-sm">
                  <textarea
                    value={captionValue}
                    onChange={(e) => handleCaptionChange(e.target.value)}
                    placeholder={t("planner:postCreator.networkCustomize.captionPlaceholder")}
                    rows={6}
                    className="w-full p-4 text-sm text-foreground placeholder-muted-foreground outline-none resize-none transition-all font-sans bg-transparent"
                  />

                  {/* Media thumbnails — same MediaThumbnailGrid ComposerBody
                      uses, wired to the same ImageEditorModal/VideoEditorModal/
                      AltTextModal state from context (those modals already
                      read from activeNetworkMedia when this screen is open —
                      see PostCreator.jsx's isNetworkCustomizeOpen gate). No
                      spoiler/thumbnail-upload here, matching this screen's
                      existing scope. */}
                  <MediaThumbnailGrid
                    items={mediaItems}
                    thumbnailSize="w-16 h-16 rounded-xl"
                    onEditImage={(idx) => {
                      setEditingPostMediaIndex(idx);
                      setShowImageEditor(true);
                    }}
                    onEditVideo={(idx) => {
                      setEditingPostMediaIndex(idx);
                      setShowVideoEditor(true);
                    }}
                    onAltText={(idx) => {
                      setEditingPostMediaIndex(idx);
                      setShowAltTextModal(true);
                    }}
                    onRemove={handleRemoveMediaItem}
                  />

                  {/* Compact toolbar — same 4 buttons ComposerBody uses */}
                  <CaptionToolbar
                    activePopover={activePopover}
                    setActivePopover={setActivePopover}
                    iconSize={16}
                    className="px-4 py-2.5 border-t border-border bg-muted/30 rounded-b-2xl"
                    onSelectMediaImage={() => { setUploadModalTab("computer"); setMediaTypeFilter?.(MEDIA_FILTER_TYPES.IMAGE); setShowUploadModal(true); }}
                    onSelectMediaVideo={() => { setUploadModalTab("computer"); setMediaTypeFilter?.(MEDIA_FILTER_TYPES.VIDEO); setShowUploadModal(true); }}
                    onSelectMediaLibrary={() => { setUploadModalTab("library"); setMediaTypeFilter?.(MEDIA_FILTER_TYPES.ALL); setShowUploadModal(true); }}
                    onSelectEmoji={(emoji) => handleCaptionChange(captionValue + emoji)}
                    onInsertHashtag={(text) => handleCaptionChange(`${captionValue}${text}`)}
                    onAddUtmUrl={(utmUrl) => handleCaptionChange(`${captionValue}${utmUrl}`)}
                    rightSlot={
                      <span className="text-[11px] font-semibold text-muted-foreground font-sans">
                        {captionValue.length}
                      </span>
                    }
                  />
                </div>
              </div>

              {/* Platform Presets Section placed below caption, spanning full width */}
              {PresetComponent && shouldRenderPreset && (
                <div className="w-full">
                  <PresetComponent />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Preview / AI / Notes / Templates (Matching
            PostCreator 0.9 ratio) — collapses entirely when rightPanelTab is
            null (re-clicking the active tab in RightPanelTabSwitcher toggles
            it off), same as PostCreator.jsx's right column. */}
        {rightPanelTab && (
          <div className="flex-[0.9] flex flex-col min-h-0 overflow-hidden bg-muted/20 border-l border-border/40">
            {rightPanelTab === "notes" ? (
              <NotesPanel />
            ) : rightPanelTab === "templates" ? (
              <TemplatesSidebar />
            ) : rightPanelTab === "ai" ? (
              <AICopilotPopover
                variant="panel"
                caption={captionValue}
                onUpdateCaption={handleCaptionChange}
                activePlatform={activePlatform}
                onClose={() => setRightPanelTab("preview")}
              />
            ) : (
              <>
                <PreviewHeader />
                <PreviewBody platformFilter={activePlatform ? [activePlatform] : []} />
              </>
            )}
          </div>
        )}
      </div>

      {/* Full-width Footer across entire bottom */}
      <ComposerFooter isNetworkCustomize={true} onCloseNetworkCustomize={onClose} />
    </div>
  </div>

    <ConfirmExitModal
      isOpen={showConfirmExit}
      onCancel={() => setShowConfirmExit(false)}
      onConfirm={() => {
        setShowConfirmExit(false);
        closePostCreator();
      }}
    />
    </>
  );
}
