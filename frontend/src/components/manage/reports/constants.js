/**
 * PubliCast - Reports Constants
 * Defines constants for chart colors, widget keys, sort options, and chart types.
 */

export const PRESET_COLORS = [
  "#5C90A8", // Slate Blue
  "#52C79F", // Mint Green
  "#C65880", // Raspberry Pink
  "#E6A735", // Honey Yellow
  "#895E8B", // Lavender Purple
  "#72C9DA", // Sky Blue
  "#B61F24", // Deep Red
  "#25927D", // Ocean Green
  "#5F5F5F"  // Dark Gray
];

export const CHART_TYPES = {
  AREA: "AREA",
  LINE: "LINE",
  BAR: "BAR",
  DOUGHNUT: "DOUGHNUT",
  PIE: "PIE"
};

export const PLATFORM_NAMES = {
  FACEBOOK: "FACEBOOK",
  INSTAGRAM: "INSTAGRAM",
  YOUTUBE: "YOUTUBE",
  TIKTOK: "TIKTOK",
  TELEGRAM: "TELEGRAM"
};

export const PERIOD_OPTIONS = {
  LAST_30_DAYS: "30 ngày qua",
  LAST_7_DAYS: "7 ngày qua",
  THIS_MONTH: "Tháng này",
  LAST_MONTH: "Tháng trước",
  CUSTOM: "custom"
};

export const SORT_BY_OPTIONS = {
  IMPRESSIONS: "Impressions",
  ENGAGEMENT: "Engagement",
  LIKES: "Likes",
  VIEWS: "Views",
  DATE: "Date",
  FOLLOWERS: "Followers"
};

export const DEFAULT_WIDGET_CONFIG = {
  // Summary
  followers: true,
  postImpressions: true,
  postInteractions: true,
  posts: true,
  rankingOfPosts: true,
  campaignImpressions: false,
  campaignClicks: false,
  campaignCpm: false,
  campaignCpc: false,
  campaignSpent: false,
  rankingOfCampaigns: false,

  // Facebook
  fbGrowth: true,
  fbBalance: true,
  fbViews: true,
  fbInteractions: true,
  fbTypesBreakdown: true,
  fbViewsBreakdown: true,
  fbRankingOfPosts: true,

  // Instagram
  igGrowth: true,
  igRankingOfPosts: true,

  // YouTube
  ytGrowth: true,
  ytRankingOfVideos: true,

  // TikTok
  ttGrowth: true,
  ttBalance: true,
  ttViews: true,
  ttInteractions: true,
  ttPosts: true
};

export const INITIAL_TEMPLATES = [
  { 
    id: "tmpl-1", 
    name: "UB (Facebook & Instagram Only)", 
    config: {
      selectedWidgets: {
        followers: true, postImpressions: true, postInteractions: true, posts: true, rankingOfPosts: true,
        fbGrowth: true, fbBalance: true, fbViews: true, fbInteractions: true, fbTypesBreakdown: true, fbViewsBreakdown: true, fbRankingOfPosts: true,
        igGrowth: true, igRankingOfPosts: true,
        ytGrowth: false, ytRankingOfVideos: false,
        ttGrowth: false, ttBalance: false, ttViews: false, ttInteractions: false, ttPosts: false,
        dcGrowth: false
      },
      selectedColor: "#5C90A8",
      reportTitle: "UB Social Media Analysis",
      postsSortBy: "Impressions", postsMaxRows: 10,
      fbPostsSortBy: "Engagement", fbPostsMaxRows: 10
    }
  },
  { 
    id: "tmpl-2", 
    name: "Laura Test (Video Platforms Focus)", 
    config: {
      selectedWidgets: {
        followers: true, postImpressions: true, postInteractions: true, posts: true, rankingOfPosts: true,
        fbGrowth: false, fbBalance: false, fbViews: false, fbInteractions: false, fbTypesBreakdown: false, fbViewsBreakdown: false, fbRankingOfPosts: false,
        igGrowth: false, igRankingOfPosts: false,
        ytGrowth: true, ytRankingOfVideos: true,
        ttGrowth: true, ttBalance: true, ttViews: true, ttInteractions: true, ttPosts: true,
        dcGrowth: false
      },
      selectedColor: "#C65880",
      reportTitle: "Video Marketing Performance",
      ytVideosSortBy: "Views", ytVideosMaxRows: 15,
      ttVideosSortBy: "Views", ttVideosMaxRows: 15
    }
  },
  { 
    id: "tmpl-3", 
    name: "Prueba Metricool Expert (All Channels)", 
    config: {
      selectedWidgets: {
        followers: true, postImpressions: true, postInteractions: true, posts: true, rankingOfPosts: true,
        fbGrowth: true, fbBalance: true, fbViews: true, fbInteractions: true, fbTypesBreakdown: true, fbViewsBreakdown: true, fbRankingOfPosts: true,
        igGrowth: true, igRankingOfPosts: true,
        ytGrowth: true, ytRankingOfVideos: true,
        ttGrowth: true, ttBalance: true, ttViews: true, ttInteractions: true, ttPosts: true,
        dcGrowth: true
      },
      selectedColor: "#52C79F",
      reportTitle: "Comprehensive Cross-Channel Report",
      postsSortBy: "Impressions", postsMaxRows: 15,
      fbPostsSortBy: "Engagement", fbPostsMaxRows: 15,
      igPostsSortBy: "Likes", igPostsMaxRows: 15,
      ytVideosSortBy: "Views", ytVideosMaxRows: 15,
      ttVideosSortBy: "Views", ttVideosMaxRows: 15
    }
  },
  { 
    id: "tmpl-4", 
    name: "MartinTest (Shorts & Reels)", 
    config: {
      selectedWidgets: {
        followers: true, postImpressions: true, postInteractions: true, posts: true, rankingOfPosts: true,
        fbGrowth: true, fbBalance: false, fbViews: true, fbInteractions: true, fbTypesBreakdown: true, fbViewsBreakdown: true, fbRankingOfPosts: true,
        igGrowth: true, igRankingOfPosts: true,
        ytGrowth: true, ytRankingOfVideos: true,
        ttGrowth: true, ttBalance: false, ttViews: true, ttInteractions: true, ttPosts: true,
        dcGrowth: false
      },
      selectedColor: "#895E8B",
      reportTitle: "Short-Form Video Performance"
    }
  },
  { 
    id: "tmpl-5", 
    name: "UNIR (Enterprise Brand Report)", 
    config: {
      selectedWidgets: {
        followers: true, postImpressions: true, postInteractions: true, posts: true, rankingOfPosts: true,
        fbGrowth: true, fbBalance: true, fbViews: true, fbInteractions: true, fbTypesBreakdown: true, fbViewsBreakdown: true, fbRankingOfPosts: true,
        igGrowth: true, igRankingOfPosts: true,
        ytGrowth: true, ytRankingOfVideos: true,
        ttGrowth: true, ttBalance: true, ttViews: true, ttInteractions: true, ttPosts: true,
        dcGrowth: true
      },
      selectedColor: "#25927D",
      reportTitle: "UNIR Global Brand Performance"
    }
  }
];
