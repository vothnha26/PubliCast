import React from "react";
import { GenericDashboardTab } from "../common/GenericDashboardTab";
import { InsightsSummaryWidget } from "../common/InsightsSummaryWidget";

export function InstagramCommunityTab({
  dateRange,
  metrics,
  stats,
  realData = {},
  communityGrowthData = [],
  publishedVideos = []
}) {
  const followersCount = metrics?.instagramAccount?.followersCount || 0;
  const followingCount = metrics?.instagramAccount?.followingCount || 0;
  const mediaCount = metrics?.instagramAccount?.mediaCount || 0;

  const igGrowthConfig = [
    {
      key: "followers",
      label: "Followers",
      color: "bg-[#8E9BEE] text-white",
      chartColor: "#8E9BEE",
      type: "area",
      value: followersCount
    },
    {
      key: "following",
      label: "Following",
      color: "bg-[#A7F3D0] text-foreground",
      chartColor: "#A7F3D0",
      type: "line",
      value: followingCount
    },
    {
      key: "totalContent",
      label: "Total content",
      color: "bg-[#E6A34A] text-white",
      chartColor: "#E6A34A",
      type: "bar",
      value: mediaCount
    }
  ];

  const daysCount = communityGrowthData?.length || 30;
  const totalContentInPeriod = communityGrowthData?.reduce((acc, curr) => acc + (curr.totalContent || 0), 0) || mediaCount;

  const dailyPostsNum = daysCount > 0 ? (totalContentInPeriod / daysCount) : 0;
  const dailyPosts = dailyPostsNum.toFixed(2);
  const postsPerWeek = (dailyPostsNum * 7).toFixed(2);
  const followersPerPost = mediaCount > 0 ? (followersCount / mediaCount).toFixed(2) : "0";

  const igGrowthSummary = [
    { label: "Followers per post", value: followersPerPost },
    { label: "Following", value: followingCount.toLocaleString() },
    { label: "Daily posts", value: dailyPosts },
    { label: "Posts per week", value: postsPerWeek }
  ];

  const igBalanceConfig = [
    {
      key: "new",
      label: "New",
      color: "bg-[#818CF8] text-white",
      chartColor: "#818CF8",
      type: "area",
      value: communityGrowthData?.reduce((acc, curr) => acc + (curr.new || 0), 0) || 0
    },
    {
      key: "lost",
      label: "Lost",
      color: "bg-[#F472B6] text-white",
      chartColor: "#F472B6",
      type: "line",
      value: communityGrowthData?.reduce((acc, curr) => acc + (curr.lost || 0), 0) || 0
    },
    {
      key: "followers",
      label: "Total Followers",
      color: "bg-[#8E9BEE] text-white",
      chartColor: "#8E9BEE",
      type: "line",
      yAxisId: "right",
      value: followersCount
    }
  ];

  return (
    <div className="space-y-6">
      <InsightsSummaryWidget
        dateRange={dateRange}
        metrics={metrics}
        stats={stats}
        realData={realData}
        communityGrowthData={communityGrowthData}
        publishedVideos={publishedVideos}
        platform="instagram"
      />

      <GenericDashboardTab
        title="Growth"
        description="Biểu đồ người theo dõi, đang theo dõi và số bài viết"
        data={communityGrowthData}
        metricConfig={igGrowthConfig}
        watermark="instagram"
        summaryGrid={igGrowthSummary}
      />

      <GenericDashboardTab
        title="Balance of Followers"
        description="Biến động tăng giảm số lượng theo dõi"
        data={communityGrowthData}
        metricConfig={igBalanceConfig}
      />
    </div>
  );
}
