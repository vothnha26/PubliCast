import * as React from "react";
import { useState, useEffect, useRef, useMemo } from "react";
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
import { MEDIA_FILTER_TYPES } from "../../constants/mediaAcceptStrategy";
import { ImageEditorModal } from "../../components/workspace/post-creator/modals/ImageEditorModal";
import { VideoEditorModal } from "../../components/workspace/post-creator/modals/VideoEditorModal";
import { AltTextModal } from "../../components/workspace/post-creator/modals/AltTextModal";
import { ReviewersModal } from "../../components/workspace/post-creator/modals/ReviewersModal";
import { FeatureGateModal } from "../../components/workspace/post-creator/modals/FeatureGateModal";
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
    setActiveNetworkTab,
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
  // Snapshot of which network tab/account was active when the upload modal
  // was opened — onAccept must route files to THIS target, not whatever
  // tab happens to be active when Accept is clicked. The modal's uploads
  // start immediately on file selection (before Accept), so if the user
  // switches network tabs while the modal is still open, reading the live
  // activeNetworkTab at Accept time would silently reassign already-picked
  // files to the wrong platform (or drop them from the shared template).
  const [uploadTargetContext, setUploadTargetContext] = useState(null);
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

  // Context value object containing all states, handlers and variables (Memoized)
  const contextValue = useMemo(() => ({
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
    setActiveNetworkTab,
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
    uploadTargetContext,
    setUploadTargetContext,
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
  }), [
    caption, title, selectedPlatforms, activePlatform, platformLimits,
    previewDevice, showPublishMenu, selectedPublishId, activeBrand, isCreating,
    submitProgressText, scheduledDate, isLibrary, globalOpen, youtubeOpen, youtubeType,
    showTypeMenu, youtubeTitle, youtubeMadeForKids, youtubePrivacy, youtubeCategory,
    youtubePlaylistId, youtubeTags, youtubeFirstComment, globalFirstComment, youtubeThumbnail,
    playlists, isLoadingPlaylists, videoFile, videoFileUrl, uploadedVideoPath, isUploadingVideo,
    activePopover, showFirstCommentModal, isDriveModalOpen, editingPost, facebookOpen,
    facebookType, showFacebookTypeMenu, facebookTitle, instagramOpen, instagramType,
    showInstagramTypeMenu, instagramCollaborators, instagramAudio, instagramShowOnFeed,
    altText, tiktokOpen, tiktokPrivacy, tiktokAllowComments, tiktokAllowDuet, tiktokAllowStitch,
    tiktokAiGenerated, tiktokCommercialContent, potentialReviewers, selectedReviewerId,
    selectedReviewerIds, approvalPolicy, requesterNote, isLoadingReviewers, postMedia,
    threadsWhoCanReply, isEditByNetwork, activeNetworkTab, activeNetworkAccountId, networkCustom, notes, videoSettings,
    threadsOpen, isUploadingThumbnail, newNoteText, blockedProductId, showReviewersModal,
    reviewerSearchQuery, showUploadModal, uploadModalTab, mediaTypeFilter, uploadTargetContext, showImageMenu,
    showImageEditor, showVideoEditor, editingPostMediaIndex, imageTransform, showAltTextModal,
    useUrlShortener, templates, loadingTemplates, hasCreatePermission, hasApprovePermission,
    isFullScreen
  ]);

  if (!isOpen) return null;

  return (
    <PostCreatorFormProvider value={contextValue}>
      <div className={`fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex flex-col overflow-hidden animate-in fade-in duration-300 ${
        isFullScreen ? 'p-0' : 'p-3 md:p-5'
      }`}>
        {/* Main Unified Workspace Card */}
        <div className={`flex-1 w-full mx-auto bg-card shadow-2xl flex flex-col overflow-hidden min-h-0 ${
          isFullScreen ? 'max-w-none rounded-none border-0' : 'max-w-[1530px] rounded-[24px] border border-border/40'
        }`}>

          {/* Unified Top Headbar matching Figma / User Reference — below md,
              the title + Tags button + RightPanelTabSwitcher (4 tabs) don't
              fit 375px width alongside fullscreen/close. Close in particular
              is the one control a user must always be able to reach without
              scrolling, so it (with Fullscreen) stays pinned outside the
              scroll region; only title+Tags+tabs scroll horizontally. */}
          <div className="shrink-0 px-3 md:px-6 py-3.5 border-b border-border/60 bg-card flex items-center justify-between gap-2 z-30">
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-none min-w-0">
              <h1 className="text-base font-bold text-foreground tracking-tight font-sans whitespace-nowrap shrink-0">
                {isLibrary
                  ? (editingPost ? t("planner:postCreator.header.editTemplate") : t("planner:postCreator.header.createTemplate"))
                  : (editingPost ? t("planner:postCreator.header.editPost", "Create Post") : t("planner:postCreator.header.createPost", "Create Post"))}
              </h1>

              {/* Tags Dropdown Button */}
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer font-sans shadow-xs shrink-0"
              >
                <Tag size={13} className="text-muted-foreground" />
                <span>{t("planner:postCreator.header.tags", "Tags")}</span>
                <ChevronDown size={12} className="text-muted-foreground" />
              </button>

              <div className="hidden md:block h-4 w-px bg-border/60 shrink-0" />

              <div className="hidden md:block shrink-0">
                <RightPanelTabSwitcher />
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
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

          {/* Below md, RightPanelTabSwitcher moves to its own row (hidden
              from the scrollable title row above) since it's how mobile
              users reach Notes/Templates/AI — burying it in a horizontal
              scroll next to the title made it easy to miss entirely. */}
          <div className="md:hidden shrink-0 px-3 py-2 border-b border-border/60 bg-card overflow-x-auto scrollbar-none">
            <RightPanelTabSwitcher />
          </div>

          {/* Main 2-Column Content Body — stacks vertically (form above
              preview, both independently scrollable) below md, since a
              side-by-side flex here left each column only a few dozen px
              wide on a 375px viewport. */}
          <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden min-h-0">
            {/* Cột 1: COMPOSE (Bên trái) */}
            <div className="md:flex-[1.1] flex flex-col min-h-0 shrink-0 md:shrink">
              <ComposerHeader />
              <ComposerBody />
            </div>

            {/* Cột 2: PREVIEW / NOTES / TEMPLATES / AI ASSISTANT (Bên phải) —
                collapses entirely when rightPanelTab is null (re-clicking the
                active tab in RightPanelTabSwitcher toggles it off). */}
            {rightPanelTab && (
              <div className="md:flex-[0.9] flex flex-col min-h-0 overflow-hidden bg-muted/20 border-t md:border-t-0 md:border-l border-border/40">
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

          // When the platform being edited has ≥2 targeted accounts, its
          // content lives in a perAccount slot, not the platform-level
          // entry — mirrors NetworkCustomizeScreen's own
          // isMultiAccountPlatform/effectiveAccountId logic, needed here so
          // media read/write (including edits saved from ImageEditorModal/
          // VideoEditorModal below) hits the right slot instead of always
          // falling back to the shared platform-level one.
          const accountsForActiveNetworkTab = (activeBrand?.socialAccounts || []).filter(
            sa => (sa.platform || '').toLowerCase() === activeNetworkTab && selectedAccountIds.includes(sa.id)
          );
          const effectiveNetworkAccountId = accountsForActiveNetworkTab.length > 1
            ? activeNetworkAccountId
            : null;

          const isCustomizingThreads = isInNetworkEditingContext
            && activeNetworkTab === 'threads';

          const isCustomizingNonThreadsPlatform = isInNetworkEditingContext
            && activeNetworkTab !== NETWORK_TAB_TEMPLATE
            && activeNetworkTab !== 'threads';

          const activeThreadIndex = networkCustom?.threads?.activeThreadIndex || 0;
          const activeThreadPost = isCustomizingThreads
            ? networkCustom?.threads?.threadPosts?.[activeThreadIndex]
            : null;

          const activeNetworkEntry = networkCustom?.[activeNetworkTab];
          const activeNetworkSlot = effectiveNetworkAccountId
            ? activeNetworkEntry?.perAccount?.[effectiveNetworkAccountId]
            : activeNetworkEntry;

          const isCustomMedia = activeNetworkSlot?.useTemplate === false;

          const activeNetworkMedia = isCustomizingNonThreadsPlatform
            ? (isCustomMedia
                ? (activeNetworkSlot?.mediaUrls || [])
                : postMedia)
            : isCustomizingThreads
              ? ((typeof activeThreadPost === 'object' ? activeThreadPost?.mediaUrls : []) || [])
              : postMedia;

          // Resolves where an accepted upload batch should land, using the
          // target snapshotted when the modal was opened (uploadTargetContext)
          // instead of the render-time values above — those drift if the
          // user switches network tabs while the modal is still open
          // (uploads start on file-select, before Accept), which previously
          // silently misfiled or dropped media picked for a different
          // platform. Falls back to the live values only for the thumbnail
          // flow's non-media-grid uses of activeThreadIndex/activeThreadPost.
          const resolveAcceptTarget = () => {
            if (uploadTargetContext === null) {
              return { kind: 'template' };
            }
            const { platform, accountId } = uploadTargetContext;
            if (platform === 'threads') {
              const threadIndex = networkCustom?.threads?.activeThreadIndex || 0;
              const threadPost = networkCustom?.threads?.threadPosts?.[threadIndex];
              return { kind: 'threads', threadIndex, threadPost };
            }
            const entry = networkCustom?.[platform];
            const slot = accountId ? entry?.perAccount?.[accountId] : entry;
            return {
              kind: 'network',
              platform,
              accountId,
              current: (slot?.useTemplate === false ? (slot?.mediaUrls || []) : postMedia)
            };
          };

          return (
            <>
              <MediaUploadModal
                isOpen={showUploadModal}
                initialTab={uploadModalTab}
                multiple={!isUploadingThumbnail}
                mediaTypeFilter={mediaTypeFilter}
                brandId={activeBrand?.id}
                onClose={() => {
                  setShowUploadModal(false);
                  setIsUploadingThumbnail(false);
                }}
                onAccept={async (items) => {
                  if (isUploadingThumbnail) {
                    // Same upload-on-select path as every other media item
                    // now (previously deferred to handleCreatePost's
                    // pending-file scan) — the modal already started the
                    // Cloudinary upload the moment the file was picked, so
                    // thumbItem.path may already be set; if not, the
                    // usePostCreatorForm sync effect fills mediaThumbnailPath
                    // in once the store's mediaUploads entry resolves.
                    const thumbItem = items[0];
                    setIsUploadingThumbnail(false);
                    if (!thumbItem) return;
                    if (thumbItem.path) {
                      formState.setMediaThumbnailUrl(thumbItem.path);
                      formState.setMediaThumbnailFile(null);
                      formState.setMediaThumbnailPath(thumbItem.path);
                      return;
                    }
                    formState.setMediaThumbnailFile(thumbItem.file);
                    formState.setMediaThumbnailPath(null);
                    formState.setMediaThumbnailUrl(thumbItem.previewUrl || "");
                    return;
                  }

                  const newItems = items.map(item => ({
                    file: item.file,
                    previewUrl: item.previewUrl || item.path,
                    path: item.path,
                    fileKey: item.fileKey
                  }));

                  // Library/URL-tab items already carry a real path at accept
                  // time (no upload involved) — track those now. Items from
                  // the "computer" tab are tracked as soon as their
                  // upload-on-select promise resolves (see
                  // MediaUploadModal's startUploadForFile), not here.
                  const trackAssetFn = usePostCreatorStore.getState().trackUploadedAsset;
                  if (trackAssetFn) {
                    newItems.forEach(item => {
                      if (item.path && !item.file) trackAssetFn(item.path);
                    });
                  }

                  const acceptTarget = resolveAcceptTarget();
                  setUploadTargetContext?.(null);

                  if (acceptTarget.kind === 'threads') {
                    const current = (typeof acceptTarget.threadPost === 'object' ? acceptTarget.threadPost?.mediaUrls : []) || [];
                    updateThreadPostMedia(acceptTarget.threadIndex, [...current, ...newItems]);
                  } else if (acceptTarget.kind === 'network') {
                    updateNetworkMedia(acceptTarget.platform, [...acceptTarget.current, ...newItems], acceptTarget.accountId);
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
                eager={false}
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
                    ? (typeof activeNetworkMedia[editingPostMediaIndex] === 'string'
                        ? activeNetworkMedia[editingPostMediaIndex]
                        : (activeNetworkMedia[editingPostMediaIndex].previewUrl || activeNetworkMedia[editingPostMediaIndex].path))
                    : (typeof postMedia[0] === 'string'
                        ? postMedia[0]
                        : (postMedia[0]?.previewUrl || postMedia[0]?.path || videoFileUrl))
                }
                imageTransform={imageTransform}
                caption={caption}
                initialAltText={
                  editingPostMediaIndex !== null && activeNetworkMedia[editingPostMediaIndex]
                    ? (typeof activeNetworkMedia[editingPostMediaIndex] === 'object'
                        ? (activeNetworkMedia[editingPostMediaIndex].caption || "")
                        : "")
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
                    const updateItem = (item, idx) => {
                      if (idx !== editingPostMediaIndex) return item;
                      if (typeof item === 'string') {
                        return { file: null, previewUrl: item, path: item, caption: text };
                      }
                      return { ...item, caption: text };
                    };
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
        <ReviewersModal />

        {/* Feature Gate / Locked Feature Upgrade Modal */}
        <FeatureGateModal />

        {isNetworkCustomizeOpen && (
          <NetworkCustomizeScreen onClose={() => setIsNetworkCustomizeOpen(false)} />
        )}
      </div>
    </PostCreatorFormProvider>
  );
}
