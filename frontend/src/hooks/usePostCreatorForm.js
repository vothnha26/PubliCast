import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useBrand } from "../context/BrandContext";
import socialService from "../services/social.service";
import workflowService from "../services/workflow.service";
import mediaService from "../services/media.service";
import { usePostCreator } from "../context/PostCreatorContext";
import { usePostCreatorStore } from "../store/usePostCreatorStore";
import { DEFAULT_PLATFORM, PLATFORMS, PLATFORM_API_KEY } from "../constants/platforms";
import { PLATFORM_CONFIGS } from "../constants/platformRegistry";
import { POST_STATUS, PUBLISH_MODE, PUBLISH_MODE_TO_STATUS, STATUS_TO_PUBLISH_MODE } from "../constants/postStatus";
import { POST_TYPE, YOUTUBE_TYPE, FACEBOOK_TYPE, INSTAGRAM_TYPE, TIKTOK_PRIVACY, APPROVAL_POLICY, YOUTUBE_DEFAULT_CATEGORY_ID } from "../constants/postTypes";
import { buildMediaUrl, isVideoPath } from "../utils/url";
import { validatePostForm } from "../utils/postValidation";
import { logger } from "../utils/logger";
import postService from "../services/post.service";
import { uploadMediaFile, uploadMediaFileWithMetadata } from "../services/mediaUpload.service";
import {
  NETWORK_TAB_TEMPLATE,
  buildDefaultNetworkCustom,
  mapNetworkOverridesToCustom,
} from "../constants/postComposerNetwork";

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
  const [mediaThumbnailUrl, setMediaThumbnailUrl] = useState("");
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
  const [facebookReelCollaboratorId, setFacebookReelCollaboratorId] = useState("");
  const [facebookReelPlaceId, setFacebookReelPlaceId] = useState("");
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
      setFacebookReelCollaboratorId(backup.facebookReelCollaboratorId ?? "");
      setFacebookReelPlaceId(backup.facebookReelPlaceId ?? "");
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
        postMedia: updatedPostMedia
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
      isEditByNetwork,
      activeNetworkTab,
      activeNetworkAccountId,
      networkCustom,
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

  // Khởi tạo mặc định tài khoản đăng khi mở composer
  useEffect(() => {
    if (activeBrand?.socialAccounts && isOpen) {
      const platformMap = {
        FACEBOOK: "facebook",
        INSTAGRAM: "instagram",
        YOUTUBE: "youtube",
        TIKTOK: "tiktok",
        TELEGRAM: "telegram",
        THREADS: "threads",
        BLUESKY: "bluesky",
        REDDIT: "reddit"
      };

      if (defaultSocialAccountId) {
        const targetAcc = activeBrand.socialAccounts.find((sa) => sa.id === defaultSocialAccountId);
        if (targetAcc) {
          setSelectedAccountIds([targetAcc.id]);
          const platformKey = platformMap[targetAcc.platform];
          if (platformKey) {
            setSelectedPlatforms([platformKey]);
            setActivePlatform(platformKey);
          }
          return;
        }
      }

      if (defaultSocialAccountIds?.length > 0) {
        const targetAccs = activeBrand.socialAccounts.filter((sa) => defaultSocialAccountIds.includes(sa.id));
        if (targetAccs.length > 0) {
          setSelectedAccountIds(targetAccs.map((sa) => sa.id));
          const platformKeys = [...new Set(targetAccs.map((sa) => platformMap[sa.platform]).filter(Boolean))];
          if (platformKeys.length > 0) {
            setSelectedPlatforms(platformKeys);
            setActivePlatform(platformKeys[0]);
          }
          return;
        }
      }

      const connected = activeBrand.socialAccounts.filter((sa) => sa.isConnected);
      if (connected.length > 0) {
        setSelectedAccountIds(connected.map((sa) => sa.id));
      }
    }
  }, [activeBrand, isOpen, defaultSocialAccountId, defaultSocialAccountIds]);

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
        const platformMap = {
          FACEBOOK: "facebook",
          INSTAGRAM: "instagram",
          YOUTUBE: "youtube",
          TIKTOK: "tiktok",
          TELEGRAM: "telegram",
          THREADS: "threads",
          BLUESKY: "bluesky",
          REDDIT: "reddit"
        };
        const selectedAccs = activeBrand.socialAccounts.filter((sa) => next.includes(sa.id));
        const newPlatforms = Array.from(new Set(selectedAccs.map((sa) => platformMap[sa.platform]).filter(Boolean)));
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

  // A platform's networkCustom entry either holds content directly
  // (single-account platforms — unchanged from before) or, when the
  // platform has ≥2 selected accounts, an entry.perAccount map keyed by
  // socialAccountId so each account can have its own caption/media instead
  // of all of them silently sharing entry.caption (composer-audit P0.4).
  // These two helpers centralize that "read/write the right slot" branch so
  // toggleUseTemplate/updateNetworkCaption/updateNetworkMedia don't each
  // duplicate it.
  const getNetworkEntrySlot = (entry, accountId) => {
    if (!accountId) return entry || { useTemplate: true, caption: "", mediaUrls: [] };
    return entry?.perAccount?.[accountId] || { useTemplate: true, caption: "", mediaUrls: [] };
  };

  const setNetworkEntrySlot = (entry, accountId, slot) => {
    if (!accountId) return { ...entry, ...slot };
    return {
      ...entry,
      perAccount: { ...(entry?.perAccount || {}), [accountId]: { ...getNetworkEntrySlot(entry, accountId), ...slot } },
    };
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

      const effectiveInitialMedia = (postMedia && postMedia.length > 0)
        ? [...postMedia]
        : (videoFileUrl || uploadedVideoPath)
          ? [{ previewUrl: videoFileUrl, path: uploadedVideoPath, file: videoFile }]
          : [];

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
    setNetworkCustom((prev) => ({
      ...prev,
      [platformId]: setNetworkEntrySlot(prev[platformId], accountId, { useTemplate: false, caption: value }),
    }));
  };

  const updateNetworkMedia = (platformId, mediaUrls, accountId = null) => {
    setNetworkCustom((prev) => ({
      ...prev,
      [platformId]: setNetworkEntrySlot(prev[platformId], accountId, { useTemplate: false, mediaUrls }),
    }));
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
      const threads = prev[PLATFORMS.THREADS] || { threadPosts: [{ text: "", mediaUrls: [] }] };
      const newPosts = [...threads.threadPosts];
      const curr = typeof newPosts[index] === 'object' && newPosts[index] !== null
        ? newPosts[index]
        : { text: typeof newPosts[index] === 'string' ? newPosts[index] : '', mediaUrls: [] };
      newPosts[index] = { ...curr, text };
      return { ...prev, [PLATFORMS.THREADS]: { ...threads, threadPosts: newPosts } };
    });
  };

  const updateThreadPostMedia = (index, mediaUrls) => {
    setNetworkCustom((prev) => {
      const threads = prev[PLATFORMS.THREADS] || { threadPosts: [{ text: "", mediaUrls: [] }] };
      const newPosts = [...threads.threadPosts];
      const curr = typeof newPosts[index] === 'object' && newPosts[index] !== null
        ? newPosts[index]
        : { text: typeof newPosts[index] === 'string' ? newPosts[index] : '', mediaUrls: [] };
      newPosts[index] = { ...curr, mediaUrls };
      return { ...prev, [PLATFORMS.THREADS]: { ...threads, threadPosts: newPosts } };
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

  const connectedPlatforms = activeBrand?.socialAccounts
    ?.filter(sa => sa.isConnected)
    ?.map(sa => {
      const mapping = {
        FACEBOOK: "facebook",
        INSTAGRAM: "instagram",
        YOUTUBE: "youtube",
        TIKTOK: "tiktok",
        TELEGRAM: "telegram",
        THREADS: "threads",
        BLUESKY: "bluesky",
        REDDIT: "reddit"
      };
      return mapping[sa.platform];
    })
    ?.filter(Boolean) || [];

  const getValidationErrors = () => {
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
      mediaCount: postMedia ? postMedia.length : 0,
      editingPost,
      postMedia,
      captionText: caption,
      youtubeMadeForKids,
      networkCustom
    });
  };

  // Playlists fetched data
  const [playlists, setPlaylists] = useState([]);
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
    return activeBrand?.socialAccounts?.find(
      sa => (sa.platform || '').toUpperCase() === PLATFORMS.YOUTUBE && selectedAccountIds.includes(sa.id)
    )?.id || null;
  };

  const fetchPlaylists = async (forceRefresh = false) => {
    if (!activeBrand) return;
    setIsLoadingPlaylists(true);
    try {
      const res = await socialService.getYouTubePlaylists(activeBrand.id, forceRefresh, getSelectedYoutubeAccountId());
      setPlaylists(res.data || res || []);
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
        
        // Setup options
        const opts = editingPost.options || {};
        setYoutubeType(opts.youtubeType || "video");
        setYoutubeTitle(opts.youtubeTitle || "");
        setYoutubeMadeForKids(typeof opts.madeForKids === 'boolean' ? opts.madeForKids : null);
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

        // Setup per-platform content override từ networkOverrides đã lưu (nếu có)
        const loadedNetworkCustom = mapNetworkOverridesToCustom(editingPost.networkOverrides || []);
        setNetworkCustom(loadedNetworkCustom);
        setIsEditByNetwork(Object.values(loadedNetworkCustom).some((entry) => entry.useTemplate === false));
        setActiveNetworkTab(NETWORK_TAB_TEMPLATE);

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
        
        // Setup options
        const opts = templatePost.options || {};
        setYoutubeType(opts.youtubeType || "video");
        setYoutubeTitle(opts.youtubeTitle || "");
        setYoutubeMadeForKids(typeof opts.madeForKids === 'boolean' ? opts.madeForKids : null);
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

        // Setup per-platform content override từ networkOverrides của template (nếu có)
        const loadedTemplateNetworkCustom = mapNetworkOverridesToCustom(templatePost.networkOverrides || []);
        setNetworkCustom(loadedTemplateNetworkCustom);
        setIsEditByNetwork(Object.values(loadedTemplateNetworkCustom).some((entry) => entry.useTemplate === false));
        setActiveNetworkTab(NETWORK_TAB_TEMPLATE);

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
        
        // selectedPlatforms is a set of PLATFORMS (one entry per platform),
        // not accounts — a brand with 2 YouTube channels must still produce
        // a single 'youtube' entry here, or downstream consumers keyed by
        // platform (NetworkTabSwitcher's tabs, PRESET_REGISTRY rendering in
        // ComposerBody) get duplicate React keys / duplicate panels for the
        // same platform. Which specific account(s) are targeted is a
        // separate concern, tracked by selectedAccountIds.
        const connected = [...new Set(activeBrand?.socialAccounts
          ?.filter(sa => sa.isConnected)
          ?.map(sa => {
            const mapping = {
              FACEBOOK: "facebook",
              INSTAGRAM: "instagram",
              YOUTUBE: "youtube",
              TIKTOK: "tiktok",
              TELEGRAM: "telegram",
              THREADS: "threads"
            };
            return mapping[sa.platform];
          })
          ?.filter(Boolean) || [])];
        const initialPlatform = connected.includes(DEFAULT_PLATFORM)
          ? DEFAULT_PLATFORM
          : (connected[0] || DEFAULT_PLATFORM);

        // Default to every connected platform, not just one — users creating
        // a new post overwhelmingly intend to cross-post, and a single
        // pre-selected pill among several unselected ones is easy to miss,
        // silently under-publishing to just DEFAULT_PLATFORM (YouTube).
        setSelectedPlatforms(connected.length > 0 ? connected : [initialPlatform]);
        setActivePlatform(initialPlatform);
        setScheduledDate(defaultScheduledAt ? toLocalDatetimeString(defaultScheduledAt) : toLocalDatetimeString(new Date()));
        setIsLibrary(initialIsLibrary || false);
        setSelectedPublishId(defaultScheduledAt ? PUBLISH_MODE.SCHEDULE : PUBLISH_MODE.NOW);
        setYoutubeType(YOUTUBE_TYPE.VIDEO);
        setYoutubeTitle("");
        setYoutubeMadeForKids(null);
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
        setVideoSettings(null);

        // Reset per-platform content override
        setNetworkCustom(buildDefaultNetworkCustom());
        setIsEditByNetwork(false);
        setActiveNetworkTab(NETWORK_TAB_TEMPLATE);

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
    setYoutubeMadeForKids(typeof opts.madeForKids === 'boolean' ? opts.madeForKids : null);
    setYoutubePrivacy(opts.privacyStatus || "public");
    setYoutubeCategory(opts.categoryId || "22");
    setYoutubePlaylistId(opts.playlistId || "");
    setYoutubeTags(opts.tags || "");
    setYoutubeFirstComment(opts.firstComment || "");
    setGlobalFirstComment(opts.firstComment || "");
    setYoutubeThumbnail(opts.youtubeThumbnail || "");
    setThreadsWhoCanReply(opts.threadsWhoCanReply || "everyone");

    // Setup per-platform content override từ networkOverrides của template (nếu có)
    const loadedNetworkCustom = mapNetworkOverridesToCustom(template.networkOverrides || []);
    setNetworkCustom(loadedNetworkCustom);
    setIsEditByNetwork(Object.values(loadedNetworkCustom).some((entry) => entry.useTemplate === false));
    setActiveNetworkTab(NETWORK_TAB_TEMPLATE);

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
        if (entry?.useTemplate !== false) return;

        if (Array.isArray(entry.mediaUrls)) {
          entry.mediaUrls.forEach((item) => {
            if (typeof item === 'object' && item.file && !item.path) {
              pendingNetworkItems.push(item);
            }
          });
        }

        if (platform === PLATFORMS.THREADS && Array.isArray(entry.threadPosts)) {
          entry.threadPosts.forEach((post) => {
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

      const allPendingFiles = [...pendingPostMedia, ...pendingNetworkItems];
      const totalPending = allPendingFiles.length;

      if (totalPending > 0) {
        let uploadedCount = 0;
        for (const item of allPendingFiles) {
          uploadedCount++;
          setSubmitProgressText(`Đang tải lên file ${uploadedCount}/${totalPending}...`);
          try {
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
            const trackUploadedAsset = usePostCreatorStore.getState().trackUploadedAsset;
            if (trackUploadedAsset && uploadedUrl) {
              trackUploadedAsset(uploadedUrl);
            }
          } catch (uploadErr) {
            console.error("Failed to upload file during submit:", uploadErr);
            setSubmitProgressText(null);
            setIsCreating(false);
            const fileName = item.file?.name || "media";
            toast.error(`Tải lên file "${fileName}" thất bại: ${uploadErr.response?.data?.message || uploadErr.message || "Lỗi kết nối"}`);
            return; // Dừng submit ngay lập tức, giữ nguyên 100% state form!
          }
        }

        setPostMedia([...postMedia]);
        setNetworkCustom({ ...networkCustom });
      }

      setSubmitProgressText(null);

      // Map publish mode → post status dùng lookup, không dùng if-else chain
      const status = PUBLISH_MODE_TO_STATUS[selectedPublishId] || POST_STATUS.DRAFT;

      let activeSubType = 'post';
      if (activePlatform === PLATFORMS.FACEBOOK) activeSubType = facebookType;
      else if (activePlatform === PLATFORMS.YOUTUBE) activeSubType = youtubeType;
      else if (activePlatform === PLATFORMS.INSTAGRAM) activeSubType = instagramType;
      else if (activePlatform === PLATFORMS.TIKTOK) activeSubType = 'video';

      const effectiveUploadedPath = uploadedVideoPath || (postMedia.length > 0 ? postMedia[0].path : "");
      const hasMedia = !!(effectiveUploadedPath || (postMedia && postMedia.length > 0 && postMedia[0].path));
      const isVid = isVideoPath(videoFileUrl, videoFile);

      const platformConfig = PLATFORM_CONFIGS[activePlatform];
      const postType = platformConfig
        ? platformConfig.getPostType(activeSubType, hasMedia, isVid)
        : POST_TYPE.VIDEO;

      // Captions built alongside their URLs (not filtered separately) so an
      // item with no path doesn't shift mediaCaptions[i] out of sync with
      // postMediaUrls[i] (AlbumPublishStrategy matches them by index).
      // postMedia's per-item caption is written by AltTextModal (see
      // PostCreator.jsx's onSave) — ≥2 photos here auto-routes to Facebook's
      // album strategy server-side (facebook-post.service.js), no separate
      // "Album" post type needed anymore.
      let postMediaUrls;
      let mediaCaptions;
      if (postMedia && postMedia.length > 0) {
        const validItems = postMedia.filter(item => item.path);
        postMediaUrls = validItems.map(item => item.path);
        mediaCaptions = validItems.map(item => item.caption || "");
      } else {
        postMediaUrls = effectiveUploadedPath ? [effectiveUploadedPath] : [];
        mediaCaptions = [];
      }

      // Groups the flat selectedAccountIds by platform into the shape
      // upsertPostTargets expects ({ [PLATFORM]: string[] }) — without this,
      // the account picker's choice never reached the backend and every
      // post silently fell back to each platform's default/earliest-connected
      // account, ignoring which specific channel the user picked (#composer-audit P0).
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
        title: title || (activePlatform === 'facebook' && facebookType === 'reel' ? facebookTitle : youtubeTitle) || (caption ? Array.from(caption).slice(0, 50).join('') : "New Post"),
        caption,
        type: postType,
        status,
        isLibrary,
        altText,
        targetPlatforms: selectedPlatforms.filter(p => connectedPlatforms.includes(p)).map(p => p.toUpperCase()),
        selectedAccountIds: selectedAccountIdsByPlatform,
        scheduledAt: ['schedule', 'review'].includes(selectedPublishId) ? (scheduledDate ? new Date(scheduledDate).toISOString() : null) : null,
        mediaUrls: postMediaUrls,
        mediaThumbnailUrls: mediaThumbnailUrl ? [mediaThumbnailUrl] : [],
        reviewerIds: selectedReviewerIds,
        approvalPolicy: approvalPolicy,
        requesterNote: requesterNote || "Vui lòng phê duyệt bài viết này.",
        options: {
          // From the browser's own <video> element (free, measured before
          // upload — see the videoFileUrl-driven effect that sets these) or,
          // for width/frameRate, from Cloudinary's upload response captured
          // on postMedia[0] just above (frameRate has no browser API
          // equivalent, so Cloudinary is the only source for it here).
          videoDuration,
          videoWidth: postMedia[0]?.width || videoWidth,
          videoHeight: postMedia[0]?.height || videoHeight,
          videoFrameRate: postMedia[0]?.frameRate || null,
          youtubeType,
          youtubeTitle,
          privacyStatus: youtubePrivacy,
          categoryId: youtubeCategory,
          playlistId: youtubePlaylistId,
          tags: youtubeTags,
          madeForKids: youtubeMadeForKids,
          firstComment: youtubeFirstComment || globalFirstComment,
          // mediaThumbnailUrl làm SSoT cho thumbnail, nối dây cho cả YouTube và Facebook Reel
          youtubeThumbnail: mediaThumbnailUrl || youtubeThumbnail,
          facebookType,
          facebookTitle,
          facebookReelCollaboratorId,
          facebookReelPlaceId,
          facebookReelThumbnail: mediaThumbnailUrl || facebookReelThumbnail,
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
          mediaCaptions,
          threadsWhoCanReply,
          useUrlShortener,
          notes,
          videoSettings
        }
      };

      const formatOverrideMediaUrls = (mediaUrls) => (mediaUrls || [])
        .map((item) => (typeof item === 'string' ? item : item.path || item.previewUrl))
        .filter(Boolean);

      const buildNetworkOverrides = () => {
        const overrides = [];
        Object.entries(networkCustom).forEach(([platform, entry]) => {
          if (!selectedPlatforms.includes(platform)) return;
          const apiKey = PLATFORM_API_KEY[platform];
          if (!apiKey) return; // bỏ qua platform không có API key hợp lệ

          const accountsForPlatform = activeBrand?.socialAccounts?.filter(
            sa => (sa.platform || '').toLowerCase() === apiKey.toLowerCase() && selectedAccountIds.includes(sa.id)
          ) || [];

          // Settings (YouTube category/privacy/tags, TikTok duet/stitch,
          // etc.) are an independent override axis from caption/media —
          // updateNetworkSetting deliberately doesn't flip useTemplate, so a
          // user can give one account a different category while every
          // account still shares the global caption. Both this and the
          // useTemplate!==false check below gate whether an override row is
          // written for a given account.
          const hasAnySettingsFor = (accountId) => {
            const slot = accountId ? entry.perAccount?.[accountId] : entry;
            return slot?.settings && Object.keys(slot.settings).length > 0;
          };
          // entry.useTemplate is the SINGLE-account flag (setNetworkEntrySlot
          // only ever writes it when accountId is falsy) — on a platform with
          // ≥2 targeted accounts, per-account customization lives in
          // entry.perAccount[accId].useTemplate instead and never touches
          // entry.useTemplate at all. Checking only entry.useTemplate here
          // meant every per-account customization on a multi-account platform
          // was silently skipped (this whole platform returned before ever
          // building an override row for it) — the composer's own UI wrote
          // the caption fine, it just never made it into the payload.
          const hasAnyCaptionCustomizedFor = (accountId) => {
            const slot = accountId ? entry.perAccount?.[accountId] : entry;
            return slot?.useTemplate === false;
          };
          const isThreadsWithChain = platform === PLATFORMS.THREADS && (entry?.threadPosts?.length || 0) > 0;
          if (
            !isThreadsWithChain &&
            !hasAnyCaptionCustomizedFor(null) &&
            accountsForPlatform.every((acc) => !hasAnyCaptionCustomizedFor(acc.id) && !hasAnySettingsFor(acc.id)) &&
            !hasAnySettingsFor(null)
          ) {
            return;
          }

          // With ≥2 accounts, each may have its own perAccount slot (see
          // getNetworkEntrySlot) — falls back to the shared `entry` for any
          // account that was never individually customized, so turning on
          // "Theo mạng" for a platform still seeds every account with
          // something instead of an empty override (composer-audit P0.4).
          const effectiveEntryFor = (accountId) =>
            accountsForPlatform.length > 1 && entry.perAccount?.[accountId]
              ? entry.perAccount[accountId]
              : entry;

          const formattedMediaUrls = (entry.mediaUrls || [])
            .map((item) => (typeof item === 'string' ? item : item.path || item.previewUrl))
            .filter(Boolean);

          if (platform === PLATFORMS.THREADS) {
            const getValidPosts = (e) => (e.threadPosts || []).filter((p) => {
              const txt = typeof p === 'string' ? p : p?.text;
              const media = typeof p === 'string' ? [] : (p?.mediaUrls || []);
              return (txt && txt.trim()) || media.length > 0;
            });

            if (accountsForPlatform.length > 0) {
              accountsForPlatform.forEach((acc) => {
                const accEntry = effectiveEntryFor(acc.id);
                const validPosts = getValidPosts(accEntry);
                if (validPosts.length === 0) return;
                const firstPostText = typeof validPosts[0] === 'string' ? validPosts[0] : (validPosts[0].text || '');
                const firstPostMedia = typeof validPosts[0] === 'string' ? [] : (validPosts[0].mediaUrls || []);
                overrides.push({
                  platform: apiKey,
                  socialAccountId: acc.id,
                  useTemplate: false,
                  caption: firstPostText,
                  mediaUrls: formatOverrideMediaUrls(firstPostMedia),
                  threadPosts: validPosts.map((p) => ({
                    text: typeof p === 'string' ? p : (p.text || ''),
                    mediaUrls: formatOverrideMediaUrls(typeof p === 'string' ? [] : p.mediaUrls),
                  })),
                });
              });
            } else {
              const validPosts = getValidPosts(entry);
              if (validPosts.length === 0) return;
              const firstPostText = typeof validPosts[0] === 'string' ? validPosts[0] : (validPosts[0].text || '');
              const firstPostMedia = typeof validPosts[0] === 'string' ? [] : (validPosts[0].mediaUrls || []);
              overrides.push({
                platform: apiKey,
                useTemplate: false,
                caption: firstPostText,
                mediaUrls: formatOverrideMediaUrls(firstPostMedia),
                threadPosts: validPosts.map((p) => ({
                  text: typeof p === 'string' ? p : (p.text || ''),
                  mediaUrls: formatOverrideMediaUrls(typeof p === 'string' ? [] : p.mediaUrls),
                })),
              });
            }
          } else {
            if (accountsForPlatform.length > 0) {
              accountsForPlatform.forEach((acc) => {
                const accEntry = effectiveEntryFor(acc.id);
                const accMediaUrls = formatOverrideMediaUrls(accEntry.mediaUrls);
                // Settings live on this account's own perAccount slot, never
                // inherited via effectiveEntryFor's shared-content fallback —
                // a category chosen for account A must never silently apply
                // to account B just because B hasn't customized its caption yet.
                const accSettings = entry.perAccount?.[acc.id]?.settings;
                const hasSettings = accSettings && Object.keys(accSettings).length > 0;
                const isCaptionCustomized = accEntry.useTemplate === false;
                if (!isCaptionCustomized && !hasSettings) return;
                if (isCaptionCustomized && !accEntry.caption && accMediaUrls.length === 0 && !hasSettings) return;
                overrides.push({
                  platform: apiKey,
                  socialAccountId: acc.id,
                  // useTemplate here means the SAME thing backend expects
                  // (social-publish.step.js: useOverride = override.useTemplate
                  // === false) — false = "this account has its own
                  // caption/media, don't fall back to the shared post". It was
                  // previously sent as `isCaptionCustomized` itself (true when
                  // customized), the exact inverse of what the backend checks
                  // for, so every per-account customization on a multi-account
                  // platform silently published the shared caption instead.
                  useTemplate: !isCaptionCustomized,
                  caption: isCaptionCustomized ? (accEntry.caption || '') : undefined,
                  mediaUrls: isCaptionCustomized ? accMediaUrls : undefined,
                  ...(hasSettings ? { settings: accSettings } : {}),
                });
              });
            } else {
              const singleSettings = entry.settings;
              const hasSettings = singleSettings && Object.keys(singleSettings).length > 0;
              if (entry?.useTemplate === false) {
                if (!entry.caption && formattedMediaUrls.length === 0 && !hasSettings) return;
                overrides.push({
                  platform: apiKey,
                  useTemplate: false,
                  caption: entry.caption || '',
                  mediaUrls: formattedMediaUrls,
                  ...(hasSettings ? { settings: singleSettings } : {}),
                });
              } else if (hasSettings) {
                overrides.push({
                  platform: apiKey,
                  useTemplate: true,
                  settings: singleSettings,
                });
              }
            }
          }
        });
        return overrides;
      };

      const networkOverrides = buildNetworkOverrides();

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
        toast.success("Post created successfully");
        // Xóa danh sách track để không bị rollback nhầm file đã đăng
        const clearTrackedAssets = usePostCreatorStore.getState().clearTrackedAssets;
        if (clearTrackedAssets) clearTrackedAssets();
        // Reset state sau khi tạo bài mới thành công
        setSelectedPlatforms([DEFAULT_PLATFORM]);
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
    postMedia,
    setPostMedia,
    // Threads States
    threadsWhoCanReply,
    setThreadsWhoCanReply,
    // Per-platform content override (Cài đặt theo mạng) States
    isEditByNetwork,
    setIsEditByNetwork,
    activeNetworkTab,
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
