import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useChannelInsights } from "../../../hooks/channels/useChannelInsights";
import { DateRangeFilter } from "../../../components/app/DateRangeFilter";
import { ChannelInsightsSkeleton } from "./ChannelInsightsSkeleton";
import { GenericDashboardTab } from "../dashboard/GenericDashboardTab";
import { DemographicsTab } from "../dashboard/DemographicsTab";
import { PublishedVideosTab } from "../dashboard/PublishedVideosTab";
import { FacebookDashboard } from "../dashboard/FacebookDashboard";
import { InstagramAccountTab } from "../dashboard/InstagramAccountTab";
import { InstagramReelsTab } from "../dashboard/InstagramReelsTab";
import { InstagramStoriesTab } from "../dashboard/InstagramStoriesTab";
import { ThreadsPostsTab } from "../dashboard/ThreadsPostsTab";
import { TikTokDashboard } from "../dashboard/TikTokDashboard";

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
              <div className="space-y-6">
                {(() => {
                  const ytGrowthConfig = [
                    {
                      key: "subscribers",
                      label: t("youtubeDashboard.subscribersLabel", "Subscribers"),
                      color: "bg-[#8E9BEE] text-white",
                      chartColor: "#8E9BEE",
                      type: "area",
                      value: stats?.subscribers || 0,
                    },
                    {
                      key: "views",
                      label: t("youtubeDashboard.viewsLabel", "Views"),
                      color: "bg-[#A7F3D0] text-foreground",
                      chartColor: "#A7F3D0",
                      type: "line",
                      value: totalPeriodViews || stats?.views || 0,
                    },
                    {
                      key: "totalContent",
                      label: t("youtubeDashboard.totalVideosLabel", "Total videos"),
                      color: "bg-[#E6A34A] text-white",
                      chartColor: "#E6A34A",
                      type: "bar",
                      value: stats?.videos || 0,
                    },
                  ];

                  const ytBalanceConfig = [
                    {
                      key: "gained",
                      dataKey: "new",
                      label: t("youtubeDashboard.gainedLabel", "Gained"),
                      color: "bg-[#8E9BEE] text-white",
                      chartColor: "#8E9BEE",
                      type: "area",
                      value: totalPeriodGained || 0,
                    },
                    {
                      key: "lost",
                      label: t("youtubeDashboard.lostLabel", "Lost"),
                      color: "bg-[#F7A6E0] text-white",
                      chartColor: "#F7A6E0",
                      type: "area",
                      value: 0,
                    },
                  ];

                  return (
                    <>
                      <GenericDashboardTab
                        title={t("youtubeDashboard.subscriberGrowthTitle", "Subscriber Growth")}
                        description={t(
                          "youtubeDashboard.subscriberGrowthDesc",
                          "Biểu đồ phát triển người đăng ký theo thời gian"
                        )}
                        data={communityGrowthData}
                        metricConfig={ytGrowthConfig}
                        watermark="publicast"
                      />
                      <GenericDashboardTab
                        title={t("youtubeDashboard.viewBalanceTitle", "Balance of Subscribers")}
                        description={t(
                          "youtubeDashboard.viewBalanceDesc",
                          "Biến động người đăng ký mới và hủy đăng ký"
                        )}
                        data={communityGrowthData}
                        metricConfig={ytBalanceConfig}
                        watermark="publicast"
                      />
                    </>
                  );
                })()}
              </div>
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
              <div className="space-y-6">
                {(() => {
                  const followersCount =
                    metrics?.instagramAccount?.followersCount || stats?.subscribers || 0;
                  const followingCount = metrics?.instagramAccount?.followingCount || 0;
                  const mediaCount = metrics?.instagramAccount?.mediaCount || stats?.videos || 0;

                  const igGrowthConfig = [
                    {
                      key: "followers",
                      label: "Followers",
                      color: "bg-[#8E9BEE] text-white",
                      chartColor: "#8E9BEE",
                      type: "area",
                      value: followersCount,
                    },
                    {
                      key: "following",
                      label: "Following",
                      color: "bg-[#A7F3D0] text-foreground",
                      chartColor: "#A7F3D0",
                      type: "line",
                      value: followingCount,
                    },
                    {
                      key: "totalContent",
                      label: "Total content",
                      color: "bg-[#E6A34A] text-white",
                      chartColor: "#E6A34A",
                      type: "bar",
                      value: mediaCount,
                    },
                  ];

                  const daysCount = communityGrowthData?.length || 30;
                  const totalContentInPeriod =
                    communityGrowthData?.reduce((acc, curr) => acc + (curr.totalContent || 0), 0) ||
                    mediaCount;
                  const dailyPostsNum = daysCount > 0 ? totalContentInPeriod / daysCount : 0;
                  const dailyPosts = dailyPostsNum.toFixed(2);
                  const postsPerWeek = (dailyPostsNum * 7).toFixed(2);
                  const followersPerPost =
                    mediaCount > 0 ? (followersCount / mediaCount).toFixed(2) : "0";
                  const dailyFollowers =
                    daysCount > 0 ? (totalPeriodGained / daysCount).toFixed(2) : "0";

                  const summaryGrid = [
                    { label: "Followers", value: followersCount.toLocaleString() },
                    { label: "Daily followers", value: dailyFollowers },
                    { label: "Followers per post", value: followersPerPost },
                    { label: "Following", value: followingCount.toLocaleString() },
                    { label: "Daily posts", value: dailyPosts },
                    { label: "Posts per week", value: postsPerWeek },
                  ];

                  const igBalanceConfig = [
                    {
                      key: "followers",
                      label: "Followers",
                      color: "bg-[#86EFAC] text-[#166534]",
                      chartColor: "#22C55E",
                      type: "line",
                      value: followersCount,
                    },
                  ];

                  return (
                    <>
                      <GenericDashboardTab
                        title="Growth"
                        description=""
                        data={communityGrowthData}
                        metricConfig={igGrowthConfig}
                        watermark="publicast"
                        summaryGrid={summaryGrid}
                      />
                      <GenericDashboardTab
                        title="Balance of Followers"
                        description=""
                        data={communityGrowthData}
                        metricConfig={igBalanceConfig}
                        watermark="publicast"
                      />
                    </>
                  );
                })()}
              </div>
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
