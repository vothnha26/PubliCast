import React from "react";
import { GenericDashboardTab } from "../common/GenericDashboardTab";

export function ThreadsCommunityTab({
  metrics = {},
  communityGrowthData = []
}) {
  const followersCount = metrics?.threadsAccount?.followersCount || metrics?.followersCount || 0;
  const followingCount = metrics?.threadsAccount?.followingCount || metrics?.followingCount || 0;
  const mediaCount = metrics?.threadsAccount?.mediaCount || metrics?.mediaCount || 0;

  const threadsGrowthConfig = [
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
      label: "Total Threads",
      color: "bg-[#E6A34A] text-white",
      chartColor: "#E6A34A",
      type: "bar",
      value: mediaCount
    }
  ];

  const daysCount = communityGrowthData?.length || 30;
  const totalContentInPeriod = communityGrowthData?.reduce((acc, curr) => acc + (curr.totalContent || 0), 0) || mediaCount;
  const totalPeriodGained = communityGrowthData?.reduce((acc, curr) => acc + (curr.followers || curr.new || 0), 0) || 0;

  const dailyPostsNum = daysCount > 0 ? (totalContentInPeriod / daysCount) : 0;
  const dailyPosts = dailyPostsNum.toFixed(2);
  const postsPerWeek = (dailyPostsNum * 7).toFixed(2);
  const followersPerPost = mediaCount > 0 ? (followersCount / mediaCount).toFixed(2) : "0";
  const dailyFollowers = daysCount > 0 ? (totalPeriodGained / daysCount).toFixed(2) : "0";

  const summaryGrid = [
    { label: "Followers", value: followersCount.toLocaleString() },
    { label: "Daily followers", value: dailyFollowers },
    { label: "Followers per post", value: followersPerPost },
    { label: "Following", value: followingCount.toLocaleString() },
    { label: "Daily posts", value: dailyPosts },
    { label: "Posts per week", value: postsPerWeek }
  ];

  const threadsBalanceConfig = [
    {
      key: "followers",
      label: "Followers",
      color: "bg-[#86EFAC] text-[#166534]",
      chartColor: "#22C55E",
      type: "line",
      value: followersCount
    }
  ];

  return (
    <div className="space-y-6">
      <GenericDashboardTab
        title="Growth"
        description=""
        data={communityGrowthData}
        metricConfig={threadsGrowthConfig}
        watermark="publicast"
        summaryGrid={summaryGrid}
      />

      <div className="h-2" />

      <GenericDashboardTab
        title="Balance of Followers"
        description=""
        data={communityGrowthData}
        metricConfig={threadsBalanceConfig}
        watermark="publicast"
      />
    </div>
  );
}
