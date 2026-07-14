import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { subDays, eachDayOfInterval, format } from "date-fns";
import { toast } from "sonner";
import { useBrand } from "../context/BrandContext";
import socialService from "../services/social.service";
import postService from "../services/post.service";
import { FALLBACK_DEMOGRAPHICS, EMPTY_ANALYTICS_DATA } from "@/mocks/dashboardFallback";

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
    const getTabDefault = (plat) => {
      if (plat === "facebook") return "overview";
      return "community";
    };
    
    if (!tabParam) return getTabDefault(platform);
    
    const ytTabs = ["community", "demographics", "published", "viewed", "competitors"];
    const fbTabs = ["overview", "posts", "posts_list", "stories", "competitors"];
    const ttTabs = ["community", "posts"];
    const discordTabs = ["community", "channels", "posts"];
    const igTabs = ["community", "account", "competitors"];
    const threadsTabs = ["community", "posts", "competitors"];
    
    let isValid = false;
    if (platform === "facebook") {
      isValid = fbTabs.includes(tabParam);
    } else if (platform === "instagram") {
      isValid = igTabs.includes(tabParam);
    } else if (platform === "threads") {
      isValid = threadsTabs.includes(tabParam);
    } else if (platform === "tiktok") {
      isValid = ttTabs.includes(tabParam);
    } else if (platform === "discord") {
      isValid = discordTabs.includes(tabParam);
    } else {
      isValid = ytTabs.includes(tabParam);
    }
    
    return isValid ? tabParam : getTabDefault(platform);
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
  
  // Date Range State
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

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

  // Video Detail State
  const videoIdParam = searchParams.get("videoId");

  const selectedVideo = useMemo(() => {
    if (!videoIdParam) return null;
    return publishedVideos.find(v => (v.id === videoIdParam || v.videoId === videoIdParam)) ||
           trackedVideos.find(v => (v.id === videoIdParam || v.videoId === videoIdParam)) ||
           null;
  }, [videoIdParam, publishedVideos, trackedVideos]);

  const selectVideo = useCallback((video) => {
    const nextParams = new URLSearchParams(searchParams);
    if (video) {
      const nextVideoId = video.id || video.videoId;
      if (searchParams.get("videoId") !== nextVideoId) {
        nextParams.set("videoId", nextVideoId);
        setSearchParams(nextParams, { replace: true });
      }
    } else {
      if (searchParams.has("videoId")) {
        nextParams.delete("videoId");
        setSearchParams(nextParams, { replace: true });
      }
    }
  }, [searchParams, setSearchParams]);

  const [videoAnalytics, setVideoAnalytics] = useState([]);
  const [videoInsights, setVideoInsights] = useState(null);
  const [isVideoDetailLoading, setIsVideoDetailLoading] = useState(false);
  const [isVideoInsightsLoading, setIsVideoInsightsLoading] = useState(false);
  const [videoInsightsError, setVideoInsightsError] = useState(null);
  const [isVideoDetailModalOpen, setIsVideoDetailModalOpen] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMetrics = async (brandId, force = false) => {
    if (force) setIsRefreshing(true);
    try {
      const metricsRes = await socialService.getMetrics(brandId, {
        startDate: dateRange.from?.toISOString().split('T')[0],
        endDate: dateRange.to?.toISOString().split('T')[0],
        force: force
      });
      const platformType = platform.toUpperCase() === 'X' ? 'TWITTER_X' : platform.toUpperCase();
      const platformMetrics = metricsRes.data?.find(m => m.platform === platformType);
      setMetrics(platformMetrics || null);
      if (force) {
        toast.success("Đồng bộ số liệu thành công!");
      }
    } catch (error) {
      console.error("Failed to load platform metrics:", error);
      setMetrics(null);
      if (force) {
        toast.error("Đồng bộ số liệu thất bại");
      }
    } finally {
      if (force) setIsRefreshing(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    if (!activeBrand) return;
    await loadMetrics(activeBrand.id, true);
  }, [activeBrand, dateRange]);

  const fetchTracked = async () => {
    if (!activeBrand) return;
    setIsTrackingLoading(true);
    try {
      const res = await socialService.getTrackedVideos(activeBrand.id);
      setTrackedVideos(res.data || []);
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
      let res;
      if (platform === 'facebook') {
        res = await socialService.getFacebookCompetitors(activeBrand.id);
      } else {
        res = await socialService.getCompetitors(activeBrand.id);
      }
      setCompetitors(res.data || []);
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
        setPublishedVideos(res.data || []);
        setNextPageToken(res.nextPageToken || null);
        setPrevPageToken(res.prevPageToken || null);
      } else if (platform === "instagram") {
        const res = await socialService.getInstagramPublishedPosts(activeBrand.id, pageToken, limit);
        setPublishedVideos(res.data || []);
        setNextPageToken(res.nextPageToken || null);
        setPrevPageToken(res.prevPageToken || null);
      } else if (platform === "tiktok") {
        const res = await socialService.getTikTokPublishedVideos(activeBrand.id, pageToken, limit);
        setPublishedVideos(res.videos || []);
        setNextPageToken(res.nextPageToken || null);
        setPrevPageToken(res.prevPageToken || null);
      } else if (platform === "threads") {
        const res = await socialService.getThreadsPublishedPosts(activeBrand.id, pageToken, limit);
        setPublishedVideos(res.data || []);
        setNextPageToken(res.nextPageToken || null);
        setPrevPageToken(res.prevPageToken || null);
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
    selectVideo(video);
    setIsVideoDetailModalOpen(true);
  }, [selectVideo]);

  useEffect(() => {
    setMetrics(null);
    if (activeBrand) {
      setLoading(true);
      loadMetrics(activeBrand.id).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [activeBrand, platform, isPlatformLocked]);

  // Tự động thăm dò trạng thái đồng bộ (auto polling) mỗi 5s nếu đang PENDING hoặc PARTIAL
  useEffect(() => {
    if (!activeBrand || !metrics) return;
    if (metrics.syncStatus === "PENDING" || metrics.syncStatus === "PARTIAL") {
      const intervalId = setInterval(() => {
        loadMetrics(activeBrand.id);
      }, 5000);
      return () => clearInterval(intervalId);
    }
  }, [activeBrand, metrics?.syncStatus, platform]);

  // Validate tab parameter and set default/redirect if empty or invalid
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const getTabDefault = (plat) => {
      if (plat === "facebook") return "overview";
      return "community";
    };
    
    const ytTabs = ["community", "demographics", "published", "viewed", "competitors"];
    const fbTabs = ["overview", "posts", "posts_list", "stories", "competitors"];
    const ttTabs = ["community", "posts"];
    const discordTabs = ["community", "channels", "posts"];
    const igTabs = ["community", "account", "competitors"];
    const threadsTabs = ["community", "posts", "competitors"];
    
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
      } else if (platform === "discord") {
        isValid = discordTabs.includes(tabParam);
      } else {
        isValid = ytTabs.includes(tabParam);
      }
    }
    
    if (!tabParam || !isValid) {
      const def = getTabDefault(platform);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", def);
      setSearchParams(nextParams, { replace: true });
    }
  }, [platform, searchParams, setSearchParams]);

  // Reactively fetch video analytics and insights when selectedVideo changes
  useEffect(() => {
    if (!selectedVideo || platform !== "youtube" || !activeBrand) {
      setVideoAnalytics([]);
      setVideoInsights(null);
      return;
    }

    setIsVideoDetailLoading(true);
    setIsVideoInsightsLoading(true);
    setVideoInsightsError(null);

    const targetVideoId = selectedVideo.id || selectedVideo.videoId;

    const analyticsPromise = socialService.getVideoAnalytics(
      activeBrand.id,
      targetVideoId,
      dateRange.from?.toISOString().split('T')[0],
      dateRange.to?.toISOString().split('T')[0]
    ).then(res => setVideoAnalytics(res.data || []))
     .catch(e => {
       console.error("Failed to fetch video analytics", e);
       setVideoAnalytics([]);
     });

    const insightsPromise = socialService.getVideoInsights(
      activeBrand.id,
      targetVideoId
    ).then(res => setVideoInsights(res || null))
     .catch(e => {
       console.error("Failed to fetch video insights", e);
       setVideoInsightsError(e.message || "Failed to load video insights");
       setVideoInsights(null);
     });

    Promise.all([analyticsPromise, insightsPromise]).finally(() => {
      setIsVideoDetailLoading(false);
      setIsVideoInsightsLoading(false);
    });
  }, [selectedVideo, activeBrand, platform, dateRange.from, dateRange.to]);

  // Auto open modal on non-YouTube platform for selectedVideo
  useEffect(() => {
    if (selectedVideo && platform !== "youtube") {
      setIsVideoDetailModalOpen(true);
    }
  }, [selectedVideo, platform]);

  // Reload metrics when dateRange changes or activeBrand changes
  useEffect(() => {
    if (activeBrand && !loading) {
      loadMetrics(activeBrand.id);
    }
  }, [activeBrand, dateRange]);

  useEffect(() => {
    if (!activeBrand) return;
    if (activeTab === "viewed" && platform !== "facebook") fetchTracked();
    if (activeTab === "competitors") fetchCompetitors();
    if (
      activeTab === "published" ||
      activeTab === "posts_list" ||
      (activeTab === "posts" && (platform === "tiktok" || platform === "threads" || platform === "facebook")) ||
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
    try {
      await socialService.deleteCompetitor(id);
      toast.success("Competitor deleted successfully");
      fetchCompetitors();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete competitor");
    }
  };

  const getAnalyticsData = () => {
    if (!metrics?.analytics?.[0]?.socialAnalytics?.audienceDemographicsJson) {
      if (platform === "instagram") {
        return {
          demographics: { gender: [], age: [], countries: [], trafficSource: [] },
          balance: [],
          growth: [],
          clicks: [],
          postsPeriod: [],
          interactions: {},
          summary: {}
        };
      }
      return EMPTY_ANALYTICS_DATA;
    }
    try {
      const raw = JSON.parse(metrics.analytics[0].socialAnalytics.audienceDemographicsJson);
      
      if (platform === "facebook" || platform === "tiktok" || platform === "instagram") {
        // Lọc theo dateRange đang chọn để chart hiển thị đúng khoảng thời gian
        const fromStr = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : null;
        const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : null;
        const filterByRange = (arr) => {
          if (!arr?.length || !fromStr || !toStr) return arr || [];
          return arr.filter(item => item.date >= fromStr && item.date <= toStr);
        };

        return {
          demographics: { gender: [], age: [], countries: [], trafficSource: [] },
          balance: filterByRange(raw.balance || []),
          growth: filterByRange(raw.growth || []).map(g => ({
            ...g,
            value: g.views || 0,
            new: g.acquired || (raw.balance?.find(b => b.date === g.date)?.acquired) || 0,
            lost: g.lost || (raw.balance?.find(b => b.date === g.date)?.lost) || 0,
            videos: g.totalContent || 0
          })),
          clicks: filterByRange(raw.clicks || []),
          postsPeriod: filterByRange(raw.postsPeriod || []),
          interactions: raw.interactions || {},
          summary: raw.summary || {},
          stories: raw.stories || []
        };
      }
      
      const ageMap = {};
      const genderMap = { Male: 0, Female: 0 };
      (raw.demographics || [])
        .filter(row => Array.isArray(row) && row.length >= 3)
        .forEach(([age, gender, percentage]) => {
          ageMap[age] = (ageMap[age] || 0) + percentage;
          if (gender === 'male') genderMap.Male += percentage;
          if (gender === 'female') genderMap.Female += percentage;
        });
 
      let age = Object.entries(ageMap).map(([name, value]) => ({
        name: name.replace('age', ''),
        value: Math.round(value)
      }));
      let gender = [
        { name: 'Male', value: Math.round(genderMap.Male), color: '#818CF8' },
        { name: 'Female', value: Math.round(genderMap.Female), color: '#F472B6' }
      ];

      if (genderMap.Male === 0 && genderMap.Female === 0) {
        gender = [];
      }
 
      const totalTrafficViews = (raw.trafficSource || []).reduce((a, b) => a + (Array.isArray(b) ? (b[1] || 0) : 0), 0) || 1;
      let trafficSource = (raw.trafficSource || [])
        .filter(row => Array.isArray(row) && row.length >= 2)
        .map(([source, views, time]) => ({
          name: source ? source.replace('insightTrafficSourceType', '').replace(/_/g, ' ') : 'Unknown',
          value: views || 0,
          percentage: `${Math.round(((views || 0) / totalTrafficViews) * 100)}%`,
          color: '#818CF8'
        }));
 
      const totalGeoViews = (raw.geographic || []).reduce((a, b) => a + (Array.isArray(b) ? (b[1] || 0) : 0), 0) || 1;
      const COUNTRY_MAP = {
        VN: { name: 'Vietnam', flag: '🇻🇳' },
        US: { name: 'United States', flag: '🇺🇸' },
        IN: { name: 'India', flag: '🇮🇳' },
        JP: { name: 'Japan', flag: '🇯🇵' },
        GB: { name: 'United Kingdom', flag: '🇬🇧' },
        DE: { name: 'Germany', flag: '🇩🇪' },
        FR: { name: 'France', flag: '🇫🇷' },
        BR: { name: 'Brazil', flag: '🇧🇷' }
      };

      let countries = (raw.geographic || [])
        .filter(row => Array.isArray(row) && row.length >= 2)
        .map(([code, views]) => {
          const mapped = COUNTRY_MAP[code] || { name: code, flag: '📍' };
          return {
            name: mapped.name,
            value: Math.round(((views || 0) / totalGeoViews) * 100),
            flag: mapped.flag,
            progress: Math.round(((views || 0) / totalGeoViews) * 100)
          };
        });

      const growth = (raw.growth || [])
        .map((row) => {
          // If it's the new object format from backend
          if (typeof row === 'object' && !Array.isArray(row)) {
            return {
              date: row.date,
              name: row.date ? row.date.split('-').slice(1).join('/') : 'Unknown',
              value: row.views || 0,
              new: row.subscribersGained || 0,
              lost: row.subscribersLost || 0,
              videos: row.totalContent || 0
            };
          }
          // Fallback for array format (old or different API)
          if (Array.isArray(row) && row.length >= 4) {
            const [day, views, gained, lost] = row;
            return {
              date: day,
              name: day ? day.split('-').slice(1).join('/') : 'Unknown',
              value: views || 0,
              new: gained || 0,
              lost: lost || 0,
              videos: 0
            };
          }
          return null;
        })
        .filter(Boolean);

      return {
        demographics: { age, gender, countries, trafficSource },
        balance: growth,
        growth: growth
      };
    } catch (e) {
      console.error("Error parsing analytics data:", e);
      return {
        demographics: { gender: [], age: [], countries: [], trafficSource: [] },
        balance: [],
        growth: [],
        clicks: [],
        postsPeriod: [],
        interactions: {},
        summary: {}
      };
    }
  };

  const getStats = () => {
    if (!metrics) return { subscribers: 0, views: 0, videos: 0 };
    if (platform === "facebook") {
      if (!metrics.facebookPage) return { subscribers: 0, views: 0, videos: 0 };
      const analytics = getAnalyticsData();
      return {
        subscribers: metrics.facebookPage.followersCount,
        views: analytics.summary?.views || metrics.facebookPage.likesCount,
        videos: 0
      };
    }
    if (platform === "instagram" || platform === "threads") {
      if (!metrics.instagramAccount) return { subscribers: 0, views: 0, videos: 0 };
      const analytics = getAnalyticsData();
      return {
        subscribers: metrics.instagramAccount.followersCount,
        views: analytics.summary?.views || 0,
        likes: analytics.summary?.likes || 0,
        videos: metrics.instagramAccount.mediaCount || 0
      };
    }
    if (platform === "tiktok") {
      if (!metrics.tikTokAccount) return { subscribers: 0, views: 0, videos: 0 };
      const analytics = getAnalyticsData();
      return {
        subscribers: metrics.tikTokAccount.followersCount,
        views: analytics.summary?.views || metrics.tikTokAccount.likesCount,
        videos: metrics.tikTokAccount.videoCount
      };
    }
    if (!metrics.youtubeChannel) return { subscribers: 0, views: 0, videos: 0 };
    return {
      subscribers: metrics.youtubeChannel.subscribersCount,
      views: metrics.youtubeChannel.totalViewsCount,
      videos: metrics.youtubeChannel.totalVideosCount
    };
  };

  const stats = getStats();
  const realData = getAnalyticsData();

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
          return {
            name: dateString,
            followers: realDayData ? (realDayData.followers || 0) : 0,
            following: metrics?.instagramAccount?.followingCount || 0,
            totalContent: realDayData ? (realDayData.totalContent || 0) : 0
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
    selectedVideo,
    setSelectedVideo: selectVideo,
    videoAnalytics,
    videoInsights,
    isVideoDetailLoading,
    isVideoInsightsLoading,
    videoInsightsError,
    isVideoDetailModalOpen,
    setIsVideoDetailModalOpen,
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
    isRefreshing,
    handleRefresh,
    activeBrand,
    isPlatformLocked,
    platformLockReason
  };
}
