/**
 * Summary Metrics Strategy Pattern (SOLID Principles & Strategy/Factory Pattern)
 * Provides platform-specific summary card configurations and metric parsing.
 */

function formatCompactNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return "0";
  const n = Number(num);
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return n.toLocaleString();
}

/**
 * Base Abstract Summary Strategy
 */
export class BaseSummaryStrategy {
  computeTrendPct(firstHalfVal, secondHalfVal) {
    if (!firstHalfVal || firstHalfVal <= 0) return 0;
    return ((secondHalfVal - firstHalfVal) / firstHalfVal) * 100;
  }

  buildSummaryMetrics(context) {
    throw new Error("buildSummaryMetrics must be implemented by concrete subclass");
  }
}

/**
 * YouTube Summary Strategy
 */
export class YouTubeSummaryStrategy extends BaseSummaryStrategy {
  buildSummaryMetrics({ communityGrowthData = [], stats = {}, metrics = {}, realData = {}, publishedVideos = [] }) {
    const len = communityGrowthData.length;
    const half = Math.floor(len / 2);

    const totalViews = communityGrowthData.reduce((acc, curr) => acc + (curr.views || curr.value || 0), 0);
    const totalGained = communityGrowthData.reduce((acc, curr) => acc + (curr.subscribers || curr.new || 0), 0);
    const totalVideos = communityGrowthData.reduce((acc, curr) => acc + (curr.videos || 0), 0);

    let totalLikes = communityGrowthData.reduce((acc, curr) => acc + (curr.likes || 0), 0);
    let totalComments = communityGrowthData.reduce((acc, curr) => acc + (curr.comments || 0), 0);

    // Fallback: If growth data from DB snapshot is missing likes/comments, sum from published videos list
    const videoList = (publishedVideos && publishedVideos.length > 0)
      ? publishedVideos
      : (realData?.publishedVideos || metrics?.publishedVideos || []);

    if (totalLikes === 0 && videoList.length > 0) {
      totalLikes = videoList.reduce((acc, v) => acc + Number(v.likes || v.likeCount || v.likesCount || v.statistics?.likeCount || 0), 0);
    }
    if (totalComments === 0 && videoList.length > 0) {
      totalComments = videoList.reduce((acc, v) => acc + Number(v.comments || v.commentCount || v.commentsCount || v.statistics?.commentCount || 0), 0);
    }

    const firstHalfViews = communityGrowthData.slice(0, half).reduce((acc, curr) => acc + (curr.views || curr.value || 0), 0);
    const secondHalfViews = communityGrowthData.slice(half).reduce((acc, curr) => acc + (curr.views || curr.value || 0), 0);
    const viewsTrend = this.computeTrendPct(firstHalfViews, secondHalfViews);

    const firstHalfVideos = communityGrowthData.slice(0, half).reduce((acc, curr) => acc + (curr.videos || 0), 0);
    const secondHalfVideos = communityGrowthData.slice(half).reduce((acc, curr) => acc + (curr.videos || 0), 0);
    const videosTrend = this.computeTrendPct(firstHalfVideos, secondHalfVideos);

    const subscribers = stats?.subscribers || metrics?.youtubeChannel?.subscribersCount || 0;
    const baseForEng = totalViews > 0 ? totalViews : (subscribers > 0 ? subscribers : 1);
    const engRate = ((totalLikes + totalComments) / baseForEng) * 100;

    return [
      {
        id: "subscribers",
        label: "Subscribers",
        value: formatCompactNumber(subscribers),
        trendText: totalGained > 0 ? `+${totalGained}` : totalGained < 0 ? `${totalGained}` : null,
        isPositive: totalGained >= 0,
        tooltip: "Tổng số người đăng ký hiện tại và số tăng mới ròng trong khoảng thời gian này.",
      },
      {
        id: "videos",
        label: "Videos",
        value: totalVideos || stats?.videos || videoList.length || 0,
        trendText: videosTrend !== 0 ? `${Math.abs(videosTrend).toFixed(1)}%` : null,
        isPositive: videosTrend >= 0,
        tooltip: "Tổng số video xuất bản trong khoảng thời gian được chọn.",
      },
      {
        id: "views",
        label: "Views",
        value: formatCompactNumber(totalViews || stats?.views || 0),
        trendText: viewsTrend !== 0 ? `${Math.abs(viewsTrend).toFixed(1)}%` : null,
        isPositive: viewsTrend >= 0,
        tooltip: "Tổng số lượt xem video trong khoảng thời gian được chọn.",
      },
      {
        id: "likes",
        label: "Likes",
        value: formatCompactNumber(totalLikes),
        trendText: null,
        isPositive: true,
        tooltip: "Tổng số lượt thích nhận được.",
      },
      {
        id: "comments",
        label: "Comments",
        value: formatCompactNumber(totalComments),
        trendText: null,
        isPositive: true,
        tooltip: "Tổng số bình luận nhận được.",
      },
      {
        id: "engagementRate",
        label: "Eng. Rate",
        value: `${engRate.toFixed(2)}%`,
        trendText: null,
        isPositive: engRate >= 0,
        tooltip: "Tỷ lệ tương tác trung bình (Likes + Comments) trên tổng lượt xem.",
      },
    ];
  }
}

/**
 * Facebook Summary Strategy
 */
export class FacebookSummaryStrategy extends BaseSummaryStrategy {
  buildSummaryMetrics({ communityGrowthData = [], stats = {}, metrics = {}, realData = {}, publishedVideos = [] }) {
    const len = communityGrowthData.length;
    const half = Math.floor(len / 2);

    const totalViews = communityGrowthData.reduce((acc, curr) => acc + (curr.views || curr.value || 0), 0);
    const totalFollowersGained = communityGrowthData.reduce((acc, curr) => acc + (curr.followers || curr.new || 0), 0);
    const totalPosts = communityGrowthData.reduce((acc, curr) => acc + (curr.posts || curr.totalContent || 0), 0);
    let totalReactions = communityGrowthData.reduce((acc, curr) => acc + (curr.likes || curr.reactions || 0), 0);
    let totalComments = communityGrowthData.reduce((acc, curr) => acc + (curr.comments || 0), 0);

    const postList = (publishedVideos && publishedVideos.length > 0)
      ? publishedVideos
      : (realData?.publishedVideos || realData?.posts || metrics?.publishedPosts || []);

    if (totalReactions === 0 && postList.length > 0) {
      totalReactions = postList.reduce((acc, p) => acc + Number(p.likes || p.likeCount || p.reactionsCount || 0), 0);
    }
    if (totalComments === 0 && postList.length > 0) {
      totalComments = postList.reduce((acc, p) => acc + Number(p.comments || p.commentCount || 0), 0);
    }

    const firstHalfReactions = communityGrowthData.slice(0, half).reduce((acc, curr) => acc + (curr.likes || curr.reactions || 0), 0);
    const secondHalfReactions = communityGrowthData.slice(half).reduce((acc, curr) => acc + (curr.likes || curr.reactions || 0), 0);
    const reactionsTrend = this.computeTrendPct(firstHalfReactions, secondHalfReactions);

    const firstHalfPosts = communityGrowthData.slice(0, half).reduce((acc, curr) => acc + (curr.posts || curr.totalContent || 0), 0);
    const secondHalfPosts = communityGrowthData.slice(half).reduce((acc, curr) => acc + (curr.posts || curr.totalContent || 0), 0);
    const postsTrend = this.computeTrendPct(firstHalfPosts, secondHalfPosts);

    const followers = stats?.subscribers || metrics?.facebookPage?.followersCount || 1;
    const engRate = totalPosts > 0 ? ((totalReactions + totalComments) / (followers * totalPosts)) * 100 : 0;

    return [
      {
        id: "followers",
        label: "Total Followers",
        value: formatCompactNumber(followers),
        trendText: totalFollowersGained > 0 ? `+${totalFollowersGained}` : null,
        isPositive: totalFollowersGained >= 0,
        tooltip: "Tổng số người theo dõi trang Facebook.",
      },
      {
        id: "posts",
        label: "Posts",
        value: totalPosts || postList.length || 0,
        trendText: postsTrend !== 0 ? `${Math.abs(postsTrend).toFixed(1)}%` : null,
        isPositive: postsTrend >= 0,
        tooltip: "Tổng số bài viết đăng trong khoảng thời gian chọn.",
      },
      {
        id: "reactions",
        label: "Reactions",
        value: formatCompactNumber(totalReactions),
        trendText: reactionsTrend !== 0 ? `${Math.abs(reactionsTrend).toFixed(1)}%` : null,
        isPositive: reactionsTrend >= 0,
        tooltip: "Tổng số cảm xúc / phản hồi nhận được.",
      },
      {
        id: "comments",
        label: "Comments",
        value: formatCompactNumber(totalComments),
        trendText: null,
        isPositive: true,
        tooltip: "Tổng số lượt bình luận trên trang.",
      },
      {
        id: "engagementRate",
        label: "Eng. Rate",
        value: `${engRate.toFixed(2)}%`,
        trendText: null,
        isPositive: engRate >= 0,
        tooltip: "Tỷ lệ tương tác trung bình bài viết.",
      },
      {
        id: "views",
        label: "Views / Reach",
        value: formatCompactNumber(totalViews),
        trendText: null,
        isPositive: true,
        tooltip: "Lượt xem hoặc phạm vi tiếp cận.",
      },
    ];
  }
}

/**
 * Instagram Summary Strategy
 */
export class InstagramSummaryStrategy extends BaseSummaryStrategy {
  buildSummaryMetrics({ communityGrowthData = [], stats = {}, metrics = {}, realData = {}, publishedVideos = [] }) {
    const len = communityGrowthData.length;
    const half = Math.floor(len / 2);

    const totalReach = communityGrowthData.reduce((acc, curr) => acc + (curr.reach || 0), 0);
    const totalViews = communityGrowthData.reduce((acc, curr) => acc + (curr.views || 0), 0);
    const totalPosts = communityGrowthData.reduce((acc, curr) => acc + (curr.posts || curr.totalContent || 0), 0);
    let totalInteractions = communityGrowthData.reduce((acc, curr) => acc + (curr.interactions || (curr.likes + curr.comments + curr.saved + curr.shares) || 0), 0);
    let totalComments = communityGrowthData.reduce((acc, curr) => acc + (curr.comments || 0), 0);

    const postList = (publishedVideos && publishedVideos.length > 0)
      ? publishedVideos
      : (realData?.publishedVideos || realData?.posts || metrics?.publishedPosts || []);

    if (totalInteractions === 0 && postList.length > 0) {
      totalInteractions = postList.reduce((acc, p) => acc + (Number(p.likes || p.likeCount || 0) + Number(p.comments || p.commentCount || 0)), 0);
    }
    if (totalComments === 0 && postList.length > 0) {
      totalComments = postList.reduce((acc, p) => acc + Number(p.comments || p.commentCount || 0), 0);
    }

    const firstHalfInteractions = communityGrowthData.slice(0, half).reduce((acc, curr) => acc + (curr.interactions || 0), 0);
    const secondHalfInteractions = communityGrowthData.slice(half).reduce((acc, curr) => acc + (curr.interactions || 0), 0);
    const interactionsTrend = this.computeTrendPct(firstHalfInteractions, secondHalfInteractions);

    const followers = metrics?.instagramAccount?.followersCount || stats?.subscribers || 0;
    const engRate = totalReach > 0 ? (totalInteractions / totalReach) * 100 : 0;

    return [
      {
        id: "followers",
        label: "Followers",
        value: formatCompactNumber(followers),
        trendText: null,
        isPositive: true,
        tooltip: "Số người theo dõi Instagram.",
      },
      {
        id: "posts",
        label: "Posts",
        value: totalPosts || postList.length || 0,
        trendText: null,
        isPositive: true,
        tooltip: "Số lượng bài viết / Reels đã đăng.",
      },
      {
        id: "interactions",
        label: "Interactions",
        value: formatCompactNumber(totalInteractions),
        trendText: interactionsTrend !== 0 ? `${Math.abs(interactionsTrend).toFixed(1)}%` : null,
        isPositive: interactionsTrend >= 0,
        tooltip: "Tổng lượt tương tác (Like, Comment, Save, Share).",
      },
      {
        id: "comments",
        label: "Comments",
        value: formatCompactNumber(totalComments),
        trendText: null,
        isPositive: true,
        tooltip: "Tổng số bình luận.",
      },
      {
        id: "engagementRate",
        label: "Eng. Rate",
        value: `${engRate.toFixed(2)}%`,
        trendText: null,
        isPositive: engRate >= 0,
        tooltip: "Tỷ lệ tương tác trên tiếp cận.",
      },
      {
        id: "reach",
        label: "Reach",
        value: formatCompactNumber(totalReach || totalViews),
        trendText: null,
        isPositive: true,
        tooltip: "Tổng lượt tiếp cận tài khoản.",
      },
    ];
  }
}

/**
 * TikTok Summary Strategy
 */
export class TikTokSummaryStrategy extends BaseSummaryStrategy {
  buildSummaryMetrics({ communityGrowthData = [], stats = {}, metrics = {}, realData = {}, publishedVideos = [] }) {
    const totalViews = communityGrowthData.reduce((acc, curr) => acc + (curr.views || curr.value || 0), 0);
    const totalVideos = communityGrowthData.reduce((acc, curr) => acc + (curr.videos || 0), 0);
    let totalLikes = communityGrowthData.reduce((acc, curr) => acc + (curr.likes || 0), 0);
    let totalComments = communityGrowthData.reduce((acc, curr) => acc + (curr.comments || 0), 0);

    const postList = (publishedVideos && publishedVideos.length > 0)
      ? publishedVideos
      : (realData?.publishedVideos || realData?.posts || metrics?.publishedPosts || []);

    if (totalLikes === 0 && postList.length > 0) {
      totalLikes = postList.reduce((acc, p) => acc + Number(p.likes || p.likeCount || 0), 0);
    }
    if (totalComments === 0 && postList.length > 0) {
      totalComments = postList.reduce((acc, p) => acc + Number(p.comments || p.commentCount || 0), 0);
    }

    const followers = metrics?.tikTokAccount?.followersCount || stats?.subscribers || 0;
    const engRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0;

    return [
      {
        id: "followers",
        label: "Followers",
        value: formatCompactNumber(followers),
        trendText: null,
        isPositive: true,
        tooltip: "Tổng số người theo dõi trên TikTok.",
      },
      {
        id: "videos",
        label: "Videos",
        value: totalVideos || stats?.videos || postList.length || 0,
        trendText: null,
        isPositive: true,
        tooltip: "Tổng số video đăng.",
      },
      {
        id: "likes",
        label: "Likes",
        value: formatCompactNumber(totalLikes),
        trendText: null,
        isPositive: true,
        tooltip: "Tổng lượt thích trên TikTok.",
      },
      {
        id: "comments",
        label: "Comments",
        value: formatCompactNumber(totalComments),
        trendText: null,
        isPositive: true,
        tooltip: "Tổng số lượt bình luận.",
      },
      {
        id: "engagementRate",
        label: "Eng. Rate",
        value: `${engRate.toFixed(2)}%`,
        trendText: null,
        isPositive: true,
        tooltip: "Tỷ lệ tương tác trung bình.",
      },
      {
        id: "views",
        label: "Video Views",
        value: formatCompactNumber(totalViews),
        trendText: null,
        isPositive: true,
        tooltip: "Tổng số lượt xem video TikTok.",
      },
    ];
  }
}

/**
 * Default / Fallback Summary Strategy (Threads, Bluesky, Generic)
 */
export class DefaultSummaryStrategy extends BaseSummaryStrategy {
  buildSummaryMetrics({ communityGrowthData = [], stats = {}, metrics = {}, realData = {}, publishedVideos = [] }) {
    const totalViews = communityGrowthData.reduce((acc, curr) => acc + (curr.views || curr.value || 0), 0);
    const totalPosts = communityGrowthData.reduce((acc, curr) => acc + (curr.posts || curr.videos || 0), 0);
    let totalLikes = communityGrowthData.reduce((acc, curr) => acc + (curr.likes || 0), 0);
    let totalComments = communityGrowthData.reduce((acc, curr) => acc + (curr.comments || 0), 0);

    const postList = (publishedVideos && publishedVideos.length > 0)
      ? publishedVideos
      : (realData?.publishedVideos || realData?.posts || metrics?.publishedPosts || []);

    if (totalLikes === 0 && postList.length > 0) {
      totalLikes = postList.reduce((acc, p) => acc + Number(p.likes || p.likeCount || 0), 0);
    }
    if (totalComments === 0 && postList.length > 0) {
      totalComments = postList.reduce((acc, p) => acc + Number(p.comments || p.commentCount || 0), 0);
    }

    return [
      {
        id: "followers",
        label: "Followers",
        value: formatCompactNumber(stats?.subscribers || 0),
        trendText: null,
        isPositive: true,
        tooltip: "Số người theo dõi.",
      },
      {
        id: "posts",
        label: "Posts",
        value: totalPosts || postList.length || 0,
        trendText: null,
        isPositive: true,
        tooltip: "Số lượng bài viết.",
      },
      {
        id: "likes",
        label: "Likes",
        value: formatCompactNumber(totalLikes),
        trendText: null,
        isPositive: true,
        tooltip: "Tổng số lượt thích.",
      },
      {
        id: "comments",
        label: "Comments",
        value: formatCompactNumber(totalComments),
        trendText: null,
        isPositive: true,
        tooltip: "Tổng số lượt bình luận.",
      },
      {
        id: "views",
        label: "Views",
        value: formatCompactNumber(totalViews),
        trendText: null,
        isPositive: true,
        tooltip: "Tổng lượt xem.",
      },
    ];
  }
}

/**
 * Factory for retrieving the appropriate Summary Strategy
 */
export class SummaryStrategyFactory {
  static strategies = {
    youtube: new YouTubeSummaryStrategy(),
    facebook: new FacebookSummaryStrategy(),
    instagram: new InstagramSummaryStrategy(),
    tiktok: new TikTokSummaryStrategy(),
  };

  /**
   * Get strategy for a platform
   * @param {string} platform
   * @returns {BaseSummaryStrategy}
   */
  static getStrategy(platform) {
    if (!platform) return new DefaultSummaryStrategy();
    const key = String(platform).toLowerCase();
    return this.strategies[key] || new DefaultSummaryStrategy();
  }
}
