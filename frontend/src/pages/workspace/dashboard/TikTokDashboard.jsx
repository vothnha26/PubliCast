import React from "react";
import { TikTokCommunityTab } from "./TikTokCommunityTab";
import { TikTokPostsTab } from "./TikTokPostsTab";

export function TikTokDashboard({
  metrics,
  dateRange,
  setDateRange,
  realData,
  activeTab,
  setActiveTab,
  publishedVideos,
  isPublishedLoading,
  pageSize,
  setPageSize,
  fetchPublishedVideos,
  onVideoClick,
}) {
  return (
    <>
      {activeTab === "community" && (
        <TikTokCommunityTab realData={realData} dateRange={dateRange} />
      )}

      {activeTab === "posts" && (
        <TikTokPostsTab
          realData={realData}
          dateRange={dateRange}
          publishedVideos={publishedVideos}
          isPublishedLoading={isPublishedLoading}
          pageSize={pageSize}
          setPageSize={setPageSize}
          fetchPublishedVideos={fetchPublishedVideos}
          onVideoClick={onVideoClick}
        />
      )}
    </>
  );
}
