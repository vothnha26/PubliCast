import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useChannelInsights } from "../../../hooks/channels/useChannelInsights";
import { DateRangeFilter } from "../../../components/app/DateRangeFilter";
import { ChannelInsightsSkeleton } from "./ChannelInsightsSkeleton";
import { GenericDashboardTab } from "../dashboard/common/GenericDashboardTab";
import { DemographicsTab } from "../dashboard/common/DemographicsTab";
import { PublishedVideosTab } from "../dashboard/common/PublishedVideosTab";
import { FacebookDashboard } from "../dashboard/facebook/FacebookDashboard";
import { InstagramAccountTab } from "../dashboard/instagram/InstagramAccountTab";
import { InstagramCommunityTab } from "../dashboard/instagram/InstagramCommunityTab";
import { InstagramReelsTab } from "../dashboard/instagram/InstagramReelsTab";
import { InstagramStoriesTab } from "../dashboard/instagram/InstagramStoriesTab";
import { YouTubeCommunityTab } from "../dashboard/youtube/YouTubeCommunityTab";
import { ThreadsPostsTab } from "../dashboard/threads/ThreadsPostsTab";
import { TikTokDashboard } from "../dashboard/tiktok/TikTokDashboard";
import { InsightsSummaryWidget } from "../dashboard/common/InsightsSummaryWidget";

const YT_TABS = [
  { id: "community", label: "COMMUNITY" },
  { id: "demographics", label: "DEMOGRAPHICS" },
  { id: "published", label: "PUBLISHED VIDEOS" },
];

const FB_TABS = [
  { id: "overview", label: "OVERVIEW" },
  { id: "posts", label: "POSTS" },
  { id: "stories", label: "STORIES" },
];

const TT_TABS = [
  { id: "community", label: "COMMUNITY" },
  { id: "posts", label: "POSTS" },
];

const IG_TABS = [
  { id: "community", label: "COMMUNITY" },
  { id: "account", label: "POSTS" },
  { id: "reels", label: "REELS" },
  { id: "stories", label: "STORIES" },
];

const THREADS_TABS = [
  { id: "community", label: "COMMUNITY" },
  { id: "posts", label: "POSTS" },
];

const BSKY_TABS = [
  { id: "community", label: "COMMUNITY" },
  { id: "posts", label: "POSTS" },
];

function getPlatformTabDefault(platform) {
  if (platform === "facebook") return "overview";
  return "community";
}

export function ChannelInsightsTab({ socialAccountId, platform: platformInput }) {
  const platform = (platformInput || "").toLowerCase();
  const { t } = useTranslation("dashboard");
  const [activeTab, setActiveTab] = useState(() => getPlatformTabDefault(platform));
  const [pageSize, setPageSize] = useState("10");

  const {
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
    totalPeriodVideos,
    communityGrowthData,
    isPlatformLocked,
    platformLockReason,
  } = useChannelInsights(socialAccountId, platform);

  const handleVideoClick = (url) => {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const tabs =
    platform === "instagram"
      ? IG_TABS
      : platform === "facebook"
      ? FB_TABS
      : platform === "tiktok"
      ? TT_TABS
      : platform === "threads"
      ? THREADS_TABS
      : platform === "bluesky"
      ? BSKY_TABS
      : YT_TABS;

  if (loading) {
    return <ChannelInsightsSkeleton />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-background">
      {/* Sub-Navigation Bar */}
      <div
        className="sticky top-0 z-20 bg-background/80 backdrop-blur-md flex items-center justify-between px-6 border-b border-border"
        style={{ height: 48 }}
      >
        <div className="flex gap-8 h-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`h-full flex items-center text-[10px] font-bold tracking-wider transition-all relative cursor-pointer border-none bg-transparent ${
                activeTab === tab.id
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`tabs.${tab.id}`, tab.label)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <DateRangeFilter date={dateRange} setDate={setDateRange} />
        </div>
      </div>

      <div className="p-6 max-w-[1400px] mx-auto space-y-6 pb-12 w-full">
        {/* Platform Lock Banner */}
        {isPlatformLocked && (
          <div className="relative overflow-hidden bg-gradient-to-r from-red-50 to-rose-50 rounded-3xl p-5 border border-red-200 shadow-sm flex items-center justify-between group">
            <div className="flex gap-4 items-center relative z-10">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0 border border-rose-200">
                <span className="text-rose-600 font-bold text-xs">🔒</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-950 flex items-center gap-2">
                  Nền tảng tạm khóa (Platform Locked)
                  <span className="px-2 py-0.5 text-[9px] font-extrabold tracking-wider bg-rose-600 text-white rounded-full uppercase">
                    Locked by Admin
                  </span>
                </h3>
                <p className="text-[11px] text-red-700 font-medium mt-0.5">
                  {platformLockReason ||
                    "Nền tảng này hiện đang bị tạm khóa phục vụ cho mục đích bảo trì hệ thống."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* YOUTUBE VIEW */}
        {platform === "youtube" && (
          <>
            {activeTab === "community" && (
              <YouTubeCommunityTab
                dateRange={dateRange}
                metrics={metrics}
                stats={stats}
                realData={realData}
                communityGrowthData={communityGrowthData}
                publishedVideos={publishedVideos}
                totalPeriodGained={totalPeriodGained}
                totalPeriodViews={totalPeriodViews}
                totalPeriodVideos={totalPeriodVideos}
              />
            )}
            {activeTab === "demographics" && <DemographicsTab realData={realData} />}
            {activeTab === "published" && (
              <PublishedVideosTab
                publishedVideos={publishedVideos}
                isPublishedLoading={isPublishedLoading}
                nextPageToken={nextPageToken}
                prevPageToken={prevPageToken}
                fetchPublishedVideos={fetchPublishedVideos}
                pageSize={pageSize}
                onVideoClick={handleVideoClick}
              />
            )}
          </>
        )}

        {/* FACEBOOK VIEW */}
        {platform === "facebook" && (
          <FacebookDashboard
            metrics={metrics}
            loading={loading}
            dateRange={dateRange}
            setDateRange={setDateRange}
            realData={realData}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            publishedVideos={publishedVideos}
            isPublishedLoading={isPublishedLoading}
            pageSize={pageSize}
            setPageSize={setPageSize}
            fetchPublishedVideos={fetchPublishedVideos}
            prevPageToken={prevPageToken}
            nextPageToken={nextPageToken}
            onVideoClick={handleVideoClick}
            isPlatformLocked={isPlatformLocked}
          />
        )}

        {/* INSTAGRAM VIEW */}
        {platform === "instagram" && (
          <>
            {activeTab === "community" && (
              <InstagramCommunityTab
                dateRange={dateRange}
                metrics={metrics}
                stats={stats}
                realData={realData}
                communityGrowthData={communityGrowthData}
                publishedVideos={publishedVideos}
              />
            )}
            {activeTab === "account" && (
              <InstagramAccountTab
                metrics={metrics}
                realData={realData}
                publishedVideos={publishedVideos}
                isPublishedLoading={isPublishedLoading}
                pageSize={pageSize}
                setPageSize={setPageSize}
                fetchPublishedVideos={fetchPublishedVideos}
                prevPageToken={prevPageToken}
                nextPageToken={nextPageToken}
                onVideoClick={handleVideoClick}
                communityGrowthData={communityGrowthData}
              />
            )}
            {activeTab === "reels" && (
              <InstagramReelsTab
                metrics={metrics}
                realData={realData}
                publishedVideos={publishedVideos}
                isPublishedLoading={isPublishedLoading}
                pageSize={pageSize}
                setPageSize={setPageSize}
                fetchPublishedVideos={fetchPublishedVideos}
                prevPageToken={prevPageToken}
                nextPageToken={nextPageToken}
                onVideoClick={handleVideoClick}
                communityGrowthData={communityGrowthData}
              />
            )}
            {activeTab === "stories" && (
              <InstagramStoriesTab
                metrics={metrics}
                realData={realData}
                publishedVideos={publishedVideos}
                isPublishedLoading={isPublishedLoading}
                pageSize={pageSize}
                setPageSize={setPageSize}
                fetchPublishedVideos={fetchPublishedVideos}
                prevPageToken={prevPageToken}
                nextPageToken={nextPageToken}
                onVideoClick={handleVideoClick}
                communityGrowthData={communityGrowthData}
              />
            )}
          </>
        )}

        {/* THREADS / BLUESKY VIEW */}
        {(platform === "threads" || platform === "bluesky") && (
          <>
            {activeTab === "community" && (
              <div className="space-y-6">
                {(() => {
                  const threadsGrowthConfig = [
                    {
                      key: "followers",
                      label: "Followers",
                      color: "bg-[#8E9BEE] text-white",
                      chartColor: "#8E9BEE",
                      type: "area",
                      value: metrics?.followersCount || 0,
                    },
                    {
                      key: "views",
                      label: "Views",
                      color: "bg-[#A7F3D0] text-foreground",
                      chartColor: "#A7F3D0",
                      type: "line",
                      value: stats?.views || 0,
                    },
                    {
                      key: "likes",
                      label: "Likes",
                      color: "bg-[#E6A34A] text-white",
                      chartColor: "#E6A34A",
                      type: "bar",
                      value: stats?.likes || 0,
                    },
                  ];

                  const threadsBalanceConfig = [
                    {
                      key: "gained",
                      dataKey: "new",
                      label: "Gained",
                      color: "bg-[#8E9BEE] text-white",
                      chartColor: "#8E9BEE",
                      type: "area",
                      value: totalPeriodGained || 0,
                    },
                    {
                      key: "lost",
                      label: "Lost",
                      color: "bg-[#F7A6E0] text-white",
                      chartColor: "#F7A6E0",
                      type: "area",
                      value: 0,
                    },
                  ];

                  return (
                    <>
                      <InsightsSummaryWidget
                        dateRange={dateRange}
                        metrics={metrics}
                        stats={stats}
                        realData={realData}
                        communityGrowthData={communityGrowthData}
                        publishedVideos={publishedVideos}
                        platform={platform}
                      />
                      <GenericDashboardTab
                        title={`${platform === "bluesky" ? "Bluesky" : "Threads"} Growth`}
                        description="Growth metrics for Followers, Views, and Likes"
                        data={communityGrowthData}
                        metricConfig={threadsGrowthConfig}
                        watermark={platform}
                      />
                      <GenericDashboardTab
                        title="Balance of Followers"
                        description="Biến động số lượng người theo dõi mới và hủy theo dõi"
                        data={communityGrowthData}
                        metricConfig={threadsBalanceConfig}
                        watermark={platform}
                      />
                    </>
                  );
                })()}
              </div>
            )}
            {activeTab === "posts" && (
              <ThreadsPostsTab
                realData={realData}
                publishedVideos={publishedVideos}
                isPublishedLoading={isPublishedLoading}
                pageSize={pageSize}
                setPageSize={setPageSize}
                fetchPublishedVideos={fetchPublishedVideos}
                prevPageToken={prevPageToken}
                nextPageToken={nextPageToken}
                onVideoClick={handleVideoClick}
              />
            )}
          </>
        )}

        {/* TIKTOK VIEW */}
        {platform === "tiktok" && (
          <TikTokDashboard
            metrics={metrics}
            dateRange={dateRange}
            setDateRange={setDateRange}
            realData={realData}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            publishedVideos={publishedVideos}
            isPublishedLoading={isPublishedLoading}
            pageSize={pageSize}
            setPageSize={setPageSize}
            fetchPublishedVideos={fetchPublishedVideos}
            onVideoClick={handleVideoClick}
          />
        )}
      </div>
    </div>
  );
}
