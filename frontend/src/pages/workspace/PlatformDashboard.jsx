import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Youtube, Instagram, Facebook, PlayCircle,
  Info, Download, Loader2, Diamond, X
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { PlatformIcon } from "../../components/shared/PlatformIcon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { GenericDashboardTab } from "./dashboard/GenericDashboardTab";
import { DemographicsTab } from "./dashboard/DemographicsTab";
import { PublishedVideosTab } from "./dashboard/PublishedVideosTab";
import { CompetitorsTab } from "./dashboard/CompetitorsTab";
import { TrackedVideosTab } from "./dashboard/TrackedVideosTab";
import { FacebookDashboard } from "./dashboard/FacebookDashboard";
import { TikTokDashboard } from "./dashboard/TikTokDashboard";
import { InstagramAccountTab } from "./dashboard/InstagramAccountTab";
import { InstagramReelsTab } from "./dashboard/InstagramReelsTab";
import { InstagramStoriesTab } from "./dashboard/InstagramStoriesTab";
import { ThreadsPostsTab } from "./dashboard/ThreadsPostsTab";
import { BlueskyDashboardTab } from "./dashboard/BlueskyDashboardTab";
import { usePlatformDashboard } from "../../hooks/usePlatformDashboard";
import { DateRangeFilter } from "../../components/app/DateRangeFilter";
import { useConnections } from "../../context/ConnectionsContext";

const PLATFORM_CONFIG = {
  youtube: { name: "YouTube", color: "#FF0000", icon: <Youtube size={20} /> },
  instagram: { name: "Instagram", color: "#E1306C", icon: <Instagram size={20} /> },
  facebook: { name: "Facebook", color: "#1877F2", icon: <Facebook size={20} /> },
  tiktok: { name: "TikTok", color: "#000000", icon: <PlayCircle size={20} /> },
  threads: { name: "Threads", color: "#000000", icon: <PlatformIcon platform="Threads" size={20} variant="flat" className="text-black" /> },
  bluesky: { name: "Bluesky", color: "#0085FF", icon: <PlatformIcon platform="Bluesky" size={20} variant="flat" /> },
};

const YT_TABS = [
  { id: "community", label: "COMMUNITY" },
  { id: "demographics", label: "DEMOGRAPHICS" },
  { id: "published", label: "PUBLISHED VIDEOS" },
  { id: "viewed", label: "VIEWED VIDEOS" },
  { id: "competitors", label: "COMPETITORS" },
];

const FB_TABS = [
  { id: "overview",    label: "OVERVIEW" },
  { id: "posts",       label: "POSTS" },
  { id: "stories",     label: "STORIES" },
  { id: "competitors", label: "COMPETITORS" },
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
  { id: "competitors", label: "COMPETITORS" },
];

const THREADS_TABS = [
  { id: "community", label: "COMMUNITY" },
  { id: "posts", label: "POSTS" },
  { id: "competitors", label: "COMPETITORS" },
];

const BSKY_TABS = [
  { id: "community", label: "COMMUNITY" },
  { id: "posts", label: "POSTS" },
  { id: "competitors", label: "COMPETITORS" },
];

export function PlatformDashboardPage() {
  const { t } = useTranslation("dashboard");
  const { platform } = useParams();
  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.youtube;
  
  const {
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
    activeBrand,
    isPlatformLocked,
    platformLockReason
  } = usePlatformDashboard(platform);

  const { openConnections } = useConnections();
  const navigate = useNavigate();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const tabs = platform === "instagram" ? IG_TABS : platform === "facebook" ? FB_TABS : platform === "tiktok" ? TT_TABS : platform === "threads" ? THREADS_TABS : platform === "bluesky" ? BSKY_TABS : YT_TABS;


  const handleExportCSV = () => {
    let headers = [];
    let rows = [];
    let fileName = `publicast_${platform}_report_${activeTab}`;

    if (activeTab === "published" || activeTab === "posts_list" || activeTab === "posts") {
      headers = ["Content", "Published At", "Reach", "Views", "Reactions", "Comments", "Shares", "Clicks"];
      rows = (publishedVideos || []).map(v => [
        v.message || v.title || "",
        v.date || v.publishedAt ? new Date(v.date || v.publishedAt).toLocaleDateString() : "",
        v.reach || 0,
        v.views || 0,
        v.reactions || v.likes || 0,
        v.comments || 0,
        v.shares || 0,
        v.clicks || 0
      ]);
    } else if (activeTab === "competitors") {
      headers = ["Competitor Name", "Handle", "Subscribers", "Total Views", "Total Videos", "Added At"];
      rows = (competitors || []).map(c => [
        c.competitorDisplayName || "",
        c.competitorHandle || "",
        c.followersCount || 0,
        0, 0,
        c.addedAt ? new Date(c.addedAt).toLocaleDateString() : ""
      ]);
    }

    // Build CSV with UTF-8 BOM for Excel compatibility and proper character escaping
    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(r => r.map(cell => {
        const cleanCell = String(cell ?? '').replace(/"/g, '""');
        return `"${cleanCell}"`;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto bg-background animate-pulse">
        {/* Sub-Navigation (Tabs) Skeleton */}
        <div className="sticky top-0 z-20 bg-card flex items-center justify-between px-6 border-b border-border" style={{ height: 48 }}>
          <div className="flex gap-8 h-full">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-full flex items-center">
                <div className="w-16 h-3 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
          <div className="w-32 h-6 bg-muted rounded-lg" />
        </div>

        <div className="p-6 max-w-[1400px] mx-auto space-y-6 pb-12">
          {/* Title and brand selector skeleton */}
          <div className="flex items-center justify-between">
            <div className="w-36 h-6 bg-gray-200 rounded-lg" />
            <div className="w-40 h-8 bg-gray-200 rounded-xl" />
          </div>

          {/* Banner skeleton */}
          <div className="bg-gray-200/50 rounded-3xl p-5 h-20" />

          {/* Metrics card skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-card p-6 rounded-3xl border border-border shadow-sm h-28 space-y-3">
                <div className="w-20 h-3 bg-muted/80 rounded" />
                <div className="w-24 h-6 bg-gray-200/80 rounded" />
              </div>
            ))}
          </div>

          {/* Chart skeleton */}
          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm h-[350px] space-y-4">
            <div className="flex justify-between">
              <div className="w-48 h-4 bg-muted rounded" />
              <div className="w-24 h-4 bg-muted rounded" />
            </div>
            <div className="w-full h-[250px] bg-muted/50 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {/* Sub-Navigation (Tabs) */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md flex items-center justify-between px-6 border-b border-border" style={{ height: 48 }}>
        <div className="flex gap-8 h-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`h-full flex items-center text-[10px] font-bold tracking-wider transition-all relative ${
                activeTab === tab.id ? 'text-foreground border-b-2 border-lime-300' : 'text-muted-foreground'
              }`}
            >
              {t(`tabs.${tab.id}`, tab.label)}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
           <DateRangeFilter date={dateRange} setDate={setDateRange} />
           
           <button
             onClick={() => setIsExportModalOpen(true)}
             className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
            >
             <Download size={16} />
           </button>
        </div>
      </div>

      <div className="p-6 max-w-[1400px] mx-auto space-y-6 pb-12">
        {isPlatformLocked && (
          <div className="relative overflow-hidden bg-gradient-to-r from-red-50 to-rose-50 rounded-3xl p-5 border border-red-200 shadow-sm flex items-center justify-between group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-200/20 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="flex gap-4 items-center relative z-10">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0 shadow-lg shadow-rose-200/10 border border-rose-200">
                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-600 animate-pulse"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-950 flex items-center gap-2">
                    Nền tảng tạm khóa (Platform Locked)
                    <span className="px-2 py-0.5 text-[9px] font-extrabold tracking-wider bg-rose-600 text-white rounded-full uppercase">Locked by Admin</span>
                  </h3>
                  <p className="text-[11px] text-red-700 font-medium mt-0.5">
                    {platformLockReason || "Nền tảng này hiện đang bị tạm khóa phục vụ cho mục đích bảo trì hệ thống."}
                  </p>
                </div>
            </div>
          </div>
        )}

        {/* Banner trạng thái đồng bộ dữ liệu (Sync Status) */}
        {metrics && metrics.syncStatus && metrics.syncStatus !== "SUCCESS" && (
          <div 
            className={`relative overflow-hidden rounded-3xl p-5 border shadow-sm flex items-center justify-between group transition-all duration-300 ${
              metrics.syncStatus === "PENDING"
                ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
                : metrics.syncStatus === "PARTIAL"
                ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
                : "bg-gradient-to-r from-rose-50 to-red-50 border-rose-200"
            }`}
          >
            <div className="flex gap-4 items-center relative z-10">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-md ${
                  metrics.syncStatus === "PENDING"
                    ? "bg-blue-100 border-blue-200 text-blue-600"
                    : metrics.syncStatus === "PARTIAL"
                    ? "bg-amber-100 border-amber-200 text-amber-600"
                    : "bg-rose-100 border-rose-200 text-rose-600"
                }`}
              >
                {metrics.syncStatus === "PENDING" ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : metrics.syncStatus === "PARTIAL" ? (
                  <Loader2 size={18} className="animate-spin text-amber-600" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                )}
              </div>
              <div>
                <h3 
                  className={`text-sm font-bold flex items-center gap-2 ${
                    metrics.syncStatus === "PENDING"
                      ? "text-blue-950"
                      : metrics.syncStatus === "PARTIAL"
                      ? "text-amber-950"
                      : "text-red-950"
                  }`}
                >
                  {metrics.syncStatus === "PENDING" && "Đang chuẩn bị đồng bộ dữ liệu..."}
                  {metrics.syncStatus === "PARTIAL" && "Đang đồng bộ dữ liệu chi tiết..."}
                  {metrics.syncStatus === "FAILED" && "Đồng bộ dữ liệu thất bại"}
                  <span 
                    className={`px-2 py-0.5 text-[9px] font-extrabold tracking-wider rounded-full uppercase text-white ${
                      metrics.syncStatus === "PENDING"
                        ? "bg-blue-600"
                        : metrics.syncStatus === "PARTIAL"
                        ? "bg-amber-500"
                        : "bg-rose-600"
                    }`}
                  >
                    {metrics.syncStatus}
                  </span>
                </h3>
                <p 
                  className={`text-[11px] font-medium mt-0.5 ${
                    metrics.syncStatus === "PENDING"
                      ? "text-blue-700"
                      : metrics.syncStatus === "PARTIAL"
                      ? "text-amber-700"
                      : "text-red-700"
                  }`}
                >
                  {metrics.syncStatus === "PENDING" && "Tài khoản vừa được kết nối thành công. Hệ thống đang xếp lịch tải dữ liệu lịch sử 90 ngày gần nhất."}
                  {metrics.syncStatus === "PARTIAL" && "Hệ thống đang tải dữ liệu phân tích chi tiết (lượt xem, nhân khẩu học, cộng đồng...) từ API nền tảng."}
                  {metrics.syncStatus === "FAILED" && "Quá trình đồng bộ dữ liệu gặp lỗi hoặc token đã hết hạn. Vui lòng kết nối lại tài khoản."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
           <h2 className="text-xl font-bold text-foreground capitalize tracking-tight">
             {activeTab === 'posts_list' ? 'List of Posts' : activeTab}
           </h2>
           
           <div className="flex items-center gap-3 bg-card px-3 py-1.5 rounded-xl border border-border shadow-sm">
              <div className="w-6 h-6 rounded-lg overflow-hidden border border-border">
                <img 
                  src={metrics?.profilePictureUrl} 
                  alt="Avatar" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                  }}
                  className="w-full h-full object-cover" 
                />
              </div>
              <span className="text-[11px] font-bold text-foreground">{metrics?.displayName}</span>
              <div 
                className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ backgroundColor: config.color }}
              >
                  {platform === "facebook" ? (
                    <Facebook size={10} className="text-white fill-white" />
                  ) : platform === "instagram" ? (
                    <Instagram size={10} className="text-white" />
                  ) : platform === "tiktok" ? (
                    <PlayCircle size={10} className="text-white fill-white" />
                  ) : (
                    <Youtube size={10} className="text-white fill-white" />
                  )}
              </div>
           </div>
        </div>

        {showInfo && (
          <div className="bg-[#2D1D35] rounded-3xl p-5 shadow-sm flex items-center justify-between border border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D9F99D]/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            <div className="flex gap-4 items-center relative z-10">
                <div className="w-10 h-10 rounded-full bg-[#D9F99D] flex items-center justify-center shrink-0 shadow-lg shadow-[#D9F99D]/20">
                  <Diamond size={20} className="text-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Unlock Full Potential</h3>
                  <p className="text-[11px] text-muted-foreground">Upgrade to learn more about your competitors' strategy and unlock 2 years of historical data.</p>
                </div>
            </div>
            <div className="flex items-center gap-4 relative z-10">
                <button onClick={() => navigate("/pricing")} className="px-5 py-2 bg-[#D9F99D] text-foreground rounded-xl text-xs font-bold hover:scale-105 transition-all shadow-md">
                  Upgrade Now
                </button>
                <button onClick={() => setShowInfo(false)} className="p-1.5 text-muted-foreground hover:text-white transition-colors">
                  <X size={16} />
                </button>
            </div>
          </div>
        )}

        {!metrics ? (
          <div className="h-96 flex flex-col items-center justify-center text-center bg-card border border-border rounded-3xl shadow-sm px-6">
             <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                <div style={{ color: config.color }}>{config.icon}</div>
             </div>
             <h3 className="text-xl font-bold text-foreground">{config.name} account not connected</h3>
             <p className="text-sm text-muted-foreground mt-2 mb-8 max-w-sm">Connect your {config.name} account to see real-time analytics, demographics, and video performance.</p>
             <button 
               onClick={() => !isPlatformLocked && openConnections(activeBrand?.id)}
               disabled={isPlatformLocked}
               className="px-8 py-3 bg-[#0A0A0A] text-white rounded-xl text-sm font-bold hover:bg-black/90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
             >
               Connect {config.name}
             </button>
          </div>
        ) : platform === "facebook" ? (
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
            isCompetitorModalOpen={isCompetitorModalOpen}
            setIsCompetitorModalOpen={setIsCompetitorModalOpen}
            competitorQuery={competitorQuery}
            setCompetitorQuery={setCompetitorQuery}
            handleSearchCompetitors={handleSearchCompetitors}
            isSearching={isSearching}
            searchResults={searchResults}
            handleAddCompetitor={handleAddCompetitor}
            handleDeleteCompetitor={handleDeleteCompetitor}
            isCompetitorLoading={isCompetitorLoading}
            competitors={competitors}
            isPlatformLocked={isPlatformLocked}
          />
        ) : platform === "instagram" ? (
          <>
            {activeTab === "community" && (
              <div className="space-y-6">
                {(() => {
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
                  const dailyFollowers = daysCount > 0 ? (totalPeriodGained / daysCount).toFixed(2) : "0";

                  const summaryGrid = [
                    { label: "Followers", value: followersCount.toLocaleString() },
                    { label: "Daily followers", value: dailyFollowers },
                    { label: "Followers per post", value: followersPerPost },
                    { label: "Following", value: followingCount.toLocaleString() },
                    { label: "Daily posts", value: dailyPosts },
                    { label: "Posts per week", value: postsPerWeek }
                  ];

                  const igBalanceConfig = [
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
                    <>
                      <GenericDashboardTab
                        title="Growth"
                        description=""
                        data={communityGrowthData}
                        metricConfig={igGrowthConfig}
                        watermark="publicast"
                        summaryGrid={summaryGrid}
                      />

                      <div className="h-2" />

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

            {activeTab === "competitors" && (
              <CompetitorsTab
                competitors={competitors}
                isLoading={isCompetitorLoading}
                onAddCompetitor={handleAddCompetitor}
                onDeleteCompetitor={handleDeleteCompetitor}
                searchQuery={competitorQuery}
                setSearchQuery={setCompetitorQuery}
                searchResults={searchResults}
                isSearching={isSearching}
                isModalOpen={isCompetitorModalOpen}
                setIsModalOpen={setIsCompetitorModalOpen}
                isPlatformLocked={isPlatformLocked}
              />
            )}
          </>
        ) : platform === "threads" ? (
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
                      value: metrics?.followersCount || 0
                    },
                    {
                      key: "views",
                      label: "Views",
                      color: "bg-[#A7F3D0] text-foreground",
                      chartColor: "#A7F3D0",
                      type: "line",
                      value: stats?.views || 0
                    },
                    {
                      key: "likes",
                      label: "Likes",
                      color: "bg-[#E6A34A] text-white",
                      chartColor: "#E6A34A",
                      type: "bar",
                      value: stats?.likes || 0
                    }
                  ];

                  const threadsBalanceConfig = [
                    {
                      key: "gained",
                      dataKey: "new",
                      label: "Gained",
                      color: "bg-[#8E9BEE] text-white",
                      chartColor: "#8E9BEE",
                      type: "area",
                      value: totalPeriodGained || 0
                    },
                    {
                      key: "lost",
                      label: "Lost",
                      color: "bg-[#F7A6E0] text-white",
                      chartColor: "#F7A6E0",
                      type: "area",
                      value: 0
                    }
                  ];

                  return (
                    <>
                      <GenericDashboardTab
                        title="Threads Growth"
                        description="Growth metrics for Followers, Views, and Likes"
                        data={communityGrowthData}
                        metricConfig={threadsGrowthConfig}
                        watermark="threads"
                      />
                      <div className="h-6" />
                      <GenericDashboardTab
                        title="Balance of Followers"
                        description="Biến động số lượng người theo dõi mới và hủy theo dõi"
                        data={communityGrowthData}
                        metricConfig={threadsBalanceConfig}
                        watermark="threads"
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

            {activeTab === "competitors" && (
              <CompetitorsTab
                competitors={competitors}
                isLoading={isCompetitorLoading}
                onAddCompetitor={handleAddCompetitor}
                onDeleteCompetitor={handleDeleteCompetitor}
                searchQuery={competitorQuery}
                setSearchQuery={setCompetitorQuery}
                searchResults={searchResults}
                isSearching={isSearching}
                isModalOpen={isCompetitorModalOpen}
                setIsModalOpen={setIsCompetitorModalOpen}
                isPlatformLocked={isPlatformLocked}
              />
            )}
          </>
        ) : platform === "bluesky" ? (
          <>
            {activeTab === "community" && (
              <div className="space-y-6">
                {(() => {
                  const bskyGrowthConfig = [
                    {
                      key: "followers",
                      label: "Followers",
                      color: "bg-[#8E9BEE] text-white",
                      chartColor: "#8E9BEE",
                      type: "area",
                      value: metrics?.followersCount || metrics?.blueskyAccount?.followersCount || 0
                    },
                    {
                      key: "views",
                      label: "Views",
                      color: "bg-[#A7F3D0] text-foreground",
                      chartColor: "#A7F3D0",
                      type: "line",
                      value: stats?.views || 0
                    },
                    {
                      key: "likes",
                      label: "Likes",
                      color: "bg-[#E6A34A] text-white",
                      chartColor: "#E6A34A",
                      type: "bar",
                      value: stats?.likes || 0
                    }
                  ];

                  const bskyBalanceConfig = [
                    {
                      key: "gained",
                      dataKey: "new",
                      label: "Gained",
                      color: "bg-[#8E9BEE] text-white",
                      chartColor: "#8E9BEE",
                      type: "area",
                      value: totalPeriodGained || 0
                    },
                    {
                      key: "lost",
                      label: "Lost",
                      color: "bg-[#F7A6E0] text-white",
                      chartColor: "#F7A6E0",
                      type: "area",
                      value: 0
                    }
                  ];

                  return (
                    <>
                      <GenericDashboardTab
                        title={t("growth.blueskyTitle", "Bluesky Growth")}
                        description={t("growth.blueskyDesc", "Growth metrics for Followers, Views, and Likes")}
                        data={communityGrowthData}
                        metricConfig={bskyGrowthConfig}
                        watermark="bluesky"
                      />
                      <div className="h-6" />
                      <GenericDashboardTab
                        title={t("growth.balanceTitle", "Balance of Followers")}
                        description={t("growth.balanceDesc", "Biến động số lượng người theo dõi mới và hủy theo dõi")}
                        data={communityGrowthData}
                        metricConfig={bskyBalanceConfig}
                        watermark="bluesky"
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

            {activeTab === "competitors" && (
              <CompetitorsTab
                competitors={competitors}
                isLoading={isCompetitorLoading}
                onAddCompetitor={handleAddCompetitor}
                onDeleteCompetitor={handleDeleteCompetitor}
                searchQuery={competitorQuery}
                setSearchQuery={setCompetitorQuery}
                searchResults={searchResults}
                isSearching={isSearching}
                isModalOpen={isCompetitorModalOpen}
                setIsModalOpen={setIsCompetitorModalOpen}
                isPlatformLocked={isPlatformLocked}
              />
            )}
          </>
        ) : platform === "tiktok" ? (
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
        ) : (
          <>
            {activeTab === "community" && (
              <div className="space-y-6">
                  {(() => {
                    const ytGrowthConfig = [
                      {
                        key: "subscribers",
                        label: "Subscribers",
                        color: "bg-[#8E9BEE] text-white",
                        chartColor: "#8E9BEE",
                        type: "area",
                        value: stats?.subscribers || totalPeriodGained || 0
                      },
                      {
                        key: "views",
                        label: "Video views",
                        color: "bg-[#86EFAC] text-foreground",
                        chartColor: "#86EFAC",
                        type: "line",
                        value: totalPeriodViews || 0
                      },
                      {
                        key: "revenue",
                        label: "Revenue",
                        color: "bg-[#C084FC] text-white",
                        chartColor: "#C084FC",
                        type: "line",
                        value: "0"
                      },
                      {
                        key: "videos",
                        label: "Videos",
                        color: "bg-[#E6A34A] text-white",
                        chartColor: "#E6A34A",
                        type: "bar",
                        yAxisId: "right",
                        value: stats?.videos || 0
                      }
                    ];

                    const ytBalanceConfig = [
                      {
                        key: "gained",
                        dataKey: "new",
                        label: "Gained",
                        color: "bg-[#8E9BEE] text-white",
                        chartColor: "#8E9BEE",
                        type: "area",
                        value: totalPeriodGained || 0
                      },
                      {
                        key: "lost",
                        label: "Lost",
                        color: "bg-[#F7A6E0] text-white",
                        chartColor: "#F7A6E0",
                        type: "area",
                        value: "0"
                      },
                      {
                        key: "videos",
                        label: "Videos",
                        color: "bg-[#E6A34A] text-white",
                        chartColor: "#E6A34A",
                        type: "bar",
                        yAxisId: "right",
                        value: stats?.videos || 0
                      }
                    ];

                    return (
                      <>
                        <GenericDashboardTab
                          title="Growth"
                          description="Biểu đồ tăng trưởng người theo dõi, lượt xem và doanh thu"
                          data={communityGrowthData}
                          metricConfig={ytGrowthConfig}
                          watermark="publicast"
                        />
                        <div className="h-6" />
                        <GenericDashboardTab
                          title="Balance of Subscribers"
                          description="Biến động số lượng người đăng ký mới và hủy đăng ký"
                          data={communityGrowthData}
                          metricConfig={ytBalanceConfig}
                          watermark="publicast"
                        />
                      </>
                    );
                  })()}
                 {realData.growth?.length === 0 && (
                   <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3">
                      <Info className="text-amber-500" size={18} />
                      <p className="text-xs text-amber-700 font-medium">
                        Real-time analytics data (Engagement, Watch Time, etc.) can take up to 48-72 hours to appear after connecting your account.
                      </p>
                   </div>
                 )}
              </div>
            )}

            {activeTab === "demographics" && (
              <DemographicsTab realData={realData} />
            )}

            {activeTab === "published" && (
              <PublishedVideosTab
                publishedVideos={publishedVideos}
                isPublishedLoading={isPublishedLoading}
                prevPageToken={prevPageToken}
                nextPageToken={nextPageToken}
                pageSize={pageSize}
                setPageSize={setPageSize}
                fetchPublishedVideos={fetchPublishedVideos}
                onVideoClick={handleVideoClick}
              />
            )}

            {activeTab === "competitors" && (
              <CompetitorsTab
                isCompetitorModalOpen={isCompetitorModalOpen}
                setIsCompetitorModalOpen={setIsCompetitorModalOpen}
                competitorQuery={competitorQuery}
                setCompetitorQuery={setCompetitorQuery}
                handleSearchCompetitors={handleSearchCompetitors}
                isSearching={isSearching}
                searchResults={searchResults}
                handleAddCompetitor={handleAddCompetitor}
                handleDeleteCompetitor={handleDeleteCompetitor}
                isCompetitorLoading={isCompetitorLoading}
                competitors={competitors}
                isPlatformLocked={isPlatformLocked}
              />
            )}

            {activeTab === "viewed" && (
              <TrackedVideosTab
                isVideoModalOpen={isVideoModalOpen}
                setIsVideoModalOpen={setIsVideoModalOpen}
                videoUrl={videoUrl}
                setVideoUrl={setVideoUrl}
                handleTrackVideo={handleTrackVideo}
                isTrackingLoading={isTrackingLoading}
                trackedVideos={trackedVideos}
                isPlatformLocked={isPlatformLocked}
              />
            )}
          </>
        )}
      </div>


      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-6 bg-card border border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground tracking-tight">Xuất báo cáo kênh {config.name}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Chọn định dạng báo cáo bạn muốn tải xuống.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <button
              onClick={() => {
                handleExportCSV();
                setIsExportModalOpen(false);
              }}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-border hover:border-gray-900 bg-card hover:bg-muted/50 transition-all text-center group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600 font-bold text-sm group-hover:scale-105 transition-transform">
                CSV
              </div>
              <div className="text-xs font-bold text-foreground">Tải file CSV</div>
              <div className="text-[9px] text-muted-foreground">Dữ liệu bảng tính chi tiết cho tab {activeTab}</div>
            </button>
            <button
              onClick={() => {
                toast.info("Tính năng xuất PDF đang được phát triển.");
                setIsExportModalOpen(false);
              }}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-border hover:border-gray-900 bg-card hover:bg-muted/50 transition-all text-center group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-sm group-hover:scale-105 transition-transform">
                PDF
              </div>
              <div className="text-xs font-bold text-foreground">Tải file PDF</div>
              <div className="text-[9px] text-muted-foreground">Báo cáo trực quan kèm biểu đồ đồ họa</div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
