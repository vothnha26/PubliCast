import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Info, AlertCircle, Youtube, MoreHorizontal, Edit, Type, Trash2,
  ImageIcon, Plus, Smile, Link2, Search, Languages, FileText, Send,
  Settings, ChevronDown, Instagram, MessageSquare, X, EyeOff,
  Folder, MapPin, Sparkles, Lock
} from "lucide-react";
import { usePostCreatorFormContext } from "../../../context/PostCreatorFormContext";
import { PlatformIcon } from "../../shared/PlatformIcon";
import { MediaDropdown } from "./MediaDropdown";
import { EmojiPickerPopover } from "./popovers/EmojiPickerPopover";
import { UTMGeneratorPopover } from "./popovers/UTMGeneratorPopover";
import { HashtagPickerPopover } from "./popovers/HashtagPickerPopover";
import { FacebookAlbumComposer } from "./FacebookAlbumComposer";
import StockMediaPicker from "../../shared/StockMediaPicker";
import { toast } from "sonner";
import { PRODUCT_IDS } from "../../../constants/products";
import { AICopilotPopover } from "./popovers/AICopilotPopover";
import { isVideoPath } from "../../../utils/url";
import { NetworkTabSwitcher } from "./NetworkTabSwitcher";
import { NETWORK_TAB_TEMPLATE } from "../../../constants/postComposerNetwork";
import { PLATFORMS } from "../../../constants/platforms";
import { FACEBOOK_TYPE, YOUTUBE_TYPE, INSTAGRAM_TYPE, POST_TYPE } from "../../../constants/postTypes";

// Presets Imports
import { GlobalPresets } from "./presets/GlobalPresets";
import { PRESET_REGISTRY } from "../../../constants/presetRegistry";

import { MEDIA_FILTER_TYPES } from "../../../constants/mediaAcceptStrategy";

export function ComposerBody() {
  const { t } = useTranslation(["planner", "common"]);
  const navigate = useNavigate();
  const [showAICopilot, setShowAICopilot] = useState(false);
  const [showStockPicker, setShowStockPicker] = useState(false);
  const [activeMediaMenuIndex, setActiveMediaMenuIndex] = useState(null);
  const [spoilersMap, setSpoilersMap] = useState({});
  const thumbnailInputRef = React.useRef(null);

  const handleToggleSpoiler = (key) => {
    setSpoilersMap((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleThumbnailUpload = () => {
    setIsUploadingThumbnail(true);
    setMediaTypeFilter?.(MEDIA_FILTER_TYPES.IMAGE);
    setUploadModalTab("computer");
    setShowUploadModal(true);
  };

  const {
    hasCreatePermission,
    hasApprovePermission,
    fileInputRef,
    handleVideoChange,
    editingPost,
    activePlatform,
    title,
    setTitle,
    textareaRef,
    caption,
    setCaption,
    postMedia,
    setPostMedia,
    videoFile,
    setVideoFile,
    videoFileUrl,
    setVideoFileUrl,
    uploadedVideoPath,
    setUploadedVideoPath,
    isUploadingVideo,
    handleRemoveVideo,
    facebookType,
    instagramType,
    youtubeType,
    activeBrand,
    albumMedia,
    setAlbumMedia,
    setEditingAlbumPhoto,
    setShowImageEditor,
    setShowVideoEditor,
    setEditingPostMediaIndex,
    imageTransform,
    showImageMenu,
    setShowImageMenu,
    setShowAltTextModal,
    activePopover,
    setActivePopover,
    setShowFirstCommentModal,
    insertAtCursor,
    youtubeFirstComment,
    globalFirstComment,
    isLibrary,
    setIsLibrary,
    selectedPlatforms,
    selectedPublishId,
    selectedReviewerIds,
    potentialReviewers,
    approvalPolicy,
    setShowReviewersModal,
    requesterNote,
    setRequesterNote,
    getValidationErrors,
    hasAccess,
    setBlockedProductId,
    setIsDriveModalOpen,
    platformLimits,
    setShowUploadModal,
    setUploadModalTab,
    setMediaTypeFilter,
    setIsUploadingThumbnail,
    mediaThumbnailUrl,
    getBackupPayload,
    backupFormState,
    closePostCreatorTemporarily,
    isEditByNetwork,
    activeNetworkTab,
    networkCustom,
    toggleUseTemplate,
    updateNetworkCaption,
    updateNetworkMedia,
    updateThreadPostText,
    updateThreadPostMedia,
  } = usePostCreatorFormContext();

  // === Network Tab derived vars ===
  const isThreadsTab = isEditByNetwork && activeNetworkTab === 'threads';
  const isThreadsCustom = isThreadsTab && networkCustom['threads']?.useTemplate === false;
  const isCustomTab =
    isEditByNetwork &&
    activeNetworkTab !== NETWORK_TAB_TEMPLATE &&
    activeNetworkTab !== 'threads' &&
    networkCustom[activeNetworkTab]?.useTemplate === false;

  const activeThreadPost = isThreadsTab
    ? networkCustom['threads']?.threadPosts?.[networkCustom['threads']?.activeThreadIndex || 0]
    : null;

  const activeCaptionValue = isCustomTab
    ? (networkCustom[activeNetworkTab]?.caption || '')
    : isThreadsTab
      ? (typeof activeThreadPost === 'string' ? activeThreadPost : activeThreadPost?.text || '')
      : caption;

  const handleCaptionChange = (val) => {
    if (isCustomTab) {
      updateNetworkCaption(activeNetworkTab, val);
    } else if (isThreadsTab) {
      const threadIndex = networkCustom['threads']?.activeThreadIndex || 0;
      updateThreadPostText(threadIndex, val);
    } else {
      setCaption(val);
    }
  };

  const effectivePostMedia = isCustomTab
    ? (networkCustom[activeNetworkTab]?.mediaUrls || [])
    : isThreadsCustom
      ? (typeof activeThreadPost === 'object' ? activeThreadPost?.mediaUrls || [] : [])
      : postMedia;

  const handleRemoveMediaItem = (index) => {
    if (isCustomTab) {
      const current = networkCustom[activeNetworkTab]?.mediaUrls || [];
      const updated = current.filter((_, i) => i !== index);
      updateNetworkMedia(activeNetworkTab, updated);
    } else if (isThreadsCustom) {
      const threadIdx = networkCustom['threads']?.activeThreadIndex || 0;
      const current = (typeof activeThreadPost === 'object' ? activeThreadPost?.mediaUrls : []) || [];
      const updated = current.filter((_, i) => i !== index);
      updateThreadPostMedia(threadIdx, updated);
    } else {
      setPostMedia(prev => {
        const next = prev.filter((_, i) => i !== index);
        if (next.length > 0) {
          setVideoFile(next[0].file);
          setVideoFileUrl(next[0].previewUrl);
          setUploadedVideoPath(next[0].path);
        } else {
          setVideoFile(null);
          setVideoFileUrl("");
          setUploadedVideoPath("");
        }
        return next;
      });
    }
  };

  const isLockedPlatformTab =
    isEditByNetwork &&
    activeNetworkTab !== NETWORK_TAB_TEMPLATE &&
    networkCustom[activeNetworkTab]?.useTemplate !== false;

  const isImageFile = videoFile 
    ? videoFile.type.startsWith("image/") 
    : (uploadedVideoPath && !uploadedVideoPath.endsWith(".mp4") && !uploadedVideoPath.endsWith(".mov") && !uploadedVideoPath.endsWith(".avi"));

  const getImageStyle = (transform) => {
    if (!transform) return {};
    const { rotation = 0, flipH = false, flipV = false } = transform;
    return {
      transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
      transition: 'transform 0.3s ease'
    };
  };

  const getImageFilterClass = (filterId) => {
    switch (filterId) {
      case 'grayscale': return 'grayscale';
      case 'sepia': return 'sepia';
      case 'invert': return 'invert';
      case 'blur': return 'blur-[2px]';
      case 'warm': return 'sepia-[0.3] saturate-[1.3] hue-rotate-[-10deg]';
      case 'cool': return 'saturate-[0.9] hue-rotate-[10deg] brightness-[1.05]';
      case 'dramatic': return 'contrast-[1.2] brightness-[0.9]';
      default: return '';
    }
  };

  const parseValidationError = (err) => {
    const match = err.match(/^\[([A-Z_]+)(?:\s*-\s*[A-Z_]+)?\]\s*(.*)$/);
    if (match) {
      return {
        platform: match[1].toLowerCase(),
        message: match[2]
      };
    }
    return {
      platform: null,
      message: err
    };
  };

  const renderErrorIcon = (platform) => {
    switch (platform) {
      case 'facebook':
        return (
          <svg className="w-3.5 h-3.5 text-[#1877F2] fill-[#1877F2] shrink-0" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        );
      case 'instagram':
        return <Instagram size={14} className="text-[#DD2A7B] shrink-0" />;
      case 'tiktok':
        return (
          <svg className="w-3.5 h-3.5 text-black fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.5-1.1-1.02-1.7-2.48-1.9-3.96-.03 2.49 0 4.99 0 7.48-.02 1.9-.38 3.82-1.39 5.43-1.46 2.42-4.13 3.84-6.93 3.55-3.05-.2-5.78-2.44-6.39-5.46-.73-3.27.97-6.9 4.13-7.91 1.09-.34 2.24-.39 3.37-.2v4.02c-1.22-.32-2.58-.09-3.55.74-.95.83-1.29 2.19-1.03 3.4.31 1.65 1.84 2.91 3.53 2.78 1.94-.04 3.42-1.8 3.25-3.73-.02-2.91 0-5.83 0-8.74.02-3.11-.02-6.22.02-9.33z"/>
          </svg>
        );
      case 'youtube':
        return <Youtube size={14} className="text-[#FF0000] fill-[#FF0000] shrink-0" />;
      case 'telegram':
        return <Send size={12} className="text-[#0088cc] fill-[#0088cc] shrink-0 rotate-45" />;
      default:
        return <AlertCircle size={14} className="text-red-500 shrink-0" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 scrollbar-thin">
      <div className="w-full space-y-6">
        {!hasCreatePermission && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Info size={16} className="text-amber-500" />
            <span className="font-sans">{t("planner:postCreator.composer.viewMode")}</span>
          </div>
        )}

        {/* Text Area Card */}
        <div className="border border-border rounded-[24px] overflow-hidden focus-within:border-black transition-all shadow-sm bg-card relative">
          <input type="file" ref={fileInputRef} accept="video/*,image/*" onChange={handleVideoChange} className="hidden" data-testid="post-file-input" />
          


          {/* Network Tab Switcher */}
          {isEditByNetwork && <NetworkTabSwitcher />}

          {/* Locked state: tab platform chưa customize */}
          {isLockedPlatformTab ? (
            <div className="mx-5 my-4 border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center gap-3 bg-muted/50 animate-in fade-in">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Lock size={16} className="text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-wider font-sans">
                  Đang dùng nội dung chung
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-sans">
                  Bấm bên dưới để chỉnh nội dung riêng cho nền tảng này
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleUseTemplate(activeNetworkTab, false)}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer font-sans shadow-sm"
              >
                Chỉnh sửa nội dung riêng
              </button>
            </div>
          ) : (
            <>
              <textarea
                ref={textareaRef}
                value={activeCaptionValue}
                onChange={(e) => handleCaptionChange(e.target.value)}
                data-testid="post-caption-input"
                className="w-full p-6 text-sm font-medium leading-relaxed outline-none min-h-[350px] resize-none font-sans"
                placeholder={
                  isThreadsTab
                    ? `Nội dung Post ${(networkCustom['threads']?.activeThreadIndex || 0) + 1} trong chuỗi Threads...`
                    : isCustomTab
                      ? `Nội dung riêng cho ${activeNetworkTab}...`
                      : t("planner:postCreator.composer.placeholders.caption")
                }
              />
              {(isCustomTab || isThreadsCustom) && (
                <p className="px-6 pb-1 text-[10px] text-purple-600 font-bold font-sans">
                  Nội dung & media riêng cho {(isThreadsCustom ? 'threads' : activeNetworkTab).toUpperCase()}
                </p>
              )}
            </>
          )}

          {!isCustomTab && (!effectivePostMedia || effectivePostMedia.length === 0) && (videoFile || uploadedVideoPath) && !isImageFile && (
            <div className="px-6 py-3 border-t border-gray-50 bg-muted/50 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Youtube className="text-red-500 fill-red-500 font-sans" size={16} />
                <span className="truncate max-w-[300px] font-sans">{videoFile ? videoFile.name : uploadedVideoPath.split('/').pop()}</span>
                {videoFile && <span className="text-[10px] text-muted-foreground font-semibold uppercase font-sans">({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)</span>}
                {isUploadingVideo && <span className="text-[10px] text-blue-500 animate-pulse font-bold uppercase font-sans">{t("planner:postCreator.composer.uploading")}</span>}
              </div>
              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    setShowVideoEditor(true);
                  }}
                  className="text-[10px] font-black text-purple-600 hover:text-purple-800 uppercase tracking-widest transition-all cursor-pointer font-sans"
                >
                  {t("planner:postCreator.composer.editVideo")}
                </button>
                <button onClick={handleRemoveVideo} className="text-[10px] font-black text-muted-foreground hover:text-red-500 uppercase tracking-widest transition-colors cursor-pointer font-sans">{t("planner:postCreator.composer.remove")}</button>
              </div>
            </div>
          )}

          {/* Facebook Album Composer Section */}
          {activePlatform === 'facebook' && facebookType === 'album' ? (
            <div className="px-6 pb-6 border-t border-gray-50 pt-6">
              <FacebookAlbumComposer
                brandId={activeBrand?.id}
                albumMedia={albumMedia}
                setAlbumMedia={setAlbumMedia}
                onEditPhoto={(photo) => {
                  setEditingAlbumPhoto(photo);
                  setShowImageEditor(true);
                }}
              />
            </div>
          ) : (
            <>

              {/* Multiple thumbnails for standard posts */}
              {effectivePostMedia && effectivePostMedia.length > 0 ? (
                <div className="px-6 pb-4 bg-card flex flex-wrap gap-4 animate-in fade-in duration-300">
                  {effectivePostMedia.map((item, index) => {
                    const isItemVid = isVideoPath(item.previewUrl || item.path, item.file);
                    const isSpoilerActive = !!spoilersMap[index];
                    return (
                      <div key={index} className="relative group">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border border-border shadow-md bg-muted flex items-center justify-center relative">
                          {isItemVid ? (
                            <>
                          <video 
                            src={item.previewUrl || item.path} 
                            poster={mediaThumbnailUrl || undefined}
                            className="w-full h-full object-cover" 
                          />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <div className="w-6 h-6 rounded-full bg-card/80 flex items-center justify-center">
                                  <div className="w-0 h-0 border-y-4 border-y-transparent border-l-6 border-l-black ml-0.5" />
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <img
                                src={item.previewUrl || item.path}
                                alt="Preview"
                                className={`w-full h-full object-cover transition-all ${isSpoilerActive ? 'blur-sm scale-105' : ''}`}
                              />
                              {isSpoilerActive && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <EyeOff size={16} className="text-white" />
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Nút 3 chấm tròn góc trên bên phải */}
                        <button
                          type="button"
                          onClick={() => setActiveMediaMenuIndex(activeMediaMenuIndex === index ? null : index)}
                          className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center cursor-pointer transition-all shadow-md z-20"
                        >
                          <MoreHorizontal size={12} />
                        </button>

                        {/* Popover Menu tùy chỉnh */}
                        {activeMediaMenuIndex === index && (
                          <div className="absolute bottom-full left-0 mb-2 min-w-[220px] w-max bg-card rounded-2xl shadow-2xl border border-border py-2 z-50 text-left text-xs font-sans text-foreground animate-in fade-in slide-in-from-bottom-1">
                            {isItemVid ? (
                              /* Video Menu: Edit video, Add alt text, Upload video thumbnail, Remove */
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMediaMenuIndex(null);
                                    setEditingPostMediaIndex(index);
                                    setShowVideoEditor(true);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-muted transition-all cursor-pointer font-bold text-foreground whitespace-nowrap font-sans"
                                >
                                  <Edit size={14} className="text-muted-foreground" />
                                  {t("planner:postCreator.composer.editVideo")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMediaMenuIndex(null);
                                    setEditingPostMediaIndex(index);
                                    setShowAltTextModal(true);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-muted transition-all cursor-pointer font-bold text-foreground whitespace-nowrap font-sans"
                                >
                                  <Type size={14} className="text-muted-foreground" />
                                  {t("planner:postCreator.composer.imageMenu.altText")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMediaMenuIndex(null);
                                    handleThumbnailUpload();
                                  }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-muted transition-all cursor-pointer font-bold text-foreground whitespace-nowrap font-sans"
                                >
                                  <ImageIcon size={14} className="text-muted-foreground" />
                                  Upload video thumbnail
                                </button>
                                <div className="h-px bg-muted my-1" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMediaMenuIndex(null);
                                    handleRemoveMediaItem(index);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-red-50 text-red-600 transition-all cursor-pointer font-bold whitespace-nowrap font-sans"
                                >
                                  <Trash2 size={14} />
                                  {t("planner:postCreator.composer.imageMenu.remove")}
                                </button>
                              </>
                            ) : (
                              /* Image Menu: Edit image, Spoiler (switch), Add alt text, Remove */
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMediaMenuIndex(null);
                                    setEditingPostMediaIndex(index);
                                    setShowImageEditor(true);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-muted transition-all cursor-pointer font-bold text-foreground whitespace-nowrap font-sans"
                                >
                                  <Edit size={14} className="text-muted-foreground" />
                                  {t("planner:postCreator.composer.imageMenu.edit")}
                                </button>
                                <div 
                                  onClick={() => handleToggleSpoiler(index)}
                                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted transition-all cursor-pointer font-bold text-foreground whitespace-nowrap font-sans"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <EyeOff size={14} className="text-muted-foreground" />
                                    <span>Spoiler</span>
                                  </div>
                                  <div className={`w-8 h-4.5 rounded-full transition-colors relative ml-4 ${isSpoilerActive ? 'bg-gray-900' : 'bg-gray-200'}`}>
                                    <div className={`w-3.5 h-3.5 rounded-full bg-card absolute top-0.5 transition-transform ${isSpoilerActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMediaMenuIndex(null);
                                    setEditingPostMediaIndex(index);
                                    setShowAltTextModal(true);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-muted transition-all cursor-pointer font-bold text-foreground whitespace-nowrap font-sans"
                                >
                                  <Type size={14} className="text-muted-foreground" />
                                  {t("planner:postCreator.composer.imageMenu.altText")}
                                </button>
                                <div className="h-px bg-muted my-1" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMediaMenuIndex(null);
                                    handleRemoveMediaItem(index);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-red-50 text-red-600 transition-all cursor-pointer font-bold whitespace-nowrap font-sans"
                                >
                                  <Trash2 size={14} />
                                  {t("planner:postCreator.composer.imageMenu.remove")}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {/* Single Thumbnail Image / Video display */}
              {(!effectivePostMedia || effectivePostMedia.length === 0) && videoFileUrl && (
                <div className="px-6 pb-4 bg-card flex flex-wrap gap-3 animate-in fade-in duration-300">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border border-border shadow-md relative">
                      {isImageFile ? (
                        <>
                          <img
                            src={videoFileUrl}
                            alt="Preview"
                            data-testid="post-image-preview"
                            style={getImageStyle(imageTransform)}
                            className={`w-full h-full object-cover ${spoilersMap['single'] ? 'blur-sm scale-105' : ''} ${getImageFilterClass(imageTransform?.filter)}`}
                          />
                          {spoilersMap['single'] && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <EyeOff size={16} className="text-white" />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full bg-gray-900 flex items-center justify-center relative">
                          <video 
                            src={videoFileUrl} 
                            poster={mediaThumbnailUrl || undefined}
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-card/80 flex items-center justify-center">
                              <div className="w-0 h-0 border-y-4 border-y-transparent border-l-6 border-l-black ml-0.5" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      type="button"
                      onClick={() => setShowImageMenu(!showImageMenu)}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center cursor-pointer transition-all shadow-md z-10"
                    >
                      <MoreHorizontal size={12} />
                    </button>

                    {showImageMenu && (
                      <div className="absolute bottom-full left-0 mb-2 min-w-[220px] w-max bg-card rounded-2xl shadow-2xl border border-border py-2 z-50 text-left text-xs font-sans text-foreground animate-in fade-in slide-in-from-bottom-1">
                        {isImageFile ? (
                          <>
                            <button 
                              type="button" 
                              onClick={() => { setShowImageMenu(false); setShowImageEditor(true); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-muted transition-all cursor-pointer font-bold text-foreground whitespace-nowrap font-sans"
                            >
                              <Edit size={14} className="text-muted-foreground" />
                              {t("planner:postCreator.composer.imageMenu.edit")}
                            </button>
                            <div 
                              onClick={() => handleToggleSpoiler('single')}
                              className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted transition-all cursor-pointer font-bold text-foreground whitespace-nowrap font-sans"
                            >
                              <div className="flex items-center gap-2.5">
                                <EyeOff size={14} className="text-muted-foreground" />
                                <span>Spoiler</span>
                              </div>
                              <div className={`w-8 h-4.5 rounded-full transition-colors relative ml-4 ${spoilersMap['single'] ? 'bg-gray-900' : 'bg-gray-200'}`}>
                                <div className={`w-3.5 h-3.5 rounded-full bg-card absolute top-0.5 transition-transform ${spoilersMap['single'] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => { setShowImageMenu(false); setShowAltTextModal(true); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-muted transition-all cursor-pointer font-bold text-foreground whitespace-nowrap font-sans"
                            >
                              <Type size={14} className="text-muted-foreground" />
                              {t("planner:postCreator.composer.imageMenu.altText")}
                            </button>
                            <div className="h-px bg-muted my-1" />
                            <button 
                              type="button" 
                              onClick={() => {
                                handleRemoveVideo();
                                setShowImageMenu(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-red-50 text-red-600 transition-all cursor-pointer font-bold whitespace-nowrap font-sans"
                            >
                              <Trash2 size={14} />
                              {t("planner:postCreator.composer.imageMenu.remove")}
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              type="button" 
                              onClick={() => { setShowImageMenu(false); setShowVideoEditor(true); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-muted transition-all cursor-pointer font-bold text-foreground whitespace-nowrap font-sans"
                            >
                              <Edit size={14} className="text-muted-foreground" />
                              {t("planner:postCreator.composer.editVideo")}
                            </button>
                            <button 
                              type="button" 
                              onClick={() => { setShowImageMenu(false); setShowAltTextModal(true); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-muted transition-all cursor-pointer font-bold text-foreground whitespace-nowrap font-sans"
                            >
                              <Type size={14} className="text-muted-foreground" />
                              {t("planner:postCreator.composer.imageMenu.altText")}
                            </button>
                            <button 
                              type="button" 
                              onClick={() => { setShowImageMenu(false); handleThumbnailUpload(); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-muted transition-all cursor-pointer font-bold text-foreground whitespace-nowrap font-sans"
                            >
                              <ImageIcon size={14} className="text-muted-foreground" />
                              Upload video thumbnail
                            </button>
                            <div className="h-px bg-muted my-1" />
                            <button 
                              type="button" 
                              onClick={() => {
                                handleRemoveVideo();
                                setShowImageMenu(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-red-50 text-red-600 transition-all cursor-pointer font-bold whitespace-nowrap font-sans"
                            >
                              <Trash2 size={14} />
                              {t("planner:postCreator.composer.imageMenu.remove")}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Toolbar & Character Limit */}
          <div className="px-6 py-4 flex items-center justify-between bg-card border-t border-gray-150">
            <div className="flex items-center gap-4">
              {/* Media Button */}
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setActivePopover(activePopover === 'media' ? null : 'media')}
                  className={`text-muted-foreground hover:text-black transition-colors relative p-1.5 rounded-lg cursor-pointer ${activePopover === 'media' ? 'bg-muted text-black' : ''}`}
                >
                  <ImageIcon size={18} />
                  <Plus size={8} className="absolute -top-0.5 -right-0.5 bg-card rounded-full border border-border" strokeWidth={4} />
                </button>
                {activePopover === 'media' && (
                  <MediaDropdown 
                    onClose={() => setActivePopover(null)} 
                    onSelectImage={() => { setUploadModalTab("computer"); setMediaTypeFilter?.(MEDIA_FILTER_TYPES.IMAGE); setShowUploadModal(true); setActivePopover(null); }} 
                    onSelectVideo={() => { setUploadModalTab("computer"); setMediaTypeFilter?.(MEDIA_FILTER_TYPES.VIDEO); setShowUploadModal(true); setActivePopover(null); }} 
                    onSelectLibrary={() => { setUploadModalTab("library"); setMediaTypeFilter?.(MEDIA_FILTER_TYPES.ALL); setShowUploadModal(true); setActivePopover(null); }}
                    onSelectStock={() => { setShowStockPicker(true); setActivePopover(null); }}
                    onSelectDrive={() => {
                      setActivePopover(null);
                      if (!hasAccess(PRODUCT_IDS.GOOGLE_DRIVE)) {
                        setBlockedProductId(PRODUCT_IDS.GOOGLE_DRIVE);
                      } else {
                        setIsDriveModalOpen(true);
                      }
                    }}
                  />
                )}
              </div>

              {/* Emoji Button */}
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setActivePopover(activePopover === 'emoji' ? null : 'emoji')}
                  className={`text-muted-foreground hover:text-black transition-colors p-1.5 rounded-lg cursor-pointer ${activePopover === 'emoji' ? 'bg-muted text-black' : ''}`}
                >
                  <Smile size={18} />
                </button>
                {activePopover === 'emoji' && (
                  <EmojiPickerPopover 
                    onSelectEmoji={(emoji) => {
                      insertAtCursor(emoji);
                      setActivePopover(null);
                    }}
                    onClose={() => setActivePopover(null)}
                  />
                )}
              </div>

              {/* Message Button (First Comment Modal) */}
              <button 
                type="button"
                onClick={() => setShowFirstCommentModal(true)}
                className={`text-muted-foreground hover:text-black transition-colors p-1.5 rounded-lg cursor-pointer ${youtubeFirstComment || globalFirstComment ? 'text-black bg-purple-50' : ''}`}
                title={t("planner:postCreator.composer.toolbar.firstComment")}
              >
                <MessageSquare size={18} />
              </button>

              {/* Location Button (Placeholder) */}
              <button 
                type="button"
                onClick={() => toast.info(t("planner:postCreator.composer.toolbar.locationComingSoon"))}
                className="text-muted-foreground hover:text-black transition-colors p-1.5 rounded-lg cursor-pointer"
                title={t("planner:postCreator.composer.toolbar.addLocation")}
              >
                <MapPin size={18} />
              </button>

              {/* Campaign URL Link Button */}
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setActivePopover(activePopover === 'utm' ? null : 'utm')}
                  className={`text-muted-foreground hover:text-black transition-colors p-1.5 rounded-lg cursor-pointer ${activePopover === 'utm' ? 'bg-muted text-black' : ''}`}
                  title={t("planner:postCreator.composer.toolbar.utmLink")}
                >
                  <Link2 size={18} />
                </button>
                {activePopover === 'utm' && (
                  <UTMGeneratorPopover 
                    onAddUrl={(utmUrl) => {
                      insertAtCursor(utmUrl);
                      setActivePopover(null);
                    }}
                    onClose={() => setActivePopover(null)}
                  />
                )}
              </div>

              {/* Hashtag Button */}
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setActivePopover(activePopover === 'hashtag' ? null : 'hashtag')}
                  className={`text-muted-foreground hover:text-black transition-colors p-1.5 rounded-lg cursor-pointer ${activePopover === 'hashtag' ? 'bg-muted text-black' : ''}`}
                  title={t("planner:postCreator.composer.toolbar.hashtags")}
                >
                  <Search size={18} />
                </button>
                {activePopover === 'hashtag' && (
                  <HashtagPickerPopover
                    onInsert={(text) => insertAtCursor(text)}
                    onClose={() => setActivePopover(null)}
                  />
                )}
              </div>

              {/* Folder (Library Template Toggle) */}
              <button 
                type="button"
                onClick={() => {
                  setIsLibrary(!isLibrary);
                  toast.success(isLibrary ? t("planner:postCreator.composer.toolbar.templateDisabled") : t("planner:postCreator.composer.toolbar.templateEnabled"));
                }}
                className={`text-muted-foreground hover:text-black transition-colors p-1.5 rounded-lg cursor-pointer ${isLibrary ? 'text-purple-600 bg-purple-50' : ''}`}
                title={t("planner:postCreator.composer.toolbar.saveAsTemplate")}
              >
                <Folder size={18} />
              </button>

              {/* AI Copilot Sparkles Button */}
              <button 
                type="button"
                onClick={() => setShowAICopilot(!showAICopilot)}
                className={`text-muted-foreground hover:text-black transition-colors p-1.5 rounded-lg cursor-pointer ${showAICopilot ? 'text-purple-600 bg-purple-50' : ''}`}
                title={t("planner:postCreator.composer.toolbar.aiCopilot")}
              >
                <Sparkles size={18} className={showAICopilot ? "animate-pulse" : ""} />
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="group relative cursor-help">
                {(() => {
                  const effectivePlatform = (isEditByNetwork && activeNetworkTab && activeNetworkTab !== NETWORK_TAB_TEMPLATE)
                    ? activeNetworkTab
                    : activePlatform;
                  const fallbacks = {
                    facebook: 63206,
                    instagram: 2200,
                    tiktok: 2200,
                    youtube: 5000,
                    telegram: 1024,
                    threads: 500,
                    bluesky: 300,
                    twitch: 500,
                    reddit: 40000
                  };
                  let maxLimit = fallbacks[effectivePlatform.toLowerCase()] || 5000;
                  if (platformLimits && platformLimits.length > 0) {
                    const platLower = effectivePlatform.toLowerCase();
                    let subType = POST_TYPE.IMAGE;
                    if (platLower === PLATFORMS.FACEBOOK) subType = facebookType.toUpperCase();
                    else if (platLower === PLATFORMS.YOUTUBE) subType = youtubeType.toUpperCase();
                    else if (platLower === PLATFORMS.INSTAGRAM) subType = instagramType.toUpperCase();
                    else if (platLower === PLATFORMS.TIKTOK) subType = POST_TYPE.VIDEO;

                    const limitObj = platformLimits.find(
                      l => l.platform.toLowerCase() === platLower && l.subType === subType
                    ) || platformLimits.find(l => l.platform.toLowerCase() === platLower);

                    if (limitObj && (limitObj.maxCharacters || limitObj.maxCaptionLength)) {
                      maxLimit = limitObj.maxCharacters || limitObj.maxCaptionLength;
                    }
                  }
                  const currentTextLength = activeCaptionValue ? activeCaptionValue.length : 0;
                  const isExceeded = currentTextLength > maxLimit;
                  return (
                    <span className={`text-[11px] font-bold transition-colors tracking-wide font-sans ${isExceeded ? 'text-red-500 font-extrabold animate-pulse' : 'text-muted-foreground group-hover:text-muted-foreground'}`}>
                      {currentTextLength} / {maxLimit}
                    </span>
                  );
                })()}
                <div className="absolute bottom-full right-0 mb-3 w-56 p-3 bg-card rounded-xl shadow-xl border border-border hidden group-hover:block animate-in fade-in slide-in-from-bottom-1 z-50">
                  <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                    {t("planner:postCreator.composer.characterLimitDesc", {
                      platform: (isEditByNetwork && activeNetworkTab && activeNetworkTab !== NETWORK_TAB_TEMPLATE) ? activeNetworkTab : activePlatform
                    })}
                  </p>
                </div>
              </div>
              <div className="w-px h-3.5 bg-gray-200" />
              {(() => {
                const currentPlatform = (isEditByNetwork && activeNetworkTab && activeNetworkTab !== NETWORK_TAB_TEMPLATE)
                  ? activeNetworkTab
                  : activePlatform;
                return (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm text-white ${
                    currentPlatform === 'youtube' ? 'bg-[#FF0000]' : 
                    currentPlatform === 'tiktok' ? 'bg-black' : 
                    currentPlatform === 'instagram' ? 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]' :
                    currentPlatform === 'telegram' ? 'bg-[#0088cc]' :
                    currentPlatform === 'threads' ? 'bg-black' : 'bg-[#1877F2]'
                  }`}>
                    {currentPlatform === 'youtube' ? (
                      <Youtube size={12} className="text-white fill-white" />
                    ) : currentPlatform === 'tiktok' ? (
                      <svg className="w-3 h-3 text-white fill-white" viewBox="0 0 24 24">
                        <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.5-1.1-1.02-1.7-2.48-1.9-3.96-.03 2.49 0 4.99 0 7.48-.02 1.9-.38 3.82-1.39 5.43-1.46 2.42-4.13 3.84-6.93 3.55-3.05-.2-5.78-2.44-6.39-5.46-.73-3.27.97-6.9 4.13-7.91 1.09-.34 2.24-.39 3.37-.2v4.02c-1.22-.32-2.58-.09-3.55.74-.95.83-1.29 2.19-1.03 3.4.31 1.65 1.84 2.91 3.53 2.78 1.94-.04 3.42-1.8 3.25-3.73-.02-2.91 0-5.83 0-8.74.02-3.11-.02-6.22.02-9.33z"/>
                      </svg>
                    ) : currentPlatform === 'instagram' ? (
                      <Instagram size={12} className="text-white" />
                    ) : currentPlatform === 'telegram' ? (
                      <Send size={11} className="text-white fill-white translate-x-[-0.5px]" />
                    ) : currentPlatform === 'threads' ? (
                      <PlatformIcon platform="Threads" size={12} variant="flat" className="text-white" />
                    ) : (
                      <svg className="w-3.5 h-3.5 text-white fill-white" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* AI Copilot Popover */}
          {showAICopilot && (
            <AICopilotPopover
              caption={caption}
              onUpdateCaption={setCaption}
              activePlatform={activePlatform}
              onClose={() => setShowAICopilot(false)}
            />
          )}
        </div>

        {/* Presets Accordion */}
        <div className="space-y-3">
          {/* Global Presets Accordion */}
          <GlobalPresets />

          {/* Dynamic Platform Presets */}
          {Object.entries(PRESET_REGISTRY).map(([platformKey, registryItem]) => {
            if (registryItem.shouldRender(selectedPlatforms, { facebookType })) {
              const PresetComponent = registryItem.Component;
              return <PresetComponent key={platformKey} />;
            }
            return null;
          })}
        </div>

        {/* Approval Workflow Settings */}
        {!isLibrary && selectedPublishId !== 'now' && (!hasApprovePermission || selectedPublishId === 'review') && selectedPublishId !== 'draft' && (
          <div className="border border-amber-200 rounded-3xl overflow-hidden bg-amber-50/20 shadow-sm transition-all duration-300 p-6 space-y-4 text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-[12px] font-black text-amber-800 uppercase tracking-wider font-sans">{t("planner:postCreator.composer.approval.title")}</h4>
                  <p className="text-[10px] text-amber-600 font-bold mt-1 leading-relaxed uppercase tracking-wider font-sans">
                    {!hasApprovePermission 
                      ? t("planner:postCreator.composer.approval.noPermission")
                      : t("planner:postCreator.composer.approval.selectedReview")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    {selectedReviewerIds.length === 0 ? (
                      <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 font-sans">{t("planner:postCreator.composer.approval.noReviewer")}</span>
                    ) : (
                      <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider bg-amber-100/50 px-2.5 py-1 rounded-lg border border-amber-200 max-w-xs truncate font-sans">
                        {t("planner:postCreator.composer.approval.selectedReviewers", { names: selectedReviewerIds.map(id => potentialReviewers.find(r => r.id === id)?.name).filter(Boolean).join(", ") })}
                      </span>
                    )}
                    <span className="text-[10px] bg-amber-900 text-amber-50 px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider font-sans">
                      {approvalPolicy === 'AT_LEAST_ONE' 
                        ? t("planner:postCreator.composer.sections.policyAtLeastOne") 
                        : approvalPolicy === 'ALL' 
                          ? t("planner:postCreator.composer.sections.policyAll") 
                          : t("planner:postCreator.composer.sections.policyNone")}
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setShowReviewersModal(true)}
                className="px-4 py-2.5 bg-[#0A0A0A] hover:bg-black text-white hover:shadow-md text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer shrink-0 font-sans"
              >
                {t("planner:postCreator.composer.approval.buttonSelect")}
              </button>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-amber-200/40">
              <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest font-sans">{t("planner:postCreator.composer.approval.noteLabel")}</label>
              <input
                type="text"
                placeholder={t("planner:postCreator.composer.approval.notePlaceholder")}
                value={requesterNote}
                onChange={(e) => setRequesterNote(e.target.value)}
                className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-[11px] font-bold text-foreground outline-none focus:border-black transition-all font-sans"
              />
            </div>
          </div>
        )}



        {showStockPicker && (
          <StockMediaPicker
            brandId={activeBrand?.id || "default"}
            onSelectMedia={(importedMedia) => {
              if (importedMedia.storageUrl) {
                setPostMedia((prev) => [...(prev || []), importedMedia.storageUrl]);
              }
              setShowStockPicker(false);
            }}
            onClose={() => setShowStockPicker(false)}
          />
        )}

      </div>
    </div>
  );
}
