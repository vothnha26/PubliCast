import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useBrand } from "../context/BrandContext";
import socialService from "../services/social.service";
import workflowService from "../services/workflow.service";
import mediaService from "../services/media.service";
import { usePostCreator } from "../context/PostCreatorContext";
import { usePostCreatorStore } from "../store/usePostCreatorStore";
import { DEFAULT_PLATFORM, PLATFORMS, PLATFORM_API_KEY, PLATFORM_KEY_MAP } from "../constants/platforms";
import { PLATFORM_CONFIGS } from "../constants/platformRegistry";
import { POST_STATUS, PUBLISH_MODE, PUBLISH_MODE_TO_STATUS, STATUS_TO_PUBLISH_MODE } from "../constants/postStatus";
import { POST_TYPE, YOUTUBE_TYPE, FACEBOOK_TYPE, INSTAGRAM_TYPE, TIKTOK_PRIVACY, APPROVAL_POLICY, YOUTUBE_DEFAULT_CATEGORY_ID } from "../constants/postTypes";
import { buildMediaUrl, isVideoPath } from "../utils/url";
import { validatePostForm } from "../utils/postValidation";
import { logger } from "../utils/logger";
import postService from "../services/post.service";
import { uploadMediaFileWithMetadata } from "../services/mediaUpload.service";
import {
  NETWORK_TAB_TEMPLATE,
  buildDefaultNetworkCustom,
} from "../constants/postComposerNetwork";
import { createPlatformOptionsFromPost, createDefaultPlatformOptions } from "../utils/platformOptionsFactory";
import { buildNetworkOverrides, mapNetworkOverridesToCustom } from "../utils/buildNetworkOverrides";
import { getNetworkEntrySlot, setNetworkEntrySlot } from "../utils/networkEntrySlot";

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
    defaultSocialAccountId,
    defaultSocialAccountIds,
    isLibrary: initialIsLibrary,
    videoFile, 
    setVideoFile,
    videoFileUrl, 
    setVideoFileUrl,
    isUploadingVideo, 
    setIsUploadingVideo,
    uploadedVideoPath,
    setUploadedVideoPath,
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
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);
  const [activePlatform, setActivePlatform] = useState(DEFAULT_PLATFORM);
  const [platformLimits, setPlatformLimits] = useState([]);
  const [previewDevice, setPreviewDevice] = useState("mobile");
  const [showPublishMenu, setShowPublishMenu] = useState(false);
  const [selectedPublishId, setSelectedPublishId] = useState("now");
  const { activeBrand } = useBrand();
  const [isCreating, setIsCreating] = useState(false);
  const [submitProgressText, setSubmitProgressText] = useState(null);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  // Which panel the right column shows: Figma's Templates / AI Assistant /
  // Preview tab switcher in ComposerHeader and NetworkCustomizeScreen.
  const [rightPanelTab, setRightPanelTab] = useState("preview");
  // Fullscreen "Customize post per network" overlay (Figma 4:289) — separate
  // from isEditByNetwork, which tracks whether any platform actually HAS
  // custom content (a data concern used by validation/submit/ComposerBody).
  const [isNetworkCustomizeOpen, setIsNetworkCustomizeOpen] = useState(false);
  // Checkbox-only for now — handleCreatePost's success path always calls
  // closePostCreator() unconditionally for new posts; there's no "stay open
  // and reset" branch to hook this into without changing that shared submit
  // handler, which is out of scope here. Lifted from NetworkCustomizeScreen's
  // local state so ComposerFooter can show/toggle the same checkbox.
  const [createAnother, setCreateAnother] = useState(false);
  // mediaThumbnailUrl is the preview value (blob URL while pending, or the
  // final Cloudinary URL once uploaded/loaded from a template) — read
  // directly by PreviewBody/ComposerBody as an <img>/<video poster> src, so a
  // local blob works identically to a real URL for preview purposes.
  // mediaThumbnailFile/mediaThumbnailPath mirror postMedia's {file, path}
  // pending-upload pair: a freshly-picked thumbnail sets mediaThumbnailFile
  // with path left null, and handleCreatePost's pending-upload scan uploads
  // it at submit time exactly like postMedia items, instead of uploading
  // eagerly on pick.
  const [mediaThumbnailUrl, setMediaThumbnailUrl] = useState("");
  const [mediaThumbnailFile, setMediaThumbnailFile] = useState(null);
  const [mediaThumbnailPath, setMediaThumbnailPath] = useState(null);
  const [scheduledDate, setScheduledDate] = useState(() => toLocalDatetimeString(new Date()));
  const [isLibrary, setIsLibrary] = useState(false);

  // Global Presets States
  const [globalOpen, setGlobalOpen] = useState(false);
  const [useUrlShortener, setUseUrlShortener] = useState(false);
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

  // Selector Video/Short State
  const [youtubeType, setYoutubeType] = useState(YOUTUBE_TYPE.VIDEO);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  // Facebook Dropdown / Mode State
  const [facebookType, setFacebookType] = useState(FACEBOOK_TYPE.POST);
  const [showFacebookTypeMenu, setShowFacebookTypeMenu] = useState(false);
  const [facebookTitle, setFacebookTitle] = useState("");
  const [facebookReelThumbnail, setFacebookReelThumbnail] = useState("");

  // YouTube Presets States
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [youtubeMadeForKids, setYoutubeMadeForKids] = useState(null);
  const [youtubePrivacy, setYoutubePrivacy] = useState("public");
  const [youtubeCategory, setYoutubeCategory] = useState(YOUTUBE_DEFAULT_CATEGORY_ID);
  const [youtubePlaylistId, setYoutubePlaylistId] = useState("");
  const [youtubeTags, setYoutubeTags] = useState("");
  const [youtubeFirstComment, setYoutubeFirstComment] = useState("");
  const [globalFirstComment, setGlobalFirstComment] = useState("");
  const [youtubeThumbnail, setYoutubeThumbnail] = useState("");

  // Threads States
  const [threadsWhoCanReply, setThreadsWhoCanReply] = useState("everyone");

  // Per-platform content override ("Cài đặt theo mạng") States
  const [isEditByNetwork, setIsEditByNetwork] = useState(false);
  const [activeNetworkTab, setActiveNetworkTab] = useState(NETWORK_TAB_TEMPLATE);
  const [networkCustom, setNetworkCustom] = useState(() => buildDefaultNetworkCustom());
  // Which account's sub-tab is active within the current network platform
  // tab, when that platform has ≥2 selected accounts (see NetworkTabSwitcher's
  // account sub-tabs, mirroring its existing Threads-post sub-tab pattern).
  // null means "not viewing a specific account" (single-account platform).
  const [activeNetworkAccountId, setActiveNetworkAccountId] = useState(null);

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
  const [isFullScreen, setIsFullScreen] = useState(false);

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
      setUseUrlShortener(backup.useUrlShortener ?? false);
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
      setYoutubeType(backup.youtubeType ?? YOUTUBE_TYPE.VIDEO);
      setFacebookType(backup.facebookType ?? FACEBOOK_TYPE.POST);
      setFacebookTitle(backup.facebookTitle ?? "");
      setFacebookReelThumbnail(backup.facebookReelThumbnail ?? "");
      setYoutubeTitle(backup.youtubeTitle ?? "");
      setYoutubeMadeForKids(typeof backup.youtubeMadeForKids === 'boolean' ? backup.youtubeMadeForKids : null);
      setYoutubePrivacy(backup.youtubePrivacy ?? "public");
      setYoutubeCategory(backup.youtubeCategory ?? YOUTUBE_DEFAULT_CATEGORY_ID);
      setYoutubePlaylistId(backup.youtubePlaylistId ?? "");
      setYoutubeTags(backup.youtubeTags ?? "");
      setYoutubeFirstComment(backup.youtubeFirstComment ?? "");
      setGlobalFirstComment(backup.globalFirstComment ?? "");
      setYoutubeThumbnail(backup.youtubeThumbnail ?? "");
      setThreadsWhoCanReply(backup.threadsWhoCanReply ?? "everyone");
      setIsEditByNetwork(backup.isEditByNetwork ?? false);
      setActiveNetworkTab(backup.activeNetworkTab ?? NETWORK_TAB_TEMPLATE);
      setActiveNetworkAccountId(backup.activeNetworkAccountId ?? null);
      setNetworkCustom(backup.networkCustom ?? buildDefaultNetworkCustom());
      setSelectedReviewerId(backup.selectedReviewerId ?? "");
      setSelectedReviewerIds(backup.selectedReviewerIds ?? []);
      setApprovalPolicy(backup.approvalPolicy ?? APPROVAL_POLICY.AT_LEAST_ONE);
      setRequesterNote(backup.requesterNote ?? "");
      setNotes(backup.notes ?? []);
      const currentStoreState = usePostCreatorStore.getState();

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
        postMedia: updatedPostMedia
      });
    }
  }, []);

  const getPlatformOptions = () => ({
    youtubeType,
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
    notes,
    videoSettings,
    facebookType,
    facebookTitle,
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
  });

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
      ...getPlatformOptions(),
      isEditByNetwork,
      activeNetworkTab,
      activeNetworkAccountId,
      networkCustom,
      selectedReviewerId,
      selectedReviewerIds,
      approvalPolicy,
      requesterNote,
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
        const res = await workflowService.getReviewers(activeBrand.id);
        const list = res || [];
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



  const toggleAccount = (accountId) => {
    setSelectedAccountIds((prev) => {
      let next;
      if (prev.includes(accountId)) {
        if (prev.length === 1) {
          toast.warning("Bắt buộc phải chọn ít nhất 1 tài khoản");
          return prev;
        }
        next = prev.filter((id) => id !== accountId);
      } else {
        next = [...prev, accountId];
      }

      if (activeBrand?.socialAccounts) {
        const selectedAccs = activeBrand.socialAccounts.filter((sa) => next.includes(sa.id));
        const newPlatforms = Array.from(new Set(selectedAccs.map((sa) => PLATFORM_KEY_MAP[sa.platform]).filter(Boolean)));
        if (newPlatforms.length > 0) {
          setSelectedPlatforms(newPlatforms);
          if (!newPlatforms.includes(activePlatform)) {
            setActivePlatform(newPlatforms[0]);
          }
        }
      }
      return next;
    });
  };

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
        setActiveNetworkTab((prevTab) => (prevTab === platLower ? NETWORK_TAB_TEMPLATE : prevTab));
        return next;
      } else {
        setActivePlatform(platLower);
        return [...prev, platLower];
      }
    });
  };

  // getNetworkEntrySlot/setNetworkEntrySlot now live in utils/networkEntrySlot.js
  // (shared with AutoList's per-channel presets) — imported above.

  const getEffectiveInitialMedia = () => {
    return (postMedia && postMedia.length > 0)
      ? [...postMedia]
      : (videoFileUrl || uploadedVideoPath)
        ? [{ previewUrl: videoFileUrl, path: uploadedVideoPath, file: videoFile }]
        : [];
  };

  // Bật/tắt chế độ chỉnh nội dung riêng cho 1 nền tảng (Cài đặt theo mạng),
  // hoặc cho 1 account cụ thể trong platform đó khi accountId được truyền.
  // Lần đầu customize (caption/mediaUrls đang rỗng) sẽ seed từ caption/postMedia chung
  // để user không phải gõ lại từ đầu.
  const toggleUseTemplate = (platformId, value, accountId = null) => {
    setNetworkCustom((prev) => {
      const entry = prev[platformId] || { useTemplate: true, caption: "", mediaUrls: [] };
      const current = getNetworkEntrySlot(entry, accountId);
      const newUseTemplate = value !== undefined ? value : !current.useTemplate;

      const isThreads = platformId === PLATFORMS.THREADS;
      const firstThreadText = typeof current.threadPosts?.[0] === 'string' ? current.threadPosts[0] : current.threadPosts?.[0]?.text;
      const isFirstCustomization = newUseTemplate === false &&
        (isThreads
          ? (!current.threadPosts || firstThreadText === "")
          : !current.caption) &&
        (current.mediaUrls?.length || 0) === 0;

      const effectiveInitialMedia = getEffectiveInitialMedia();

      const seeded = isFirstCustomization
        ? isThreads
          ? {
              ...current,
              threadPosts: [
                { text: caption, mediaUrls: effectiveInitialMedia },
                ...(Array.isArray(current.threadPosts) ? current.threadPosts.slice(1) : [])
              ]
            }
          : { ...current, caption, mediaUrls: effectiveInitialMedia }
        : current;

      return {
        ...prev,
        [platformId]: setNetworkEntrySlot(entry, accountId, { ...seeded, useTemplate: newUseTemplate }),
      };
    });
  };

  const updateNetworkCaption = (platformId, value, accountId = null) => {
    setNetworkCustom((prev) => {
      const entry = prev[platformId] || { useTemplate: true, caption: "", mediaUrls: [] };
      const current = getNetworkEntrySlot(entry, accountId);
      const wasTemplate = current.useTemplate !== false;
      const effectiveInitialMedia = getEffectiveInitialMedia();

      const mediaUrlsToKeep = wasTemplate && (current.mediaUrls?.length || 0) === 0
        ? effectiveInitialMedia
        : (current.mediaUrls || []);

      return {
        ...prev,
        [platformId]: setNetworkEntrySlot(entry, accountId, {
          ...current,
          useTemplate: false,
          caption: value,
          mediaUrls: mediaUrlsToKeep
        }),
      };
    });
  };

  const updateNetworkMedia = (platformId, mediaUrls, accountId = null) => {
    setNetworkCustom((prev) => {
      const entry = prev[platformId] || { useTemplate: true, caption: "", mediaUrls: [] };
      const current = getNetworkEntrySlot(entry, accountId);
      const wasTemplate = current.useTemplate !== false;

      const captionToKeep = wasTemplate && !current.caption
        ? caption
        : (current.caption ?? "");

      return {
        ...prev,
        [platformId]: setNetworkEntrySlot(entry, accountId, {
          ...current,
          useTemplate: false,
          caption: captionToKeep,
          mediaUrls
        }),
      };
    });
  };

  // Writes one technical-setting field (YouTube categoryId, TikTok
  // allowDuet, etc.) into the given account's slot — unlike
  // updateNetworkCaption/updateNetworkMedia, this does NOT force
  // useTemplate:false, since a user may want a different category for one
  // account while still sharing the global caption (settings and
  // caption/media are independent override axes).
  const updateNetworkSetting = (platformId, key, value, accountId = null) => {
    setNetworkCustom((prev) => {
      const entry = prev[platformId];
      const currentSlot = getNetworkEntrySlot(entry, accountId);
      const nextSettings = { ...(currentSlot.settings || {}), [key]: value };
      return {
        ...prev,
        [platformId]: setNetworkEntrySlot(entry, accountId, { settings: nextSettings }),
      };
    });
  };

  const updateThreadPostText = (index, text) => {
    setNetworkCustom((prev) => {
      const threads = prev[PLATFORMS.THREADS] || { useTemplate: true, threadPosts: [{ text: "", mediaUrls: [] }] };
      const wasTemplate = threads.useTemplate !== false;
      const effectiveInitialMedia = getEffectiveInitialMedia();

      const newPosts = [...(threads.threadPosts || [{ text: "", mediaUrls: [] }])];
      const curr = typeof newPosts[index] === 'object' && newPosts[index] !== null
        ? newPosts[index]
        : { text: typeof newPosts[index] === 'string' ? newPosts[index] : '', mediaUrls: [] };

      const mediaToKeep = (index === 0 && wasTemplate && (curr.mediaUrls?.length || 0) === 0)
        ? effectiveInitialMedia
        : (curr.mediaUrls || []);

      newPosts[index] = { ...curr, text, mediaUrls: mediaToKeep };
      return {
        ...prev,
        [PLATFORMS.THREADS]: {
          ...threads,
          useTemplate: false,
          threadPosts: newPosts
        }
      };
    });
  };

  const updateThreadPostMedia = (index, mediaUrls) => {
    setNetworkCustom((prev) => {
      const threads = prev[PLATFORMS.THREADS] || { useTemplate: true, threadPosts: [{ text: "", mediaUrls: [] }] };
      const wasTemplate = threads.useTemplate !== false;

      const newPosts = [...(threads.threadPosts || [{ text: "", mediaUrls: [] }])];
      const curr = typeof newPosts[index] === 'object' && newPosts[index] !== null
        ? newPosts[index]
        : { text: typeof newPosts[index] === 'string' ? newPosts[index] : '', mediaUrls: [] };

      const textToKeep = (index === 0 && wasTemplate && !curr.text)
        ? caption
        : (curr.text ?? "");

      newPosts[index] = { ...curr, text: textToKeep, mediaUrls };
      return {
        ...prev,
        [PLATFORMS.THREADS]: {
          ...threads,
          useTemplate: false,
          threadPosts: newPosts
        }
      };
    });
  };

  const addThreadPost = () => {
    setNetworkCustom((prev) => {
      const threads = prev[PLATFORMS.THREADS];
      // First time a Threads chain is started (no threadPosts yet), seed
      // post 1 from the shared caption/media instead of starting blank —
      // otherwise whatever the user already typed in the shared caption box
      // silently vanishes the moment they add a second post.
      const effectiveInitialMedia = (postMedia && postMedia.length > 0)
        ? [...postMedia]
        : (videoFileUrl || uploadedVideoPath)
          ? [{ previewUrl: videoFileUrl, path: uploadedVideoPath, file: videoFile }]
          : [];
      const existingPosts = threads?.threadPosts?.length
        ? threads.threadPosts
        : [{ text: caption, mediaUrls: effectiveInitialMedia }];
      const newPosts = [...existingPosts, { text: "", mediaUrls: [] }];
      return {
        ...prev,
        [PLATFORMS.THREADS]: { ...threads, useTemplate: false, activeThreadIndex: newPosts.length - 1, threadPosts: newPosts },
      };
    });
  };

  const removeThreadPost = (index) => {
    setNetworkCustom((prev) => {
      const threads = prev[PLATFORMS.THREADS] || { threadPosts: [""] };
      if (threads.threadPosts.length <= 1) return prev;
      const newPosts = threads.threadPosts.filter((_, i) => i !== index);
      return {
        ...prev,
        [PLATFORMS.THREADS]: {
          ...threads,
          activeThreadIndex: Math.max(0, (threads.activeThreadIndex || 0) - 1),
          threadPosts: newPosts,
        },
      };
    });
  };

  const setThreadActiveIndex = (index) => {
    setNetworkCustom((prev) => {
      const threads = prev[PLATFORMS.THREADS] || { threadPosts: [""] };
      return { ...prev, [PLATFORMS.THREADS]: { ...threads, activeThreadIndex: index } };
    });
  };

  const setNetworkTab = (tabId) => {
    setActiveNetworkTab(tabId);
    setActiveNetworkAccountId(null);
  };

  const getValidationErrors = () => {
    const connectedPlatformKeys = (activeBrand?.socialAccounts || [])
      .filter((sa) => sa.isConnected)
      .map((sa) => PLATFORM_KEY_MAP[sa.platform])
      .filter(Boolean);
    const activeSelectedPlatforms = selectedPlatforms.filter((p) => connectedPlatformKeys.includes(p));
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
      mediaCount: postMedia ? postMedia.length : 0,
      editingPost,
      postMedia,
      captionText: caption,
      youtubeTitle,
      youtubeMadeForKids,
      networkCustom,
      selectedAccountIds,
      activeBrand
    });
  };

  // Playlists fetched data
  const [playlists, setPlaylists] = useState([]);
  const [playlistsByAccount, setPlaylistsByAccount] = useState({});
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  // Categories fetched data
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

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

    // Revoke the previous blob URL before creating a new one — picking video
    // B right after video A (without removing A first) previously leaked A's
    // URL for the rest of the tab's lifetime, since only handleRemoveVideo
    // revoked (#89).
    if (videoFileUrl && videoFileUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoFileUrl);
    }

    setVideoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setVideoFileUrl(previewUrl);

    setIsUploadingVideo(true);
    const formData = new FormData();
    formData.append("video", file);

    try {
      const res = await mediaService.saveDirect(activeBrand?.id, null, {
        filename: file.name,
        size: file.size,
        type: file.type
      });
      setUploadedVideoPath(res?.url);
      
      const trackUploadedAsset = usePostCreatorStore.getState().trackUploadedAsset;
      if (trackUploadedAsset && res?.url) {
        trackUploadedAsset(res.url);
      }

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

        const trackUploadedAsset = usePostCreatorStore.getState().trackUploadedAsset;
        if (trackUploadedAsset && res.videoUrl) {
          trackUploadedAsset(res.videoUrl);
        }
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

  // Brands can have multiple YouTube channels connected — without pinning
  // to the one actually selected in this post, the backend silently fell
  // back to "whichever YouTube account comes first", so playlists/categories
  // could load for the wrong channel (or fail entirely if that first
  // account's token was stale) while the user was targeting a different one.
  const getSelectedYoutubeAccountId = () => {
    if (activeNetworkAccountId) {
      const activeAcc = activeBrand?.socialAccounts?.find(sa => sa.id === activeNetworkAccountId);
      if (activeAcc && (activeAcc.platform || '').toUpperCase() === PLATFORMS.YOUTUBE) {
        return activeNetworkAccountId;
      }
    }
    return activeBrand?.socialAccounts?.find(
      sa => (sa.platform || '').toUpperCase() === PLATFORMS.YOUTUBE && selectedAccountIds.includes(sa.id)
    )?.id || null;
  };

  const fetchPlaylists = async (forceRefresh = false, explicitAccountId = null) => {
    if (!activeBrand) return;
    const targetAccId = explicitAccountId || getSelectedYoutubeAccountId();
    setIsLoadingPlaylists(true);
    try {
      const res = await socialService.getYouTubePlaylists(activeBrand.id, forceRefresh, targetAccId);
      const list = res.data || res || [];
      setPlaylists(list);
      if (targetAccId) {
        setPlaylistsByAccount(prev => ({ ...prev, [targetAccId]: list }));
      }
      if (forceRefresh) {
        toast.success("YouTube Playlists synchronized successfully");
      }
    } catch (err) {
      logger.error("Failed to load playlists:", err);
      // Previously silent unless forceRefresh — an initial-load failure
      // (e.g. expired YouTube token) left the dropdown empty with no
      // indication why, indistinguishable from "no playlists exist".
      toast.error(err.message || "Failed to load YouTube playlists");
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  const fetchCategories = async (forceRefresh = false) => {
    if (!activeBrand) return;
    setIsLoadingCategories(true);
    try {
      const res = await socialService.getYouTubeVideoCategories(activeBrand.id, forceRefresh, getSelectedYoutubeAccountId());
      setCategories(res.data || []);
      if (forceRefresh) {
        toast.success("YouTube Video Categories synchronized successfully");
      }
    } catch (err) {
      logger.error("Failed to load video categories:", err);
      toast.error(err.message || "Failed to load YouTube video categories");
    } finally {
      setIsLoadingCategories(false);
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

        // Flatten the { [PLATFORM]: string[] } the backend round-trips back
        // (see _formatPostResponse) into the flat array this hook's state
        // uses — without this, opening an existing post left the account
        // picker showing whatever was selected the last time the composer
        // was open for a *different* post (#composer-audit P0).
        setSelectedAccountIds(Object.values(editingPost.selectedAccountIds || {}).flat());

        setScheduledDate(editingPost.scheduledAt ? toLocalDatetimeString(editingPost.scheduledAt) : toLocalDatetimeString(new Date()));
        setIsLibrary(editingPost.isLibrary || false);
        
        // Load publish mode từ post status dùng lookup map
        setSelectedPublishId(STATUS_TO_PUBLISH_MODE[editingPost.status] || PUBLISH_MODE.NOW);
        
        // Setup options via Factory Pattern
        applyPlatformOptions(createPlatformOptionsFromPost(editingPost));

        // Setup per-platform content override từ networkOverrides đã lưu (nếu có)
        const loadedNetworkCustom = mapNetworkOverridesToCustom(editingPost.networkOverrides || []);
        setNetworkCustom(loadedNetworkCustom);
        setIsEditByNetwork(Object.values(loadedNetworkCustom).some((entry) => entry.useTemplate === false));
        setActiveNetworkTab(NETWORK_TAB_TEMPLATE);

        // Setup media
        if (editingPost.mediaUrls?.[0]) {
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
        
        // Setup options via Factory Pattern
        applyPlatformOptions(createPlatformOptionsFromPost(templatePost));

        // Setup per-platform content override từ networkOverrides của template (nếu có)
        const loadedTemplateNetworkCustom = mapNetworkOverridesToCustom(templatePost.networkOverrides || []);
        setNetworkCustom(loadedTemplateNetworkCustom);
        setIsEditByNetwork(Object.values(loadedTemplateNetworkCustom).some((entry) => entry.useTemplate === false));
        setActiveNetworkTab(NETWORK_TAB_TEMPLATE);

        // Setup media
        if (templatePost.mediaUrls?.[0]) {
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
        setAltText("");
        
        setScheduledDate(defaultScheduledAt ? toLocalDatetimeString(defaultScheduledAt) : toLocalDatetimeString(new Date()));
        setIsLibrary(initialIsLibrary || false);
        setSelectedPublishId(defaultScheduledAt ? PUBLISH_MODE.SCHEDULE : PUBLISH_MODE.NOW);
        
        // Apply default platform options via Factory Pattern
        applyPlatformOptions(createDefaultPlatformOptions());

        // Reset per-platform content override
        setNetworkCustom(buildDefaultNetworkCustom());
        setIsEditByNetwork(false);
        setActiveNetworkTab(NETWORK_TAB_TEMPLATE);

        // Deterministic account and platform resolution
        let resolvedAccountIds = [];
        let resolvedPlatforms = [];

        if (defaultSocialAccountId) {
          const targetAcc = activeBrand?.socialAccounts?.find((sa) => sa.id === defaultSocialAccountId);
          if (targetAcc) {
            resolvedAccountIds = [targetAcc.id];
            const platformKey = PLATFORM_KEY_MAP[targetAcc.platform];
            if (platformKey) resolvedPlatforms = [platformKey];
          }
        } else if (defaultSocialAccountIds?.length > 0) {
          const targetAccs = activeBrand?.socialAccounts?.filter((sa) => defaultSocialAccountIds.includes(sa.id)) || [];
          if (targetAccs.length > 0) {
            resolvedAccountIds = targetAccs.map((sa) => sa.id);
            resolvedPlatforms = [...new Set(targetAccs.map((sa) => PLATFORM_KEY_MAP[sa.platform]).filter(Boolean))];
          }
        }

        if (resolvedAccountIds.length === 0) {
          const connectedAccounts = activeBrand?.socialAccounts?.filter((sa) => sa.isConnected) || [];
          if (connectedAccounts.length > 0) {
            resolvedAccountIds = connectedAccounts.map((sa) => sa.id);
          }
          if (resolvedPlatforms.length === 0) {
            resolvedPlatforms = [...new Set(connectedAccounts.map((sa) => PLATFORM_KEY_MAP[sa.platform]).filter(Boolean))];
          }
        }

        const initialPlatform = resolvedPlatforms.includes(DEFAULT_PLATFORM)
          ? DEFAULT_PLATFORM
          : (resolvedPlatforms[0] || DEFAULT_PLATFORM);

        setSelectedAccountIds(resolvedAccountIds);
        setSelectedPlatforms(resolvedPlatforms.length > 0 ? resolvedPlatforms : [initialPlatform]);
        setActivePlatform(initialPlatform);
      }
    }
  }, [isOpen, editingPost, templatePost, defaultScheduledAt, initialIsLibrary, activeBrand, defaultSocialAccountId, defaultSocialAccountIds]);

  const applyPlatformOptions = (opts) => {
    setYoutubeType(opts.youtubeType);
    setYoutubeTitle(opts.youtubeTitle);
    setYoutubeMadeForKids(opts.youtubeMadeForKids);
    setYoutubePrivacy(opts.youtubePrivacy);
    setYoutubeCategory(opts.youtubeCategory);
    setYoutubePlaylistId(opts.youtubePlaylistId);
    setYoutubeTags(opts.youtubeTags);
    setYoutubeFirstComment(opts.youtubeFirstComment);
    setGlobalFirstComment(opts.globalFirstComment);
    setYoutubeThumbnail(opts.youtubeThumbnail);
    setThreadsWhoCanReply(opts.threadsWhoCanReply);
    if (opts.notes) setNotes(opts.notes);
    if (opts.videoSettings !== undefined) setVideoSettings(opts.videoSettings);
    setFacebookType(opts.facebookType);
    setFacebookTitle(opts.facebookTitle);
    setFacebookReelThumbnail(opts.facebookReelThumbnail || "");
    if (!opts.youtubeThumbnail && opts.facebookReelThumbnail) {
      setMediaThumbnailUrl(opts.facebookReelThumbnail);
    }
    setInstagramType(opts.instagramType);
    setInstagramCollaborators(opts.instagramCollaborators || []);
    setInstagramAudio(opts.instagramAudio || null);
    setInstagramShowOnFeed(opts.instagramShowOnFeed !== undefined ? opts.instagramShowOnFeed : true);
    setTiktokPrivacy(opts.tiktokPrivacy);
    setTiktokAllowComments(opts.tiktokAllowComments !== undefined ? opts.tiktokAllowComments : true);
    setTiktokAllowDuet(opts.tiktokAllowDuet !== undefined ? opts.tiktokAllowDuet : true);
    setTiktokAllowStitch(opts.tiktokAllowStitch !== undefined ? opts.tiktokAllowStitch : true);
    setTiktokAiGenerated(opts.tiktokAiGenerated || false);
    setTiktokCommercialContent(opts.tiktokCommercialContent || false);
  };

  const loadTemplate = (template) => {
    if (!template) return;
    setCaption(template.caption || "");
    setTitle(template.title || "");
    setAltText(template.altText || "");
    setActivePlatform(template.platforms?.[0]?.toLowerCase() || "youtube");
    
    // Setup options via Factory Pattern
    applyPlatformOptions(createPlatformOptionsFromPost(template));

    // Setup per-platform content override từ networkOverrides của template (nếu có)
    const loadedNetworkCustom = mapNetworkOverridesToCustom(template.networkOverrides || []);
    setNetworkCustom(loadedNetworkCustom);
    setIsEditByNetwork(Object.values(loadedNetworkCustom).some((entry) => entry.useTemplate === false));
    setActiveNetworkTab(NETWORK_TAB_TEMPLATE);

    // Setup media
    if (template.mediaUrls?.[0]) {
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
    setSubmitProgressText(null);
    try {
      // 1. Quét và tập hợp tất cả các file media chưa upload (has file && !path)
      const pendingPostMedia = postMedia.filter((item) => item.file && !item.path);
      const pendingNetworkItems = [];

      Object.entries(networkCustom).forEach(([platform, entry]) => {
        if (!selectedPlatforms.includes(platform)) return;

        const slotsToScan = [];
        if (entry?.useTemplate === false) {
          slotsToScan.push(entry);
        }
        if (entry?.perAccount) {
          Object.values(entry.perAccount).forEach((slot) => {
            if (slot?.useTemplate === false) {
              slotsToScan.push(slot);
            }
          });
        }

        slotsToScan.forEach((slot) => {
          if (Array.isArray(slot.mediaUrls)) {
            slot.mediaUrls.forEach((item) => {
              if (typeof item === 'object' && item.file && !item.path) {
                pendingNetworkItems.push(item);
              }
            });
          }
        });

        if (platform === PLATFORMS.THREADS) {
          const threadSlots = [entry, ...(entry?.perAccount ? Object.values(entry.perAccount) : [])];
          threadSlots.forEach((tSlot) => {
            if (Array.isArray(tSlot.threadPosts)) {
              tSlot.threadPosts.forEach((post) => {
                if (typeof post === 'object' && Array.isArray(post.mediaUrls)) {
                  post.mediaUrls.forEach((item) => {
                    if (typeof item === 'object' && item.file && !item.path) {
                      pendingNetworkItems.push(item);
                    }
                  });
                }
              });
            }
          });
        }
      });

      // Thumbnail is a single optional slot with the same {file, path} shape
      // as postMedia/networkCustom items — folded into the same pending scan
      // so it uploads concurrently with everything else at submit time.
      const pendingThumbnail = mediaThumbnailFile && !mediaThumbnailPath
        ? { file: mediaThumbnailFile, path: mediaThumbnailPath }
        : null;

      // Deduplicate pending files by File instance or unique file signature
      const uniquePendingFiles = [];
      const seenFileKeys = new Set();

      const addPendingFile = (item) => {
        if (typeof item === 'object' && item && item.file && !item.path) {
          const key = item.file.name ? `${item.file.name}_${item.file.size}_${item.file.lastModified}` : item.file;
          if (!seenFileKeys.has(key)) {
            seenFileKeys.add(key);
            uniquePendingFiles.push(item);
          }
        }
      };

      pendingPostMedia.forEach(addPendingFile);
      pendingNetworkItems.forEach(addPendingFile);
      if (pendingThumbnail) addPendingFile(pendingThumbnail);

      const totalPending = uniquePendingFiles.length;

      if (totalPending > 0) {
        let uploadedCount = 0;
        setSubmitProgressText(`Đang tải lên 0/${totalPending} file...`);
        const trackUploadedAsset = usePostCreatorStore.getState().trackUploadedAsset;

        // Uploads are independent Cloudinary requests — nothing about file B
        // depends on file A finishing, so run them concurrently instead of
        // one-at-a-time. A 3-video post that used to take 3x a single
        // upload's time now takes ~1x.
        const uploadResults = await Promise.allSettled(
          uniquePendingFiles.map(async (item) => {
            // Cloudinary's own upload response already carries width/height/
            // duration/frame rate/codec for videos — read from it here
            // instead of a separate probe pass, since this request happens
            // regardless of whether anything reads the extra fields.
            const uploadResult = await uploadMediaFileWithMetadata(item.file, activeBrand.id);
            const uploadedUrl = uploadResult.url;
            item.path = uploadedUrl;
            if (item.file?.type?.startsWith('video/')) {
              item.width = uploadResult.width;
              item.height = uploadResult.height;
              item.frameRate = uploadResult.frameRate;
              item.codec = uploadResult.codec;
            }

            // Track asset immediately upon successful upload to allow rollback if subsequent uploads fail
            if (trackUploadedAsset && uploadedUrl) {
              trackUploadedAsset(uploadedUrl);
            }

            uploadedCount++;
            setSubmitProgressText(`Đang tải lên ${uploadedCount}/${totalPending} file...`);
            return { item, uploadResult };
          })
        );

        const firstFailure = uploadResults.find((r) => r.status === 'rejected');
        if (firstFailure) {
          const uploadErr = firstFailure.reason;
          console.error("Failed to upload file during submit:", uploadErr);
          setSubmitProgressText(null);
          setIsCreating(false);
          toast.error(`Tải lên file thất bại: ${uploadErr?.response?.data?.message || uploadErr?.message || "Lỗi kết nối"}`);
          return; // Dừng submit ngay lập tức, giữ nguyên 100% state form!
        }

        // Sync uploaded path and video metadata to all slots sharing the same file
        uploadResults.forEach(res => {
          if (res.status === 'fulfilled' && res.value?.uploadResult?.url) {
            const { item, uploadResult } = res.value;
            const targetFile = item.file;
            const fileKey = targetFile?.name ? `${targetFile.name}_${targetFile.size}_${targetFile.lastModified}` : null;

            const isMatch = (otherFile) => {
              if (!otherFile) return false;
              if (otherFile === targetFile) return true;
              if (fileKey && otherFile.name) {
                return `${otherFile.name}_${otherFile.size}_${otherFile.lastModified}` === fileKey;
              }
              return false;
            };

            postMedia.forEach(pm => {
              if (isMatch(pm.file)) {
                pm.path = uploadResult.url;
                if (uploadResult.width) pm.width = uploadResult.width;
                if (uploadResult.height) pm.height = uploadResult.height;
              }
            });

            Object.values(networkCustom).forEach(entry => {
              const slots = [entry, ...(entry?.perAccount ? Object.values(entry.perAccount) : [])];
              slots.forEach(slot => {
                if (Array.isArray(slot?.mediaUrls)) {
                  slot.mediaUrls.forEach(m => {
                    if (typeof m === 'object' && isMatch(m.file)) {
                      m.path = uploadResult.url;
                      if (uploadResult.width) m.width = uploadResult.width;
                      if (uploadResult.height) m.height = uploadResult.height;
                    }
                  });
                }
              });
            });
          }
        });

        setPostMedia([...postMedia]);
        setNetworkCustom({ ...networkCustom });
        if (pendingThumbnail?.path) {
          setMediaThumbnailPath(pendingThumbnail.path);
        }
      }

      setSubmitProgressText(null);

      // Map publish mode → post status dùng lookup, không dùng if-else chain
      const status = PUBLISH_MODE_TO_STATUS[selectedPublishId] || POST_STATUS.DRAFT;

      let activeSubType = POST_TYPE.POST;
      if (activePlatform === PLATFORMS.FACEBOOK) activeSubType = facebookType;
      else if (activePlatform === PLATFORMS.YOUTUBE) activeSubType = youtubeType;
      else if (activePlatform === PLATFORMS.INSTAGRAM) activeSubType = instagramType;
      else if (activePlatform === PLATFORMS.TIKTOK) activeSubType = POST_TYPE.VIDEO;

      const getMediaUrl = (item) => {
        if (!item) return '';
        if (typeof item === 'string') return item;
        return item.path || item.url || item.previewUrl || '';
      };

      const effectiveUploadedPath = uploadedVideoPath || (postMedia.length > 0 ? getMediaUrl(postMedia[0]) : "");
      const hasMedia = !!(effectiveUploadedPath || (postMedia && postMedia.length > 0 && getMediaUrl(postMedia[0])));
      const isVid = isVideoPath(videoFileUrl || effectiveUploadedPath, videoFile);

      const platformConfig = PLATFORM_CONFIGS[activePlatform];
      const postType = platformConfig
        ? platformConfig.getPostType(activeSubType, hasMedia, isVid)
        : POST_TYPE.VIDEO;

      let postMediaUrls;
      let mediaCaptions;
      if (postMedia && postMedia.length > 0) {
        const validItems = postMedia.filter(item => getMediaUrl(item));
        postMediaUrls = validItems.map(item => getMediaUrl(item));
        mediaCaptions = validItems.map(item => (typeof item === 'object' ? item.caption || "" : ""));
      } else {
        postMediaUrls = effectiveUploadedPath ? [effectiveUploadedPath] : [];
        mediaCaptions = [];
      }

      const connectedPlatformKeys = (activeBrand?.socialAccounts || [])
        .filter((sa) => sa.isConnected)
        .map((sa) => PLATFORM_KEY_MAP[sa.platform])
        .filter(Boolean);

      const selectedAccountIdsByPlatform = {};
      (activeBrand?.socialAccounts || []).forEach(sa => {
        if (!selectedAccountIds.includes(sa.id)) return;
        const platformKey = (sa.platform || '').toUpperCase();
        if (!platformKey) return;
        if (!selectedAccountIdsByPlatform[platformKey]) selectedAccountIdsByPlatform[platformKey] = [];
        selectedAccountIdsByPlatform[platformKey].push(sa.id);
      });

      const payload = {
        brandId: activeBrand.id,
        title: title || (selectedPlatforms.includes('facebook') && facebookType === 'reel' ? facebookTitle : '') || (selectedPlatforms.includes('youtube') ? youtubeTitle : '') || (caption ? Array.from(caption).slice(0, 50).join('') : "New Post"),
        caption,
        type: postType,
        status,
        isLibrary,
        altText,
        targetPlatforms: selectedPlatforms.filter(p => connectedPlatformKeys.includes(p)).map(p => p.toUpperCase()),
        selectedAccountIds: selectedAccountIdsByPlatform,
        scheduledAt: ['schedule', 'review'].includes(selectedPublishId) ? (scheduledDate ? new Date(scheduledDate).toISOString() : null) : null,
        mediaUrls: postMediaUrls,
        mediaThumbnailUrls: (mediaThumbnailPath || mediaThumbnailUrl) ? [mediaThumbnailPath || mediaThumbnailUrl] : [],
        reviewerIds: selectedReviewerIds,
        approvalPolicy: approvalPolicy,
        requesterNote: requesterNote || "Vui lòng phê duyệt bài viết này.",
        options: {
          videoDuration,
          videoWidth: postMedia[0]?.width || videoWidth,
          videoHeight: postMedia[0]?.height || videoHeight,
          videoFrameRate: postMedia[0]?.frameRate || null,
          ...getPlatformOptions(),
          privacyStatus: youtubePrivacy,
          categoryId: youtubeCategory,
          playlistId: youtubePlaylistId,
          tags: youtubeTags,
          madeForKids: youtubeMadeForKids,
          firstComment: youtubeFirstComment || globalFirstComment,
          youtubeThumbnail: mediaThumbnailPath || mediaThumbnailUrl || youtubeThumbnail,
          facebookReelThumbnail: mediaThumbnailPath || mediaThumbnailUrl,
          mediaCaptions,
          useUrlShortener
        }
      };

      const networkOverrides = buildNetworkOverrides({
        networkCustom,
        selectedPlatforms,
        selectedAccountIds,
        activeBrand
      });

      if (editingPost) {
        // Gửi networkOverrides trong PUT payload — backend đã được vá để xử lý
        // (upsertNetworkOverrides trong updatePost, chỉ khi bài chưa PUBLISHED).
        // Nếu không có override nào (networkOverrides rỗng), payload giống y như trước
        // (backward-compatible 100% — backend bỏ qua khi postData.networkOverrides falsy).
        const updatePayload = networkOverrides.length > 0
          ? { ...payload, networkOverrides }
          : payload;
        await postService.updatePost(editingPost.id, updatePayload);
        toast.success("Post updated successfully");
        // Xóa danh sách track để không bị rollback nhầm file đã đăng
        const clearTrackedAssets = usePostCreatorStore.getState().clearTrackedAssets;
        if (clearTrackedAssets) clearTrackedAssets();
        // Đóng form ngay sau khi cập nhật thành công để tránh user vô tình tạo thêm bài mới
        closePostCreator();
      } else {
        const finalPayload = networkOverrides.length > 0 ? { ...payload, networkOverrides } : payload;
        await postService.createPost(finalPayload);
        toast.success(
          selectedPublishId === PUBLISH_MODE.NOW
            ? "Bài viết đã được tạo và đang được xuất bản ngầm"
            : "Tạo bài viết thành công"
        );
        // Xóa danh sách track để không bị rollback nhầm file đã đăng
        const clearTrackedAssets = usePostCreatorStore.getState().clearTrackedAssets;
        if (clearTrackedAssets) clearTrackedAssets();
        // Đóng form lập tức để trả về giao diện ngầm không phải chờ
        closePostCreator();
        setActivePlatform(DEFAULT_PLATFORM);
        setScheduledDate(toLocalDatetimeString(new Date()));
        setIsLibrary(false);
        setSelectedPublishId(PUBLISH_MODE.NOW);
        setYoutubeType(YOUTUBE_TYPE.VIDEO);
        setYoutubeMadeForKids(null);
        setYoutubeTitle("");
        setYoutubeTags("");
        setYoutubeFirstComment("");
        setGlobalFirstComment("");
        setYoutubeThumbnail("");
        setMediaThumbnailUrl("");
        setMediaThumbnailFile(null);
        setMediaThumbnailPath(null);
        setFacebookTitle("");
        setFacebookType(FACEBOOK_TYPE.POST);
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
        setNetworkCustom(buildDefaultNetworkCustom());
        setIsEditByNetwork(false);
        setActiveNetworkTab(NETWORK_TAB_TEMPLATE);
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
    setSelectedPlatforms,
    selectedAccountIds,
    setSelectedAccountIds,
    // Set when the composer is opened from a single channel's Publish tab
    // (ChannelPublishTab) — the UI locks to this one account and hides the
    // multi-account/platform pickers so the post can't accidentally fan out
    // to other channels.
    isLockedToAccount: Boolean(defaultSocialAccountId),
    toggleAccount,
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
    submitProgressText,
    scheduledDate,
    setScheduledDate,
    isLibrary,
    setIsLibrary,
    globalOpen,
    setGlobalOpen,
    useUrlShortener,
    setUseUrlShortener,
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
    playlistsByAccount,
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
    categories,
    isLoadingCategories,
    fetchCategories,
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
    postMedia,
    setPostMedia,
    // Threads States
    threadsWhoCanReply,
    setThreadsWhoCanReply,
    // Per-platform content override (Cài đặt theo mạng) States
    isEditByNetwork,
    setIsEditByNetwork,
    activeNetworkTab,
    setActiveNetworkTab,
    setNetworkTab,
    activeNetworkAccountId,
    setActiveNetworkAccountId,
    networkCustom,
    toggleUseTemplate,
    updateNetworkCaption,
    updateNetworkMedia,
    updateNetworkSetting,
    updateThreadPostText,
    updateThreadPostMedia,
    addThreadPost,
    removeThreadPost,
    setThreadActiveIndex,
    notes,
    setNotes,
    videoSettings,
    setVideoSettings,
    showMediaViewer,
    setShowMediaViewer,
    mediaThumbnailUrl,
    setMediaThumbnailUrl,
    mediaThumbnailFile,
    setMediaThumbnailFile,
    mediaThumbnailPath,
    setMediaThumbnailPath,
    getBackupPayload,
    backupFormState,
    closePostCreatorTemporarily,
    rightPanelTab,
    setRightPanelTab,
    isNetworkCustomizeOpen,
    setIsNetworkCustomizeOpen,
    createAnother,
    setCreateAnother,
    isFullScreen,
    setIsFullScreen
  };
}
