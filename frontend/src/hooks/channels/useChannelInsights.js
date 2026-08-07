import { useState, useEffect, useCallback, useMemo } from "react";
import { eachDayOfInterval, format } from "date-fns";
import { toast } from "sonner";
import { useBrand } from "../../context/BrandContext";
import socialService from "../../services/social.service";
import postService from "../../services/post.service";
import socketClient from "../../services/socket";
import { useMetricsQuery } from "../queries/useMetricsQuery";
import { useDateRangeQuery } from "../useDateRangeQuery";
import { parseAnalyticsData } from "../../utils/parseAnalyticsData";
import { PLATFORMS } from "../../constants/platforms";

const DEFAULT_PAGE_SIZE = 10;

/**
 * Single-account variant of the metrics/published-content half of
 * usePlatformDashboard.js — selects by socialAccountId instead of platform.
 */
export function useChannelInsights(socialAccountId, platformInput) {
  const platform = (platformInput || "").toLowerCase();
  const { activeBrand } = useBrand();

  const [dateRange, setDateRange] = useDateRangeQuery(29);
  const [platformLimits, setPlatformLimits] = useState([]);

  const [publishedVideos, setPublishedVideos] = useState([]);
  const [isPublishedLoading, setIsPublishedLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [prevPageToken, setPrevPageToken] = useState(null);

  // Fetch Platform Limits (No arguments required for postService.getPlatformLimits())
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const res = await postService.getPlatformLimits();
        if (res && res.success && Array.isArray(res.data)) {
          setPlatformLimits(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch platform limits in useChannelInsights", err);
      }
    };
    fetchLimits();
  }, []);

  const isPlatformLocked = useMemo(() => {
    if (!platform) return false;
    const platUpper = platform.toUpperCase();
    return platformLimits.some((limit) => limit.platform === platUpper && limit.isLocked);
  }, [platformLimits, platform]);

  const platformLockReason = useMemo(() => {
    if (!platform) return null;
    const platUpper = platform.toUpperCase();
    const lockedLimit = platformLimits.find((limit) => limit.platform === platUpper && limit.isLocked);
    return lockedLimit ? lockedLimit.lockReason : null;
  }, [platformLimits, platform]);

  const startDate = dateRange.from?.toISOString().slice(0, 10);
  const endDate = dateRange.to?.toISOString().slice(0, 10);

  // Cached in IndexedDB (see App.jsx's PersistQueryClientProvider) and kept
  // fresh by the `data_invalidate` socket event (services/socket.js already
  // invalidates any query keyed [CACHE_SCOPES.METRICS, brandId, ...] on that
  // event) instead of a client-side poll, so a page refresh shows the last
  // known data instantly rather than a blank loading state.
  const metricsQuery = useMetricsQuery(activeBrand?.id, startDate, endDate);
  const metrics = useMemo(
    () => (metricsQuery.data || []).find((m) => m?.id === socialAccountId) || null,
    [metricsQuery.data, socialAccountId]
  );
  const loading = metricsQuery.isLoading;

  // Auto-poll while a background sync is in flight for this account — the
  // eventual data_invalidate covers the normal case, but polls as a
  // fallback in case that event is missed (e.g. a dropped socket message).
  useEffect(() => {
    if (!activeBrand || !metrics) return;
    if (metrics.syncStatus === "PENDING" || metrics.syncStatus === "PARTIAL") {
      const intervalId = setInterval(() => metricsQuery.refetch(), 5000);
      return () => clearInterval(intervalId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBrand?.id, metrics?.syncStatus]);

  const fetchPublishedVideos = useCallback(async (pageToken = null, limit = DEFAULT_PAGE_SIZE) => {
    if (!activeBrand || !socialAccountId) return;
    setIsPublishedLoading(true);
    const startDate = dateRange.from?.toISOString().slice(0, 10);
    const endDate = dateRange.to?.toISOString().slice(0, 10);
    try {
      if (platform === PLATFORMS.FACEBOOK) {
        const res = await socialService.getFacebookPublishedPosts(activeBrand.id, pageToken, limit, socialAccountId, startDate, endDate);
        setPublishedVideos(res || []);
        setNextPageToken(res?.nextPageToken || null);
        setPrevPageToken(res?.prevPageToken || null);
      } else if (platform === PLATFORMS.INSTAGRAM) {
        const res = await socialService.getInstagramPublishedPosts(activeBrand.id, pageToken, limit, socialAccountId, startDate, endDate);
        setPublishedVideos(res || []);
        setNextPageToken(res?.nextPageToken || null);
        setPrevPageToken(res?.prevPageToken || null);
      } else if (platform === PLATFORMS.TIKTOK) {
        const res = await socialService.getTikTokPublishedVideos(activeBrand.id, pageToken, limit, socialAccountId, startDate, endDate);
        setPublishedVideos(res?.videos || res || []);
        setNextPageToken(res?.nextPageToken || null);
        setPrevPageToken(res?.prevPageToken || null);
      } else if (platform === PLATFORMS.THREADS) {
        const res = await socialService.getThreadsPublishedPosts(activeBrand.id, pageToken, limit, socialAccountId, startDate, endDate);
        setPublishedVideos(res || []);
        setNextPageToken(res?.nextPageToken || null);
        setPrevPageToken(res?.prevPageToken || null);
      } else if (platform === PLATFORMS.BLUESKY) {
        const res = await socialService.getBlueskyPublishedPosts(activeBrand.id, pageToken, limit, socialAccountId);
        const mapped = (res?.data || []).map((p) => ({
          id: p.id,
          message: p.message || "",
          date: p.date,
          mediaUrl: p.mediaUrl || null,
          reach: p.reach || 0,
          views: p.views || 0,
          likes: p.likes || 0,
          comments: p.comments || 0,
        }));
        setPublishedVideos(mapped);
        setNextPageToken(res?.nextPageToken || null);
        setPrevPageToken(null);
      } else {
        const res = await socialService.getPublishedVideos(activeBrand.id, pageToken, limit, socialAccountId, startDate, endDate);
        setPublishedVideos(res.videos || []);
        setNextPageToken(res.nextPageToken || null);
        setPrevPageToken(res.prevPageToken || null);
      }
    } catch (error) {
      console.error("Failed to fetch channel published content:", error);
      // 429 already shows a global rate-limit toast via the apiV2 response
      // interceptor — avoid double-toasting the same error here.
      if (error?.status !== 429) {
        toast.error("Không thể tải danh sách bài viết.");
      }
    } finally {
      setIsPublishedLoading(false);
    }
  }, [activeBrand?.id, socialAccountId, platform, dateRange]);

  useEffect(() => {
    fetchPublishedVideos();
  }, [fetchPublishedVideos]);

  // Real-time socket listener for published-videos invalidation. Metrics
  // invalidation doesn't need handling here — services/socket.js already
  // invalidates any React Query key matching [CACHE_SCOPES.METRICS,
  // brandId, ...] on the same `data_invalidate` event, which useMetricsQuery
  // above is keyed into automatically.
  useEffect(() => {
    if (!activeBrand?.id) return;
    socketClient.emit("join_room", { brandId: activeBrand.id });

    const handleDataInvalidate = (data) => {
      if (data?.brandId === activeBrand.id && data.scope === "published_videos") {
        fetchPublishedVideos();
      }
    };

    socketClient.on("data_invalidate", handleDataInvalidate);
    return () => {
      socketClient.off("data_invalidate", handleDataInvalidate);
    };
  }, [activeBrand?.id, fetchPublishedVideos]);

  const realData = useMemo(() => parseAnalyticsData(metrics, platform, dateRange), [metrics, platform, dateRange]);

  const stats = useMemo(() => {
    if (!metrics) return { subscribers: 0, views: 0, videos: 0 };
    if (platform === PLATFORMS.FACEBOOK) {
      if (!metrics.facebookPage) return { subscribers: 0, views: 0, videos: 0 };
      return {
        subscribers: metrics.facebookPage.followersCount,
        views: realData.summary?.views || metrics.facebookPage.likesCount,
        videos: 0,
      };
    }
    if (platform === PLATFORMS.INSTAGRAM || platform === PLATFORMS.THREADS) {
      if (!metrics.instagramAccount) return { subscribers: 0, views: 0, videos: 0 };
      return {
        subscribers: metrics.instagramAccount.followersCount,
        views: realData.summary?.views || 0,
        likes: realData.summary?.likes || 0,
        videos: metrics.instagramAccount.mediaCount || 0,
      };
    }
    if (platform === PLATFORMS.TIKTOK) {
      if (!metrics.tikTokAccount) return { subscribers: 0, views: 0, videos: 0 };
      return {
        subscribers: metrics.tikTokAccount.followersCount,
        views: realData.summary?.views || metrics.tikTokAccount.likesCount,
        videos: metrics.tikTokAccount.videoCount,
      };
    }
    if (platform === PLATFORMS.BLUESKY) {
      if (!metrics.blueskyAccount) return { subscribers: 0, views: 0, videos: 0 };
      return {
        subscribers: metrics.blueskyAccount.followersCount || 0,
        views: 0,
        likes: realData.interactions?.likes || 0,
        videos: metrics.blueskyAccount.postsCount || 0,
      };
    }
    if (!metrics.youtubeChannel) return { subscribers: 0, views: 0, videos: 0 };
    return {
      subscribers: metrics.youtubeChannel.subscribersCount,
      views: metrics.youtubeChannel.totalViewsCount,
      videos: metrics.youtubeChannel.totalVideosCount,
    };
  }, [metrics, platform, realData]);

  const totalPeriodViews = useMemo(() => realData.growth?.reduce((a, b) => a + (b.value || 0), 0) || 0, [realData.growth]);
  const totalPeriodGained = useMemo(() => realData.growth?.reduce((a, b) => a + (b.new || 0), 0) || 0, [realData.growth]);

  const communityGrowthData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];
    try {
      if (platform === PLATFORMS.FACEBOOK || platform === PLATFORMS.TIKTOK || platform === PLATFORMS.BLUESKY) {
        return realData.growth || [];
      }
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

      return days.map((day) => {
        const dateString = format(day, "MMM d");
        const searchDate = format(day, "yyyy-MM-dd");
        const realDayData = realData.growth?.find((g) => g.date === searchDate);

        if (platform === PLATFORMS.INSTAGRAM) {
          const likesCount = realDayData ? realDayData.likes || 0 : 0;
          const commentsCount = realDayData ? realDayData.comments || 0 : 0;
          const savedCount = realDayData ? realDayData.saved || 0 : 0;
          const sharesCount = realDayData ? realDayData.shares || 0 : 0;
          const postsCount = realDayData ? realDayData.totalContent || realDayData.posts || 0 : 0;
          const interactionsCount = realDayData ? realDayData.interactions || likesCount + commentsCount + savedCount + sharesCount : 0;
          const reachCount = realDayData ? realDayData.reach || 0 : 0;
          const viewsCount = realDayData ? realDayData.views || 0 : 0;
          const engagementRate = realDayData ? realDayData.engagement || 0 : 0;

          return {
            name: dateString,
            followers: realDayData ? realDayData.followers || 0 : 0,
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
            shares: sharesCount,
          };
        }

        return {
          name: dateString,
          subscribers: realDayData ? realDayData.new : 0,
          views: realDayData ? realDayData.value : 0,
          revenue: 0,
          videos: realDayData ? realDayData.videos : 0,
          new: realDayData ? realDayData.new : 0,
          lost: realDayData ? realDayData.lost : 0,
        };
      });
    } catch (e) {
      console.error("Error generating community growth data:", e);
      return [];
    }
  }, [dateRange, realData.growth, platform, metrics]);

  return {
    dateRange,
    setDateRange,
    metrics,
    loading,
    publishedVideos,
    isPublishedLoading,
    nextPageToken,
    prevPageToken,
    fetchPublishedVideos,
    realData,
    stats,
    totalPeriodViews,
    totalPeriodGained,
    communityGrowthData,
    isPlatformLocked,
    platformLockReason,
  };
}
