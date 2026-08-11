import { useState, useEffect, useCallback, useMemo } from "react";
import { eachDayOfInterval, format } from "date-fns";
import { toast } from "sonner";
import { useBrand } from "../../context/BrandContext";
import socialService from "../../services/social.service";
import socketClient from "../../services/socket";
import { useChannelInsightsSummaryQuery } from "../queries/useChannelInsightsSummaryQuery";
import { useDateRangeQuery } from "../useDateRangeQuery";
import { parseAnalyticsData } from "../../utils/parseAnalyticsData";
import { normalizePublishedVideosResponse } from "../../utils/normalizePublishedVideosResponse";
import { PLATFORMS } from "../../constants/platforms";

const DEFAULT_PAGE_SIZE = 10;

/**
 * Single-account variant of the metrics/published-content half of
 * usePlatformDashboard.js — selects by socialAccountId instead of platform.
 *
 * The page's initial published-videos page + platformLimits + metrics all
 * come from useChannelInsightsSummaryQuery (one batched request, shared with
 * DailyPostingUsageBadge/channel-groups on the same page) instead of each
 * being fetched here independently — cached per [brandId, socialAccountId]
 * rather than pulling the whole brand's accounts through useMetricsQuery
 * (which Dashboard.jsx still uses directly, since it needs all accounts).
 * Paging past page 1 (fetchPublishedVideos below) still calls the
 * platform-specific endpoint directly — the summary only ever fetches the
 * first page.
 */
export function useChannelInsights(socialAccountId, platformInput) {
  const platform = (platformInput || "").toLowerCase();
  const { activeBrand } = useBrand();

  const [dateRange, setDateRange] = useDateRangeQuery(29);

  const summaryQuery = useChannelInsightsSummaryQuery(activeBrand?.id, socialAccountId);
  const platformLimits = summaryQuery.data?.platformLimits || [];

  const [publishedVideos, setPublishedVideos] = useState([]);
  const [isPublishedLoading, setIsPublishedLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [prevPageToken, setPrevPageToken] = useState(null);

  // Seed published-videos state from the summary's first page once it
  // arrives — a plain effect (not derived state) because fetchPublishedVideos
  // below writes into this same state for page 2+/refresh, and both need to
  // share one source of truth the rest of the hook reads from.
  useEffect(() => {
    if (!summaryQuery.data || summaryQuery.isFetching) return;
    const normalized = normalizePublishedVideosResponse(platform, summaryQuery.data.publishedVideos);
    setPublishedVideos(normalized.items);
    setNextPageToken(normalized.nextPageToken);
    setPrevPageToken(normalized.prevPageToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryQuery.data, socialAccountId]);

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

  // metrics comes from the same batched summary request as
  // platformLimits/publishedVideos above — the page-load cache is now scoped
  // per [brandId, socialAccountId] via useChannelInsightsSummaryQuery instead
  // of pulling the whole brand's accounts through useMetricsQuery just to
  // find() this one. Dashboard.jsx still uses useMetricsQuery directly since
  // it genuinely needs all accounts.
  const metrics = useMemo(
    () => (summaryQuery.data?.metrics || []).find((m) => m?.id === socialAccountId) || null,
    [summaryQuery.data, socialAccountId]
  );
  const loading = summaryQuery.isLoading;

  // Auto-poll while a background sync is in flight for this account — the
  // eventual data_invalidate covers the normal case, but polls as a
  // fallback in case that event is missed (e.g. a dropped socket message).
  useEffect(() => {
    if (!activeBrand || !metrics) return;
    if (metrics.syncStatus === "PENDING" || metrics.syncStatus === "PARTIAL") {
      const intervalId = setInterval(() => summaryQuery.refetch(), 5000);
      return () => clearInterval(intervalId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBrand?.id, metrics?.syncStatus]);

  // Fetches one page of published-videos directly (bypassing the summary
  // endpoint) — used for paging past page 1 and for the socket-driven
  // refresh below. The FIRST page on mount comes from
  // useChannelInsightsSummaryQuery instead (see the effect above); this is
  // never auto-called on mount, only on an explicit page change or
  // invalidation.
  const fetchPublishedVideos = useCallback(async (pageToken = null, limit = DEFAULT_PAGE_SIZE) => {
    if (!activeBrand || !socialAccountId) return;
    setIsPublishedLoading(true);
    const startDate = dateRange.from?.toISOString().slice(0, 10);
    const endDate = dateRange.to?.toISOString().slice(0, 10);
    try {
      let res;
      if (platform === PLATFORMS.FACEBOOK) {
        res = await socialService.getFacebookPublishedPosts(activeBrand.id, pageToken, limit, socialAccountId, startDate, endDate);
      } else if (platform === PLATFORMS.INSTAGRAM) {
        res = await socialService.getInstagramPublishedPosts(activeBrand.id, pageToken, limit, socialAccountId, startDate, endDate);
      } else if (platform === PLATFORMS.TIKTOK) {
        res = await socialService.getTikTokPublishedVideos(activeBrand.id, pageToken, limit, socialAccountId, startDate, endDate);
      } else if (platform === PLATFORMS.THREADS) {
        res = await socialService.getThreadsPublishedPosts(activeBrand.id, pageToken, limit, socialAccountId, startDate, endDate);
      } else if (platform === PLATFORMS.BLUESKY) {
        res = await socialService.getBlueskyPublishedPosts(activeBrand.id, pageToken, limit, socialAccountId);
      } else {
        res = await socialService.getPublishedVideos(activeBrand.id, pageToken, limit, socialAccountId, startDate, endDate);
      }
      const normalized = normalizePublishedVideosResponse(platform, res);
      setPublishedVideos(normalized.items);
      setNextPageToken(normalized.nextPageToken);
      setPrevPageToken(normalized.prevPageToken);
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

  // Real-time socket listener for published-videos invalidation. Metrics
  // invalidation doesn't need handling here — services/socket.js already
  // invalidates [CACHE_SCOPES.CHANNEL_INSIGHTS_SUMMARY, brandId] whenever a
  // metrics data_invalidate arrives (see socket.js), which summaryQuery
  // above is keyed into automatically. Refetches the summary (page 1) rather
  // than calling fetchPublishedVideos directly, so a background sync while
  // the user hasn't paged away from page 1 goes through the same batched
  // path everything else on this page uses.
  useEffect(() => {
    if (!activeBrand?.id) return;
    socketClient.emit("join_room", { brandId: activeBrand.id });

    const handleDataInvalidate = (data) => {
      if (data?.brandId === activeBrand.id && data.scope === "published_videos") {
        summaryQuery.refetch();
      }
    };

    socketClient.on("data_invalidate", handleDataInvalidate);
    return () => {
      socketClient.off("data_invalidate", handleDataInvalidate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBrand?.id]);

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
    if (platform === PLATFORMS.INSTAGRAM) {
      if (!metrics.instagramAccount) return { subscribers: 0, views: 0, videos: 0 };
      return {
        subscribers: metrics.instagramAccount.followersCount,
        views: realData.summary?.views || 0,
        likes: realData.summary?.likes || 0,
        videos: metrics.instagramAccount.mediaCount || 0,
      };
    }
    if (platform === PLATFORMS.THREADS) {
      if (!metrics.threadsAccount) return { subscribers: 0, views: 0, videos: 0 };
      return {
        subscribers: metrics.threadsAccount.followersCount,
        views: realData.summary?.views || 0,
        likes: realData.summary?.likes || 0,
        videos: metrics.threadsAccount.mediaCount || 0,
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
            followers: (realDayData && realDayData.followers > 0) ? realDayData.followers : (metrics?.instagramAccount?.followersCount || 0),
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
          likes: realDayData ? realDayData.likes || 0 : 0,
          comments: realDayData ? realDayData.comments || 0 : 0,
        };
      });
    } catch (e) {
      console.error("Error generating community growth data:", e);
      return [];
    }
  }, [dateRange, realData.growth, platform, metrics]);

  const totalPeriodViews = useMemo(
    () => communityGrowthData?.reduce((a, b) => a + (b.views || 0), 0) || 0,
    [communityGrowthData]
  );
  const totalPeriodGained = useMemo(
    () => communityGrowthData?.reduce((a, b) => a + (b.subscribers || b.new || 0), 0) || 0,
    [communityGrowthData]
  );
  const totalPeriodVideos = useMemo(
    () => communityGrowthData?.reduce((a, b) => a + (b.videos || 0), 0) || 0,
    [communityGrowthData]
  );

  return {
    dateRange,
    setDateRange,
    metrics,
    loading,
    publishedVideos,
    // True during either the initial summary fetch (first page) or an
    // explicit fetchPublishedVideos call (paging past page 1) — both write
    // into the same publishedVideos state, so callers only need one flag.
    isPublishedLoading: isPublishedLoading || summaryQuery.isLoading,
    nextPageToken,
    prevPageToken,
    fetchPublishedVideos,
    realData,
    stats,
    totalPeriodViews,
    totalPeriodGained,
    totalPeriodVideos,
    communityGrowthData,
    isPlatformLocked,
    platformLockReason,
  };
}
