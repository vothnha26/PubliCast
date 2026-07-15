import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import apiService from "../services/api";
import { useBrand } from "../context/BrandContext";
import socialService from "../services/social.service";
import { usePostCreator } from "../context/PostCreatorContext";
import { DEFAULT_PLATFORM, PLATFORMS } from "../constants/platforms";
import { PLATFORM_CONFIGS } from "../constants/platformRegistry";
import { POST_STATUS, PUBLISH_MODE, PUBLISH_MODE_TO_STATUS, STATUS_TO_PUBLISH_MODE } from "../constants/postStatus";
import { POST_TYPE, YOUTUBE_TYPE, FACEBOOK_TYPE, INSTAGRAM_TYPE, TIKTOK_PRIVACY, APPROVAL_POLICY, YOUTUBE_DEFAULT_CATEGORY_ID } from "../constants/postTypes";
import { buildMediaUrl, isVideoPath } from "../utils/url";
import { validatePostForm } from "../utils/postValidation";
import { logger } from "../utils/logger";
import postService from "../services/post.service";

const toLocalDatetimeString = (dateInput) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export function usePostCreatorForm() {
  const { 
    isOpen, 
    closePostCreator,
    closePostCreatorTemporarily,
    editingPost, 
    templatePost,
    defaultScheduledAt,
    isLibrary: initialIsLibrary,
    videoFile, 
    setVideoFile,
    videoFileUrl, 
    setVideoFileUrl,
    isUploadingVideo, 
    setIsUploadingVideo,
    uploadedVideoPath, 
    setUploadedVideoPath,
    albumMedia,
    setAlbumMedia,
    postMedia,
    setPostMedia,
    backupFormState,
    restoreFormState,
    openPostCreator
  } = usePostCreator();
  
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState([DEFAULT_PLATFORM]);
  const [activePlatform, setActivePlatform] = useState(DEFAULT_PLATFORM);
  const [platformLimits, setPlatformLimits] = useState([]);
  const [previewDevice, setPreviewDevice] = useState("mobile");
  const [showPublishMenu, setShowPublishMenu] = useState(false);
  const [selectedPublishId, setSelectedPublishId] = useState("now");
  const { activeBrand } = useBrand();
  const [isCreating, setIsCreating] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(() => toLocalDatetimeString(new Date()));
  const [isLibrary, setIsLibrary] = useState(false);

  // Presets Accordion States
  const [globalOpen, setGlobalOpen] = useState(false);
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const [facebookOpen, setFacebookOpen] = useState(false);
  const [tiktokOpen, setTiktokOpen] = useState(false);
  const [instagramOpen, setInstagramOpen] = useState(false);

  // Instagram Dropdown / Mode State
  const [instagramType, setInstagramType] = useState(INSTAGRAM_TYPE.POST);
  const [showInstagramTypeMenu, setShowInstagramTypeMenu] = useState(false);
  const [instagramCollaborators, setInstagramCollaborators] = useState([]);
  const [instagramAudio, setInstagramAudio] = useState(null);
  const [instagramShowOnFeed, setInstagramShowOnFeed] = useState(true);
  const [tiktokPrivacy, setTiktokPrivacy] = useState(TIKTOK_PRIVACY.PUBLIC);
  const [tiktokAllowComments, setTiktokAllowComments] = useState(true);
  const [tiktokAllowDuet, setTiktokAllowDuet] = useState(true);
  const [tiktokAllowStitch, setTiktokAllowStitch] = useState(true);
  const [tiktokAiGenerated, setTiktokAiGenerated] = useState(false);
  const [tiktokCommercialContent, setTiktokCommercialContent] = useState(false);
  const [selectedDiscordChannels, setSelectedDiscordChannels] = useState([]);
  const [discordOpen, setDiscordOpen] = useState(false);

  // Selector Video/Short State
  const [youtubeType, setYoutubeType] = useState(YOUTUBE_TYPE.VIDEO);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  // Facebook Dropdown / Mode State
  const [facebookType, setFacebookType] = useState(FACEBOOK_TYPE.POST);
  const [showFacebookTypeMenu, setShowFacebookTypeMenu] = useState(false);
  const [facebookTitle, setFacebookTitle] = useState("");
  const [facebookReelCollaboratorId, setFacebookReelCollaboratorId] = useState("");
  const [facebookReelPlaceId, setFacebookReelPlaceId] = useState("");
  const [facebookReelThumbnail, setFacebookReelThumbnail] = useState("");

  // YouTube Presets States
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [youtubeMadeForKids, setYoutubeMadeForKids] = useState(false);
  const [youtubePrivacy, setYoutubePrivacy] = useState("public");
  const [youtubeCategory, setYoutubeCategory] = useState(YOUTUBE_DEFAULT_CATEGORY_ID);
  const [youtubePlaylistId, setYoutubePlaylistId] = useState("");
  const [youtubeTags, setYoutubeTags] = useState("");
  const [youtubeFirstComment, setYoutubeFirstComment] = useState("");
  const [globalFirstComment, setGlobalFirstComment] = useState("");
  const [youtubeThumbnail, setYoutubeThumbnail] = useState("");

  // Threads States
  const [threadsWhoCanReply, setThreadsWhoCanReply] = useState("everyone");

  // Video metadata states for format validation
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoWidth, setVideoWidth] = useState(0);
  const [videoHeight, setVideoHeight] = useState(0);

  // Approval Workflow states
  const [potentialReviewers, setPotentialReviewers] = useState([]);
  const [selectedReviewerId, setSelectedReviewerId] = useState("");
  const [selectedReviewerIds, setSelectedReviewerIds] = useState([]);
  const [approvalPolicy, setApprovalPolicy] = useState(APPROVAL_POLICY.AT_LEAST_ONE);
  const [requesterNote, setRequesterNote] = useState("Vui lòng phê duyệt bài viết này.");
  const [notes, setNotes] = useState([]);
  const [isLoadingReviewers, setIsLoadingReviewers] = useState(false);
  const [videoSettings, setVideoSettings] = useState(null);

  useEffect(() => {
    const backup = restoreFormState();
    if (backup) {
      setCaption(backup.caption ?? "");
      setTitle(backup.title ?? "");
      setAltText(backup.altText ?? "");
      setSelectedPlatforms(backup.selectedPlatforms ?? [DEFAULT_PLATFORM]);
      setActivePlatform(backup.activePlatform ?? DEFAULT_PLATFORM);
      setScheduledDate(backup.scheduledDate ?? "");
      setIsLibrary(backup.isLibrary ?? false);
      setGlobalOpen(backup.globalOpen ?? false);
      setYoutubeOpen(backup.youtubeOpen ?? false);
      setFacebookOpen(backup.facebookOpen ?? false);
      setTiktokOpen(backup.tiktokOpen ?? false);
      setInstagramOpen(backup.instagramOpen ?? false);
      setInstagramType(backup.instagramType ?? INSTAGRAM_TYPE.POST);
      setInstagramCollaborators(backup.instagramCollaborators ?? []);
      setInstagramAudio(backup.instagramAudio ?? null);
      setInstagramShowOnFeed(backup.instagramShowOnFeed ?? true);
      setTiktokPrivacy(backup.tiktokPrivacy ?? TIKTOK_PRIVACY.PUBLIC);
      setTiktokAllowComments(backup.tiktokAllowComments ?? true);
      setTiktokAllowDuet(backup.tiktokAllowDuet ?? true);
      setTiktokAllowStitch(backup.tiktokAllowStitch ?? true);
      setTiktokAiGenerated(backup.tiktokAiGenerated ?? false);
      setTiktokCommercialContent(backup.tiktokCommercialContent ?? false);
      setSelectedDiscordChannels(backup.selectedDiscordChannels ?? []);
      setDiscordOpen(backup.discordOpen ?? false);
      setYoutubeType(backup.youtubeType ?? YOUTUBE_TYPE.VIDEO);
      setFacebookType(backup.facebookType ?? FACEBOOK_TYPE.POST);
      setFacebookTitle(backup.facebookTitle ?? "");
      setFacebookReelCollaboratorId(backup.facebookReelCollaboratorId ?? "");
      setFacebookReelPlaceId(backup.facebookReelPlaceId ?? "");
      setFacebookReelThumbnail(backup.facebookReelThumbnail ?? "");
      setYoutubeTitle(backup.youtubeTitle ?? "");
      setYoutubeMadeForKids(backup.youtubeMadeForKids ?? false);
      setYoutubePrivacy(backup.youtubePrivacy ?? "public");
      setYoutubeCategory(backup.youtubeCategory ?? YOUTUBE_DEFAULT_CATEGORY_ID);
      setYoutubePlaylistId(backup.youtubePlaylistId ?? "");
      setYoutubeTags(backup.youtubeTags ?? "");
      setYoutubeFirstComment(backup.youtubeFirstComment ?? "");
      setGlobalFirstComment(backup.globalFirstComment ?? "");
      setYoutubeThumbnail(backup.youtubeThumbnail ?? "");
      setThreadsWhoCanReply(backup.threadsWhoCanReply ?? "everyone");
      setSelectedReviewerId(backup.selectedReviewerId ?? "");
      setSelectedReviewerIds(backup.selectedReviewerIds ?? []);
      setApprovalPolicy(backup.approvalPolicy ?? APPROVAL_POLICY.AT_LEAST_ONE);
      setRequesterNote(backup.requesterNote ?? "");
      setNotes(backup.notes ?? []);
      const currentStoreState = usePostCreator.getState();

      let updatedPostMedia = backup.postMedia || [];
      if (currentStoreState.videoFileUrl && backup.videoFileUrl && currentStoreState.videoFileUrl !== backup.videoFileUrl) {
        updatedPostMedia = updatedPostMedia.map(item => {
          if (item.path === backup.uploadedVideoPath || item.previewUrl === backup.videoFileUrl) {
            return {
              ...item,
              previewUrl: currentStoreState.videoFileUrl,
              path: currentStoreState.uploadedVideoPath || currentStoreState.videoFileUrl
            };
          }
          return item;
        });
      }

      setVideoSettings(currentStoreState.videoSettings || backup.videoSettings || null);
      
      // Mở lại popup PostCreator
      openPostCreator({
        post: backup.editingPost,
        template: backup.templatePost,
        defaultScheduledAt: backup.defaultScheduledAt,
        isLibrary: backup.isLibrary,
        defaultVideoUrl: currentStoreState.videoFileUrl || backup.videoFileUrl,
        defaultVideoPath: currentStoreState.uploadedVideoPath || backup.uploadedVideoPath,
        isUploadingVideo: backup.isUploadingVideo,
        videoSettings: currentStoreState.videoSettings || backup.videoSettings || null,
        postMedia: updatedPostMedia,
        albumMedia: backup.albumMedia
      });
    }
  }, []);

  const getBackupPayload = () => {
    return {
      caption,
      title,
      altText,
      selectedPlatforms,
      activePlatform,
      scheduledDate,
      isLibrary,
      globalOpen,
      youtubeOpen,
      facebookOpen,
      tiktokOpen,
      instagramOpen,
      instagramType,
      instagramCollaborators,
      instagramAudio,
      instagramShowOnFeed,
      tiktokPrivacy,
      tiktokAllowComments,
      tiktokAllowDuet,
      tiktokAllowStitch,
      tiktokAiGenerated,
      tiktokCommercialContent,
      selectedDiscordChannels,
      discordOpen,
      youtubeType,
      facebookType,
      facebookTitle,
      facebookReelCollaboratorId,
      facebookReelPlaceId,
      facebookReelThumbnail,
      youtubeTitle,
      youtubeMadeForKids,
      youtubePrivacy,
      youtubeCategory,
      youtubePlaylistId,
      youtubeTags,
      youtubeFirstComment,
      globalFirstComment,
      youtubeThumbnail,
      threadsWhoCanReply,
      selectedReviewerId,
      selectedReviewerIds,
      approvalPolicy,
      requesterNote,
      notes,
      videoSettings,
      editingPost,
      templatePost,
      defaultScheduledAt,
      videoFileUrl,
      uploadedVideoPath,
      isUploadingVideo
    };
  };

  useEffect(() => {
    const fetchReviewers = async () => {
      if (!activeBrand?.id) return;
      setIsLoadingReviewers(true);
      try {
        const res = await apiService.get(`/brands/${activeBrand.id}/workflows/reviewers`);
        const list = res.data?.data || [];
        setPotentialReviewers(list);
        if (list.length > 0) {
          setSelectedReviewerId(list[0].id);
          setSelectedReviewerIds([list[0].id]);
        }
      } catch (err) {
        logger.error("Failed to fetch potential reviewers:", err);
      } finally {
        setIsLoadingReviewers(false);
      }
    };

    const fetchLimits = async () => {
      try {
        const res = await postService.getPlatformLimits();
        setPlatformLimits(res.data || []);
      } catch (err) {
        logger.error("Failed to load platform limits from DB:", err);
      }
    };

    if (isOpen && activeBrand?.id) {
      fetchReviewers();
      fetchLimits();
    } else {
      setPotentialReviewers([]);
      setSelectedReviewerId("");
      setSelectedReviewerIds([]);
      setPlatformLimits([]);
    }
  }, [isOpen, activeBrand?.id]);

  useEffect(() => {
    if (!videoFileUrl) {
      setVideoDuration(0);
      setVideoWidth(0);
      setVideoHeight(0);
      return;
    }

    const isVid = isVideoPath(videoFileUrl, videoFile);
    if (!isVid) {
      setVideoDuration(0);
      setVideoWidth(0);
      setVideoHeight(0);
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = videoFileUrl;
    video.onloadedmetadata = () => {
      setVideoDuration(video.duration);
      setVideoWidth(video.videoWidth);
      setVideoHeight(video.videoHeight);
    };
    video.onerror = () => {
      console.warn("Failed to load video metadata");
    };
  }, [videoFileUrl, videoFile]);

  const togglePlatform = (platform) => {
    setSelectedPlatforms((prev) => {
      const platLower = platform.toLowerCase();
      if (prev.includes(platLower)) {
        if (prev.length === 1) {
          toast.warning("At least one platform must be selected");
          return prev;
        }
        const next = prev.filter((p) => p !== platLower);
        if (activePlatform === platLower) {
          setActivePlatform(next[0]);
        }
        return next;
      } else {
        setActivePlatform(platLower);
        return [...prev, platLower];
      }
    });
  };

  const connectedPlatforms = activeBrand?.socialAccounts
    ?.filter(sa => sa.isConnected)
    ?.map(sa => {
      const mapping = {
        FACEBOOK: "facebook",
        INSTAGRAM: "instagram",
        YOUTUBE: "youtube",
        TIKTOK: "tiktok",
        LINKEDIN: "linkedin",
        TELEGRAM: "telegram",
        DISCORD: "discord",
        THREADS: "threads"
      };
      return mapping[sa.platform];
    })
    ?.filter(Boolean) || [];

  const getValidationErrors = () => {
    const isAlbum = selectedPlatforms.includes('facebook') && activePlatform === 'facebook' && facebookType === 'album';
    const activeSelectedPlatforms = selectedPlatforms.filter(p => connectedPlatforms.includes(p));
    return validatePostForm({
      isLibrary,
      selectedPublishId,
      scheduledDate,
      selectedPlatforms: activeSelectedPlatforms,
      facebookType,
      youtubeType,
      instagramType,
      videoFileUrl,
      videoFile,
      videoDuration,
      videoWidth,
      videoHeight,
      uploadedVideoPath,
      platformLimits,
      mediaCount: isAlbum ? albumMedia.length : (postMedia ? postMedia.length : 0),
      editingPost,
      postMedia
    });
  };

  // Playlists fetched data
  const [playlists, setPlaylists] = useState([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  const [activePopover, setActivePopover] = useState(null); // 'media', 'emoji', 'utm'
  const [showFirstCommentModal, setShowFirstCommentModal] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const insertAtCursor = (textToInsert) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    setCaption(before + textToInsert + after);
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
      textarea.focus();
    }, 0);
  };

  const handleVideoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setVideoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setVideoFileUrl(previewUrl);

    setIsUploadingVideo(true);
    const formData = new FormData();
    formData.append("video", file);

    try {
      const res = await apiService.post(`/posts/upload?brandId=${activeBrand?.id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      setUploadedVideoPath(res.data.videoUrl);
      toast.success("Video uploaded successfully");
    } catch (err) {
      toast.error("Failed to upload video to server");
      logger.error("Failed to upload video to server", err);
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    if (videoFileUrl) {
      URL.revokeObjectURL(videoFileUrl);
    }
    setVideoFileUrl("");
    setUploadedVideoPath("");
  };

  const handleSelectDriveFile = async (file) => {
    if (!activeBrand) return;
    
    setIsDriveModalOpen(false);
    setIsUploadingVideo(true);
    toast.loading(`Importing "${file.name}" from Google Drive...`, { id: 'import-drive-toast' });

    try {
      const res = await socialService.downloadGoogleDriveFile(
        activeBrand.id,
        file.id,
        file.name
      );

      if (res.videoUrl) {
        toast.success(`Successfully imported "${file.name}"!`, { id: 'import-drive-toast' });

      const fullUrl = buildMediaUrl(res.videoUrl);

        setUploadedVideoPath(res.videoUrl);
        setVideoFileUrl(fullUrl);
      } else {
        throw new Error("Invalid response received from import service");
      }
    } catch (err) {
      logger.error("Google Drive Import failed", err);
      toast.error(`Import failed: ${err.message}`, { id: 'import-drive-toast' });
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const fetchPlaylists = async (forceRefresh = false) => {
    if (!activeBrand) return;
    setIsLoadingPlaylists(true);
    try {
      const url = `/social/youtube/playlists?brandId=${activeBrand.id}${forceRefresh ? '&sync=true' : ''}`;
      const res = await apiService.get(url);
      setPlaylists(res.data?.data || []);
      if (forceRefresh) {
        toast.success("YouTube Playlists synchronized successfully");
      }
    } catch (err) {
      logger.error("Failed to load playlists:", err);
      if (forceRefresh) {
        toast.error("Failed to synchronize playlists");
      }
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (editingPost) {
        setCaption(editingPost.caption || "");
        setTitle(editingPost.title || "");
        setAltText(editingPost.altText || "");
        
        const loadedPlatforms = editingPost.platforms && editingPost.platforms.length > 0
          ? editingPost.platforms.map(p => p.toLowerCase())
          : [DEFAULT_PLATFORM];
        setSelectedPlatforms(loadedPlatforms);
        setActivePlatform(loadedPlatforms[0] || DEFAULT_PLATFORM);

        setScheduledDate(editingPost.scheduledAt ? toLocalDatetimeString(editingPost.scheduledAt) : toLocalDatetimeString(new Date()));
        setIsLibrary(editingPost.isLibrary || false);
        
        // Load publish mode từ post status dùng lookup map
        setSelectedPublishId(STATUS_TO_PUBLISH_MODE[editingPost.status] || PUBLISH_MODE.NOW);
        
        // Setup options
        const opts = editingPost.options || {};
        setYoutubeType(opts.youtubeType || "video");
        setYoutubeTitle(opts.youtubeTitle || "");
        setYoutubeMadeForKids(opts.madeForKids || false);
        setYoutubePrivacy(opts.privacyStatus || "public");
        setYoutubeCategory(opts.categoryId || "22");
        setYoutubePlaylistId(opts.playlistId || "");
        setYoutubeTags(opts.tags || "");
        setYoutubeFirstComment(opts.firstComment || "");
        setGlobalFirstComment(opts.firstComment || "");
        setYoutubeThumbnail(opts.youtubeThumbnail || "");
        setThreadsWhoCanReply(opts.threadsWhoCanReply || "everyone");
        setNotes(opts.notes || []);
        setVideoSettings(opts.videoSettings || null);

        // Setup Facebook
        setFacebookType(opts.facebookType || "post");
        setFacebookTitle(opts.facebookTitle || "");
        setFacebookReelCollaboratorId(opts.facebookReelCollaboratorId || "");
        setFacebookReelPlaceId(opts.facebookReelPlaceId || "");
        setFacebookReelThumbnail(opts.facebookReelThumbnail || "");

        // Setup Instagram
        setInstagramType(opts.instagramType || "post");
        setInstagramCollaborators(opts.instagramCollaborators || []);
        setInstagramAudio(opts.instagramAudio || null);
        setInstagramShowOnFeed(opts.instagramShowOnFeed !== undefined ? opts.instagramShowOnFeed : true);

        // Setup TikTok
        setTiktokPrivacy(opts.tiktokPrivacy || "public");
        setTiktokAllowComments(opts.tiktokAllowComments !== undefined ? opts.tiktokAllowComments : true);
        setTiktokAllowDuet(opts.tiktokAllowDuet !== undefined ? opts.tiktokAllowDuet : true);
        setTiktokAllowStitch(opts.tiktokAllowStitch !== undefined ? opts.tiktokAllowStitch : true);
        setTiktokAiGenerated(opts.tiktokAiGenerated || false);
        setTiktokCommercialContent(opts.tiktokCommercialContent || false);
        setSelectedDiscordChannels(opts.selectedDiscordChannels || []);
        
        // Setup media
        if (opts.facebookType === 'album' && opts.albumMedia) {
          setAlbumMedia(opts.albumMedia);
        } else if (editingPost.mediaUrls?.[0]) {
          const path = editingPost.mediaUrls[0];
          setUploadedVideoPath(path);
          setVideoFileUrl(buildMediaUrl(path));
        } else {
          setUploadedVideoPath("");
          setVideoFileUrl("");
        }
      } else if (templatePost) {
        // Load presets from a template to create a new post
        setCaption(templatePost.caption || "");
        setTitle(templatePost.title || "");
        setAltText(templatePost.altText || "");
        
        const loadedPlatforms = templatePost.platforms && templatePost.platforms.length > 0
          ? templatePost.platforms.map(p => p.toLowerCase())
          : [DEFAULT_PLATFORM];
        setSelectedPlatforms(loadedPlatforms);
        setActivePlatform(loadedPlatforms[0] || DEFAULT_PLATFORM);

        setScheduledDate(defaultScheduledAt ? toLocalDatetimeString(defaultScheduledAt) : toLocalDatetimeString(new Date()));
        setIsLibrary(initialIsLibrary || false);
        setSelectedPublishId(defaultScheduledAt ? "schedule" : "now");
        
        // Setup options
        const opts = templatePost.options || {};
        setYoutubeType(opts.youtubeType || "video");
        setYoutubeTitle(opts.youtubeTitle || "");
        setYoutubeMadeForKids(opts.madeForKids || false);
        setYoutubePrivacy(opts.privacyStatus || "public");
        setYoutubeCategory(opts.categoryId || "22");
        setYoutubePlaylistId(opts.playlistId || "");
        setYoutubeTags(opts.tags || "");
        setYoutubeFirstComment(opts.firstComment || "");
        setGlobalFirstComment(opts.firstComment || "");
        setYoutubeThumbnail(opts.youtubeThumbnail || "");
        setThreadsWhoCanReply(opts.threadsWhoCanReply || "everyone");
        setNotes(opts.notes || []);
        setVideoSettings(opts.videoSettings || null);

        // Setup Facebook
        setFacebookType(opts.facebookType || "post");
        setFacebookTitle(opts.facebookTitle || "");

        // Setup Instagram
        setInstagramType(opts.instagramType || "post");
        setInstagramCollaborators(opts.instagramCollaborators || []);
        setInstagramAudio(opts.instagramAudio || null);
        setInstagramShowOnFeed(opts.instagramShowOnFeed !== undefined ? opts.instagramShowOnFeed : true);

        // Setup TikTok
        setTiktokPrivacy(opts.tiktokPrivacy || "public");
        setTiktokAllowComments(opts.tiktokAllowComments !== undefined ? opts.tiktokAllowComments : true);
        setTiktokAllowDuet(opts.tiktokAllowDuet !== undefined ? opts.tiktokAllowDuet : true);
        setTiktokAllowStitch(opts.tiktokAllowStitch !== undefined ? opts.tiktokAllowStitch : true);
        setTiktokAiGenerated(opts.tiktokAiGenerated || false);
        setTiktokCommercialContent(opts.tiktokCommercialContent || false);
        setSelectedDiscordChannels(opts.selectedDiscordChannels || []);
        
        // Setup media
        if (opts.facebookType === 'album' && opts.albumMedia) {
          setAlbumMedia(opts.albumMedia);
        } else if (templatePost.mediaUrls?.[0]) {
          const path = templatePost.mediaUrls[0];
          setUploadedVideoPath(path);
          setVideoFileUrl(buildMediaUrl(path));
        } else {
          setUploadedVideoPath("");
          setVideoFileUrl("");
        }
      } else {
        // Reset for new creation
        setCaption("");
        setTitle("");
        
        const connected = activeBrand?.socialAccounts
          ?.filter(sa => sa.isConnected)
          ?.map(sa => {
            const mapping = {
              FACEBOOK: "facebook",
              INSTAGRAM: "instagram",
              YOUTUBE: "youtube",
              TIKTOK: "tiktok",
              LINKEDIN: "linkedin",
              TELEGRAM: "telegram",
              DISCORD: "discord",
              THREADS: "threads"
            };
            return mapping[sa.platform];
          })
          ?.filter(Boolean) || [];
        const initialPlatform = connected.includes(DEFAULT_PLATFORM)
          ? DEFAULT_PLATFORM
          : (connected[0] || DEFAULT_PLATFORM);

        setSelectedPlatforms([initialPlatform]);
        setActivePlatform(initialPlatform);
        setScheduledDate(defaultScheduledAt ? toLocalDatetimeString(defaultScheduledAt) : toLocalDatetimeString(new Date()));
        setIsLibrary(initialIsLibrary || false);
        setSelectedPublishId(defaultScheduledAt ? PUBLISH_MODE.SCHEDULE : PUBLISH_MODE.NOW);
        setYoutubeType(YOUTUBE_TYPE.VIDEO);
        setYoutubeTitle("");
        setYoutubeMadeForKids(false);
        setYoutubePrivacy("public");
        setYoutubeCategory(YOUTUBE_DEFAULT_CATEGORY_ID);
        setYoutubePlaylistId("");
        setYoutubeTags("");
        setYoutubeFirstComment("");
        setGlobalFirstComment("");
        setYoutubeThumbnail("");

        // Reset Facebook
        setFacebookType(FACEBOOK_TYPE.POST);
        setFacebookTitle("");
        setFacebookReelCollaboratorId("");
        setFacebookReelPlaceId("");
        setFacebookReelThumbnail("");
        setAltText("");
        setAlbumMedia([]);
        setVideoSettings(null);

        // Reset Instagram
        setInstagramType(INSTAGRAM_TYPE.POST);
        setInstagramCollaborators([]);
        setInstagramAudio(null);
        setInstagramShowOnFeed(true);

        // Reset TikTok
        setTiktokPrivacy(TIKTOK_PRIVACY.PUBLIC);
        setTiktokAllowComments(true);
        setTiktokAllowDuet(true);
        setTiktokAllowStitch(true);
        setTiktokAiGenerated(false);
        setTiktokCommercialContent(false);
        const discordAccs = activeBrand?.socialAccounts?.filter(sa => sa.platform === 'DISCORD' && sa.isConnected) || [];
        setSelectedDiscordChannels(discordAccs.map(acc => acc.id));
      }
    }
  }, [isOpen, editingPost, templatePost, defaultScheduledAt, initialIsLibrary, activeBrand]);

  const loadTemplate = (template) => {
    if (!template) return;
    setCaption(template.caption || "");
    setTitle(template.title || "");
    setAltText(template.altText || "");
    setActivePlatform(template.platforms?.[0]?.toLowerCase() || "youtube");
    
    // Setup options
    const opts = template.options || {};
    setYoutubeType(opts.youtubeType || "video");
    setYoutubeTitle(opts.youtubeTitle || "");
    setYoutubeMadeForKids(opts.madeForKids || false);
    setYoutubePrivacy(opts.privacyStatus || "public");
    setYoutubeCategory(opts.categoryId || "22");
    setYoutubePlaylistId(opts.playlistId || "");
    setYoutubeTags(opts.tags || "");
    setYoutubeFirstComment(opts.firstComment || "");
    setGlobalFirstComment(opts.firstComment || "");
    setYoutubeThumbnail(opts.youtubeThumbnail || "");
    setThreadsWhoCanReply(opts.threadsWhoCanReply || "everyone");

    // Setup Facebook
    setFacebookType(opts.facebookType || "post");
    setFacebookTitle(opts.facebookTitle || "");

    // Setup Instagram
    setInstagramType(opts.instagramType || "post");
    setInstagramCollaborators(opts.instagramCollaborators || []);
    setInstagramAudio(opts.instagramAudio || null);
    setInstagramShowOnFeed(opts.instagramShowOnFeed !== undefined ? opts.instagramShowOnFeed : true);

    // Setup TikTok
    setTiktokPrivacy(opts.tiktokPrivacy || "public");
    setTiktokAllowComments(opts.tiktokAllowComments !== undefined ? opts.tiktokAllowComments : true);
    setTiktokAllowDuet(opts.tiktokAllowDuet !== undefined ? opts.tiktokAllowDuet : true);
    setTiktokAllowStitch(opts.tiktokAllowStitch !== undefined ? opts.tiktokAllowStitch : true);
    setTiktokAiGenerated(opts.tiktokAiGenerated || false);
    setTiktokCommercialContent(opts.tiktokCommercialContent || false);
    
    // Setup media
    if (opts.facebookType === 'album' && opts.albumMedia) {
      setAlbumMedia(opts.albumMedia);
    } else if (template.mediaUrls?.[0]) {
      const path = template.mediaUrls[0];
      setUploadedVideoPath(path);
      setVideoFileUrl(buildMediaUrl(path));
    } else {
      setUploadedVideoPath("");
      setVideoFileUrl("");
    }
    toast.success(`Loaded template "${template.title}"`);
  };

  const handleCreatePost = async () => {
    if (!activeBrand) {
      toast.error("Please select a brand first");
      return;
    }

    const errors = getValidationErrors();
    if (errors.length > 0) {
      console.warn("Validation errors detected in PostCreator Form:", JSON.stringify(errors));
      toast.error("Please resolve the validation errors first");
      return;
    }

    setIsCreating(true);
    try {
      // Map publish mode → post status dùng lookup, không dùng if-else chain
      const status = PUBLISH_MODE_TO_STATUS[selectedPublishId] || POST_STATUS.DRAFT;

      let activeSubType = 'post';
      if (activePlatform === PLATFORMS.FACEBOOK) activeSubType = facebookType;
      else if (activePlatform === PLATFORMS.YOUTUBE) activeSubType = youtubeType;
      else if (activePlatform === PLATFORMS.INSTAGRAM) activeSubType = instagramType;
      else if (activePlatform === PLATFORMS.TIKTOK) activeSubType = 'video';

      const isAlbum = activePlatform === PLATFORMS.FACEBOOK && facebookType === 'album';
      const hasMedia = isAlbum ? albumMedia.length > 0 : !!(uploadedVideoPath || videoFile);
      const isVid = !isAlbum && isVideoPath(videoFileUrl, videoFile);

      const platformConfig = PLATFORM_CONFIGS[activePlatform];
      const postType = platformConfig 
        ? platformConfig.getPostType(activeSubType, hasMedia, isVid)
        : POST_TYPE.VIDEO;

      // Chuẩn bị danh sách URLs và captions cho Album hoặc Post
      const postMediaUrls = isAlbum 
        ? albumMedia.map(item => item.path).filter(Boolean)
        : (postMedia && postMedia.length > 0
            ? postMedia.map(item => item.path).filter(Boolean)
            : (uploadedVideoPath ? [uploadedVideoPath] : [])
          );
      const mediaCaptions = isAlbum
        ? albumMedia.map(item => item.caption || "")
        : [];

      const payload = {
        brandId: activeBrand.id,
        title: title || (activePlatform === 'facebook' && facebookType === 'reel' ? facebookTitle : youtubeTitle) || (caption ? Array.from(caption).slice(0, 50).join('') : "New Post"),
        caption,
        type: postType,
        status,
        isLibrary,
        altText,
        targetPlatforms: selectedPlatforms.filter(p => connectedPlatforms.includes(p)).map(p => p.toUpperCase()),
        scheduledAt: ['schedule', 'review'].includes(selectedPublishId) ? (scheduledDate ? new Date(scheduledDate).toISOString() : null) : null,
        mediaUrls: postMediaUrls,
        reviewerIds: selectedReviewerIds,
        approvalPolicy: approvalPolicy,
        requesterNote: requesterNote || "Vui lòng phê duyệt bài viết này.",
        options: {
          youtubeType,
          youtubeTitle,
          privacyStatus: youtubePrivacy,
          categoryId: youtubeCategory,
          playlistId: youtubePlaylistId,
          tags: youtubeTags,
          madeForKids: youtubeMadeForKids,
          firstComment: youtubeFirstComment || globalFirstComment,
          youtubeThumbnail,
          facebookType,
          facebookTitle,
          facebookReelCollaboratorId,
          facebookReelPlaceId,
          facebookReelThumbnail,
          instagramType,
          instagramCollaborators,
          instagramAudio,
          instagramShowOnFeed,
          tiktokPrivacy,
          tiktokAllowComments,
          tiktokAllowDuet,
          tiktokAllowStitch,
          tiktokAiGenerated,
          tiktokCommercialContent,
          selectedDiscordChannels,
          albumMedia,
          mediaCaptions,
          threadsWhoCanReply,
          notes,
          videoSettings
        }
      };

      if (editingPost) {
        await apiService.put(`/posts/${editingPost.id}`, payload, { timeout: 60000 });
        toast.success("Post updated successfully");
        // Đóng form ngay sau khi cập nhật thành công để tránh user vô tình tạo thêm bài mới
        closePostCreator();
      } else {
        await apiService.post('/posts', payload, { timeout: 60000 });
        toast.success("Post created successfully");
        // Reset state sau khi tạo bài mới thành công
        setSelectedPlatforms([DEFAULT_PLATFORM]);
        setActivePlatform(DEFAULT_PLATFORM);
        setScheduledDate(toLocalDatetimeString(new Date()));
        setIsLibrary(false);
        setSelectedPublishId(PUBLISH_MODE.NOW);
        setYoutubeType(YOUTUBE_TYPE.VIDEO);
        setYoutubeTitle("");
        setYoutubeTags("");
        setYoutubeFirstComment("");
        setGlobalFirstComment("");
        setYoutubeThumbnail("");
        setFacebookTitle("");
        setFacebookType(FACEBOOK_TYPE.POST);
        setFacebookReelCollaboratorId("");
        setFacebookReelPlaceId("");
        setFacebookReelThumbnail("");
        setInstagramType(INSTAGRAM_TYPE.POST);
        setInstagramCollaborators([]);
        setInstagramAudio(null);
        setInstagramShowOnFeed(true);
        setAltText("");
        setNotes([]);
        setVideoSettings(null);
        setTiktokPrivacy(TIKTOK_PRIVACY.PUBLIC);
        setTiktokAllowComments(true);
        setTiktokAllowDuet(true);
        setTiktokAllowStitch(true);
        setTiktokAiGenerated(false);
        setTiktokCommercialContent(false);
        setVideoFile(null);
        setVideoFileUrl("");
        setUploadedVideoPath("");
        closePostCreator();
      }
    } catch (error) {
      console.error("Failed to create/update post:", error);
      const serverMessage = error.response?.data?.message || error.message || "Failed to create post";
      console.error('[PostCreator] Server error detail:', serverMessage);
      // Tách validation errors nếu có (bắt đầu bằng "Validation failed:")
      if (serverMessage.startsWith('Validation failed:')) {
        const details = serverMessage.replace('Validation failed: ', '');
        toast.error(`Lỗi validation:\n${details}`, { duration: 8000 });
      } else {
        toast.error(serverMessage);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return {
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
    setIsCreating,
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
    isUploadingVideo,
    uploadedVideoPath,
    setUploadedVideoPath,
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
    // Facebook States
    facebookOpen,
    setFacebookOpen,
    facebookType,
    setFacebookType,
    showFacebookTypeMenu,
    setShowFacebookTypeMenu,
    facebookTitle,
    setFacebookTitle,
    facebookReelCollaboratorId,
    setFacebookReelCollaboratorId,
    facebookReelPlaceId,
    setFacebookReelPlaceId,
    facebookReelThumbnail,
    setFacebookReelThumbnail,
    // Instagram States
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
    // TikTok States
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
    // Approval Workflow States
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
    // Threads States
    threadsWhoCanReply,
    setThreadsWhoCanReply,
    notes,
    setNotes,
    videoSettings,
    setVideoSettings,
    getBackupPayload,
    backupFormState,
    closePostCreatorTemporarily
  };
}
