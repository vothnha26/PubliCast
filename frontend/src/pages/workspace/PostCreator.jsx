import * as React from "react";
import { useState, useEffect, useRef } from "react";
import {
  X, Check, Search, Lock, ArrowRight, Maximize2, Minimize2, Tag, ChevronDown, FileText
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
import { uploadMediaFile } from "../../services/mediaUpload.service";
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
import { PreviewHeader } from "../../components/workspace/post-creator/previews/PreviewHeader";
import { PreviewBody } from "../../components/workspace/post-creator/previews/PreviewBody";
import { NotesPanel } from "../../components/workspace/post-creator/NotesPanel";
import { TemplatesSidebar } from "../../components/workspace/post-creator/TemplatesSidebar";
import { AICopilotPopover } from "../../components/workspace/post-creator/popovers/AICopilotPopover";
import { NetworkCustomizeScreen } from "../../components/workspace/post-creator/NetworkCustomizeScreen";
import { RightPanelTabSwitcher } from "../../components/workspace/post-creator/RightPanelTabSwitcher";

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
    isFullScreen,
    setIsFullScreen,
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
    postMedia,
    setPostMedia,
    threadsWhoCanReply,
    setThreadsWhoCanReply,
    isEditByNetwork,
    setIsEditByNetwork,
    activeNetworkTab,
    setNetworkTab,
    activeNetworkAccountId,
    selectedAccountIds,
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
    closePostCreatorTemporarily,
    rightPanelTab,
    setRightPanelTab,
    isNetworkCustomizeOpen,
    setIsNetworkCustomizeOpen
  } = formState;

  const [threadsOpen, setThreadsOpen] = useState(false);
  const { user } = useAuthStore();
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");

  // NetworkCustomizeScreen repurposes the composer's shared activePlatform
  // state to track which channel tab is active while it's open (it has no
  // state of its own for that). Snapshot it on open and restore it on
  // close so the main composer doesn't inherit whatever platform the user
  // last looked at in Customize (e.g. its Instagram char limit leaking into
  // the main caption box after closing).
  const activePlatformBeforeCustomizeRef = useRef(null);
  useEffect(() => {
    if (isNetworkCustomizeOpen) {
      activePlatformBeforeCustomizeRef.current = activePlatform;
    } else if (activePlatformBeforeCustomizeRef.current) {
      setActivePlatform(activePlatformBeforeCustomizeRef.current);
      activePlatformBeforeCustomizeRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNetworkCustomizeOpen]);

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
  const [editingPostMediaIndex, setEditingPostMediaIndex] = useState(null);
  const [imageTransform, setImageTransform] = useState({ rotation: 0, flipH: false, flipV: false, filter: 'none' });
  const [showAltTextModal, setShowAltTextModal] = useState(false);
  
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const handleOpenTemplatePicker = async () => {
    if (!activeBrand) return;
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
    editingPostMediaIndex,
    setEditingPostMediaIndex,
    imageTransform,
    setImageTransform,
    showAltTextModal,
    setShowAltTextModal,
    useUrlShortener,
    setUseUrlShortener,
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
    backupFormState,
    isFullScreen,
    setIsFullScreen
  };

  return (
    <PostCreatorFormProvider value={contextValue}>
      <div className={`fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex flex-col overflow-hidden animate-in fade-in duration-300 ${
        isFullScreen ? 'p-0' : 'p-3 md:p-5'
      }`}>
        {/* Main Unified Workspace Card */}
        <div className={`flex-1 w-full mx-auto bg-card shadow-2xl flex flex-col overflow-hidden min-h-0 ${
          isFullScreen ? 'max-w-none rounded-none border-0' : 'max-w-[1530px] rounded-[24px] border border-border/40'
        }`}>

          {/* Unified Top Headbar matching Figma / User Reference */}
          <div className="shrink-0 px-6 py-3.5 border-b border-border/60 bg-card flex items-center justify-between z-30">
            <div className="flex items-center gap-3">
              <h1 className="text-base font-bold text-foreground tracking-tight font-sans">
                {isLibrary
                  ? (editingPost ? t("planner:postCreator.header.editTemplate") : t("planner:postCreator.header.createTemplate"))
                  : (editingPost ? t("planner:postCreator.header.editPost", "Create Post") : t("planner:postCreator.header.createPost", "Create Post"))}
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
                  onClick={closePostCreator}
                  data-testid="post-creator-close-btn"
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
            {/* Cột 1: COMPOSE (Bên trái) */}
            <div className="flex-[1.1] flex flex-col min-h-0">
              <ComposerHeader />
              <ComposerBody />
            </div>

            {/* Cột 2: PREVIEW / NOTES / TEMPLATES / AI ASSISTANT (Bên phải) —
                collapses entirely when rightPanelTab is null (re-clicking the
                active tab in RightPanelTabSwitcher toggles it off). */}
            {rightPanelTab && (
              <div className="flex-[0.9] flex flex-col min-h-0 overflow-hidden bg-muted/20 border-l border-border/40">
                {rightPanelTab === 'notes' ? (
                  <NotesPanel />
                ) : rightPanelTab === 'templates' ? (
                  <TemplatesSidebar />
                ) : rightPanelTab === 'ai' ? (
                  <AICopilotPopover
                    variant="panel"
                    caption={caption}
                    onUpdateCaption={setCaption}
                    activePlatform={activePlatform}
                    onClose={() => setRightPanelTab('preview')}
                  />
                ) : (
                  <>
                    <PreviewHeader />
                    <PreviewBody />
                  </>
                )}
              </div>
            )}
          </div>

          {/* Full-width Footer across entire bottom */}
          <ComposerFooter />
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
          // Media uploads route into the per-network slot either from the
          // main composer's "Theo mạng" mode (isEditByNetwork) or from the
          // fullscreen NetworkCustomizeScreen (isNetworkCustomizeOpen) —
          // the two are independent UIs sharing the same underlying data.
          const isInNetworkEditingContext = isEditByNetwork || isNetworkCustomizeOpen;

          const isCustomizingThreads = isInNetworkEditingContext
            && activeNetworkTab === 'threads'
            && networkCustom?.threads?.useTemplate === false;

          const isCustomizingNonThreadsPlatform = isInNetworkEditingContext
            && activeNetworkTab !== NETWORK_TAB_TEMPLATE
            && activeNetworkTab !== 'threads'
            && networkCustom?.[activeNetworkTab]?.useTemplate === false;

          // When the platform being edited has ≥2 targeted accounts, its
          // content lives in a perAccount slot, not the platform-level
          // entry — mirrors NetworkCustomizeScreen's own
          // isMultiAccountPlatform/effectiveAccountId logic, needed here so
          // media read/write (including edits saved from ImageEditorModal/
          // VideoEditorModal below) hits the right slot instead of always
          // falling back to the shared platform-level one.
          const accountsForActiveNetworkTab = isCustomizingNonThreadsPlatform
            ? (activeBrand?.socialAccounts || []).filter(
                sa => (sa.platform || '').toLowerCase() === activeNetworkTab && selectedAccountIds.includes(sa.id)
              )
            : [];
          const effectiveNetworkAccountId = accountsForActiveNetworkTab.length > 1
            ? activeNetworkAccountId
            : null;

          const activeThreadIndex = networkCustom?.threads?.activeThreadIndex || 0;
          const activeThreadPost = isCustomizingThreads
            ? networkCustom?.threads?.threadPosts?.[activeThreadIndex]
            : null;

          const activeNetworkMedia = isCustomizingNonThreadsPlatform
            ? (effectiveNetworkAccountId
                ? (networkCustom?.[activeNetworkTab]?.perAccount?.[effectiveNetworkAccountId]?.mediaUrls || [])
                : (networkCustom?.[activeNetworkTab]?.mediaUrls || []))
            : isCustomizingThreads
              ? ((typeof activeThreadPost === 'object' ? activeThreadPost?.mediaUrls : []) || [])
              : postMedia;

          return (
            <>
              <MediaUploadModal
                isOpen={showUploadModal}
                initialTab={uploadModalTab}
                multiple={!isUploadingThumbnail}
                mediaTypeFilter={mediaTypeFilter}
                onClose={() => {
                  setShowUploadModal(false);
                  setIsUploadingThumbnail(false);
                }}
                onAccept={async (items) => {
                  if (isUploadingThumbnail) {
                    // Thumbnail is the one case that needs a real URL right
                    // away (fed straight into mediaThumbnailUrl, the SSoT
                    // YouTube/Facebook Reel read at submit) — the modal
                    // itself always defers upload now, so this uploads the
                    // picked file itself instead of relying on the modal to
                    // special-case it via multiple={false}.
                    const thumbItem = items[0];
                    setIsUploadingThumbnail(false);
                    if (!thumbItem) return;
                    if (thumbItem.path) {
                      formState.setMediaThumbnailUrl(thumbItem.path);
                      return;
                    }
                    try {
                      const url = await uploadMediaFile(thumbItem.file, activeBrand.id);
                      formState.setMediaThumbnailUrl(url);
                    } catch (err) {
                      toast.error(err.message || "Failed to upload thumbnail");
                    }
                    return;
                  }

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
                    const current = activeNetworkMedia;
                    updateNetworkMedia(activeNetworkTab, [...current, ...newItems], effectiveNetworkAccountId);
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
                }}
              />
              <ImageEditorModal
                isOpen={showImageEditor}
                imageUrl={
                  editingPostMediaIndex !== null && activeNetworkMedia[editingPostMediaIndex]
                    ? (activeNetworkMedia[editingPostMediaIndex].previewUrl || activeNetworkMedia[editingPostMediaIndex].path)
                    : videoFileUrl
                }
                currentTransform={imageTransform}
                brandId={activeBrand?.id}
                onClose={() => {
                  setShowImageEditor(false);
                  setEditingPostMediaIndex(null);
                }}
                onSave={(file, path, fallbackTransform) => {
                  const trackAssetFn = usePostCreatorStore.getState().trackUploadedAsset;
                  if (trackAssetFn && path) {
                    trackAssetFn(path);
                  }

                  if (editingPostMediaIndex !== null) {
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
                      const current = activeNetworkMedia;
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
                      updateNetworkMedia(activeNetworkTab, updated, effectiveNetworkAccountId);
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
                  (editingPostMediaIndex !== null && activeNetworkMedia[editingPostMediaIndex])
                    ? (activeNetworkMedia[editingPostMediaIndex].previewUrl || activeNetworkMedia[editingPostMediaIndex].path)
                    : videoFileUrl
                }
                videoPath={
                  (editingPostMediaIndex !== null && activeNetworkMedia[editingPostMediaIndex])
                    ? activeNetworkMedia[editingPostMediaIndex].path
                    : uploadedVideoPath
                }
                initialSettings={videoSettings}
                brandId={activeBrand?.id}
                onClose={() => {
                  setShowVideoEditor(false);
                  setEditingPostMediaIndex(null);
                }}
                onSave={(newUrl, newSettings) => {
                  const trackAssetFn = usePostCreatorStore.getState().trackUploadedAsset;
                  if (trackAssetFn && newUrl && typeof newUrl === 'string' && !newUrl.startsWith('blob:')) {
                    trackAssetFn(newUrl);
                  }

                  if (editingPostMediaIndex !== null && activeNetworkMedia[editingPostMediaIndex]) {
                    const updateItem = (item, idx) =>
                      idx === editingPostMediaIndex
                        ? { ...item, previewUrl: newUrl, path: newUrl }
                        : item;
                    if (isCustomizingThreads) {
                      const current = (typeof activeThreadPost === 'object' ? activeThreadPost?.mediaUrls : []) || [];
                      updateThreadPostMedia(activeThreadIndex, current.map(updateItem));
                    } else if (isCustomizingNonThreadsPlatform) {
                      updateNetworkMedia(activeNetworkTab, activeNetworkMedia.map(updateItem), effectiveNetworkAccountId);
                    } else {
                      setPostMedia((prev) => prev.map(updateItem));
                      if (editingPostMediaIndex === 0) {
                        setVideoFileUrl(newUrl);
                        setUploadedVideoPath(newUrl);
                      }
                    }
                  } else {
                    setVideoFileUrl(newUrl);
                    setUploadedVideoPath(newUrl);
                    setVideoSettings(newSettings);
                  }
                  setShowVideoEditor(false);
                  setEditingPostMediaIndex(null);
                }}
              />

              <AltTextModal
                isOpen={showAltTextModal}
                onClose={() => {
                  setShowAltTextModal(false);
                  setEditingPostMediaIndex(null);
                }}
                imageUrl={
                  editingPostMediaIndex !== null && activeNetworkMedia[editingPostMediaIndex]
                    ? (activeNetworkMedia[editingPostMediaIndex].previewUrl || activeNetworkMedia[editingPostMediaIndex].path)
                    : videoFileUrl
                }
                imageTransform={imageTransform}
                caption={caption}
                initialAltText={
                  editingPostMediaIndex !== null && activeNetworkMedia[editingPostMediaIndex]
                    ? (activeNetworkMedia[editingPostMediaIndex].caption || "")
                    : altText
                }
                onSave={(text) => {
                  // Per-image alt text (Facebook album "Add a description"),
                  // not a single post-wide value — mirrors ImageEditorModal/
                  // VideoEditorModal's own editingPostMediaIndex-scoped
                  // write-back just above, so it lands in whichever media
                  // array is actually active (per-network override, thread
                  // post, or the main postMedia list).
                  if (editingPostMediaIndex !== null) {
                    const updateItem = (item, idx) =>
                      idx === editingPostMediaIndex ? { ...item, caption: text } : item;
                    if (isCustomizingThreads) {
                      const current = (typeof activeThreadPost === 'object' ? activeThreadPost?.mediaUrls : []) || [];
                      updateThreadPostMedia(activeThreadIndex, current.map(updateItem));
                    } else if (isCustomizingNonThreadsPlatform) {
                      updateNetworkMedia(activeNetworkTab, activeNetworkMedia.map(updateItem), effectiveNetworkAccountId);
                    } else {
                      setPostMedia((prev) => prev.map(updateItem));
                    }
                  } else {
                    setAltText(text);
                  }
                  toast.success(t("common:success"));
                  setEditingPostMediaIndex(null);
                }}
              />
            </>
          );
        })()}
        {/* Select Reviewers Modal */}
        {showReviewersModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-card rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-border w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-6 space-y-6 text-left">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground tracking-tight font-sans">{t("planner:postCreator.composer.sections.selectReviewers")}</h3>
                <button 
                  onClick={() => setShowReviewersModal(false)}
                  className="text-muted-foreground hover:text-black transition-colors cursor-pointer"
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
                  className="w-full pl-4 pr-10 py-3 bg-muted border border-transparent rounded-2xl text-[12px] font-bold text-foreground outline-none focus:bg-card focus:border-border transition-all placeholder-gray-400 font-sans"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Search size={14} />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-muted-foreground">
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
                  <div className="py-8 text-center text-muted-foreground text-[11px] font-bold uppercase tracking-wider font-sans">
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
                          className="flex items-center justify-between p-3.5 bg-card border border-border hover:border-border rounded-2xl transition-all cursor-pointer group font-sans"
                        >
                          <div className="flex items-center gap-3.5">
                            {rev.avatarUrl ? (
                              <img src={rev.avatarUrl} alt={rev.name} className="w-8 h-8 rounded-xl object-cover border border-border" />
                            ) : (
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest ${badgeStyle}`}>
                                {initials}
                              </div>
                            )}
                            <div>
                              <div className="text-[11px] font-bold text-foreground group-hover:text-black transition-colors">{rev.name}</div>
                              <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">{rev.role}</div>
                            </div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                              isChecked 
                                ? 'border-[#10B981] bg-[#10B981] text-white' 
                                : 'border-gray-300 bg-card'
                            }`}
                          >
                            {isChecked && <Check size={10} strokeWidth={4} />}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-border">
                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground font-sans">{t("planner:postCreator.composer.sections.policyLabel")}</div>
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
                            : 'border-gray-300 bg-card'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-card" />}
                        </div>
                        <span className="text-[11px] font-bold text-muted-foreground group-hover:text-black transition-colors">{opt.label}</span>
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
            <div className="bg-card rounded-3xl p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden animate-in zoom-in-95 duration-200 mx-4">
              <button 
                type="button"
                onClick={() => setBlockedProductId(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-black transition-colors cursor-pointer font-sans"
              >
                <X size={20} />
              </button>
              
              <div className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-orange-500 rounded-2xl flex items-center justify-center text-white mb-5 shadow-lg shadow-purple-200 mx-auto">
                <Lock size={26} className="animate-pulse" />
              </div>
              
              <h3 className="text-xl font-bold text-foreground mb-2 font-sans">
                {FEATURE_GATE_REGISTRY[blockedProductId]?.title || "Feature Locked"}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed font-sans">
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

        {isNetworkCustomizeOpen && (
          <NetworkCustomizeScreen onClose={() => setIsNetworkCustomizeOpen(false)} />
        )}
      </div>
    </PostCreatorFormProvider>
  );
}
