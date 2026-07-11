import * as React from "react";
import { useState } from "react";
import { 
  X, Smile, Link2, Plus, Image as ImageIcon, 
  FileText, Loader2, RotateCw, Copy, ChevronDown, 
  Calendar, Youtube, PlayCircle, Smartphone, Monitor, Info, MessageSquare,
  Languages, Settings, LayoutGrid, Film, PlusCircle, AlertCircle, Check,
  MoreHorizontal, Edit, Type, Trash2, Diamond, Search, Lock, Sparkles, ArrowRight,
  Linkedin, Send, Upload, HelpCircle
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
import { VideoEditorModal } from "../../components/workspace/post-creator/VideoEditorModal";
import { AltTextModal } from "../../components/workspace/post-creator/AltTextModal";
import { FacebookAlbumComposer } from "../../components/workspace/post-creator/FacebookAlbumComposer";
import { HashtagPickerPopover } from "../../components/workspace/post-creator/HashtagPickerPopover";
import { PLATFORM_CONFIGS } from "../../constants/platformRegistry";
import { Instagram } from "lucide-react";
import { toast } from "sonner";
import { useBrandPermission } from "../../hooks/useBrandPermission";
import { PlatformIcon } from "../../components/shared/PlatformIcon";
import { buildMediaUrl } from "../../utils/url";

// Layout Sub-components
import { ComposerHeader } from "../../components/workspace/post-creator/ComposerHeader";
import { ComposerBody } from "../../components/workspace/post-creator/ComposerBody";
import { ComposerFooter } from "../../components/workspace/post-creator/ComposerFooter";
import { PreviewHeader } from "../../components/workspace/post-creator/PreviewHeader";
import { PreviewBody } from "../../components/workspace/post-creator/PreviewBody";
import { PreviewFooter } from "../../components/workspace/post-creator/PreviewFooter";

// Context Provider
import { PostCreatorFormProvider } from "../../context/PostCreatorFormContext";

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
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [showVideoEditor, setShowVideoEditor] = useState(false);
  const [editingAlbumPhoto, setEditingAlbumPhoto] = useState(null);
  const [editingPostMediaIndex, setEditingPostMediaIndex] = useState(null);
  const [imageTransform, setImageTransform] = useState({ rotation: 0, flipH: false, flipV: false, filter: 'none' });
  const [showAltTextModal, setShowAltTextModal] = useState(false);
  const [useUrlShortener, setUseUrlShortener] = useState(false);
  
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
    setNotes,

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
    showImageMenu,
    setShowImageMenu,
    showImageEditor,
    setShowImageEditor,
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
    hasAccess,
    showVideoEditor,
    setShowVideoEditor
  };

  return (
    <PostCreatorFormProvider value={contextValue}>
      <div className="fixed inset-0 z-[2000] bg-[#F3F4F6] flex flex-col p-6 overflow-hidden animate-in slide-in-from-bottom duration-500">
        {/* Outer Header */}
        <div className="flex items-center justify-between px-2 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-800 font-sans">
              {isLibrary 
                ? (editingPost ? "Edit post template" : "Create post template") 
                : (editingPost ? "Edit scheduled post" : "Create new post")}
            </h1>
            {!editingPost && !isLibrary && (
              <button 
                onClick={handleOpenTemplatePicker}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all transform hover:scale-105 shadow-sm border border-purple-200 cursor-pointer font-sans"
              >
                <Diamond size={12} />
                Load template
              </button>
            )}
          </div>
          <button onClick={closePostCreator} className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors group cursor-pointer font-sans">
            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-[11px] font-bold uppercase tracking-widest">Close</span>
          </button>
        </div>

        {/* Main Workspace Panels */}
        <div className="flex-1 bg-white border border-gray-200 rounded-[24px] shadow-lg flex overflow-hidden">
          {/* Left Panel: Composer */}
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            <ComposerHeader />
            <ComposerBody />
            <ComposerFooter />
          </div>

          {/* Right Panel: Preview */}
          <div className="flex-[0.8] flex flex-col h-full bg-[#FAFAFA] border-l border-gray-100 overflow-hidden">
            <PreviewHeader />
            <PreviewBody />
            <PreviewFooter />
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
              setImageTransform({ rotation: 0, flipH: false, flipV: false, filter: 'none' });
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
            toast.success("Image edited successfully");
          }}
        />
        <VideoEditorModal
          isOpen={showVideoEditor}
          videoUrl={videoFileUrl}
          onClose={() => setShowVideoEditor(false)}
          onSave={(settings) => {
            setShowVideoEditor(false);
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
                  <h3 className="font-bold text-[#0A0A0A] text-xs uppercase tracking-wider font-sans">Select a template</h3>
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
                    <span className="text-[10px] font-bold uppercase tracking-wider font-sans">Loading templates...</span>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider font-sans">No templates found</p>
                    <p className="text-[11px] text-gray-400 font-medium font-sans">Create templates in the Library first to load them here.</p>
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
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#0A0A0A] tracking-tight font-sans">Select reviewers</h3>
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
                  placeholder="Search user"
                  value={reviewerSearchQuery}
                  onChange={(e) => setReviewerSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-transparent rounded-2xl text-[12px] font-bold text-[#0A0A0A] outline-none focus:bg-white focus:border-gray-200 transition-all placeholder-gray-400 font-sans"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search size={14} />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-gray-400">
                <span className="font-sans">Users</span>
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
                  {selectedReviewerIds.length === potentialReviewers.length ? "Uncheck all" : "Check all"}
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
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 font-sans">To publish this post...</div>
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
                Confirm Selection
              </button>
            </div>
          </div>
        )}

        {/* Modal Team Notes */}
        {isNotesOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-6 flex flex-col max-h-[80vh] text-left">
              <div className="flex items-start justify-between pb-4 border-b border-gray-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-gray-800" />
                    <h3 className="text-base font-bold text-[#0A0A0A] tracking-tight font-sans">Thảo luận & Ghi chú nội bộ</h3>
                  </div>
                  <p className="text-[11px] text-gray-400 font-semibold leading-relaxed uppercase tracking-widest font-sans">
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

              <div className="flex-1 overflow-y-auto py-4 space-y-3.5 scrollbar-thin max-h-[40vh]">
                {!notes || notes.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 text-gray-400 font-sans">
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
                      <div key={index} className="flex gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-200 font-sans">
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

              <div className="pt-4 border-t border-gray-100 space-y-3">
                <textarea
                  placeholder="Nhập ghi chú hoặc phản hồi mới..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-[12px] font-medium text-[#0A0A0A] outline-none focus:bg-white focus:border-gray-200 transition-all placeholder-gray-400 min-h-[80px] resize-none font-sans"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddNoteClick();
                    }
                  }}
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest font-sans">
                    Enter để gửi nhanh
                  </span>
                  <button
                    type="button"
                    onClick={handleAddNoteClick}
                    disabled={!newNoteText.trim()}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-[#0A0A0A] hover:bg-black disabled:bg-gray-100 disabled:text-gray-400 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all cursor-pointer shadow-md hover:shadow-lg disabled:shadow-none font-sans"
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
                Upgrade Plan
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </PostCreatorFormProvider>
  );
}
