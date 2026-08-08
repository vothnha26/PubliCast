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
    const growthList = Array.isArray(communityGrowthData) ? communityGrowthData : [];
    const videoList = Array.isArray(publishedVideos) && publishedVideos.length > 0
      ? publishedVideos
      : (realData?.publishedVideos || realData?.posts || metrics?.publishedPosts || []);

    const len = growthList.length;
    const half = Math.floor(len / 2);

    const totalViews = growthList.reduce((acc, curr) => acc + (curr?.views || curr?.value || 0), 0);
    const totalFollowersGained = growthList.reduce((acc, curr) => acc + (curr?.followers || curr?.new || curr?.acquired || 0), 0);
    const totalPosts = growthList.reduce((acc, curr) => acc + (curr?.posts || curr?.totalContent || 0), 0);
    let totalReactions = growthList.reduce((acc, curr) => acc + (curr?.likes || curr?.reactions || 0), 0);
    let totalComments = growthList.reduce((acc, curr) => acc + (curr?.comments || 0), 0);
    let totalShares = growthList.reduce((acc, curr) => acc + (curr?.shares || 0), 0);

    if (totalReactions === 0 && videoList.length > 0) {
      totalReactions = videoList.reduce((acc, p) => acc + Number(p?.likes || p?.likeCount || p?.reactionsCount || p?.reactions || 0), 0);
    }
    if (totalComments === 0 && videoList.length > 0) {
      totalComments = videoList.reduce((acc, p) => acc + Number(p?.comments || p?.commentCount || 0), 0);
    }
    if (totalShares === 0 && videoList.length > 0) {
      totalShares = videoList.reduce((acc, p) => acc + Number(p?.shares || p?.sharesCount || 0), 0);
    }

    const firstHalfReactions = growthList.slice(0, half).reduce((acc, curr) => acc + (curr?.likes || curr?.reactions || 0), 0);
    const secondHalfReactions = growthList.slice(half).reduce((acc, curr) => acc + (curr?.likes || curr?.reactions || 0), 0);
    const reactionsTrend = this.computeTrendPct(firstHalfReactions, secondHalfReactions);

    const firstHalfPosts = growthList.slice(0, half).reduce((acc, curr) => acc + (curr?.posts || curr?.totalContent || 0), 0);
    const secondHalfPosts = growthList.slice(half).reduce((acc, curr) => acc + (curr?.posts || curr?.totalContent || 0), 0);
    const postsTrend = this.computeTrendPct(firstHalfPosts, secondHalfPosts);

    const followers = metrics?.facebookPage?.followersCount || metrics?.followersCount || metrics?.facebookAccount?.followersCount || stats?.subscribers || realData?.summary?.followers || 0;
    const baseCount = totalPosts > 0 && followers > 0 ? (followers * totalPosts) : (totalViews > 0 ? totalViews : 1);
    const engRate = ((totalReactions + totalComments + totalShares) / baseCount) * 100;

    return [
      {
        id: "followers",
        label: "Total Followers",
        value: formatCompactNumber(followers),
        trendText: totalFollowersGained > 0 ? `+${totalFollowersGained}` : totalFollowersGained < 0 ? `${totalFollowersGained}` : null,
        isPositive: totalFollowersGained >= 0,
        tooltip: "Tổng số người theo dõi trang Facebook.",
      },
      {
        id: "posts",
        label: "Posts",
        value: totalPosts || videoList.length || 0,
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
        value: formatCompactNumber(totalViews || videoList.reduce((acc, p) => acc + Number(p?.views || p?.reach || 0), 0)),
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
    const growthList = Array.isArray(communityGrowthData) ? communityGrowthData : [];
    const videoList = Array.isArray(publishedVideos) && publishedVideos.length > 0
      ? publishedVideos
      : (realData?.publishedVideos || realData?.posts || metrics?.publishedPosts || []);

    const len = growthList.length;
    const half = Math.floor(len / 2);

    let totalReach = growthList.reduce((acc, curr) => acc + (curr?.reach || 0), 0);
    let totalViews = growthList.reduce((acc, curr) => acc + (curr?.views || 0), 0);
    const totalPosts = growthList.reduce((acc, curr) => acc + (curr?.posts || curr?.totalContent || 0), 0);
    let totalReactions = growthList.reduce((acc, curr) => acc + (curr?.likes || 0), 0);
    let totalComments = growthList.reduce((acc, curr) => acc + (curr?.comments || 0), 0);
    let totalShares = growthList.reduce((acc, curr) => acc + (curr?.shares || 0), 0);
    let totalSaves = growthList.reduce((acc, curr) => acc + (curr?.saved || 0), 0);
    let totalFollowsGained = growthList.reduce((acc, curr) => acc + (curr?.new || 0), 0);

    if (totalReactions === 0 && videoList.length > 0) {
      totalReactions = videoList.reduce((acc, p) => acc + Number(p?.likes || p?.likeCount || p?.reactions || 0), 0);
    }
    if (totalComments === 0 && videoList.length > 0) {
      totalComments = videoList.reduce((acc, p) => acc + Number(p?.comments || p?.commentCount || 0), 0);
    }
    if (totalShares === 0 && videoList.length > 0) {
      totalShares = videoList.reduce((acc, p) => acc + Number(p?.shares || p?.sharesCount || 0), 0);
    }
    if (totalSaves === 0 && videoList.length > 0) {
      totalSaves = videoList.reduce((acc, p) => acc + Number(p?.saved || p?.saves || 0), 0);
    }
    if (totalViews === 0 && videoList.length > 0) {
      totalViews = videoList.reduce((acc, p) => acc + Number(p?.views || p?.viewCount || 0), 0);
    }

    // Trend calculations (First half vs Second half)
    const firstHalfPosts = growthList.slice(0, half).reduce((acc, curr) => acc + (curr?.posts || curr?.totalContent || 0), 0);
    const secondHalfPosts = growthList.slice(half).reduce((acc, curr) => acc + (curr?.posts || curr?.totalContent || 0), 0);
    const postsTrend = this.computeTrendPct(firstHalfPosts, secondHalfPosts);

    const firstHalfReactions = growthList.slice(0, half).reduce((acc, curr) => acc + (curr?.likes || 0), 0);
    const secondHalfReactions = growthList.slice(half).reduce((acc, curr) => acc + (curr?.likes || 0), 0);
    const reactionsTrend = this.computeTrendPct(firstHalfReactions, secondHalfReactions);

    const firstHalfViews = growthList.slice(0, half).reduce((acc, curr) => acc + (curr?.views || 0), 0);
    const secondHalfViews = growthList.slice(half).reduce((acc, curr) => acc + (curr?.views || 0), 0);
    const viewsTrend = this.computeTrendPct(firstHalfViews, secondHalfViews);

    const firstHalfReach = growthList.slice(0, half).reduce((acc, curr) => acc + (curr?.reach || 0), 0);
    const secondHalfReach = growthList.slice(half).reduce((acc, curr) => acc + (curr?.reach || 0), 0);
    const reachTrend = this.computeTrendPct(firstHalfReach, secondHalfReach);

    const totalInteractions = totalReactions + totalComments + totalSaves + totalShares;
    const followers = metrics?.instagramAccount?.followersCount || metrics?.followersCount || stats?.subscribers || 0;
    const baseDenom = totalReach > 0 ? totalReach : (totalViews > 0 ? totalViews : (followers > 0 ? followers : 1));
    const engRate = (totalInteractions / baseDenom) * 100;

    const firstHalfEngRate = firstHalfReach > 0 ? ((firstHalfReactions) / firstHalfReach) * 100 : 0;
    const secondHalfEngRate = secondHalfReach > 0 ? ((secondHalfReactions) / secondHalfReach) * 100 : 0;
    const engRateTrend = this.computeTrendPct(firstHalfEngRate, secondHalfEngRate);

    return [
      {
        id: "followers",
        label: "Total Followers",
        value: formatCompactNumber(followers),
        trendText: totalFollowsGained > 0 ? `+${totalFollowsGained}` : null,
        isPositive: true,
        tooltip: "Tổng số người theo dõi Instagram.",
      },
      {
        id: "posts",
        label: "Posts",
        value: totalPosts || videoList.length || 0,
        trendText: postsTrend !== 0 ? `${Math.abs(postsTrend).toFixed(1)}%` : null,
        isPositive: postsTrend >= 0,
        tooltip: "Số lượng bài viết / Reels đã đăng.",
      },
      {
        id: "reactions",
        label: "Reactions",
        value: formatCompactNumber(totalReactions),
        trendText: reactionsTrend !== 0 ? `${Math.abs(reactionsTrend).toFixed(1)}%` : null,
        isPositive: reactionsTrend >= 0,
        tooltip: "Tổng lượt cảm xúc / Thích bài viết.",
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
        trendText: engRateTrend !== 0 ? `${Math.abs(engRateTrend).toFixed(1)}%` : null,
        isPositive: engRateTrend >= 0,
        tooltip: "Tỷ lệ tương tác trên tiếp cận.",
      },
      {
        id: "views",
        label: "Views",
        value: formatCompactNumber(totalViews),
        trendText: viewsTrend !== 0 ? `${Math.abs(viewsTrend).toFixed(1)}%` : null,
        isPositive: viewsTrend >= 0,
        tooltip: "Tổng lượt xem video/reels.",
      },
      {
        id: "shares",
        label: "Shares",
        value: formatCompactNumber(totalShares),
        trendText: null,
        isPositive: true,
        tooltip: "Tổng số lượt chia sẻ.",
      },
      {
        id: "saves",
        label: "Saves",
        value: formatCompactNumber(totalSaves),
        trendText: null,
        isPositive: true,
        tooltip: "Tổng số lượt lưu bài viết.",
      },
      {
        id: "reach",
        label: "Reach",
        value: formatCompactNumber(totalReach),
        trendText: reachTrend !== 0 ? `${Math.abs(reachTrend).toFixed(1)}%` : null,
        isPositive: reachTrend >= 0,
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
    const growthList = Array.isArray(communityGrowthData) ? communityGrowthData : [];
    const videoList = Array.isArray(publishedVideos) && publishedVideos.length > 0
      ? publishedVideos
      : (realData?.publishedVideos || realData?.posts || metrics?.publishedPosts || []);

    let totalViews = growthList.reduce((acc, curr) => acc + (curr?.views || curr?.value || 0), 0);
    const totalVideos = growthList.reduce((acc, curr) => acc + (curr?.videos || curr?.totalContent || 0), 0);
    let totalLikes = growthList.reduce((acc, curr) => acc + (curr?.likes || 0), 0);
    let totalComments = growthList.reduce((acc, curr) => acc + (curr?.comments || 0), 0);
    let totalShares = growthList.reduce((acc, curr) => acc + (curr?.shares || 0), 0);

    if (totalViews === 0 && videoList.length > 0) {
      totalViews = videoList.reduce((acc, p) => acc + Number(p?.views || p?.viewCount || p?.playCount || 0), 0);
    }
    if (totalLikes === 0 && videoList.length > 0) {
      totalLikes = videoList.reduce((acc, p) => acc + Number(p?.likes || p?.likeCount || p?.diggCount || 0), 0);
    }
    if (totalComments === 0 && videoList.length > 0) {
      totalComments = videoList.reduce((acc, p) => acc + Number(p?.comments || p?.commentCount || 0), 0);
    }
    if (totalShares === 0 && videoList.length > 0) {
      totalShares = videoList.reduce((acc, p) => acc + Number(p?.shares || p?.shareCount || 0), 0);
    }

    const followers = metrics?.tikTokAccount?.followersCount || metrics?.followersCount || stats?.subscribers || 0;
    const baseDenom = totalViews > 0 ? totalViews : (followers > 0 ? followers : 1);
    const engRate = ((totalLikes + totalComments + totalShares) / baseDenom) * 100;

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
        value: totalVideos || stats?.videos || videoList.length || 0,
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
 * Threads Summary Strategy
 */
export class ThreadsSummaryStrategy extends BaseSummaryStrategy {
  buildSummaryMetrics({ communityGrowthData = [], stats = {}, metrics = {}, realData = {}, publishedVideos = [] }) {
    const growthList = Array.isArray(communityGrowthData) ? communityGrowthData : [];
    const videoList = Array.isArray(publishedVideos) && publishedVideos.length > 0
      ? publishedVideos
      : (realData?.publishedVideos || realData?.posts || metrics?.publishedPosts || []);

    const len = growthList.length;
    const half = Math.floor(len / 2);

    const summary = realData?.summary || {};
    const totalViews = growthList.reduce((acc, curr) => acc + (curr?.views || curr?.value || 0), 0) || summary.views || 0;
    const totalFollowersGained = growthList.reduce((acc, curr) => acc + (curr?.followers || curr?.new || curr?.acquired || 0), 0);
    const totalPosts = growthList.reduce((acc, curr) => acc + (curr?.posts || curr?.totalContent || 0), 0) || summary.totalContent || 0;
    let totalLikes = growthList.reduce((acc, curr) => acc + (curr?.likes || curr?.reactions || 0), 0) || summary.likes || 0;
    let totalReplies = growthList.reduce((acc, curr) => acc + (curr?.comments || curr?.replies || 0), 0) || summary.replies || 0;
    let totalReposts = growthList.reduce((acc, curr) => acc + (curr?.reposts || curr?.shares || 0), 0) || summary.reposts || 0;

    if (totalLikes === 0 && videoList.length > 0) {
      totalLikes = videoList.reduce((acc, p) => acc + Number(p?.likes || p?.likeCount || 0), 0);
    }
    if (totalReplies === 0 && videoList.length > 0) {
      totalReplies = videoList.reduce((acc, p) => acc + Number(p?.comments || p?.replyCount || p?.replies || 0), 0);
    }
    if (totalReposts === 0 && videoList.length > 0) {
      totalReposts = videoList.reduce((acc, p) => acc + Number(p?.reposts || p?.repostCount || p?.shares || 0), 0);
    }

    const firstHalfPosts = growthList.slice(0, half).reduce((acc, curr) => acc + (curr?.posts || curr?.totalContent || 0), 0);
    const secondHalfPosts = growthList.slice(half).reduce((acc, curr) => acc + (curr?.posts || curr?.totalContent || 0), 0);
    const postsTrend = this.computeTrendPct(firstHalfPosts, secondHalfPosts);

    const followers = metrics?.threadsAccount?.followersCount || metrics?.followersCount || stats?.subscribers || realData?.summary?.followers || 0;
    const baseDenom = totalPosts > 0 && followers > 0 ? (followers * totalPosts) : (totalViews > 0 ? totalViews : 1);
    const engRate = ((totalLikes + totalReplies + totalReposts) / baseDenom) * 100;

    return [
      {
        id: "followers",
        label: "Total Followers",
        value: formatCompactNumber(followers),
        trendText: totalFollowersGained > 0 ? `+${totalFollowersGained}` : totalFollowersGained < 0 ? `${totalFollowersGained}` : null,
        isPositive: totalFollowersGained >= 0,
        tooltip: "Tổng số người theo dõi trên tài khoản Threads.",
      },
      {
        id: "posts",
        label: "Threads Posts",
        value: totalPosts || videoList.length || 0,
        trendText: postsTrend !== 0 ? `${Math.abs(postsTrend).toFixed(1)}%` : null,
        isPositive: postsTrend >= 0,
        tooltip: "Tổng số bài viết đăng trên Threads.",
      },
      {
        id: "likes",
        label: "Likes",
        value: formatCompactNumber(totalLikes),
        trendText: null,
        isPositive: true,
        tooltip: "Tổng lượt thích trên các bài viết Threads.",
      },
      {
        id: "replies",
        label: "Replies",
        value: formatCompactNumber(totalReplies),
        trendText: null,
        isPositive: true,
        tooltip: "Tổng số lượt trả lời (bình luận).",
      },
      {
        id: "reposts",
        label: "Reposts",
        value: formatCompactNumber(totalReposts),
        trendText: null,
        isPositive: true,
        tooltip: "Tổng lượt chia sẻ lại (Reposts).",
      },
      {
        id: "engagementRate",
        label: "Eng. Rate",
        value: `${engRate.toFixed(2)}%`,
        trendText: null,
        isPositive: true,
        tooltip: "Tỷ lệ tương tác trên nền tảng Threads.",
      },
      {
        id: "views",
        label: "Views / Impressions",
        value: formatCompactNumber(totalViews || videoList.reduce((acc, p) => acc + Number(p?.views || p?.viewsCount || 0), 0)),
        trendText: null,
        isPositive: true,
        tooltip: "Tổng số lượt hiển thị/xem bài viết Threads.",
      },
    ];
  }
}

/**
 * Default / Fallback Summary Strategy (Bluesky, Generic)
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
    threads: new ThreadsSummaryStrategy(),
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
