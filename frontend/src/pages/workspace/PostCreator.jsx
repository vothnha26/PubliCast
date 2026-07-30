import * as React from "react";
import { useState } from "react";
import { 
  X, Loader2, Check, Search, Lock, ArrowRight, Diamond
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFeatureGate } from "../../hooks/useFeatureGate";
import { PRODUCT_IDS, FEATURE_GATE_REGISTRY } from "../../constants/products";
import postService from "../../services/post.service";
import { usePostCreatorForm } from "../../hooks/usePostCreatorForm";
import { useAuthStore } from "../../store/useAuthStore";
import { usePostCreatorStore } from "../../store/usePostCreatorStore";
import { FirstCommentModal } from "../../components/workspace/post-creator/modals/FirstCommentModal";
import { GoogleDrivePickerModal } from "../../components/workspace/post-creator/modals/GoogleDrivePickerModal";
import { MediaUploadModal } from "../../components/workspace/post-creator/modals/MediaUploadModal";
import { MEDIA_FILTER_TYPES } from "../../constants/mediaAcceptStrategy";
import { ImageEditorModal } from "../../components/workspace/post-creator/modals/ImageEditorModal";
import { VideoEditorModal } from "../../components/workspace/post-creator/modals/VideoEditorModal";
import { AltTextModal } from "../../components/workspace/post-creator/modals/AltTextModal";
import { NETWORK_TAB_TEMPLATE } from "../../constants/postComposerNetwork";
import { toast } from "sonner";
import { useBrandPermission } from "../../hooks/useBrandPermission";

// Layout Sub-components
import { ComposerHeader } from "../../components/workspace/post-creator/ComposerHeader";
import { ComposerBody } from "../../components/workspace/post-creator/ComposerBody";
import { ComposerFooter } from "../../components/workspace/post-creator/ComposerFooter";
import { ComposerErrorPanel } from "../../components/workspace/post-creator/ComposerErrorPanel";
import { PreviewHeader } from "../../components/workspace/post-creator/previews/PreviewHeader";
import { PreviewBody } from "../../components/workspace/post-creator/previews/PreviewBody";
import { NotesPanel } from "../../components/workspace/post-creator/NotesPanel";

// Context Provider
import { PostCreatorFormProvider } from "../../context/PostCreatorFormContext";

const PUBLISH_OPTIONS = [
  { id: "draft", label: "SAVE AS DRAFT", sub: "Save and publish at a later time" },
  { id: "review", label: "SEND TO REVIEW", sub: "Select reviewers" },
  { id: "schedule", label: "SAVE AND SCHEDULE", sub: "Save changes to this post" },
  { id: "now", label: "PUBLISH NOW", sub: "Publish with current date and time" },
];

export function PostCreatorPage() {
  const { t } = useTranslation(["planner", "common"]);
  const formState = usePostCreatorForm();
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
    useUrlShortener,
    setUseUrlShortener,
    previewDevice,
    setPreviewDevice,
    showPublishMenu,
    setShowPublishMenu,
    selectedPublishId,
    setSelectedPublishId,
    activeBrand,
    isCreating,
    submitProgressText,
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
    categories,
    isLoadingCategories,
    fetchCategories,
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
    instagramCollaborators,
    setInstagramCollaborators,
    instagramAudio,
    setInstagramAudio,
    instagramShowOnFeed,
    setInstagramShowOnFeed,
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
    albumMedia,
    setAlbumMedia,
    postMedia,
    setPostMedia,
    threadsWhoCanReply,
    setThreadsWhoCanReply,
    isEditByNetwork,
    setIsEditByNetwork,
    activeNetworkTab,
    setNetworkTab,
    networkCustom,
    toggleUseTemplate,
    updateNetworkCaption,
    updateNetworkMedia,
    updateThreadPostText,
    updateThreadPostMedia,
    addThreadPost,
    removeThreadPost,
    setThreadActiveIndex,
    notes,
    setNotes,
    videoSettings,
    setVideoSettings,
    getBackupPayload,
    backupFormState,
    closePostCreatorTemporarily
  } = formState;

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

  const navigate = useNavigate();
  const { hasAccess } = useFeatureGate();
  const [blockedProductId, setBlockedProductId] = useState(null);
  const { hasPermission } = useBrandPermission();
  const hasCreatePermission = hasPermission('CREATE_POSTS');

  const hasApprovePermission = 
    activeBrand?.isOwner || 
    activeBrand?.userRole === 'OWNER' ||
    activeBrand?.userRole === 'ADMIN' || 
    activeBrand?.userPermissions?.find(p => p.key === 'APPROVE_POSTS')?.isAllowed;

  const [showReviewersModal, setShowReviewersModal] = useState(false);
  const [reviewerSearchQuery, setReviewerSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadModalTab, setUploadModalTab] = useState("computer");
  const [mediaTypeFilter, setMediaTypeFilter] = useState(MEDIA_FILTER_TYPES.ALL);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [showVideoEditor, setShowVideoEditor] = useState(false);
  const [editingAlbumPhoto, setEditingAlbumPhoto] = useState(null);
  const [editingPostMediaIndex, setEditingPostMediaIndex] = useState(null);
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

  // Context value object containing all states, handlers and variables
  const contextValue = {
    ...formState,
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
    submitProgressText,
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
    facebookOpen,
    setFacebookOpen,
    facebookType,
    setFacebookType,
    showFacebookTypeMenu,
    setShowFacebookTypeMenu,
    facebookTitle,
    setFacebookTitle,
    instagramOpen,
    setInstagramOpen,
    instagramType,
    setInstagramType,
    showInstagramTypeMenu,
    setShowInstagramTypeMenu,
    instagramCollaborators,
    setInstagramCollaborators,
    instagramAudio,
    setInstagramAudio,
    instagramShowOnFeed,
    setInstagramShowOnFeed,
    getValidationErrors,
    altText,
    setAltText,
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
    albumMedia,
    setAlbumMedia,
    postMedia,
    setPostMedia,
    threadsWhoCanReply,
    setThreadsWhoCanReply,
    isEditByNetwork,
    setIsEditByNetwork,
    activeNetworkTab,
    setNetworkTab,
    networkCustom,
    toggleUseTemplate,
    updateNetworkCaption,
    updateNetworkMedia,
    updateThreadPostText,
    updateThreadPostMedia,
    addThreadPost,
    removeThreadPost,
    setThreadActiveIndex,
    notes,
    setNotes,
    videoSettings,
    setVideoSettings,

    threadsOpen,
    setThreadsOpen,
    isNotesOpen,
    setIsNotesOpen,
    isUploadingThumbnail,
    setIsUploadingThumbnail,
    newNoteText,
    setNewNoteText,
    handleAddNoteClick,
    handleDeleteNoteClick,
    blockedProductId,
    setBlockedProductId,
    showReviewersModal,
    setShowReviewersModal,
    reviewerSearchQuery,
    setReviewerSearchQuery,
    showUploadModal,
    setShowUploadModal,
    uploadModalTab,
    setUploadModalTab,
    mediaTypeFilter,
    setMediaTypeFilter,
    showImageMenu,
    setShowImageMenu,
    showImageEditor,
    setShowImageEditor,
    showVideoEditor,
    setShowVideoEditor,
    editingAlbumPhoto,
    setEditingAlbumPhoto,
    editingPostMediaIndex,
    setEditingPostMediaIndex,
    imageTransform,
    setImageTransform,
    showAltTextModal,
    setShowAltTextModal,
    useUrlShortener,
    setUseUrlShortener,
    showTemplatePicker,
    setShowTemplatePicker,
    templates,
    setTemplates,
    loadingTemplates,
    setLoadingTemplates,
    handleOpenTemplatePicker,
    hasCreatePermission,
    hasApprovePermission,
    closePostCreator,
    closePostCreatorTemporarily,
    hasAccess,
    getBackupPayload,
    backupFormState
  };

  return (
    <PostCreatorFormProvider value={contextValue}>
      <div className="fixed inset-0 z-[2000] bg-[#ECEEF2] flex flex-col p-5 overflow-hidden animate-in slide-in-from-bottom duration-500">
        {/* Outer Top Bar */}
        <div className="flex items-center justify-between px-1 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center">
                <svg className="w-4 h-4 text-white fill-white" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              </div>
              <h1 className="text-[15px] font-black text-gray-900 tracking-tight font-sans">
                {isLibrary 
                  ? (editingPost ? t("planner:postCreator.header.editTemplate") : t("planner:postCreator.header.createTemplate")) 
                  : (editingPost ? t("planner:postCreator.header.editPost") : t("planner:postCreator.header.createPost"))}
              </h1>
            </div>
            {!editingPost && !isLibrary && (
              <button 
                onClick={handleOpenTemplatePicker}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-purple-700 hover:bg-purple-50 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm border border-purple-200 cursor-pointer font-sans"
              >
                <Diamond size={11} />
                {t("planner:postCreator.header.loadTemplate")}
              </button>
            )}
          </div>
          <button onClick={closePostCreator} data-testid="post-creator-close-btn" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 hover:bg-white border border-gray-200 text-gray-500 hover:text-black transition-all group cursor-pointer font-sans shadow-sm">
            <X size={16} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-[11px] font-bold uppercase tracking-widest">{t("planner:postCreator.header.close")}</span>
          </button>
        </div>

        {/* Main Unified Workspace Card */}
        <div className="flex-1 bg-white rounded-[24px] border border-gray-200/80 shadow-xl flex overflow-hidden min-h-0">

          {/* Cột 1: COMPOSE (Bên trái) */}
          <div className="flex-[1.15] flex flex-col min-h-0 overflow-hidden border-r border-gray-100">
            <ComposerHeader />
            <ComposerBody />
            <ComposerErrorPanel />
            <ComposerFooter />
          </div>

          {/* Cột 2: PREVIEW / NOTES (Bên phải) */}
          <div className="flex-[0.85] flex flex-col min-h-0 overflow-hidden bg-white">
            {isNotesOpen ? (
              <NotesPanel />
            ) : (
              <>
                <PreviewHeader />
                <PreviewBody />
              </>
            )}
          </div>

        </div>

        {/* Modals and Sidebars */}
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
        {(() => {
          const isCustomizingThreads = isEditByNetwork
            && activeNetworkTab === 'threads'
            && networkCustom?.threads?.useTemplate === false;

          const isCustomizingNonThreadsPlatform = isEditByNetwork
            && activeNetworkTab !== NETWORK_TAB_TEMPLATE
            && activeNetworkTab !== 'threads'
            && networkCustom?.[activeNetworkTab]?.useTemplate === false;

          const activeThreadIndex = networkCustom?.threads?.activeThreadIndex || 0;
          const activeThreadPost = isCustomizingThreads
            ? networkCustom?.threads?.threadPosts?.[activeThreadIndex]
            : null;

          const activeNetworkMedia = isCustomizingNonThreadsPlatform
            ? (networkCustom?.[activeNetworkTab]?.mediaUrls || [])
            : isCustomizingThreads
              ? ((typeof activeThreadPost === 'object' ? activeThreadPost?.mediaUrls : []) || [])
              : postMedia;

          return (
            <>
              <MediaUploadModal 
                isOpen={showUploadModal}
                initialTab={uploadModalTab}
                brandId={activeBrand?.id}
                multiple={!isUploadingThumbnail}
                mediaTypeFilter={mediaTypeFilter}
                onClose={() => {
                  setShowUploadModal(false);
                  setIsUploadingThumbnail(false);
                }}
                onAccept={(result, path) => {
                  if (isUploadingThumbnail) {
                    // mediaThumbnailUrl là SSoT chung cho thumbnail — YouTube/Facebook Reel sẽ đọc từ đây khi submit
                    formState.setMediaThumbnailUrl(path);
                    setIsUploadingThumbnail(false);
                  } else {
                    // Normalize thành array items { file, path, previewUrl }
                    const items = Array.isArray(result)
                      ? result
                      : [{ file: result, path, previewUrl: result ? URL.createObjectURL(result) : path }];
                    const newItems = items.map(item => ({
                      file: item.file,
                      previewUrl: item.previewUrl || item.path,
                      path: item.path
                    }));

                    // Track bất kỳ path nào mới upload trong session
                    const trackAssetFn = usePostCreatorStore.getState().trackUploadedAsset;
                    if (trackAssetFn) {
                      newItems.forEach(item => {
                        if (item.path) trackAssetFn(item.path);
                      });
                    }

                    if (isCustomizingThreads) {
                      const current = (typeof activeThreadPost === 'object' ? activeThreadPost?.mediaUrls : []) || [];
                      updateThreadPostMedia(activeThreadIndex, [...current, ...newItems]);
                    } else if (isCustomizingNonThreadsPlatform) {
                      const current = networkCustom?.[activeNetworkTab]?.mediaUrls || [];
                      updateNetworkMedia(activeNetworkTab, [...current, ...newItems]);
                    } else {
                      setPostMedia(prev => {
                        const updated = [...prev, ...newItems];
                        if (updated.length > 0) {
                          const firstItem = updated[0];
                          setVideoFile(firstItem.file || null);
                          setVideoFileUrl(firstItem.previewUrl || firstItem.path || '');
                          setUploadedVideoPath(firstItem.path || '');
                        }
                        return updated;
                      });
                      setImageTransform({ rotation: 0, flipH: false, flipV: false, filter: 'none' });
                    }
                  }
                }}
              />
              <ImageEditorModal 
                isOpen={showImageEditor}
                imageUrl={
                  editingAlbumPhoto 
                    ? (editingAlbumPhoto.previewUrl || editingAlbumPhoto.path) 
                    : (editingPostMediaIndex !== null && activeNetworkMedia[editingPostMediaIndex]) 
                      ? (activeNetworkMedia[editingPostMediaIndex].previewUrl || activeNetworkMedia[editingPostMediaIndex].path) 
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
                  const trackAssetFn = usePostCreatorStore.getState().trackUploadedAsset;
                  if (trackAssetFn && path) {
                    trackAssetFn(path);
                  }

                  if (editingAlbumPhoto) {
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
                    if (isCustomizingThreads) {
                      const current = (typeof activeThreadPost === 'object' ? activeThreadPost?.mediaUrls : []) || [];
                      const updated = current.map((item, idx) =>
                        idx === editingPostMediaIndex
                          ? {
                              ...item,
                              file: file || item.file,
                              previewUrl: file ? URL.createObjectURL(file) : (path || item.previewUrl),
                              path: path || item.path
                            }
                          : item
                      );
                      updateThreadPostMedia(activeThreadIndex, updated);
                    } else if (isCustomizingNonThreadsPlatform) {
                      const current = networkCustom?.[activeNetworkTab]?.mediaUrls || [];
                      const updated = current.map((item, idx) =>
                        idx === editingPostMediaIndex
                          ? {
                              ...item,
                              file: file || item.file,
                              previewUrl: file ? URL.createObjectURL(file) : (path || item.previewUrl),
                              path: path || item.path
                            }
                          : item
                      );
                      updateNetworkMedia(activeNetworkTab, updated);
                    } else {
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
                      if (editingPostMediaIndex === 0) {
                        if (file) setVideoFile(file);
                        if (file) setVideoFileUrl(URL.createObjectURL(file));
                        if (path) setUploadedVideoPath(path);
                      }
                    }
                    setEditingPostMediaIndex(null);
                  } else {
                    if (file && path) {
                      setVideoFile(file);
                      const previewUrl = URL.createObjectURL(file);
                      setVideoFileUrl(previewUrl);
                      setUploadedVideoPath(path);
                      setImageTransform({ rotation: 0, flipH: false, flipV: false, filter: 'none' });
                    } else if (fallbackTransform) {
                      setImageTransform(fallbackTransform);
                    }
                  }
                  setShowImageEditor(false);
                  toast.success(t("common:success"));
                }}
              />
              <VideoEditorModal 
                isOpen={showVideoEditor}
                videoUrl={
                  editingAlbumPhoto 
                    ? (editingAlbumPhoto.previewUrl || editingAlbumPhoto.path) 
                    : (editingPostMediaIndex !== null && activeNetworkMedia[editingPostMediaIndex]) 
                      ? (activeNetworkMedia[editingPostMediaIndex].previewUrl || activeNetworkMedia[editingPostMediaIndex].path) 
                      : videoFileUrl
                }
                videoPath={
                  editingAlbumPhoto
                    ? editingAlbumPhoto.path
                    : (editingPostMediaIndex !== null && activeNetworkMedia[editingPostMediaIndex])
                      ? activeNetworkMedia[editingPostMediaIndex].path
                      : uploadedVideoPath
                }
                initialSettings={videoSettings}
                brandId={activeBrand?.id}
                onClose={() => {
                  setShowVideoEditor(false);
                  setEditingAlbumPhoto(null);
                  setEditingPostMediaIndex(null);
                }}
                onSave={(newUrl, newSettings) => {
                  const trackAssetFn = usePostCreatorStore.getState().trackUploadedAsset;
                  if (trackAssetFn && newUrl && typeof newUrl === 'string' && !newUrl.startsWith('blob:')) {
                    trackAssetFn(newUrl);
                  }

                  if (editingAlbumPhoto) {
                    setAlbumMedia((prev) =>
                      prev.map((item) =>
                        item.id === editingAlbumPhoto.id
                          ? {
                              ...item,
                              previewUrl: newUrl,
                              path: newUrl
                            }
                          : item
                      )
                    );
                  } else if (editingPostMediaIndex !== null && activeNetworkMedia[editingPostMediaIndex]) {
                    updateNetworkMedia(editingPostMediaIndex, {
                      previewUrl: newUrl,
                      path: newUrl
                    });
                  } else {
                    setVideoFileUrl(newUrl);
                    setUploadedVideoPath(newUrl);
                    setVideoSettings(newSettings);
                  }
                  setShowVideoEditor(false);
                  setEditingAlbumPhoto(null);
                  setEditingPostMediaIndex(null);
                }}
              />
            </>
          );
        })()}

        <AltTextModal 
          isOpen={showAltTextModal}
          onClose={() => setShowAltTextModal(false)}
          imageUrl={videoFileUrl}
          imageTransform={imageTransform}
          caption={caption}
          initialAltText={altText}
          onSave={(text) => {
            setAltText(text);
            toast.success(t("common:success"));
          }}
        />
        {showTemplatePicker && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Diamond size={16} className="text-purple-600" />
                  <h3 className="font-bold text-[#0A0A0A] text-xs uppercase tracking-wider font-sans">{t("planner:postCreator.header.loadTemplate")}</h3>
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
                    <span className="text-[10px] font-bold uppercase tracking-wider font-sans">{t("planner:postCreator.templatesPicker.loading")}</span>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider font-sans">{t("planner:postCreator.templatesPicker.noTemplates")}</p>
                    <p className="text-[11px] text-gray-400 font-medium font-sans">{t("planner:postCreator.templatesPicker.noTemplatesDesc")}</p>
                  </div>
                ) : (
                  templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => {
                        loadTemplate(tpl);
                        setShowTemplatePicker(false);
                      }}
                      className="w-full text-left p-4 rounded-2xl border border-gray-100 hover:border-purple-300 hover:bg-purple-50/20 transition-all flex items-center gap-4 group cursor-pointer font-sans"
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
                        <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5 font-medium">{tpl.caption || t("planner:postCreator.templatesPicker.noCaption")}</p>
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
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#0A0A0A] tracking-tight font-sans">{t("planner:postCreator.composer.sections.selectReviewers")}</h3>
                <button 
                  onClick={() => setShowReviewersModal(false)}
                  className="text-gray-400 hover:text-black transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder={t("planner:postCreator.composer.sections.searchUser")}
                  value={reviewerSearchQuery}
                  onChange={(e) => setReviewerSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-transparent rounded-2xl text-[12px] font-bold text-[#0A0A0A] outline-none focus:bg-white focus:border-gray-200 transition-all placeholder-gray-400 font-sans"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search size={14} />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-gray-400">
                <span className="font-sans">{t("planner:postCreator.composer.sections.reviewers")}</span>
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
                  className="text-[#10B981] hover:text-[#059669] transition-colors cursor-pointer font-bold lowercase first-letter:uppercase font-sans"
                >
                  {selectedReviewerIds.length === potentialReviewers.length ? t("planner:postCreator.composer.sections.uncheckAll") : t("planner:postCreator.composer.sections.checkAll")}
                </button>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1.5 scrollbar-thin">
                {potentialReviewers.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-[11px] font-bold uppercase tracking-wider font-sans">
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
                          className="flex items-center justify-between p-3.5 bg-white border border-gray-100 hover:border-gray-200 rounded-2xl transition-all cursor-pointer group font-sans"
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

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 font-sans">{t("planner:postCreator.composer.sections.policyLabel")}</div>
                <div className="space-y-2.5">
                  {[
                    { id: 'NO_APPROVAL', label: t("planner:postCreator.composer.sections.policyNone") },
                    { id: 'AT_LEAST_ONE', label: t("planner:postCreator.composer.sections.policyAtLeastOne") },
                    { id: 'ALL', label: t("planner:postCreator.composer.sections.policyAll") }
                  ].map((opt) => {
                    const isSelected = approvalPolicy === opt.id;
                    return (
                      <div 
                        key={opt.id}
                        onClick={() => setApprovalPolicy(opt.id)}
                        className="flex items-center gap-3 cursor-pointer group font-sans"
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

              <button
                type="button"
                onClick={() => setShowReviewersModal(false)}
                className="w-full py-3.5 bg-[#0A0A0A] hover:bg-black text-white text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98] font-sans"
              >
                {t("planner:postCreator.composer.sections.confirmSelection")}
              </button>
            </div>
          </div>
        )}


        {blockedProductId && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden animate-in zoom-in-95 duration-200 mx-4">
              <button 
                type="button"
                onClick={() => setBlockedProductId(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors cursor-pointer font-sans"
              >
                <X size={20} />
              </button>
              
              <div className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-orange-500 rounded-2xl flex items-center justify-center text-white mb-5 shadow-lg shadow-purple-200 mx-auto">
                <Lock size={26} className="animate-pulse" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2 font-sans">
                {FEATURE_GATE_REGISTRY[blockedProductId]?.title || "Feature Locked"}
              </h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed font-sans">
                {FEATURE_GATE_REGISTRY[blockedProductId]?.description || "This channel/feature is not available on your current plan. Please upgrade."}
              </p>
              
              <button 
                type="button"
                onClick={() => {
                  setBlockedProductId(null);
                  closePostCreator();
                  navigate('/pricing');
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-white transition-all bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 shadow-md hover:shadow-lg active:scale-95 cursor-pointer font-sans"
              >
                {t("planner:upgrade.button")}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </PostCreatorFormProvider>
  );
}
