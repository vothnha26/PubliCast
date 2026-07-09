import React, { useState } from "react";
import { 
  Info, AlertCircle, Youtube, MoreHorizontal, Edit, Type, Trash2, 
  ImageIcon, Plus, Smile, Link2, Search, Languages, FileText, Send, 
  Linkedin, Settings, ChevronDown, Instagram, MessageSquare, X,
  Folder, MapPin, Sparkles
} from "lucide-react";
import { usePostCreatorFormContext } from "../../../context/PostCreatorFormContext";
import { PlatformIcon } from "../../shared/PlatformIcon";
import { MediaDropdown } from "./MediaDropdown";
import { EmojiPickerPopover } from "./EmojiPickerPopover";
import { UTMGeneratorPopover } from "./UTMGeneratorPopover";
import { HashtagPickerPopover } from "./HashtagPickerPopover";
import { FacebookAlbumComposer } from "./FacebookAlbumComposer";
import { toast } from "sonner";
import { PRODUCT_IDS } from "../../../constants/products";
import { AICopilotPopover } from "./AICopilotPopover";

// Presets Imports
import { GlobalPresets } from "./presets/GlobalPresets";
import { YouTubePresets } from "./presets/YouTubePresets";
import { FacebookPresets } from "./presets/FacebookPresets";
import { TikTokPresets } from "./presets/TikTokPresets";
import { DiscordPresets } from "./presets/DiscordPresets";
import { ThreadsPresets } from "./presets/ThreadsPresets";

export function ComposerBody() {
  const [showAICopilot, setShowAICopilot] = useState(false);
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
    activeBrand,
    albumMedia,
    setAlbumMedia,
    setEditingAlbumPhoto,
    setShowImageEditor,
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
    platformLimits
  } = usePostCreatorFormContext();

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
      case 'linkedin':
        return <Linkedin size={14} className="text-[#0077B5] fill-[#0077B5] shrink-0" />;
      case 'telegram':
        return <Send size={12} className="text-[#0088cc] fill-[#0088cc] shrink-0 rotate-45" />;
      case 'discord':
        return <MessageSquare size={14} className="text-[#5865F2] shrink-0" />;
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
            <span className="font-sans">Chế độ Xem: Bạn không có quyền chỉnh sửa hoặc xuất bản bài viết này.</span>
          </div>
        )}

        {/* Text Area Card */}
        <div className="border border-gray-200 rounded-[24px] overflow-hidden focus-within:border-black transition-all shadow-sm bg-white relative">
          <input type="file" ref={fileInputRef} accept="video/*,image/*" onChange={handleVideoChange} className="hidden" data-testid="post-file-input" />
          
          {/* Title Input */}
          {(editingPost || activePlatform === 'youtube') && (
            <div className="px-6 pt-5 pb-0 border-b border-gray-100">
              <input
                type="text"
                data-testid="post-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title (optional)"
                className="w-full text-base font-bold text-gray-900 outline-none bg-transparent placeholder-gray-300 font-sans"
              />
            </div>
          )}

          <textarea 
            ref={textareaRef} 
            value={caption}
            onChange={(e) => setCaption(e.target.value)} 
            data-testid="post-caption-input"
            className="w-full p-6 text-sm font-medium leading-relaxed outline-none min-h-[350px] resize-none font-sans"
            placeholder="What's on your mind?"
          />

          {(!postMedia || postMedia.length === 0) && (videoFile || uploadedVideoPath) && !isImageFile && (
            <div className="px-6 py-3 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                <Youtube className="text-red-500 fill-red-500 font-sans" size={16} />
                <span className="truncate max-w-[300px] font-sans">{videoFile ? videoFile.name : uploadedVideoPath.split('/').pop()}</span>
                {videoFile && <span className="text-[10px] text-gray-400 font-semibold uppercase font-sans">({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)</span>}
                {isUploadingVideo && <span className="text-[10px] text-blue-500 animate-pulse font-bold uppercase font-sans">(Uploading...)</span>}
              </div>
              <button onClick={handleRemoveVideo} className="text-[10px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors cursor-pointer font-sans">Remove</button>
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
              {postMedia && postMedia.length > 0 ? (
                <div className="px-6 pb-4 bg-white flex flex-wrap gap-4 animate-in fade-in duration-300">
                  {postMedia.map((item, index) => {
                    const isItemVid = item.path && (
                      item.path.endsWith(".mp4") || 
                      item.path.endsWith(".mov") || 
                      item.path.endsWith(".avi") || 
                      item.path.includes("/video/upload/")
                    );
                    return (
                      <div key={index} className="relative group">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border border-gray-100 shadow-md bg-gray-50 flex items-center justify-center relative">
                          {isItemVid ? (
                            <video src={item.previewUrl} className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <img src={item.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  type="button"
                                  title="Chỉnh sửa hình ảnh"
                                  onClick={() => {
                                    setEditingPostMediaIndex(index);
                                    setShowImageEditor(true);
                                  }}
                                  className="w-7 h-7 rounded-full bg-white/90 hover:bg-white text-gray-800 flex items-center justify-center cursor-pointer shadow-md active:scale-90 transition-all"
                                >
                                  <Edit size={12} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
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
                          }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center cursor-pointer shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {/* Thumbnail Image display */}
              {(!postMedia || postMedia.length === 0) && isImageFile && videoFileUrl && (
                <div className="px-6 pb-4 bg-white flex flex-wrap gap-3 animate-in fade-in duration-300">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border border-gray-100 shadow-md">
                      <img src={videoFileUrl} alt="Preview" data-testid="post-image-preview" style={getImageStyle(imageTransform)} className={`w-full h-full object-cover ${getImageFilterClass(imageTransform?.filter)}`} />
                    </div>
                    
                    <button 
                      type="button"
                      onClick={() => setShowImageMenu(!showImageMenu)}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center cursor-pointer transition-all shadow-md z-10"
                    >
                      <MoreHorizontal size={12} />
                    </button>

                    {showImageMenu && (
                      <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 text-left text-xs text-gray-700 animate-in fade-in slide-in-from-bottom-1">
                        <button 
                          type="button" 
                          onClick={() => { setShowImageMenu(false); setShowImageEditor(true); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 transition-all cursor-pointer font-bold text-gray-700 whitespace-nowrap font-sans"
                        >
                          <Edit size={14} className="text-gray-500" />
                          Edit image
                        </button>
                        <button 
                          type="button" 
                          onClick={() => { setShowImageMenu(false); toast.info("Edit with Adobe Express clicked"); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 transition-all cursor-pointer font-bold text-gray-700 whitespace-nowrap font-sans"
                        >
                          <span className="w-4 h-4 rounded-md bg-gradient-to-tr from-[#FF0000] via-[#FF0080] to-[#7F00FF] flex items-center justify-center text-[9px] font-black text-white shrink-0 select-none">A</span>
                          Edit with Adobe Express
                        </button>
                        <button 
                          type="button" 
                          onClick={() => { setShowImageMenu(false); setShowAltTextModal(true); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 transition-all cursor-pointer font-bold text-gray-700 whitespace-nowrap font-sans"
                        >
                          <Type size={14} className="text-gray-500" />
                          Add alt text
                        </button>
                        <div className="h-px bg-gray-100 my-1" />
                        <button 
                          type="button" 
                          onClick={() => {
                            handleRemoveVideo();
                            setShowImageMenu(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-red-50 text-red-600 transition-all cursor-pointer font-bold whitespace-nowrap font-sans"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Toolbar & Character Limit */}
          <div className="px-6 py-4 flex items-center justify-between bg-white border-t border-gray-150">
            <div className="flex items-center gap-4">
              {/* Media Button */}
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setActivePopover(activePopover === 'media' ? null : 'media')}
                  className={`text-gray-400 hover:text-black transition-colors relative p-1.5 rounded-lg cursor-pointer ${activePopover === 'media' ? 'bg-gray-100 text-black' : ''}`}
                >
                  <ImageIcon size={18} />
                  <Plus size={8} className="absolute -top-0.5 -right-0.5 bg-white rounded-full border border-gray-200" strokeWidth={4} />
                </button>
                {activePopover === 'media' && (
                  <MediaDropdown 
                    onClose={() => setActivePopover(null)} 
                    onSelectImage={() => { setUploadModalTab("computer"); setShowUploadModal(true); }} 
                    onSelectVideo={() => { setUploadModalTab("computer"); setShowUploadModal(true); }} 
                    onSelectLibrary={() => { setUploadModalTab("library"); setShowUploadModal(true); }}
                    onSelectDrive={() => {
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
                  className={`text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg cursor-pointer ${activePopover === 'emoji' ? 'bg-gray-100 text-black' : ''}`}
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
                className={`text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg cursor-pointer ${youtubeFirstComment || globalFirstComment ? 'text-black bg-purple-50' : ''}`}
                title="First Comment"
              >
                <MessageSquare size={18} />
              </button>

              {/* Location Button (Placeholder) */}
              <button 
                type="button"
                onClick={() => toast.info("Tính năng vị trí sẽ sớm khả dụng")}
                className="text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg cursor-pointer"
                title="Add Location"
              >
                <MapPin size={18} />
              </button>

              {/* Campaign URL Link Button */}
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setActivePopover(activePopover === 'utm' ? null : 'utm')}
                  className={`text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg cursor-pointer ${activePopover === 'utm' ? 'bg-gray-100 text-black' : ''}`}
                  title="UTM Link"
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
                  className={`text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg cursor-pointer ${activePopover === 'hashtag' ? 'bg-gray-100 text-black' : ''}`}
                  title="Insert Hashtags"
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
                  toast.success(isLibrary ? "Đã tắt chế độ mẫu" : "Đã bật chế độ lưu làm mẫu");
                }}
                className={`text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg cursor-pointer ${isLibrary ? 'text-purple-600 bg-purple-50' : ''}`}
                title="Save as template (Library)"
              >
                <Folder size={18} />
              </button>

              {/* AI Copilot Sparkles Button */}
              <button 
                type="button"
                onClick={() => setShowAICopilot(!showAICopilot)}
                className={`text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg cursor-pointer ${showAICopilot ? 'text-purple-600 bg-purple-50' : ''}`}
                title="AI Copilot Assistant"
              >
                <Sparkles size={18} className={showAICopilot ? "animate-pulse" : ""} />
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="group relative cursor-help">
                <span className="text-[11px] font-bold text-gray-400 group-hover:text-gray-600 transition-colors tracking-wide font-sans">
                  {caption.length} / {(() => {
                    if (!platformLimits || platformLimits.length === 0) {
                      const fallbacks = {
                        facebook: 63206,
                        instagram: 2200,
                        tiktok: 2200,
                        youtube: 5000,
                        linkedin: 3000,
                        telegram: 4096,
                        discord: 2000,
                        threads: 500
                      };
                      return fallbacks[activePlatform.toLowerCase()] || 5000;
                    }
                    const limitObj = platformLimits.find(l => l.platform.toLowerCase() === activePlatform.toLowerCase());
                    return limitObj ? limitObj.maxCharacters : 5000;
                  })()}
                </span>
                <div className="absolute bottom-full right-0 mb-3 w-56 p-3 bg-white rounded-xl shadow-xl border border-gray-100 hidden group-hover:block animate-in fade-in slide-in-from-bottom-1 z-50">
                  <p className="text-[10px] text-gray-500 leading-normal font-sans">Giới hạn độ dài bài viết của nền tảng {activePlatform}.</p>
                </div>
              </div>
              <div className="w-px h-3.5 bg-gray-200" />
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm text-white ${
                activePlatform === 'youtube' ? 'bg-[#FF0000]' : 
                activePlatform === 'tiktok' ? 'bg-black' : 
                activePlatform === 'instagram' ? 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]' : 
                activePlatform === 'linkedin' ? 'bg-[#0077B5]' : 
                activePlatform === 'telegram' ? 'bg-[#0088cc]' : 
                activePlatform === 'discord' ? 'bg-[#5865F2]' : 
                activePlatform === 'threads' ? 'bg-black' : 'bg-[#1877F2]'
              }`}>
                {activePlatform === 'youtube' ? (
                  <Youtube size={12} className="text-white fill-white" />
                ) : activePlatform === 'tiktok' ? (
                  <svg className="w-3 h-3 text-white fill-white" viewBox="0 0 24 24">
                    <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.5-1.1-1.02-1.7-2.48-1.9-3.96-.03 2.49 0 4.99 0 7.48-.02 1.9-.38 3.82-1.39 5.43-1.46 2.42-4.13 3.84-6.93 3.55-3.05-.2-5.78-2.44-6.39-5.46-.73-3.27.97-6.9 4.13-7.91 1.09-.34 2.24-.39 3.37-.2v4.02c-1.22-.32-2.58-.09-3.55.74-.95.83-1.29 2.19-1.03 3.4.31 1.65 1.84 2.91 3.53 2.78 1.94-.04 3.42-1.8 3.25-3.73-.02-2.91 0-5.83 0-8.74.02-3.11-.02-6.22.02-9.33z"/>
                  </svg>
                ) : activePlatform === 'instagram' ? (
                  <Instagram size={12} className="text-white" />
                ) : activePlatform === 'linkedin' ? (
                  <Linkedin size={12} className="text-white" />
                ) : activePlatform === 'telegram' ? (
                  <Send size={11} className="text-white fill-white translate-x-[-0.5px]" />
                ) : activePlatform === 'discord' ? (
                  <MessageSquare size={11} className="text-white fill-white translate-y-[0.5px]" />
                ) : activePlatform === 'threads' ? (
                  <PlatformIcon platform="Threads" size={12} variant="flat" className="text-white" />
                ) : (
                  <svg className="w-3.5 h-3.5 text-white fill-white" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                )}
              </div>
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

          {/* YouTube Presets Accordion */}
          {selectedPlatforms.includes('youtube') && <YouTubePresets />}

          {/* Facebook Presets Accordion (Reels only) */}
          {selectedPlatforms.includes('facebook') && facebookType === 'reel' && <FacebookPresets />}

          {/* TikTok Presets Accordion */}
          {selectedPlatforms.includes('tiktok') && <TikTokPresets />}

          {/* Discord Presets Accordion */}
          {selectedPlatforms.includes('discord') && <DiscordPresets />}

          {/* Threads Presets Accordion */}
          {selectedPlatforms.includes('threads') && <ThreadsPresets />}
        </div>

        {/* Approval Workflow Settings */}
        {!isLibrary && selectedPublishId !== 'now' && (!hasApprovePermission || selectedPublishId === 'review') && selectedPublishId !== 'draft' && (
          <div className="border border-amber-200 rounded-3xl overflow-hidden bg-amber-50/20 shadow-sm transition-all duration-300 p-6 space-y-4 text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-[12px] font-black text-amber-800 uppercase tracking-wider font-sans">Yêu cầu phê duyệt bài viết</h4>
                  <p className="text-[10px] text-amber-600 font-bold mt-1 leading-relaxed uppercase tracking-wider font-sans">
                    {!hasApprovePermission 
                      ? "Bạn không có quyền đăng bài trực tiếp. Vui lòng cấu hình người duyệt bài."
                      : "Bạn đã chọn gửi bài viết này để phê duyệt."}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    {selectedReviewerIds.length === 0 ? (
                      <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 font-sans">Chưa chọn người duyệt</span>
                    ) : (
                      <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider bg-amber-100/50 px-2.5 py-1 rounded-lg border border-amber-200 max-w-xs truncate font-sans">
                        Đã chọn: {selectedReviewerIds.map(id => potentialReviewers.find(r => r.id === id)?.name).filter(Boolean).join(", ")}
                      </span>
                    )}
                    <span className="text-[10px] bg-amber-900 text-amber-50 px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider font-sans">
                      {approvalPolicy === 'AT_LEAST_ONE' 
                        ? 'Ít nhất 1 người duyệt' 
                        : approvalPolicy === 'ALL' 
                          ? 'Tất cả phải duyệt' 
                          : 'Không yêu cầu phê duyệt'}
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setShowReviewersModal(true)}
                className="px-4 py-2.5 bg-[#0A0A0A] hover:bg-black text-white hover:shadow-md text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer shrink-0 font-sans"
              >
                Chọn người duyệt
              </button>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-amber-200/40">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest font-sans">Ghi chú cho người duyệt</label>
              <input
                type="text"
                placeholder="Nhập lời nhắn gửi đến người duyệt..."
                value={requesterNote}
                onChange={(e) => setRequesterNote(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-[11px] font-bold text-gray-700 outline-none focus:border-black transition-all font-sans"
              />
            </div>
          </div>
        )}

        {/* Validation Errors Banner */}
        {getValidationErrors().length > 0 && (
          <div className="border border-red-100 rounded-3xl overflow-hidden bg-red-50/50 shadow-sm transition-all duration-300">
            <div className="p-5 flex items-center justify-between text-red-700">
              <div className="flex items-center gap-3">
                <AlertCircle size={18} className="text-red-500 shrink-0" />
                <span className="text-[12px] font-bold font-sans">{getValidationErrors().length} errors</span>
              </div>
            </div>
            <div className="border-t border-red-100/50 px-6 py-4 space-y-2 text-left">
              {getValidationErrors().map((err, idx) => {
                const parsed = parseValidationError(err);
                return (
                  <div key={idx} className="flex items-center gap-2.5 text-xs font-medium text-gray-700 font-sans">
                    {renderErrorIcon(parsed.platform)}
                    <span>{parsed.message}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
