import * as React from "react";
import { useState } from "react";
import { 
  X, Smile, Link2, Plus, Image as ImageIcon, 
  FileText, Loader2, RotateCw, Copy, ChevronDown, 
  Calendar, Youtube, PlayCircle, Smartphone, Monitor, Info, MessageSquare,
  Languages, Settings, LayoutGrid, Film, PlusCircle, AlertCircle, Check,
  MoreHorizontal, Edit, Type, Trash2, Diamond, Search, Lock, Sparkles, ArrowRight,
  Linkedin, Send, Upload
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFeatureGate } from "../../hooks/useFeatureGate";
import { PRODUCT_IDS, FEATURE_GATE_REGISTRY } from "../../constants/products";
import postService from "../../services/post.service";
import { usePostCreatorForm } from "../../hooks/usePostCreatorForm";
import { useAuthStore } from "../../store/useAuthStore";
import { ShortsIcon } from "../../components/workspace/post-creator/ShortsIcon";
import { MediaDropdown } from "../../components/workspace/post-creator/MediaDropdown";
import { EmojiPickerPopover } from "../../components/workspace/post-creator/EmojiPickerPopover";
import { FirstCommentModal } from "../../components/workspace/post-creator/FirstCommentModal";
import { UTMGeneratorPopover } from "../../components/workspace/post-creator/UTMGeneratorPopover";
import { PreviewStrategies } from "../../components/workspace/post-creator/PreviewStrategies";
import { GoogleDrivePickerModal } from "../../components/workspace/post-creator/GoogleDrivePickerModal";
import { MediaUploadModal } from "../../components/workspace/post-creator/MediaUploadModal";
import { ImageEditorModal } from "../../components/workspace/post-creator/ImageEditorModal";
import { AltTextModal } from "../../components/workspace/post-creator/AltTextModal";
import { FacebookAlbumComposer } from "../../components/workspace/post-creator/FacebookAlbumComposer";
import { HashtagPickerPopover } from "../../components/workspace/post-creator/HashtagPickerPopover";
import { PLATFORM_CONFIGS } from "../../constants/platformRegistry";
import { Instagram } from "lucide-react";
import { toast } from "sonner";
import { useBrandPermission } from "../../hooks/useBrandPermission";
import { PlatformIcon } from "../../components/shared/PlatformIcon";
import { buildMediaUrl } from "../../utils/url";

const PUBLISH_OPTIONS = [
  { id: "draft", label: "SAVE AS DRAFT", sub: "Save and publish at a later time" },
  { id: "review", label: "SEND TO REVIEW", sub: "Select reviewers" },
  { id: "schedule", label: "SAVE AND SCHEDULE", sub: "Save changes to this post" },
  { id: "now", label: "PUBLISH NOW", sub: "Publish with current date and time" },
];

export function PostCreatorPage() {
  const {
    isOpen,
    closePostCreator,
    caption,
    setCaption,
    title,
    setTitle,
    selectedPlatforms,
    togglePlatform,
    activePlatform,
    setActivePlatform,
    platformLimits,
    previewDevice,
    setPreviewDevice,
    showPublishMenu,
    setShowPublishMenu,
    selectedPublishId,
    setSelectedPublishId,
    activeBrand,
    isCreating,
    scheduledDate,
    setScheduledDate,
    isLibrary,
    setIsLibrary,
    globalOpen,
    setGlobalOpen,
    youtubeOpen,
    setYoutubeOpen,
    youtubeType,
    setYoutubeType,
    showTypeMenu,
    setShowTypeMenu,
    youtubeTitle,
    setYoutubeTitle,
    youtubeMadeForKids,
    setYoutubeMadeForKids,
    youtubePrivacy,
    setYoutubePrivacy,
    youtubeCategory,
    setYoutubeCategory,
    youtubePlaylistId,
    setYoutubePlaylistId,
    youtubeTags,
    setYoutubeTags,
    youtubeFirstComment,
    setYoutubeFirstComment,
    globalFirstComment,
    setGlobalFirstComment,
    youtubeThumbnail,
    setYoutubeThumbnail,
    playlists,
    isLoadingPlaylists,
    videoFile,
    setVideoFile,
    videoFileUrl,
    setVideoFileUrl,
    uploadedVideoPath,
    setUploadedVideoPath,
    isUploadingVideo,
    activePopover,
    setActivePopover,
    showFirstCommentModal,
    setShowFirstCommentModal,
    isDriveModalOpen,
    setIsDriveModalOpen,
    handleSelectDriveFile,
    textareaRef,
    fileInputRef,
    insertAtCursor,
    handleVideoChange,
    handleRemoveVideo,
    fetchPlaylists,
    editingPost,
    handleCreatePost,
    // Facebook
    facebookOpen,
    setFacebookOpen,
    facebookType,
    setFacebookType,
    showFacebookTypeMenu,
    setShowFacebookTypeMenu,
    facebookTitle,
    setFacebookTitle,
    // Instagram
    instagramOpen,
    setInstagramOpen,
    instagramType,
    setInstagramType,
    showInstagramTypeMenu,
    setShowInstagramTypeMenu,
    getValidationErrors,
    altText,
    setAltText,
    // TikTok
    tiktokOpen,
    setTiktokOpen,
    tiktokPrivacy,
    setTiktokPrivacy,
    tiktokAllowComments,
    setTiktokAllowComments,
    tiktokAllowDuet,
    setTiktokAllowDuet,
    tiktokAllowStitch,
    setTiktokAllowStitch,
    tiktokAiGenerated,
    setTiktokAiGenerated,
    tiktokCommercialContent,
    setTiktokCommercialContent,
    loadTemplate,
    // Approval Workflow
    potentialReviewers,
    selectedReviewerId,
    setSelectedReviewerId,
    selectedReviewerIds,
    setSelectedReviewerIds,
    approvalPolicy,
    setApprovalPolicy,
    requesterNote,
    setRequesterNote,
    isLoadingReviewers,
    selectedDiscordChannels,
    setSelectedDiscordChannels,
    discordOpen,
    setDiscordOpen,
    albumMedia,
    setAlbumMedia,
    postMedia,
    setPostMedia,
    threadsWhoCanReply,
    setThreadsWhoCanReply,
    notes,
    setNotes
  } = usePostCreatorForm();

  const [threadsOpen, setThreadsOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const { user } = useAuthStore();
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");

  const handleAddNoteClick = () => {
    if (!newNoteText.trim()) return;
    const newNote = {
      author: user?.fullName || user?.email || 'Thành viên',
      timestamp: new Date().toISOString(),
      text: newNoteText.trim()
    };
    setNotes(prev => [...prev, newNote]);
    setNewNoteText("");
    toast.success("Đã thêm ghi chú");
  };

  const handleDeleteNoteClick = (idx) => {
    setNotes(prev => prev.filter((_, i) => i !== idx));
    toast.success("Đã xóa ghi chú");
  };

  const discordAccounts = activeBrand?.socialAccounts?.filter(sa => sa.platform === 'DISCORD' && sa.isConnected) || [];

  const isPlatformConnected = (platformId) => {
    if (!activeBrand || !activeBrand.socialAccounts) return false;
    const mapping = {
      facebook: "FACEBOOK",
      instagram: "INSTAGRAM",
      youtube: "YOUTUBE",
      tiktok: "TIKTOK",
      linkedin: "LINKEDIN",
      telegram: "TELEGRAM",
      discord: "DISCORD",
      threads: "THREADS"
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

  const activeConfig = PLATFORM_CONFIGS[activePlatform];
  const activeType = activePlatform === 'facebook' ? facebookType : activePlatform === 'instagram' ? instagramType : activePlatform === 'youtube' ? youtubeType : 'video';
  const setType = activePlatform === 'facebook' ? setFacebookType : activePlatform === 'instagram' ? setInstagramType : activePlatform === 'youtube' ? setYoutubeType : () => {};
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const handlePlatformClick = (platformName, hasAccess, productId) => {
    const lockInfo = getPlatformLockInfo(platformName);
    if (lockInfo.isFullyLocked) {
      toast.error(`Nền tảng ${platformName.toUpperCase()} hiện đang bị khóa: ${lockInfo.reason}`);
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
          className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all text-[10px] font-bold text-gray-700 uppercase cursor-pointer"
        >
          {activeType}
          <ChevronDown size={12} className="text-gray-500" />
        </button>

        {showTypeDropdown && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
            {activeConfig.supportedTypes.map((typeOption) => {
              let icon = <LayoutGrid size={16} className="text-gray-600" />;
              let subtitle = "Standard publication";
              
              if (typeOption.id === 'reel') {
                icon = <Film size={16} className="text-gray-600" />;
                subtitle = "Automatic posting";
              } else if (typeOption.id === 'story') {
                icon = <PlusCircle size={16} className="text-gray-600" />;
                subtitle = "Automatic posting";
              } else if (typeOption.id === 'short') {
                icon = <ShortsIcon size={14} className="text-[#FF0000]" />;
                subtitle = "Short-form vertical video";
              } else if (typeOption.id === 'video') {
                icon = <Youtube size={14} className="text-[#FF0000] fill-[#FF0000]" />;
                subtitle = "Standard video";
              } else if (typeOption.id === 'post') {
                if (activePlatform === 'instagram') {
                  subtitle = "Standard post on your feed";
                } else {
                  subtitle = "Standard publication";
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
                      <div className="text-xs font-bold text-gray-800 capitalize">{typeOption.label}</div>
                      <div className="text-[10px] text-gray-400 font-medium">{subtitle}</div>
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

  const navigate = useNavigate();
  const { hasAccess } = useFeatureGate();
  const [blockedProductId, setBlockedProductId] = useState(null);
  const { hasPermission } = useBrandPermission();
  const hasCreatePermission = hasPermission('CREATE_POSTS');

  const hasFacebookAccess = true;
  const hasTiktokAccess = true;
  const hasYoutubeAccess = true;
  const hasInstagramAccess = true;
  const hasLinkedinAccess = true;

  const hasApprovePermission = 
    activeBrand?.isOwner || 
    activeBrand?.userRole === 'OWNER' ||
    activeBrand?.userRole === 'ADMIN' || 
    activeBrand?.userPermissions?.find(p => p.key === 'APPROVE_POSTS')?.isAllowed;

  const [showReviewersModal, setShowReviewersModal] = useState(false);
  const [reviewerSearchQuery, setReviewerSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadModalTab, setUploadModalTab] = useState("computer");
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editingAlbumPhoto, setEditingAlbumPhoto] = useState(null); // Lưu { id, previewUrl, path, caption } đang chỉnh sửa
  const [editingPostMediaIndex, setEditingPostMediaIndex] = useState(null); // Lưu index của ảnh trong postMedia đang chỉnh sửa
  const [imageTransform, setImageTransform] = useState({ rotation: 0, flipH: false, flipV: false, filter: 'none' });
  const [showAltTextModal, setShowAltTextModal] = useState(false);
  
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const handleOpenTemplatePicker = async () => {
    if (!activeBrand) return;
    setShowTemplatePicker(true);
    setLoadingTemplates(true);
    try {
      const res = await postService.getPosts(activeBrand.id, { isLibrary: true });
      setTemplates(res.data || []);
    } catch (e) {
      console.error("Failed to load templates:", e);
      toast.error("Failed to load templates");
    } finally {
      setLoadingTemplates(false);
    }
  };

  if (!isOpen) return null;

  const getPublishButtonLabelText = () => {
    // Chế độ edit: luôn hiển thị "UPDATE" để phân biệt rõ với create
    if (editingPost) return 'UPDATE';
    if (selectedPublishId === 'draft') return 'SAVE';
    if (selectedPublishId === 'review') return 'SEND';
    if (!hasApprovePermission) return 'SUBMIT';
    return selectedPublishId === 'now' ? 'PUBLISH' : 'SCHEDULE';
  };

  // Lọc PUBLISH_OPTIONS phù hợp khi ở chế độ edit
  const getEditPublishOptions = () => {
    if (!editingPost) return PUBLISH_OPTIONS;
    const postStatus = editingPost.status?.toLowerCase();
    // Bài đã published: chỉ cho edit nội dung, không đổi chế độ
    if (postStatus === 'published') return [];
    // Bài scheduled: kiểm tra xem thời hạn đã tới chưa
    if (postStatus === 'scheduled' && editingPost.scheduledAt) {
      const scheduledTime = new Date(editingPost.scheduledAt);
      const isPastDeadline = scheduledTime <= new Date();
      if (isPastDeadline) {
        // Thời hạn đã qua: chỉ cho lưu draft
        return PUBLISH_OPTIONS.filter(o => o.id === 'draft');
      }
    }
    // draft/review/schedule chưa tới hạn: cho phép đổi mode (trừ publish now nếu không có quyền)
    return PUBLISH_OPTIONS.filter(o => o.id !== 'now' || hasApprovePermission);
  };

  const editablePublishOptions = getEditPublishOptions();

  const currentOption = PUBLISH_OPTIONS.find(o => o.id === selectedPublishId);
  const PreviewComponent = PreviewStrategies[activePlatform];
  
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

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col bg-[#F8F8F7] animate-in slide-in-from-bottom duration-500">
      {/* Header */}
      <div className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-[#0A0A0A]">
            {isLibrary 
              ? (editingPost ? "Edit post template" : "Create post template") 
              : (editingPost ? "Edit scheduled post" : "Create new post")}
          </h1>
          {!editingPost && !isLibrary && (
             <button 
               onClick={handleOpenTemplatePicker}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all transform hover:scale-105 shadow-sm border border-purple-200 cursor-pointer"
             >
                <Diamond size={12} />
                Load template
             </button>
          )}
        </div>
        <button onClick={closePostCreator} className="flex items-center gap-2 text-gray-400 hover:text-black transition-colors group cursor-pointer">
           <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
           <span className="text-[11px] font-bold uppercase tracking-widest">Close</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Composer */}
        <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-white border-r border-gray-100 scrollbar-thin">
           <div className="max-w-[700px] mx-auto w-full space-y-6">
              {!hasCreatePermission && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-xs font-bold flex items-center gap-2">
                  <Info size={16} className="text-amber-500" />
                  <span>Chế độ Xem: Bạn không có quyền chỉnh sửa hoặc xuất bản bài viết này.</span>
                </div>
              )}
              {/* Platform Header */}
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <button className="text-gray-300 hover:text-[#010101] transition-colors cursor-pointer"><PlayCircle size={24} /></button>
                     
                       {/* Platform Icons Toolbar */}
                       <div className="flex items-center gap-3">
                         {/* Facebook Item */}
                         {shouldShowPlatform("facebook") && (
                           <div className="flex items-center gap-1.5 relative">
                              <button 
                                type="button"
                                title={getPlatformLockInfo("facebook").isFullyLocked ? `Facebook hiện đang bị khóa: ${getPlatformLockInfo("facebook").reason}` : "Facebook"}
                                data-testid="platform-select-facebook" onClick={() => handlePlatformClick("facebook", hasFacebookAccess, PRODUCT_IDS.FACEBOOK_MANAGEMENT)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                                  getPlatformLockInfo("facebook").isFullyLocked
                                    ? 'bg-red-50 text-red-400 border border-red-200 opacity-60 cursor-not-allowed'
                                    : selectedPlatforms.includes('facebook')
                                      ? activePlatform === 'facebook'
                                        ? 'bg-[#1877F2] text-white ring-2 ring-offset-2 ring-[#1877F2]'
                                        : 'bg-[#1877F2]/70 text-white hover:bg-[#1877F2]/80 border border-[#1877F2]'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                              >
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                                {selectedPlatforms.includes('facebook') && !getPlatformLockInfo("facebook").isFullyLocked && (
                                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white" />
                                )}
                                {!hasFacebookAccess && !getPlatformLockInfo("facebook").isFullyLocked && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-white border border-purple-100 text-purple-600 rounded-full p-0.5 shadow-sm">
                                    <Lock size={7} strokeWidth={3} />
                                  </span>
                                )}
                                {getPlatformLockInfo("facebook").isFullyLocked && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                                    <Lock size={7} strokeWidth={3} />
                                  </span>
                                )}
                              </button>
                             
                             {selectedPlatforms.includes('facebook') && activePlatform === 'facebook' && renderTypeDropdown()}
                           </div>
                         )}

                         {/* Instagram Item */}
                         {shouldShowPlatform("instagram") && (
                           <div className="flex items-center gap-1.5 relative">
                              <button 
                                type="button"
                                title={getPlatformLockInfo("instagram").isFullyLocked ? `Instagram hiện đang bị khóa: ${getPlatformLockInfo("instagram").reason}` : "Instagram"}
                                data-testid="platform-select-instagram" onClick={() => handlePlatformClick("instagram", hasInstagramAccess, PRODUCT_IDS.INSTAGRAM_MANAGEMENT || 'instagram_management')}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                                  getPlatformLockInfo("instagram").isFullyLocked
                                    ? 'bg-red-50 text-red-400 border border-red-200 opacity-60 cursor-not-allowed'
                                    : selectedPlatforms.includes('instagram')
                                      ? activePlatform === 'instagram'
                                        ? 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white ring-2 ring-offset-2 ring-[#DD2A7B]'
                                        : 'bg-gradient-to-tr from-[#F58529]/70 via-[#DD2A7B]/70 to-[#8134AF]/70 text-white hover:opacity-90 border border-[#DD2A7B]'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                              >
                                <Instagram size={14} />
                                {selectedPlatforms.includes('instagram') && !getPlatformLockInfo("instagram").isFullyLocked && (
                                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white" />
                                )}
                                {!hasInstagramAccess && !getPlatformLockInfo("instagram").isFullyLocked && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-white border border-purple-100 text-purple-600 rounded-full p-0.5 shadow-sm">
                                    <Lock size={7} strokeWidth={3} />
                                  </span>
                                )}
                                {getPlatformLockInfo("instagram").isFullyLocked && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                                    <Lock size={7} strokeWidth={3} />
                                  </span>
                                )}
                              </button>
                             
                             {selectedPlatforms.includes('instagram') && activePlatform === 'instagram' && renderTypeDropdown()}
                           </div>
                         )}

                         {/* Tiktok Item */}
                         {shouldShowPlatform("tiktok") && (
                           <div className="relative">
                              <button 
                                type="button" 
                                title={getPlatformLockInfo("tiktok").isFullyLocked ? `TikTok hiện đang bị khóa: ${getPlatformLockInfo("tiktok").reason}` : "TikTok"}
                                data-testid="platform-select-tiktok" onClick={() => handlePlatformClick("tiktok", hasTiktokAccess, PRODUCT_IDS.TIKTOK_CREATIVE)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                                  getPlatformLockInfo("tiktok").isFullyLocked
                                    ? 'bg-red-50 text-red-400 border border-red-200 opacity-60 cursor-not-allowed'
                                    : selectedPlatforms.includes('tiktok')
                                      ? activePlatform === 'tiktok'
                                        ? 'bg-black text-white ring-2 ring-offset-2 ring-black'
                                        : 'bg-black/70 text-white hover:bg-black/80 border border-black'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                              >
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                  <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.5-1.1-1.02-1.7-2.48-1.9-3.96-.03 2.49 0 4.99 0 7.48-.02 1.9-.38 3.82-1.39 5.43-1.46 2.42-4.13 3.84-6.93 3.55-3.05-.2-5.78-2.44-6.39-5.46-.73-3.27.97-6.9 4.13-7.91 1.09-.34 2.24-.39 3.37-.2v4.02c-1.22-.32-2.58-.09-3.55.74-.95.83-1.29 2.19-1.03 3.4.31 1.65 1.84 2.91 3.53 2.78 1.94-.04 3.42-1.8 3.25-3.73-.02-2.91 0-5.83 0-8.74.02-3.11-.02-6.22.02-9.33z"/>
                                </svg>
                                {selectedPlatforms.includes('tiktok') && !getPlatformLockInfo("tiktok").isFullyLocked && (
                                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white" />
                                )}
                                {!hasTiktokAccess && !getPlatformLockInfo("tiktok").isFullyLocked && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-white border border-purple-100 text-purple-600 rounded-full p-0.5 shadow-sm">
                                    <Lock size={7} strokeWidth={3} />
                                  </span>
                                )}
                                {getPlatformLockInfo("tiktok").isFullyLocked && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                                    <Lock size={7} strokeWidth={3} />
                                  </span>
                                )}
                              </button>
                           </div>
                         )}

                         {/* Youtube Item */}
                         {shouldShowPlatform("youtube") && (
                           <div className="flex items-center gap-1.5 relative">
                              <button 
                                type="button"
                                title={getPlatformLockInfo("youtube").isFullyLocked ? `YouTube hiện đang bị khóa: ${getPlatformLockInfo("youtube").reason}` : "YouTube"}
                                data-testid="platform-select-youtube" onClick={() => handlePlatformClick("youtube", hasYoutubeAccess, PRODUCT_IDS.YOUTUBE_ANALYTICS)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                                  getPlatformLockInfo("youtube").isFullyLocked
                                    ? 'bg-red-50 text-red-400 border border-red-200 opacity-60 cursor-not-allowed'
                                    : selectedPlatforms.includes('youtube')
                                      ? activePlatform === 'youtube'
                                        ? 'bg-[#FF0000] text-white ring-2 ring-offset-2 ring-[#FF0000]'
                                        : 'bg-[#FF0000]/70 text-white hover:bg-[#FF0000]/80 border border-[#FF0000]'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                              >
                                <Youtube size={14} className={activePlatform === 'youtube' && !getPlatformLockInfo("youtube").isFullyLocked ? 'fill-white' : ''} />
                                {selectedPlatforms.includes('youtube') && !getPlatformLockInfo("youtube").isFullyLocked && (
                                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white" />
                                )}
                                {!hasYoutubeAccess && !getPlatformLockInfo("youtube").isFullyLocked && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-white border border-purple-100 text-purple-600 rounded-full p-0.5 shadow-sm">
                                    <Lock size={7} strokeWidth={3} />
                                  </span>
                                )}
                                {getPlatformLockInfo("youtube").isFullyLocked && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                                    <Lock size={7} strokeWidth={3} />
                                  </span>
                                )}
                              </button>
                             
                             {selectedPlatforms.includes('youtube') && activePlatform === 'youtube' && renderTypeDropdown()}
                           </div>
                         )}

                         {/* LinkedIn Item */}
                         {shouldShowPlatform("linkedin") && (
                           <div className="flex items-center gap-1.5 relative">
                              <button 
                                type="button"
                                title={getPlatformLockInfo("linkedin").isFullyLocked ? `LinkedIn hiện đang bị khóa: ${getPlatformLockInfo("linkedin").reason}` : "LinkedIn"}
                                data-testid="platform-select-linkedin" onClick={() => handlePlatformClick("linkedin", hasLinkedinAccess, PRODUCT_IDS.LINKEDIN_MANAGEMENT || 'linkedin_management')}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                                  getPlatformLockInfo("linkedin").isFullyLocked
                                    ? 'bg-red-50 text-red-400 border border-red-200 opacity-60 cursor-not-allowed'
                                    : selectedPlatforms.includes('linkedin')
                                      ? activePlatform === 'linkedin'
                                        ? 'bg-[#0077B5] text-white ring-2 ring-offset-2 ring-[#0077B5]'
                                        : 'bg-[#0077B5]/70 text-white hover:bg-[#0077B5]/80 border border-[#0077B5]'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                              >
                                <Linkedin size={14} className={activePlatform === 'linkedin' && !getPlatformLockInfo("linkedin").isFullyLocked ? 'fill-white text-white' : ''} />
                                {selectedPlatforms.includes('linkedin') && !getPlatformLockInfo("linkedin").isFullyLocked && (
                                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white" />
                                )}
                                {!hasLinkedinAccess && !getPlatformLockInfo("linkedin").isFullyLocked && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-white border border-purple-100 text-purple-600 rounded-full p-0.5 shadow-sm">
                                    <Lock size={7} strokeWidth={3} />
                                  </span>
                                )}
                                {getPlatformLockInfo("linkedin").isFullyLocked && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                                    <Lock size={7} strokeWidth={3} />
                                  </span>
                                )}
                              </button>
                             
                             {selectedPlatforms.includes('linkedin') && activePlatform === 'linkedin' && renderTypeDropdown()}
                           </div>
                         )}

                         {/* Telegram Item */}
                         {shouldShowPlatform("telegram") && (
                           <div className="flex items-center gap-1.5 relative">
                              <button 
                                type="button"
                                title={getPlatformLockInfo("telegram").isFullyLocked ? `Telegram hiện đang bị khóa: ${getPlatformLockInfo("telegram").reason}` : "Telegram"}
                                onClick={() => handlePlatformClick("telegram", true)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                                  getPlatformLockInfo("telegram").isFullyLocked
                                    ? 'bg-red-50 text-red-400 border border-red-200 opacity-60 cursor-not-allowed'
                                    : selectedPlatforms.includes('telegram')
                                      ? activePlatform === 'telegram'
                                        ? 'bg-[#0088cc] text-white ring-2 ring-offset-2 ring-[#0088cc]'
                                        : 'bg-[#0088cc]/70 text-white hover:bg-[#0088cc]/80 border border-[#0088cc]'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                              >
                                <Send size={12} className={activePlatform === 'telegram' && !getPlatformLockInfo("telegram").isFullyLocked ? 'fill-white text-white' : 'text-gray-400'} />
                                {selectedPlatforms.includes('telegram') && !getPlatformLockInfo("telegram").isFullyLocked && (
                                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white" />
                                )}
                                {getPlatformLockInfo("telegram").isFullyLocked && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                                    <Lock size={7} strokeWidth={3} />
                                  </span>
                                )}
                              </button>
                             
                             {selectedPlatforms.includes('telegram') && activePlatform === 'telegram' && renderTypeDropdown()}
                           </div>
                         )}

                         {/* Discord Item */}
                         {shouldShowPlatform("discord") && (
                           <div className="flex items-center gap-1.5 relative">
                              <button 
                                type="button"
                                title={getPlatformLockInfo("discord").isFullyLocked ? `Discord hiện đang bị khóa: ${getPlatformLockInfo("discord").reason}` : "Discord"}
                                onClick={() => handlePlatformClick("discord", true)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                                  getPlatformLockInfo("discord").isFullyLocked
                                    ? 'bg-red-50 text-red-400 border border-red-200 opacity-60 cursor-not-allowed'
                                    : selectedPlatforms.includes('discord')
                                      ? activePlatform === 'discord'
                                        ? 'bg-[#5865F2] text-white ring-2 ring-offset-2 ring-[#5865F2]'
                                        : 'bg-[#5865F2]/70 text-white hover:bg-[#5865F2]/80 border border-[#5865F2]'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                              >
                                <MessageSquare size={12} className={activePlatform === 'discord' && !getPlatformLockInfo("discord").isFullyLocked ? 'fill-white text-white' : 'text-gray-400'} />
                                {selectedPlatforms.includes('discord') && !getPlatformLockInfo("discord").isFullyLocked && (
                                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white" />
                                )}
                                {getPlatformLockInfo("discord").isFullyLocked && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                                    <Lock size={7} strokeWidth={3} />
                                  </span>
                                )}
                              </button>
                             
                             {selectedPlatforms.includes('discord') && activePlatform === 'discord' && renderTypeDropdown()}
                           </div>
                         )}

                         {/* Threads Item */}
                         {shouldShowPlatform("threads") && (
                           <div className="flex items-center gap-1.5 relative">
                              <button 
                                type="button"
                                title={getPlatformLockInfo("threads").isFullyLocked ? `Threads hiện đang bị khóa: ${getPlatformLockInfo("threads").reason}` : "Threads"}
                                data-testid="platform-select-threads" onClick={() => handlePlatformClick("threads", true)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                                  getPlatformLockInfo("threads").isFullyLocked
                                    ? 'bg-red-50 text-red-400 border border-red-200 opacity-60 cursor-not-allowed'
                                    : selectedPlatforms.includes('threads')
                                      ? activePlatform === 'threads'
                                        ? 'bg-black text-white ring-2 ring-offset-2 ring-black'
                                        : 'bg-black/70 text-white hover:bg-black/85 border border-black'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                              >
                                <PlatformIcon platform="Threads" size={14} variant="flat" className={activePlatform === 'threads' && !getPlatformLockInfo("threads").isFullyLocked ? 'text-white' : 'text-gray-400'} />
                                {selectedPlatforms.includes('threads') && !getPlatformLockInfo("threads").isFullyLocked && (
                                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white" />
                                )}
                                {getPlatformLockInfo("threads").isFullyLocked && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                                    <Lock size={7} strokeWidth={3} />
                                  </span>
                                )}
                              </button>
                             
                             {selectedPlatforms.includes('threads') && activePlatform === 'threads' && renderTypeDropdown()}
                           </div>
                         )}

                         {/* Plus Add Button */}
                         <button type="button" className="w-7 h-7 rounded-full bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-all cursor-pointer">
                           <Plus size={14} />
                         </button>
                       </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsNotesOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer relative"
                  >
                     <FileText size={16} />
                     <span className="text-[11px] font-bold uppercase tracking-widest font-sans">Notes</span>
                     {notes && notes.length > 0 && (
                       <span className="absolute -top-1 -right-1 bg-black text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white animate-scale-in">
                         {notes.length}
                       </span>
                     )}
                  </button>
              </div>

               {/* Text Area Card */}
              <div className="border border-gray-200 rounded-[24px] overflow-hidden focus-within:border-black transition-all shadow-sm bg-white relative">
                  <input type="file" ref={fileInputRef} accept="video/*,image/*" onChange={handleVideoChange} className="hidden" data-testid="post-file-input" />
                  
                  {/* Title Input — hiển thị khi đang edit post hoặc platform là YouTube */}
                  {(editingPost || activePlatform === 'youtube') && (
                    <div className="px-6 pt-5 pb-0 border-b border-gray-100">
                      <input
                        type="text"
                        data-testid="post-title-input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Post title (optional)"
                        className="w-full text-base font-bold text-gray-900 outline-none bg-transparent placeholder-gray-300"
                      />
                    </div>
                  )}

                  <textarea ref={textareaRef} 
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)} data-testid="post-caption-input"
                    className="w-full p-6 text-sm font-medium leading-relaxed outline-none min-h-[350px] resize-none"
                    placeholder="What's on your mind?"
                  />
                  {(!postMedia || postMedia.length === 0) && (videoFile || uploadedVideoPath) && !isImageFile && (
                     <div className="px-6 py-3 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                       <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                         <Youtube className="text-red-500 fill-red-500" size={16} />
                         <span className="truncate max-w-[300px]">{videoFile ? videoFile.name : uploadedVideoPath.split('/').pop()}</span>
                         {videoFile && <span className="text-[10px] text-gray-400 font-semibold uppercase">({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)</span>}
                         {isUploadingVideo && <span className="text-[10px] text-blue-500 animate-pulse font-bold uppercase">(Uploading...)</span>}
                       </div>
                       <button onClick={handleRemoveVideo} className="text-[10px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors cursor-pointer">Remove</button>
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
                                      {/* Overlay mờ hiển thị nút Edit khi hover */}
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
                            {/* Image Container with aspect ratio and rounded borders */}
                            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-gray-100 shadow-md">
                              <img src={videoFileUrl} alt="Preview" data-testid="post-image-preview" style={getImageStyle(imageTransform)} className={`w-full h-full object-cover ${getImageFilterClass(imageTransform?.filter)}`} />
                            </div>
                            
                            {/* Three dots button */}
                            <button 
                              type="button"
                              onClick={() => setShowImageMenu(!showImageMenu)}
                              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center cursor-pointer transition-all shadow-md z-10"
                            >
                              <MoreHorizontal size={12} />
                            </button>

                            {/* Dropdown Menu (Floats on top, opening upwards to prevent clipping) */}
                            {showImageMenu && (
                              <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 text-left text-xs text-gray-700 animate-in fade-in slide-in-from-bottom-1">
                                <button 
                                  type="button" 
                                  onClick={() => { setShowImageMenu(false); setShowImageEditor(true); }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 transition-all cursor-pointer font-bold text-gray-700 whitespace-nowrap"
                                >
                                  <Edit size={14} className="text-gray-500" />
                                  Edit image
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => { setShowImageMenu(false); toast.info("Edit with Adobe Express clicked"); }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 transition-all cursor-pointer font-bold text-gray-700 whitespace-nowrap"
                                >
                                  <span className="w-4 h-4 rounded-md bg-gradient-to-tr from-[#FF0000] via-[#FF0080] to-[#7F00FF] flex items-center justify-center text-[9px] font-black text-white shrink-0 select-none">A</span>
                                  Edit with Adobe Express
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => { setShowImageMenu(false); setShowAltTextModal(true); }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 transition-all cursor-pointer font-bold text-gray-700 whitespace-nowrap"
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
                                  className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-red-50 text-red-600 transition-all cursor-pointer font-bold whitespace-nowrap"
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
                  <div className="px-6 py-4 flex items-center justify-between bg-white border-t border-gray-50">
                     <div className="flex items-center gap-5">
                        {/* Media Button */}
                        <div className="relative">
                          <button 
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
                          onClick={() => setShowFirstCommentModal(true)}
                          className={`text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg cursor-pointer ${youtubeFirstComment || globalFirstComment ? 'text-black bg-purple-50' : ''}`}
                        >
                          <MessageSquare size={18} />
                        </button>

                        {/* Campaign URL Link Button */}
                        <div className="relative">
                          <button 
                            onClick={() => setActivePopover(activePopover === 'utm' ? null : 'utm')}
                            className={`text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg cursor-pointer ${activePopover === 'utm' ? 'bg-gray-100 text-black' : ''}`}
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

                        {/* Other Static Buttons */}
                        <button className="text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg cursor-pointer"><Languages size={18} /></button>
                        <button className="text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg cursor-pointer"><FileText size={18} /></button>
                     </div>
                     <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer group">
                           <input 
                             type="checkbox" 
                             checked={isLibrary}
                             onChange={(e) => setIsLibrary(e.target.checked)}
                             className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black" 
                           />
                           <span className="text-[10px] font-bold text-gray-400 group-hover:text-black transition-colors uppercase tracking-widest">Add to library</span>
                        </label>
                        <div className="w-px h-4 bg-gray-200" />
                        <div className="group relative">
                           <span className="text-[10px] font-bold text-gray-300 group-hover:text-gray-500 transition-colors uppercase tracking-widest">{caption.length} / 5000</span>
                           <div className="absolute bottom-full right-0 mb-4 w-64 p-3 bg-white rounded-xl shadow-xl border border-gray-100 hidden group-hover:block animate-in fade-in slide-in-from-bottom-2 z-50">
                              <p className="text-[10px] text-gray-500 leading-tight">Limited by the network with less character length support.</p>
                           </div>
                        </div>
                          <div className={`w-5 h-5 rounded flex items-center justify-center ${activePlatform === 'youtube' ? 'bg-[#FF0000]' : activePlatform === 'tiktok' ? 'bg-black' : activePlatform === 'instagram' ? 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]' : activePlatform === 'linkedin' ? 'bg-[#0077B5]' : activePlatform === 'telegram' ? 'bg-[#0088cc]' : activePlatform === 'discord' ? 'bg-[#5865F2]' : 'bg-[#1877F2]'}`}>
                            {activePlatform === 'youtube' ? (
                              <Youtube size={10} className="text-white fill-white" />
                            ) : activePlatform === 'tiktok' ? (
                               <svg className="w-2.5 h-2.5 text-white fill-white" viewBox="0 0 24 24">
                                 <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.5-1.1-1.02-1.7-2.48-1.9-3.96-.03 2.49 0 4.99 0 7.48-.02 1.9-.38 3.82-1.39 5.43-1.46 2.42-4.13 3.84-6.93 3.55-3.05-.2-5.78-2.44-6.39-5.46-.73-3.27.97-6.9 4.13-7.91 1.09-.34 2.24-.39 3.37-.2v4.02c-1.22-.32-2.58-.09-3.55.74-.95.83-1.29 2.19-1.03 3.4.31 1.65 1.84 2.91 3.53 2.78 1.94-.04 3.42-1.8 3.25-3.73-.02-2.91 0-5.83 0-8.74.02-3.11-.02-6.22.02-9.33z"/>
                               </svg>
                            ) : activePlatform === 'instagram' ? (
                               <Instagram size={10} className="text-white" />
                            ) : activePlatform === 'linkedin' ? (
                                <Linkedin size={10} className="text-white" />
                            ) : activePlatform === 'telegram' ? (
                                <Send size={9} className="text-white fill-white translate-x-[-0.5px]" />
                            ) : activePlatform === 'discord' ? (
                                <MessageSquare size={9} className="text-white fill-white translate-y-[0.5px]" />
                            ) : (
                              <svg className="w-3 h-3 text-white fill-white" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                              </svg>
                            )}
                          </div>
                     </div>
                  </div>
              </div>

              {/* Presets Accordion */}
              <div className="space-y-3">
                 {/* Global Presets Accordion */}
                 <div className="border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm transition-all duration-300">
                    <div 
                      onClick={() => setGlobalOpen(!globalOpen)}
                      className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-all cursor-pointer group"
                    >
                       <div className="flex items-center gap-3">
                          <Settings size={18} className="text-gray-400 group-hover:text-black transition-colors" />
                          <span className="text-[12px] font-bold text-gray-700">Global presets</span>
                          <span className="px-2 py-0.5 bg-[#D1FAE5] text-[#065F46] rounded-lg text-[9px] font-bold">New</span>
                       </div>
                       <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${globalOpen ? 'rotate-180 text-black' : ''}`} />
                    </div>
                    
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${globalOpen ? 'max-h-[300px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
                       <div className="space-y-4">
                          <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">First Comment</label>
                             <textarea 
                               value={globalFirstComment}
                               onChange={(e) => setGlobalFirstComment(e.target.value)}
                               placeholder="Write a comment to be posted automatically right after publishing..."
                               className="w-full p-4 border border-gray-200 rounded-2xl text-xs font-medium focus:border-black outline-none resize-none h-20"
                             />
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* YouTube Presets Accordion */}
                  {selectedPlatforms.includes('youtube') && (
                 <div className="border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm transition-all duration-300">
                    <div 
                      onClick={() => setYoutubeOpen(!youtubeOpen)}
                      className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-all cursor-pointer group"
                    >
                       <div className="flex items-center gap-3">
                          <Youtube size={18} className="text-[#FF0000]" />
                          <span className="text-[12px] font-bold text-gray-700">YouTube presets</span>
                       </div>
                       <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${youtubeOpen ? 'rotate-180 text-black' : ''}`} />
                    </div>

                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${youtubeOpen ? 'max-h-[800px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
                       <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-left">
                          
                          {/* Video or Short Title */}
                          <div>
                             <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Video or short title</label>
                             <div className="relative">
                                <input 
                                  type="text"
                                  maxLength={100}
                                  value={youtubeTitle}
                                  onChange={(e) => setYoutubeTitle(e.target.value)}
                                  placeholder="Enter video title..."
                                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none"
                                />
                                <span className="block text-right text-[9px] font-bold text-gray-300 mt-1.5 uppercase tracking-widest">
                                   {youtubeTitle.length} / 100
                                </span>
                             </div>
                          </div>

                          {/* Audience configuration */}
                          <div>
                             <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Audience configuration</label>
                             <div className="relative">
                                <select 
                                  value={youtubeMadeForKids ? "true" : "false"}
                                  onChange={(e) => setYoutubeMadeForKids(e.target.value === "true")}
                                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer"
                                >
                                   <option value="false">No, it's not made for kids</option>
                                   <option value="true">Yes, it's made for kids</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                             </div>
                          </div>

                          {/* Privacy configuration */}
                          <div>
                             <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Privacy configuration</label>
                             <div className="relative">
                                <select 
                                  value={youtubePrivacy}
                                  onChange={(e) => setYoutubePrivacy(e.target.value)}
                                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer"
                                >
                                   <option value="public">Public</option>
                                   <option value="unlisted">Unlisted</option>
                                   <option value="private">Private</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                             </div>
                             <p className="text-[10px] text-gray-400 mt-2 font-medium leading-normal">
                                Privacy status configuration can be modified in YouTube after publishing the video or short.
                             </p>
                          </div>

                          {/* Category */}
                          <div>
                             <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Category</label>
                             <div className="relative">
                                <select 
                                  value={youtubeCategory}
                                  onChange={(e) => setYoutubeCategory(e.target.value)}
                                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer"
                                >
                                   <option value="22">People & Blogs</option>
                                   <option value="20">Gaming</option>
                                   <option value="27">Education</option>
                                   <option value="24">Entertainment</option>
                                   <option value="28">Science & Technology</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                             </div>
                          </div>

                          {/* Add to playlist */}
                          <div>
                             <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Add to playlist</label>
                             <div className="flex gap-2">
                                <div className="relative flex-1">
                                   <select 
                                     value={youtubePlaylistId}
                                     onChange={(e) => setYoutubePlaylistId(e.target.value)}
                                     className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer"
                                   >
                                      <option value="">Select playlist...</option>
                                      {playlists.map(pl => (
                                        <option key={pl.id} value={pl.id}>{pl.title}</option>
                                      ))}
                                   </select>
                                   <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => fetchPlaylists(true)}
                                  className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 text-gray-500 hover:text-black transition-all flex items-center justify-center shrink-0 cursor-pointer"
                                >
                                   <RotateCw size={14} className={isLoadingPlaylists ? "animate-spin" : ""} />
                                </button>
                             </div>
                          </div>

                          {/* Tags */}
                          <div>
                             <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Tags</label>
                             <div className="flex gap-2">
                                <input 
                                  type="text"
                                  value={youtubeTags}
                                  onChange={(e) => setYoutubeTags(e.target.value)}
                                  placeholder="Enter tags (comma separated)..."
                                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none"
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(youtubeTags);
                                    toast.success("Tags copied to clipboard");
                                  }}
                                  className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 text-gray-500 hover:text-black transition-all flex items-center justify-center shrink-0 cursor-pointer"
                                >
                                   <Copy size={14} />
                                </button>
                             </div>
                          </div>

                          {/* Custom Thumbnail */}
                          {youtubeType.toLowerCase() === 'short' ? (
                             <div className="col-span-2 p-4 bg-amber-50/50 rounded-2xl border border-amber-100 flex items-center gap-2">
                               <span className="text-amber-600 text-xs">💡</span>
                               <span className="text-[11px] text-amber-700 font-semibold leading-normal">
                                 Custom Thumbnails are not supported for YouTube Shorts by the YouTube API.
                               </span>
                             </div>
                           ) : (
                             <div className="col-span-2">
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Custom Thumbnail</label>
                                <div className="flex items-center gap-4">
                                  {youtubeThumbnail ? (
                                    <div className="relative w-28 h-20 rounded-2xl overflow-hidden border border-gray-200 shadow-sm group">
                                      <img src={buildMediaUrl(youtubeThumbnail)} alt="YT Thumbnail" className="w-full h-full object-cover" />
                                      <button 
                                        type="button" 
                                        onClick={() => setYoutubeThumbnail("")}
                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        setIsUploadingThumbnail(true);
                                        setUploadModalTab("computer");
                                        setShowUploadModal(true);
                                      }}
                                      className="w-full max-w-xs h-20 border-2 border-dashed border-gray-200 hover:border-gray-400 rounded-2xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-gray-600 transition-all cursor-pointer bg-gray-50/50"
                                    >
                                      <Upload size={16} />
                                      <span className="text-[10px] font-bold uppercase tracking-wider">Upload Thumbnail</span>
                                    </button>
                                  )}
                                  <div className="flex-1 text-[10px] text-gray-400 font-medium leading-normal text-left">
                                    Select an image from your computer or media library to use as the thumbnail for this YouTube video. 
                                    Max size 2MB. Recommended resolution: 1280x720.
                                  </div>
                                </div>
                             </div>
                           )}

                          {/* First Comment inside YT presets */}
                          <div className="col-span-2">
                             <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">First Comment (Auto post after publishing)</label>
                             <textarea 
                               value={youtubeFirstComment}
                               onChange={(e) => setYoutubeFirstComment(e.target.value)}
                               placeholder="Write a comment to be posted automatically right after publishing..."
                               className="w-full p-4 border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none resize-none h-16"
                             />
                          </div>

                       </div>
                    </div>
                 </div>
                 )}

                 {/* Facebook Presets Accordion */}
                 {selectedPlatforms.includes('facebook') && (
                  <div className="border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm transition-all duration-300">
                    <div 
                      onClick={() => setFacebookOpen(!facebookOpen)}
                      className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-[18px] h-[18px] text-[#1877F2] fill-[#1877F2]" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        <span className="text-[12px] font-bold text-gray-700">Facebook presets</span>
                      </div>
                      <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${facebookOpen ? 'rotate-180 text-black' : ''}`} />
                    </div>

                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${facebookOpen ? 'max-h-[300px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
                      <div className="space-y-4 text-left">
                        {facebookType === 'reel' ? (
                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Title</label>
                            <input 
                              type="text"
                              value={facebookTitle}
                              onChange={(e) => setFacebookTitle(e.target.value)}
                              placeholder="Title"
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none"
                            />
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-400 font-medium leading-normal">
                            Facebook content will be published as a Facebook {facebookType || 'post'}.
                            {facebookType === 'story' && " Story links or interactive elements should be customized natively after publication."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                 )}

                  {/* TikTok Presets Accordion */}
                  {selectedPlatforms.includes('tiktok') && (
                    <div className="border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm transition-all duration-300">
                      <div 
                        onClick={() => setTiktokOpen(!tiktokOpen)}
                        className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-[18px] h-[18px] text-black fill-current" viewBox="0 0 24 24">
                            <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.5-1.1-1.02-1.7-2.48-1.9-3.96-.03 2.49 0 4.99 0 7.48-.02 1.9-.38 3.82-1.39 5.43-1.46 2.42-4.13 3.84-6.93 3.55-3.05-.2-5.78-2.44-6.39-5.46-.73-3.27.97-6.9 4.13-7.91 1.09-.34 2.24-.39 3.37-.2v4.02c-1.22-.32-2.58-.09-3.55.74-.95.83-1.29 2.19-1.03 3.4.31 1.65 1.84 2.91 3.53 2.78 1.94-.04 3.42-1.8 3.25-3.73-.02-2.91 0-5.83 0-8.74.02-3.11-.02-6.22.02-9.33z"/>
                          </svg>
                          <span className="text-[12px] font-bold text-gray-700">Tiktok presets</span>
                        </div>
                        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${tiktokOpen ? 'rotate-180 text-black' : ''}`} />
                      </div>

                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${tiktokOpen ? 'max-h-[500px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
                        <div className="space-y-5 text-left">
                          
                          {/* Privacy dropdown */}
                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Who can view your post?</label>
                            <div className="relative">
                              <select
                                value={tiktokPrivacy}
                                onChange={(e) => setTiktokPrivacy(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer"
                              >
                                <option value="public">Public</option>
                                <option value="friends">Friends</option>
                                <option value="self">Self</option>
                              </select>
                              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                          </div>

                          {/* 3 Switches */}
                          <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-50">
                            <div className="flex flex-col items-start gap-1">
                              <span className="text-[11px] font-bold text-gray-500 uppercase">Allow comments</span>
                              <button
                                type="button"
                                onClick={() => setTiktokAllowComments(!tiktokAllowComments)}
                                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                                  tiktokAllowComments ? 'bg-black' : 'bg-gray-200'
                                }`}
                              >
                                <div
                                  className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-all duration-300 ${
                                    tiktokAllowComments ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                            <div className="flex flex-col items-start gap-1">
                              <span className="text-[11px] font-bold text-gray-500 uppercase">Allow duet</span>
                              <button
                                type="button"
                                onClick={() => setTiktokAllowDuet(!tiktokAllowDuet)}
                                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                                  tiktokAllowDuet ? 'bg-black' : 'bg-gray-200'
                                }`}
                              >
                                <div
                                  className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-all duration-300 ${
                                    tiktokAllowDuet ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                            <div className="flex flex-col items-start gap-1">
                              <span className="text-[11px] font-bold text-gray-500 uppercase">Allow stitch</span>
                              <button
                                type="button"
                                onClick={() => setTiktokAllowStitch(!tiktokAllowStitch)}
                                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                                  tiktokAllowStitch ? 'bg-black' : 'bg-gray-200'
                                }`}
                              >
                                <div
                                  className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-all duration-300 ${
                                    tiktokAllowStitch ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>

                          {/* 2 Switches */}
                          <div className="border-t border-gray-100 pt-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="block text-[11px] font-bold text-gray-500 uppercase">AI-generated content</span>
                                <span className="text-[9px] text-gray-400 font-medium">Label your content as generated by AI</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setTiktokAiGenerated(!tiktokAiGenerated)}
                                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 shrink-0 ${
                                  tiktokAiGenerated ? 'bg-black' : 'bg-gray-200'
                                }`}
                              >
                                <div
                                  className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-all duration-300 ${
                                    tiktokAiGenerated ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>

                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-0.5">
                                <span className="block text-[11px] font-bold text-gray-500 uppercase">Commercial content</span>
                                <span className="block text-[9px] text-gray-400 font-medium leading-normal">
                                  Turn on to disclose that this post promotes goods or services in exchange for something of value
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setTiktokCommercialContent(!tiktokCommercialContent)}
                                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 shrink-0 mt-0.5 ${
                                  tiktokCommercialContent ? 'bg-black' : 'bg-gray-200'
                                }`}
                              >
                                <div
                                  className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-all duration-300 ${
                                    tiktokCommercialContent ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  )}

                  {/* Instagram Presets Accordion */}
                  {selectedPlatforms.includes('instagram') && (
                    <div className="border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm transition-all duration-300">
                      <div 
                        onClick={() => setInstagramOpen(!instagramOpen)}
                        className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <Instagram size={18} className="text-[#DD2A7B]" />
                          <span className="text-[12px] font-bold text-gray-700">Instagram presets</span>
                        </div>
                        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${instagramOpen ? 'rotate-180 text-black' : ''}`} />
                      </div>

                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${instagramOpen ? 'max-h-[300px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
                        <div className="space-y-4 text-left">
                          <p className="text-[11px] text-gray-400 font-medium leading-normal">
                            Instagram content will be published as an Instagram {instagramType || 'post'}. 
                            {instagramType === 'reel' && " Ensure your video has a vertical aspect ratio of 9:16."}
                            {instagramType === 'story' && " Story links or interactive elements should be customized natively after publication."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Discord Presets Accordion */}
                  {selectedPlatforms.includes('discord') && (
                    <div className="border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm transition-all duration-300">
                      <div 
                        onClick={() => setDiscordOpen(!discordOpen)}
                        className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <MessageSquare size={18} className="text-[#5865F2]" />
                          <span className="text-[12px] font-bold text-gray-700">Discord presets</span>
                        </div>
                        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${discordOpen ? 'rotate-180 text-black' : ''}`} />
                      </div>

                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${discordOpen ? 'max-h-[400px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
                        <div className="space-y-4 text-left">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Chọn Kênh Đăng Bài</label>
                          <p className="text-[11px] text-gray-400 font-medium leading-normal mb-3">
                            Chọn máy chủ và kênh chat Discord bạn muốn xuất bản bài viết này:
                          </p>
                          {discordAccounts.length === 0 ? (
                            <p className="text-xs text-amber-600 font-semibold">Chưa có kênh Discord nào được liên kết. Vui lòng liên kết kênh tại trang Quản lý kết nối.</p>
                          ) : (
                            <div className="space-y-2 border border-gray-150 rounded-2xl p-4 bg-gray-50/30 max-h-48 overflow-y-auto">
                              {discordAccounts.map((acc) => (
                                <label key={acc.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedDiscordChannels.includes(acc.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedDiscordChannels([...selectedDiscordChannels, acc.id]);
                                      } else {
                                        setSelectedDiscordChannels(selectedDiscordChannels.filter(id => id !== acc.id));
                                      }
                                    }}
                                    className="rounded border-gray-300 text-[#5865F2] focus:ring-[#5865F2]"
                                  />
                                  <div className="text-xs">
                                    <div className="font-bold text-gray-800">{acc.discordAccount?.guildName || 'Discord Server'}</div>
                                    <div className="text-gray-400 font-semibold">#{acc.discordAccount?.channelName || acc.displayName}</div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Threads Presets Accordion */}
                  {selectedPlatforms.includes('threads') && (
                    <div className="border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm transition-all duration-300">
                      <div 
                        onClick={() => setThreadsOpen(!threadsOpen)}
                        className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <PlatformIcon platform="Threads" size={18} variant="flat" className="text-black" />
                          <span className="text-[12px] font-bold text-gray-700">Threads presets</span>
                        </div>
                        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${threadsOpen ? 'rotate-180 text-black' : ''}`} />
                      </div>

                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${threadsOpen ? 'max-h-[300px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
                        <div className="space-y-4 text-left">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Who can reply to this post?</label>
                            <div className="relative">
                              <select
                                value={threadsWhoCanReply}
                                onChange={(e) => setThreadsWhoCanReply(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer"
                              >
                                <option value="everyone">Everyone</option>
                                <option value="accounts_you_follow">Profiles you follow</option>
                                <option value="mentioned_only">Mentioned profiles only</option>
                              </select>
                              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2 font-medium leading-normal">
                              Limit who can reply to your Threads post directly from here.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
              </div>

              {/* Approval Workflow Settings */}
              {!isLibrary && selectedPublishId !== 'now' && (!hasApprovePermission || selectedPublishId === 'review') && selectedPublishId !== 'draft' && (
                <div className="border border-amber-200 rounded-3xl overflow-hidden bg-amber-50/20 shadow-sm transition-all duration-300 p-6 space-y-4 text-left">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                      <div>
                        <h4 className="text-[12px] font-black text-amber-800 uppercase tracking-wider">Yêu cầu phê duyệt bài viết</h4>
                        <p className="text-[10px] text-amber-600 font-bold mt-1 leading-relaxed uppercase tracking-wider">
                          {!hasApprovePermission 
                            ? "Bạn không có quyền đăng bài trực tiếp. Vui lòng cấu hình người duyệt bài."
                            : "Bạn đã chọn gửi bài viết này để phê duyệt."}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 items-center">
                          {selectedReviewerIds.length === 0 ? (
                            <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">Chưa chọn người duyệt</span>
                          ) : (
                            <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider bg-amber-100/50 px-2.5 py-1 rounded-lg border border-amber-200 max-w-xs truncate">
                              Đã chọn: {selectedReviewerIds.map(id => potentialReviewers.find(r => r.id === id)?.name).filter(Boolean).join(", ")}
                            </span>
                          )}
                          <span className="text-[10px] bg-amber-900 text-amber-50 px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider">
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
                      className="px-4 py-2.5 bg-[#0A0A0A] hover:bg-black text-white hover:shadow-md text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer shrink-0"
                    >
                      Chọn người duyệt
                    </button>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-amber-200/40">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Ghi chú cho người duyệt</label>
                    <input
                      type="text"
                      placeholder="Nhập lời nhắn gửi đến người duyệt..."
                      value={requesterNote}
                      onChange={(e) => setRequesterNote(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-[11px] font-bold text-gray-700 outline-none focus:border-black transition-all"
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
                      <span className="text-[12px] font-bold">{getValidationErrors().length} errors</span>
                    </div>
                  </div>
                  <div className="border-t border-red-100/50 px-6 py-4 space-y-2 text-left">
                    {getValidationErrors().map((err, idx) => {
                      const parsed = parseValidationError(err);
                      return (
                        <div key={idx} className="flex items-center gap-2.5 text-xs font-medium text-gray-700">
                          {renderErrorIcon(parsed.platform)}
                          <span>{parsed.message}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Composition Footer */}
              <div className="pt-4 flex items-center justify-between">
                 <button onClick={closePostCreator} className="px-6 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 hover:text-black transition-all cursor-pointer">Cancel</button>
                 
                 <div className="flex items-center gap-4">
                     {!isLibrary && ['schedule', 'review'].includes(selectedPublishId) && (
                       <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-2.5 hover:bg-gray-50 transition-all relative">
                           <Calendar size={18} className="text-gray-400" />
                           <input 
                             type="datetime-local" data-testid="post-scheduled-date-input" 
                             value={scheduledDate}
                             onChange={(e) => setScheduledDate(e.target.value)}
                             className="text-[11px] font-bold text-gray-600 uppercase tracking-widest outline-none bg-transparent cursor-pointer border-none p-0"
                           />
                        </div>
                     )}
                    
                     {isLibrary ? (
                        <button data-testid="post-submit-btn" 
                          onClick={() => {
                            if (!hasCreatePermission) return;
                            handleCreatePost();
                          }}
                          disabled={isCreating || !hasCreatePermission}
                          className={`px-8 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer ${
                            hasCreatePermission
                              ? "bg-[#0A0A0A] text-white hover:bg-black"
                              : "bg-gray-200 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                           {isCreating ? <Loader2 size={16} className="animate-spin" /> : "Save Template"}
                        </button>
                     ) : (
                       <div className="flex items-center">
                          <button data-testid="post-submit-btn" 
                            onClick={() => {
                              if (!hasCreatePermission) return;
                              handleCreatePost();
                            }}
                            disabled={isCreating || !hasCreatePermission}
                            className={`px-8 py-3 rounded-l-2xl text-[11px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer ${
                              hasCreatePermission
                                ? "bg-[#0A0A0A] text-white hover:bg-black"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            }`}
                          >
                             {isCreating ? <Loader2 size={16} className="animate-spin" /> : getPublishButtonLabelText()}
                          </button>
                          <div className="relative">
                             <button data-testid="post-publish-menu-btn" 
                               onClick={() => {
                                 if (!hasCreatePermission) return;
                                 setShowPublishMenu(!showPublishMenu);
                               }} 
                               disabled={!hasCreatePermission}
                               className={`px-3 py-3 rounded-r-2xl border-l border-white/10 transition-all ${
                                 hasCreatePermission
                                   ? "bg-[#2D1D35] text-white hover:bg-[#1E1B4B] cursor-pointer"
                                   : "bg-gray-300 text-gray-400 cursor-not-allowed"
                               }`}
                             >
                                <ChevronDown size={18} />
                             </button>
                             {showPublishMenu && hasCreatePermission && (
                                <div className="absolute bottom-full right-0 mb-4 w-64 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 py-3 z-50 animate-in slide-in-from-bottom-2">
                                   {editablePublishOptions.length === 0 ? (
                                      <div className="px-6 py-3 text-[10px] text-gray-400 font-bold text-center">
                                        Bài đã đăng — chỉ có thể chỉnh nội dung
                                      </div>
                                    ) : editablePublishOptions.map((opt) => (
                                       <button key={opt.id} onClick={() => { setSelectedPublishId(opt.id); setShowPublishMenu(false); }} data-testid={`publish-option-${opt.id}`} className={`w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-all text-left cursor-pointer ${selectedPublishId === opt.id ? 'bg-gray-50' : ''}`}>
                                          <div>
                                             <div className="text-[10px] font-black text-gray-800 uppercase tracking-widest">{opt.label}</div>
                                             <div className="text-[9px] text-gray-400 font-bold">{opt.sub}</div>
                                          </div>
                                          {selectedPublishId === opt.id && <Check size={14} className="text-gray-800 shrink-0" />}
                                       </button>
                                    ))}
                                </div>
                             )}
                          </div>
                       </div>
                     )}
                  </div>
              </div>
           </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="flex-[0.8] flex flex-col bg-[#F3F4F6]">
           {/* Preview Toolbar */}
           <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                 {selectedPlatforms.map((platform) => {
                    const isActive = platform === activePlatform;
                    return (
                       <button
                          key={platform}
                          type="button"
                          onClick={() => setActivePlatform(platform)}
                          title={`Switch to ${platform} preview`}
                          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all cursor-pointer hover:scale-105 ${
                             isActive ? 'bg-black text-white scale-110' : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-black'
                          }`}
                       >
                          {platform === 'youtube' ? (
                             <Youtube size={18} className={isActive ? 'text-white fill-white' : 'text-[#FF0000] fill-[#FF0000]'} />
                          ) : platform === 'tiktok' ? (
                             <svg className={`w-4.5 h-4.5 ${isActive ? 'text-white fill-white' : 'text-black fill-current'}`} viewBox="0 0 24 24">
                                <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.5-1.1-1.02-1.7-2.48-1.9-3.96-.03 2.49 0 4.99 0 7.48-.02 1.9-.38 3.82-1.39 5.43-1.46 2.42-4.13 3.84-6.93 3.55-3.05-.2-5.78-2.44-6.39-5.46-.73-3.27.97-6.9 4.13-7.91 1.09-.34 2.24-.39 3.37-.2v4.02c-1.22-.32-2.58-.09-3.55.74-.95.83-1.29 2.19-1.03 3.4.31 1.65 1.84 2.91 3.53 2.78 1.94-.04 3.42-1.8 3.25-3.73-.02-2.91 0-5.83 0-8.74.02-3.11-.02-6.22.02-9.33z"/>
                             </svg>
                          ) : platform === 'instagram' ? (
                             <Instagram size={18} className={isActive ? 'text-white' : 'text-[#DD2A7B]'} />
                          ) : platform === 'linkedin' ? (
                             <Linkedin size={18} className={isActive ? 'text-white' : 'text-[#0077B5] fill-[#0077B5]'} />
                          ) : platform === 'telegram' ? (
                             <Send size={16} className={`rotate-45 ${isActive ? 'text-white' : 'text-[#0088cc] fill-[#0088cc]'}`} />
                          ) : platform === 'discord' ? (
                             <MessageSquare size={18} className={isActive ? 'text-white' : 'text-[#5865F2]'} />
                          ) : platform === 'threads' ? (
                             <span className="text-[10px] font-black tracking-tight">Th</span>
                          ) : (
                             <svg className={`w-4.5 h-4.5 ${isActive ? 'text-white fill-white' : 'text-[#1877F2] fill-[#1877F2]'}`} viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                             </svg>
                          )}
                       </button>
                    );
                 })}
                 {selectedPlatforms.length === 0 && (
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-300">
                       <AlertCircle size={20} />
                    </div>
                 )}
              </div>
              <div className="flex gap-2 bg-white/50 p-1 rounded-2xl backdrop-blur-md">
                 <button onClick={() => setPreviewDevice("mobile")} className={`p-2 rounded-xl transition-all cursor-pointer ${previewDevice === 'mobile' ? 'bg-black text-white' : 'text-gray-400 hover:text-black'}`}><Smartphone size={18} /></button>
                 <button onClick={() => setPreviewDevice("desktop")} className={`p-2 rounded-xl transition-all cursor-pointer ${previewDevice === 'desktop' ? 'bg-black text-white' : 'text-gray-400 hover:text-black'}`}><Monitor size={18} /></button>
              </div>
           </div>

           {/* Preview Body */}
           <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
              <div className="w-full max-w-sm">
                 {PreviewComponent && (
                   <PreviewComponent 
                      caption={caption} 
                      videoFileUrl={videoFileUrl} 
                      youtubeType={youtubeType}
                      youtubeTitle={youtubeTitle}
                      youtubePlaylistId={youtubePlaylistId}
                      playlists={playlists}
                      youtubeTags={youtubeTags}
                      youtubeFirstComment={youtubeFirstComment}
                      globalFirstComment={globalFirstComment}
                      previewDevice={previewDevice}
                      facebookType={facebookType}
                      facebookTitle={facebookTitle}
                      instagramType={instagramType}
                      imageTransform={imageTransform}
                      albumMedia={albumMedia}
                    />
                 )}
              </div>
              <p className="text-[10px] text-gray-400 text-center max-w-[280px] leading-normal font-medium uppercase tracking-tight">
                  {activePlatform === 'youtube' 
                    ? 'YouTube descriptions and setup parameters are fully simulated and will be included in your post' 
                    : activePlatform === 'tiktok'
                    ? 'TikTok video presets and details are fully simulated and will be included in your post'
                    : activePlatform === 'instagram'
                    ? 'Instagram photos, Reels, and Stories are fully simulated and will be published on your account'
                    : 'Facebook status updates, photos, and videos are fully supported and will be published on your feed'}
               </p>
           </div>

           {/* Preview Disclaimer Card */}
           <div className="p-8">
              <div className="bg-[#E0F2FE] border border-[#BAE6FD] rounded-3xl p-5 flex items-start gap-4">
                 <div className="p-2 bg-white rounded-xl shadow-sm text-blue-500">
                    <Info size={20} />
                 </div>
                 <p className="text-[13px] text-blue-900 leading-relaxed font-medium">
                    Previews are an approximation of how your post will look when published. The final post may look slightly different.
                 </p>
              </div>
           </div>
        {showFirstCommentModal && (
          <FirstCommentModal 
            value={youtubeFirstComment || globalFirstComment}
            onAccept={(comment) => {
              setYoutubeFirstComment(comment);
              setGlobalFirstComment(comment);
              setShowFirstCommentModal(false);
              toast.success("First comment set successfully");
            }}
            onCancel={() => setShowFirstCommentModal(false)}
          />
        )}
        <GoogleDrivePickerModal 
          isOpen={isDriveModalOpen}
          onClose={() => setIsDriveModalOpen(false)}
          activeBrand={activeBrand}
          onSelectFile={handleSelectDriveFile}
        />
        <MediaUploadModal 
          isOpen={showUploadModal}
          initialTab={uploadModalTab}
          brandId={activeBrand?.id}
          multiple={!isUploadingThumbnail}
          onClose={() => {
            setShowUploadModal(false);
            setIsUploadingThumbnail(false);
          }}
          onAccept={(result, path) => {
            if (isUploadingThumbnail) {
              setYoutubeThumbnail(path);
              setIsUploadingThumbnail(false);
            } else {
              const items = Array.isArray(result) ? result : [{ file: result, path, previewUrl: result ? URL.createObjectURL(result) : path }];
              setPostMedia(prev => {
                const newItems = items.map(item => ({
                  file: item.file,
                  previewUrl: item.previewUrl || item.path,
                  path: item.path
                }));
                const updated = [...prev, ...newItems];
                if (updated.length > 0) {
                  setVideoFile(updated[0].file);
                  setVideoFileUrl(updated[0].previewUrl);
                  setUploadedVideoPath(updated[0].path);
                }
                return updated;
              });
              setImageTransform({ rotation: 0, flipH: false, flipV: false, filter: 'none' }); // reset transform on new upload
            }
          }}
        />
        <ImageEditorModal 
          isOpen={showImageEditor}
          imageUrl={
            editingAlbumPhoto 
              ? (editingAlbumPhoto.previewUrl || editingAlbumPhoto.path) 
              : (editingPostMediaIndex !== null && postMedia[editingPostMediaIndex]) 
                ? (postMedia[editingPostMediaIndex].previewUrl || postMedia[editingPostMediaIndex].path) 
                : videoFileUrl
          }
          currentTransform={imageTransform}
          brandId={activeBrand?.id}
          onClose={() => {
            setShowImageEditor(false);
            setEditingAlbumPhoto(null);
            setEditingPostMediaIndex(null);
          }}
          onSave={(file, path, fallbackTransform) => {
            if (editingAlbumPhoto) {
              // Update image inside albumMedia
              setAlbumMedia((prev) =>
                prev.map((item) =>
                  item.id === editingAlbumPhoto.id
                    ? {
                        ...item,
                        previewUrl: file ? URL.createObjectURL(file) : path,
                        path: path || item.path
                      }
                    : item
                )
              );
              setEditingAlbumPhoto(null);
            } else if (editingPostMediaIndex !== null) {
              // Update image inside postMedia
              setPostMedia((prev) =>
                prev.map((item, idx) =>
                  idx === editingPostMediaIndex
                    ? {
                        ...item,
                        file: file || item.file,
                        previewUrl: file ? URL.createObjectURL(file) : (path || item.previewUrl),
                        path: path || item.path
                      }
                    : item
                )
              );
              // Also update the main videoFile / videoFileUrl / uploadedVideoPath if it is the first media item
              if (editingPostMediaIndex === 0) {
                if (file) setVideoFile(file);
                if (file) setVideoFileUrl(URL.createObjectURL(file));
                if (path) setUploadedVideoPath(path);
              }
              setEditingPostMediaIndex(null);
            } else {
              // Default behavior for single image
              if (file && path) {
                setVideoFile(file);
                const previewUrl = URL.createObjectURL(file);
                setVideoFileUrl(previewUrl);
                setUploadedVideoPath(path);
                setImageTransform({ rotation: 0, flipH: false, flipV: false, filter: 'none' }); // reset transform since it's baked into the new image file
              } else if (fallbackTransform) {
                setImageTransform(fallbackTransform);
              }
            }
            setShowImageEditor(false);
            toast.success("Image edited successfully");
          }}
        />
        <AltTextModal 
          isOpen={showAltTextModal}
          onClose={() => setShowAltTextModal(false)}
          imageUrl={videoFileUrl}
          imageTransform={imageTransform}
          caption={caption}
          initialAltText={altText}
          onSave={(text) => {
            setAltText(text);
            toast.success("Alt text saved successfully");
          }}
        />
        {showTemplatePicker && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Diamond size={16} className="text-purple-600" />
                  <h3 className="font-bold text-[#0A0A0A] text-xs uppercase tracking-wider">Select a template</h3>
                </div>
                <button 
                  onClick={() => setShowTemplatePicker(false)}
                  className="text-gray-400 hover:text-black transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-6 max-h-[400px] overflow-y-auto space-y-3 scrollbar-thin">
                {loadingTemplates ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Loading templates...</span>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider">No templates found</p>
                    <p className="text-[11px] text-gray-400 font-medium">Create templates in the Library first to load them here.</p>
                  </div>
                ) : (
                  templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => {
                        loadTemplate(tpl);
                        setShowTemplatePicker(false);
                      }}
                      className="w-full text-left p-4 rounded-2xl border border-gray-100 hover:border-purple-300 hover:bg-purple-50/20 transition-all flex items-center gap-4 group cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 border border-gray-100">
                        {tpl.thumbnail ? (
                          <img src={tpl.thumbnail} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">📝</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-gray-900 group-hover:text-purple-700 transition-colors truncate uppercase tracking-tight">{tpl.title}</h4>
                        <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5 font-medium">{tpl.caption || "No caption"}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {tpl.platforms?.map(plt => (
                          <span key={plt} className="text-[9px] font-black bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                            {plt.toLowerCase()}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Select Reviewers Modal */}
        {showReviewersModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-6 space-y-6 text-left">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#0A0A0A] tracking-tight">Select reviewers</h3>
                <button 
                  onClick={() => setShowReviewersModal(false)}
                  className="text-gray-400 hover:text-black transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search user"
                  value={reviewerSearchQuery}
                  onChange={(e) => setReviewerSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-transparent rounded-2xl text-[12px] font-bold text-[#0A0A0A] outline-none focus:bg-white focus:border-gray-200 transition-all placeholder-gray-400"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search size={14} />
                </div>
              </div>

              {/* Users Header */}
              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-gray-400">
                <span>Users</span>
                <button 
                  type="button" 
                  onClick={() => {
                    const allIds = potentialReviewers.map(r => r.id);
                    if (selectedReviewerIds.length === potentialReviewers.length) {
                      setSelectedReviewerIds([]);
                    } else {
                      setSelectedReviewerIds(allIds);
                    }
                  }}
                  className="text-[#10B981] hover:text-[#059669] transition-colors cursor-pointer font-bold lowercase first-letter:uppercase"
                >
                  {selectedReviewerIds.length === potentialReviewers.length ? "Uncheck all" : "Check all"}
                </button>
              </div>

              {/* Users List */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1.5 scrollbar-thin">
                {potentialReviewers.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-[11px] font-bold uppercase tracking-wider">
                    Không có người duyệt khả dụng
                  </div>
                ) : (
                  potentialReviewers
                    .filter(r => r.name.toLowerCase().includes(reviewerSearchQuery.toLowerCase()))
                    .map((rev) => {
                      const isChecked = selectedReviewerIds.includes(rev.id);
                      const initials = rev.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                      const hash = rev.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                      const bgColors = ["bg-[#E6F4EA] text-[#137333]", "bg-[#FEF7E0] text-[#B06000]", "bg-[#FCE8E6] text-[#C5221F]", "bg-[#F3F4F6] text-[#1F2937]", "bg-[#E4F7F6] text-[#00796B]"];
                      const badgeStyle = bgColors[hash % bgColors.length];
                      
                      const handleToggle = () => {
                        if (isChecked) {
                          setSelectedReviewerIds(selectedReviewerIds.filter(id => id !== rev.id));
                        } else {
                          setSelectedReviewerIds([...selectedReviewerIds, rev.id]);
                        }
                      };

                      return (
                        <div 
                          key={rev.id}
                          onClick={handleToggle}
                          className="flex items-center justify-between p-3.5 bg-white border border-gray-100 hover:border-gray-200 rounded-2xl transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3.5">
                            {rev.avatarUrl ? (
                              <img src={rev.avatarUrl} alt={rev.name} className="w-8 h-8 rounded-xl object-cover border border-gray-100" />
                            ) : (
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest ${badgeStyle}`}>
                                {initials}
                              </div>
                            )}
                            <div>
                              <div className="text-[11px] font-bold text-[#0A0A0A] group-hover:text-black transition-colors">{rev.name}</div>
                              <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{rev.role}</div>
                            </div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                              isChecked 
                                ? 'border-[#10B981] bg-[#10B981] text-white' 
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isChecked && <Check size={10} strokeWidth={4} />}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Policy Settings */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">To publish this post...</div>
                <div className="space-y-2.5">
                  {[
                    { id: 'NO_APPROVAL', label: 'No reviewer approval required.' },
                    { id: 'AT_LEAST_ONE', label: 'At least one reviewer must approve it.' },
                    { id: 'ALL', label: 'All reviewers must approve it.' }
                  ].map((opt) => {
                    const isSelected = approvalPolicy === opt.id;
                    return (
                      <div 
                        key={opt.id}
                        onClick={() => setApprovalPolicy(opt.id)}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'border-[#0A0A0A] bg-[#0A0A0A]' 
                            : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-[11px] font-bold text-gray-600 group-hover:text-black transition-colors">{opt.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => setShowReviewersModal(false)}
                className="w-full py-3.5 bg-[#0A0A0A] hover:bg-black text-white text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
              >
                Confirm Selection
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Modal Ghi chú nội bộ (Team Notes) */}
      {isNotesOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-6 flex flex-col max-h-[80vh] text-left">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-gray-800" />
                  <h3 className="text-base font-bold text-[#0A0A0A] tracking-tight">Thảo luận & Ghi chú nội bộ</h3>
                </div>
                <p className="text-[11px] text-gray-400 font-semibold leading-relaxed uppercase tracking-widest">
                  Ghi chú chỉ hiển thị trong nội bộ team
                </p>
              </div>
              <button 
                onClick={() => setIsNotesOpen(false)}
                className="text-gray-400 hover:text-black transition-colors cursor-pointer p-1 rounded-full hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 scrollbar-thin max-h-[40vh]">
              {!notes || notes.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 text-gray-400">
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <MessageSquare size={24} className="text-gray-300" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Chưa có ghi chú nào</p>
                    <p className="text-[12px] text-gray-400 font-medium px-6">Hãy viết lời nhắn hoặc lưu ý đầu tiên cho bài viết này.</p>
                  </div>
                </div>
              ) : (
                notes.map((note, index) => {
                  const initials = note.author ? note.author.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'M';
                  const hash = note.author ? note.author.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : index;
                  const bgColors = ["bg-[#E6F4EA] text-[#137333]", "bg-[#FEF7E0] text-[#B06000]", "bg-[#FCE8E6] text-[#C5221F]", "bg-[#F3F4F6] text-[#1F2937]", "bg-[#E4F7F6] text-[#00796B]"];
                  const badgeStyle = bgColors[hash % bgColors.length];
                  
                  return (
                    <div key={index} className="flex gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest shrink-0 ${badgeStyle}`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0 bg-gray-50 rounded-2xl p-3.5 relative">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[11px] font-bold text-gray-800 truncate">{note.author}</span>
                          <span className="text-[9px] text-gray-400 font-medium tracking-tight whitespace-nowrap">
                            {new Date(note.timestamp).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 font-medium leading-relaxed break-words whitespace-pre-wrap">{note.text}</p>
                        
                        {/* Delete button (hidden until hover) */}
                        <button
                          onClick={() => handleDeleteNoteClick(index)}
                          className="absolute -top-1 -right-1 p-1 bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 hover:border-red-100 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          title="Xóa ghi chú này"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Note Input Area */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <textarea
                placeholder="Nhập ghi chú hoặc phản hồi mới..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-[12px] font-medium text-[#0A0A0A] outline-none focus:bg-white focus:border-gray-200 transition-all placeholder-gray-400 min-h-[80px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddNoteClick();
                  }
                }}
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">
                  Enter để gửi nhanh
                </span>
                <button
                  type="button"
                  onClick={handleAddNoteClick}
                  disabled={!newNoteText.trim()}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-[#0A0A0A] hover:bg-black disabled:bg-gray-100 disabled:text-gray-400 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all cursor-pointer shadow-md hover:shadow-lg disabled:shadow-none"
                >
                  <span>Lưu ghi chú</span>
                  <Send size={12} className="rotate-45" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {blockedProductId && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden animate-in zoom-in-95 duration-200 mx-4">
            <button 
              type="button"
              onClick={() => setBlockedProductId(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            
            <div className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-orange-500 rounded-2xl flex items-center justify-center text-white mb-5 shadow-lg shadow-purple-200 mx-auto">
              <Lock size={26} className="animate-pulse" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {FEATURE_GATE_REGISTRY[blockedProductId]?.title || "Feature Locked"}
            </h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              {FEATURE_GATE_REGISTRY[blockedProductId]?.description || "This channel/feature is not available on your current plan. Please upgrade."}
            </p>
            
            <button 
              type="button"
              onClick={() => {
                setBlockedProductId(null);
                closePostCreator();
                navigate('/pricing');
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-white transition-all bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
            >
              Upgrade Plan
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
