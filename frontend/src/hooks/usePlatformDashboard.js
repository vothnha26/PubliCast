import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { eachDayOfInterval, format } from "date-fns";
import { toast } from "sonner";
import { useBrand } from "../context/BrandContext";
import socialService from "../services/social.service";
import postService from "../services/post.service";
import { useLatestRequestId } from "./useLatestRequestId";
import { useDateRangeQuery } from "./useDateRangeQuery";
import { getPlatformPostUrl } from "../utils/postUrlHelper";
import { PLATFORM_DEFAULT_TAB } from "../constants/platforms";
import { parseAnalyticsData } from "../utils/parseAnalyticsData";

const getPlatformTabDefault = (plat) => {
  const norm = plat?.toLowerCase();
  return PLATFORM_DEFAULT_TAB[norm] || (norm === "facebook" ? "overview" : "community");
};

export function usePlatformDashboard(platform) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeBrand } = useBrand();

  const [platformLimits, setPlatformLimits] = useState([]);

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const res = await postService.getPlatformLimits();
        if (res.data) {
          setPlatformLimits(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch platform limits in dashboard hook", err);
      }
    };
    fetchLimits();
  }, []);

  const isPlatformLocked = useMemo(() => {
    if (!platform) return false;
    const platUpper = platform.toUpperCase();
    return platformLimits.some(limit => limit.platform === platUpper && limit.isLocked);
  }, [platformLimits, platform]);

  const platformLockReason = useMemo(() => {
    if (!platform) return null;
    const platUpper = platform.toUpperCase();
    const lockedLimit = platformLimits.find(limit => limit.platform === platUpper && limit.isLocked);
    return lockedLimit ? lockedLimit.lockReason : null;
  }, [platformLimits, platform]);
  
  const activeTab = useMemo(() => {
    const tabParam = searchParams.get("tab");
    if (!tabParam) return getPlatformTabDefault(platform);
    
    const ytTabs = ["community", "demographics", "published", "viewed", "competitors"];
    const fbTabs = ["overview", "posts", "posts_list", "stories", "competitors"];
    const ttTabs = ["community", "posts"];
    const igTabs = ["community", "account", "reels", "stories", "competitors"];
    const threadsTabs = ["community", "posts", "competitors"];
    const bskyTabs = ["community", "posts", "competitors"];

    let isValid = false;
    if (platform === "facebook") {
      isValid = fbTabs.includes(tabParam);
    } else if (platform === "instagram") {
      isValid = igTabs.includes(tabParam);
    } else if (platform === "threads") {
      isValid = threadsTabs.includes(tabParam);
    } else if (platform === "tiktok") {
      isValid = ttTabs.includes(tabParam);
    } else if (platform === "bluesky") {
      isValid = bskyTabs.includes(tabParam);
    } else {
      isValid = ytTabs.includes(tabParam);
    }

    return isValid ? tabParam : getPlatformTabDefault(platform);
  }, [platform, searchParams]);

  const setActiveTab = useCallback((tab) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tab);
    nextParams.delete("videoId");
    nextParams.delete("competitorId");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const [showInfo, setShowInfo] = useState(true);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  
  // Date Range State — synced to ?from=&to= in the URL (see useDateRangeQuery)
  const [dateRange, setDateRange] = useDateRangeQuery(30);

  const [selectedMetrics, setSelectedMetrics] = useState({
    subscribers: true,
    views: true,
    revenue: true,
    videos: true
  });

  const handleMetricToggle = (metricKey) => {
    setSelectedMetrics(prev => ({
      ...prev,
      [metricKey]: !prev[metricKey]
    }));
  };

  const [selectedBalanceMetrics, setSelectedBalanceMetrics] = useState({
    gained: true,
    lost: true,
    videos: true
  });

  const handleBalanceMetricToggle = (metricKey) => {
    setSelectedBalanceMetrics(prev => ({
      ...prev,
      [metricKey]: !prev[metricKey]
    }));
  };

  const [trackedVideos, setTrackedVideos] = useState([]);
  const [publishedVideos, setPublishedVideos] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [isPublishedLoading, setIsPublishedLoading] = useState(false);
  const [isCompetitorLoading, setIsCompetitorLoading] = useState(false);
  
  // Pagination States
  const [nextPageToken, setNextPageToken] = useState(null);
  const [prevPageToken, setPrevPageToken] = useState(null);
  const [pageSize, setPageSize] = useState("10");

  // Modal States
  const [videoUrl, setVideoUrl] = useState("");
  const [competitorQuery, setCompetitorQuery] = useState("");
  const [searchResults, setSearchChannels] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isCompetitorModalOpen, setIsCompetitorModalOpen] = useState(false);

  const metricsRequest = useLatestRequestId();

  // loadMetrics is invoked by the mount/brand/platform/dateRange effect and
  // the 5s sync-status poll — a slow older call resolving after a newer one
  // must not clobber fresher state (#78). Memoized with useCallback (deps:
  // platform, dateRange) so effects that depend on it don't need dateRange
  // as a separate dependency, which previously required a second effect
  // just to react to dateRange changes and caused a duplicate fetch
  // alongside the brand/platform effect on mount (#91 M9).
  const loadMetrics = useCallback(async (brandId) => {
    const requestId = metricsRequest.start();
    try {
      // toISOString() converts to UTC first — for a UTC+ user, "today" in
      // local time can shift to yesterday's date, silently dropping the
      // last day's metrics from the query range (#87). format() below uses
      // the date's local calendar fields instead.
      const metrics = await socialService.getMetrics(brandId, {
        startDate: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        endDate: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined
      });
      const platformType = platform.toUpperCase() === 'X' ? 'TWITTER_X' : platform.toUpperCase();
      const platformMetrics = (metrics || []).find(m => m?.platform === platformType);
      if (!metricsRequest.isLatest(requestId)) return;
      setMetrics(platformMetrics || null);
    } catch (error) {
      console.error("Failed to load platform metrics:", error);
      if (!metricsRequest.isLatest(requestId)) return;
      setMetrics(null);
    }
  }, [platform, dateRange, metricsRequest]);

  const fetchTracked = async () => {
    if (!activeBrand) return;
    setIsTrackingLoading(true);
    try {
      const videos = await socialService.getTrackedVideos(activeBrand.id);
      setTrackedVideos(videos || []);
    } catch (error) {
      console.error("Failed to fetch tracked videos:", error);
    } finally {
      setIsTrackingLoading(false);
    }
  };

  const fetchCompetitors = async () => {
    if (!activeBrand) return;
    setIsCompetitorLoading(true);
    try {
      let comps;
      if (platform === 'facebook') {
        comps = await socialService.getFacebookCompetitors(activeBrand.id);
      } else {
        comps = await socialService.getCompetitors(activeBrand.id);
      }
      setCompetitors(comps || []);
    } catch (error) {
      console.error("Failed to fetch competitors:", error);
    } finally {
      setIsCompetitorLoading(false);
    }
  };

  const fetchPublishedVideos = async (pageToken = null, limit = pageSize) => {
    if (!activeBrand) return;
    setIsPublishedLoading(true);
    try {
      if (platform === "facebook") {
        const res = await socialService.getFacebookPublishedPosts(activeBrand.id, pageToken, limit);
        setPublishedVideos(res || []);
        setNextPageToken(res?.nextPageToken || null);
        setPrevPageToken(res?.prevPageToken || null);
      } else if (platform === "instagram") {
        const res = await socialService.getInstagramPublishedPosts(activeBrand.id, pageToken, limit);
        setPublishedVideos(res || []);
        setNextPageToken(res?.nextPageToken || null);
        setPrevPageToken(res?.prevPageToken || null);
      } else if (platform === "tiktok") {
        const res = await socialService.getTikTokPublishedVideos(activeBrand.id, pageToken, limit);
        setPublishedVideos(res?.videos || res || []);
        setNextPageToken(res?.nextPageToken || null);
        setPrevPageToken(res?.prevPageToken || null);
      } else if (platform === "threads") {
        const res = await socialService.getThreadsPublishedPosts(activeBrand.id, pageToken, limit);
        setPublishedVideos(res || []);
        setNextPageToken(res?.nextPageToken || null);
        setPrevPageToken(res?.prevPageToken || null);
      } else if (platform === "bluesky") {
        const posts = await postService.getPosts(activeBrand.id, { platform: 'BLUESKY', status: 'PUBLISHED', limit });
        const postsList = posts || [];
        const mapped = postsList.map(p => ({
          id: p.id,
          message: p.caption || p.title || '',
          date: p.publishedAt || p.createdAt,
          mediaUrl: p.mediaUrls && p.mediaUrls.length > 0 ? p.mediaUrls[0] : null,
          reach: 0,
          views: 0,
          likes: 0,
          comments: 0
        }));
        setPublishedVideos(mapped);
        setNextPageToken(null);
        setPrevPageToken(null);
      } else {
        const res = await socialService.getPublishedVideos(activeBrand.id, pageToken, limit);
        setPublishedVideos(res.videos || []);
        setNextPageToken(res.nextPageToken || null);
        setPrevPageToken(res.prevPageToken || null);
      }
    } catch (error) {
      console.error("Failed to fetch published content:", error);
    } finally {
      setIsPublishedLoading(false);
    }
  };

  const handleVideoClick = useCallback((video) => {
    const url = getPlatformPostUrl(video) || (video.permalinkUrl ? video.permalinkUrl : null);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, []);

  // Single effect covering brand/platform/lock changes AND dateRange changes
  // — previously these were 2 separate effects that both fired on mount
  // whenever activeBrand was already available, issuing two identical
  // GET /social/metrics calls back-to-back (#91 M9). loadMetrics is now a
  // stable useCallback keyed on [platform, dateRange], so this single effect
  // re-fires correctly for either kind of change without needing dateRange
  // as its own separate effect.
  useEffect(() => {
    setMetrics(null);
    if (activeBrand) {
      setLoading(true);
      loadMetrics(activeBrand.id).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [activeBrand, platform, isPlatformLocked, dateRange, loadMetrics]);

  // Tự động thăm dò trạng thái đồng bộ (auto polling) mỗi 5s nếu đang PENDING hoặc PARTIAL
  useEffect(() => {
    if (!activeBrand || !metrics) return;
    if (metrics.syncStatus === "PENDING" || metrics.syncStatus === "PARTIAL") {
      const intervalId = setInterval(() => {
        loadMetrics(activeBrand.id);
      }, 5000);
      return () => clearInterval(intervalId);
    }
  }, [activeBrand, metrics?.syncStatus, platform, loadMetrics]);

  // Validate tab parameter and set default/redirect if empty or invalid
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    
    const ytTabs = ["community", "demographics", "published", "viewed", "competitors"];
    const fbTabs = ["overview", "posts", "posts_list", "stories", "competitors"];
    const ttTabs = ["community", "posts"];
    const igTabs = ["community", "account", "reels", "stories", "competitors"];
    const threadsTabs = ["community", "posts", "competitors"];
    const bskyTabs = ["community", "posts", "competitors"];

    let isValid = false;
    if (tabParam) {
      if (platform === "facebook") {
        isValid = fbTabs.includes(tabParam);
      } else if (platform === "instagram") {
        isValid = igTabs.includes(tabParam);
      } else if (platform === "threads") {
        isValid = threadsTabs.includes(tabParam);
      } else if (platform === "tiktok") {
        isValid = ttTabs.includes(tabParam);
      } else if (platform === "bluesky") {
        isValid = bskyTabs.includes(tabParam);
      } else {
        isValid = ytTabs.includes(tabParam);
      }
    }
    
    if (!tabParam || !isValid) {
      const def = getPlatformTabDefault(platform);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", def);
      setSearchParams(nextParams, { replace: true });
    }
  }, [platform, searchParams, setSearchParams]);

  useEffect(() => {
    if (!activeBrand) return;
    if (activeTab === "viewed" && platform !== "facebook") fetchTracked();
    if (activeTab === "competitors") fetchCompetitors();
    if (
      activeTab === "published" ||
      activeTab === "posts_list" ||
      activeTab === "account" ||
      activeTab === "reels" ||
      activeTab === "stories" ||
      (activeTab === "posts" && (platform === "tiktok" || platform === "threads" || platform === "facebook" || platform === "instagram")) ||
      (activeTab === "community" && platform === "youtube")
    ) {
      fetchPublishedVideos(null, pageSize);
    }
  }, [activeTab, activeBrand, pageSize]);

  const handleTrackVideo = async () => {
    if (!videoUrl) return;
    try {
      await socialService.addTrackedVideo(activeBrand.id, videoUrl);
      toast.success("Video added to tracking list");
      setVideoUrl("");
      setIsVideoModalOpen(false);
      fetchTracked();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to track video");
    }
  };

  const handleSearchCompetitors = async () => {
    if (!competitorQuery) return;
    setIsSearching(true);
    try {
      let res;
      if (platform === 'facebook') {
        res = await socialService.searchFacebookPages(activeBrand.id, competitorQuery);
      } else {
        res = await socialService.searchChannels(activeBrand.id, competitorQuery);
      }
      setSearchChannels(res.data || []);
    } catch (e) {
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddCompetitor = async (pageOrChannelId) => {
    try {
      if (platform === 'facebook') {
        await socialService.addFacebookCompetitor(activeBrand.id, pageOrChannelId);
      } else {
        await socialService.addCompetitor(activeBrand.id, pageOrChannelId);
      }
      toast.success("Competitor added");
      setIsCompetitorModalOpen(false);
      setSearchChannels([]);
      setCompetitorQuery("");
      fetchCompetitors();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to add competitor");
    }
  };

  const handleDeleteCompetitor = async (id) => {
    if (!activeBrand) return;
    try {
      await socialService.deleteCompetitor(id, activeBrand.id);
      toast.success("Competitor deleted successfully");
      fetchCompetitors();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete competitor");
    }
  };

  // Memoized: parses/reshapes the raw analytics JSON, so without useMemo this
  // ran on every render of any consumer (e.g. an unrelated UI toggle), even
  // when metrics/platform/dateRange hadn't changed (#91 L15). Logic lives in
  // parseAnalyticsData (frontend/src/utils/parseAnalyticsData.js), shared
  // with useChannelInsights so both the old platform-grouped dashboard and
  // the new per-channel Insights tab stay in sync instead of drifting apart.
  const realData = useMemo(() => parseAnalyticsData(metrics, platform, dateRange), [metrics, platform, dateRange]);

  // Memoized alongside realData (#91 L15) — depends on the same inputs plus
  // realData itself, so it only recomputes when one of them actually changes.
  const stats = useMemo(() => {
    if (!metrics) return { subscribers: 0, views: 0, videos: 0 };
    if (platform === "facebook") {
      if (!metrics.facebookPage) return { subscribers: 0, views: 0, videos: 0 };
      return {
        subscribers: metrics.facebookPage.followersCount,
        views: realData.summary?.views || metrics.facebookPage.likesCount,
        videos: 0
      };
    }
    if (platform === "instagram" || platform === "threads") {
      if (!metrics.instagramAccount) return { subscribers: 0, views: 0, videos: 0 };
      return {
        subscribers: metrics.instagramAccount.followersCount,
        views: realData.summary?.views || 0,
        likes: realData.summary?.likes || 0,
        videos: metrics.instagramAccount.mediaCount || 0
      };
    }
    if (platform === "tiktok") {
      if (!metrics.tikTokAccount) return { subscribers: 0, views: 0, videos: 0 };
      return {
        subscribers: metrics.tikTokAccount.followersCount,
        views: realData.summary?.views || metrics.tikTokAccount.likesCount,
        videos: metrics.tikTokAccount.videoCount
      };
    }
    if (!metrics.youtubeChannel) return { subscribers: 0, views: 0, videos: 0 };
    return {
      subscribers: metrics.youtubeChannel.subscribersCount,
      views: metrics.youtubeChannel.totalViewsCount,
      videos: metrics.youtubeChannel.totalVideosCount
    };
  }, [metrics, platform, realData]);

  const totalPeriodViews = realData.growth?.reduce((a, b) => a + (b.value || 0), 0) || 0;
  const totalPeriodGained = realData.growth?.reduce((a, b) => a + (b.new || 0), 0) || 0;
  const totalPeriodLost = realData.growth?.reduce((a, b) => a + (b.lost || 0), 0) || 0;
  const totalPeriodVideos = realData.growth?.reduce((a, b) => a + (b.videos || 0), 0) || 0;

  const communityGrowthData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];
    try {
      if (platform === "facebook" || platform === "tiktok") {
        return realData.growth || [];
      }
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      
      return days.map((day) => {
        const dateString = format(day, "MMM d");
        const searchDate = format(day, "yyyy-MM-dd");
        const realDayData = realData.growth?.find(g => g.date === searchDate);

        if (platform === "instagram") {
          const likesCount = realDayData ? (realDayData.likes || 0) : 0;
          const commentsCount = realDayData ? (realDayData.comments || 0) : 0;
          const savedCount = realDayData ? (realDayData.saved || 0) : 0;
          const sharesCount = realDayData ? (realDayData.shares || 0) : 0;
          const postsCount = realDayData ? (realDayData.totalContent || realDayData.posts || 0) : 0;
          const interactionsCount = realDayData ? (realDayData.interactions || (likesCount + commentsCount + savedCount + sharesCount)) : 0;
          const reachCount = realDayData ? (realDayData.reach || 0) : 0;
          const viewsCount = realDayData ? (realDayData.views || 0) : 0;
          const engagementRate = realDayData ? (realDayData.engagement || 0) : 0;

          return {
            name: dateString,
            followers: realDayData ? (realDayData.followers || 0) : 0,
            following: metrics?.instagramAccount?.followingCount || 0,
            totalContent: postsCount,
            posts: postsCount,
            engagement: engagementRate,
            interactions: interactionsCount,
            reach: reachCount,
            views: viewsCount,
            likes: likesCount,
            comments: commentsCount,
            saved: savedCount,
            shares: sharesCount
          };
        }

        return {
          name: dateString,
          subscribers: realDayData ? realDayData.new : 0,
          views: realDayData ? realDayData.value : 0,
          revenue: 0,
          videos: realDayData ? realDayData.videos : 0,
          new: realDayData ? realDayData.new : 0,
          lost: realDayData ? realDayData.lost : 0
        };
      });
    } catch (e) {
      console.error("Error generating community growth data:", e);
      return [];
    }
  }, [dateRange, realData.growth, platform, metrics]);

  return {
    activeTab,
    setActiveTab,
    showInfo,
    setShowInfo,
    loading,
    metrics,
    dateRange,
    setDateRange,
    selectedMetrics,
    handleMetricToggle,
    selectedBalanceMetrics,
    handleBalanceMetricToggle,
    trackedVideos,
    publishedVideos,
    competitors,
    isTrackingLoading,
    isPublishedLoading,
    isCompetitorLoading,
    nextPageToken,
    prevPageToken,
    pageSize,
    setPageSize,
    videoUrl,
    setVideoUrl,
    competitorQuery,
    setCompetitorQuery,
    searchResults,
    isSearching,
    isVideoModalOpen,
    setIsVideoModalOpen,
    isCompetitorModalOpen,
    setIsCompetitorModalOpen,
    handleVideoClick,
    stats,
    realData,
    totalPeriodViews,
    totalPeriodGained,
    communityGrowthData,
    handleTrackVideo,
    handleSearchCompetitors,
    handleAddCompetitor,
    handleDeleteCompetitor,
    fetchPublishedVideos,
    activeBrand,
    isPlatformLocked,
    platformLockReason
  };
}
