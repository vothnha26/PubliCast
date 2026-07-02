import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Youtube, Instagram, Facebook, PlayCircle, Linkedin,
  Info, Download, Loader2, Diamond, X, BarChart2, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { PlatformIcon } from "../../components/shared/PlatformIcon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area
} from "recharts";
import { GenericDashboardTab } from "./dashboard/GenericDashboardTab";
import { DemographicsTab } from "./dashboard/DemographicsTab";
import { PublishedVideosTab } from "./dashboard/PublishedVideosTab";
import { CompetitorsTab } from "./dashboard/CompetitorsTab";
import { TrackedVideosTab } from "./dashboard/TrackedVideosTab";
import { FacebookDashboard } from "./dashboard/FacebookDashboard";
import { TikTokDashboard } from "./dashboard/TikTokDashboard";
import { DiscordDashboard } from "./dashboard/DiscordDashboard";
import { InstagramAccountTab } from "./dashboard/InstagramAccountTab";
import { ThreadsPostsTab } from "./dashboard/ThreadsPostsTab";
import { usePlatformDashboard } from "../../hooks/usePlatformDashboard";
import { DateRangeFilter } from "../../components/app/DateRangeFilter";
import { useConnections } from "../../context/ConnectionsContext";
import socialService from "../../services/social.service";

const PLATFORM_CONFIG = {
  youtube: { name: "YouTube", color: "#FF0000", icon: <Youtube size={20} /> },
  instagram: { name: "Instagram", color: "#E1306C", icon: <Instagram size={20} /> },
  facebook: { name: "Facebook", color: "#1877F2", icon: <Facebook size={20} /> },
  tiktok: { name: "TikTok", color: "#000000", icon: <PlayCircle size={20} /> },
  linkedin: { name: "LinkedIn", color: "#0A66C2", icon: <Linkedin size={20} /> },
  discord: { name: "Discord", color: "#5865F2", icon: <BarChart2 size={20} /> },
  threads: { name: "Threads", color: "#000000", icon: <PlatformIcon platform="Threads" size={20} variant="flat" className="text-black" /> },
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

const DISCORD_TABS = [
  { id: "community", label: "CỘNG ĐỒNG" },
  { id: "channels", label: "KÊNH KẾT NỐI" },
];

const IG_TABS = [
  { id: "community", label: "COMMUNITY" },
  { id: "account", label: "ACCOUNT" },
  { id: "competitors", label: "COMPETITORS" },
];

const THREADS_TABS = [
  { id: "community", label: "COMMUNITY" },
  { id: "posts", label: "POSTS" },
  { id: "competitors", label: "COMPETITORS" },
];

export function PlatformDashboardPage() {
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
    selectedVideo,
    setSelectedVideo,
    videoAnalytics,
    isVideoDetailLoading,
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
    activeBrand
  } = usePlatformDashboard(platform);

  const { openConnections } = useConnections();
  const navigate = useNavigate();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const tabs = platform === "instagram" ? IG_TABS : platform === "facebook" ? FB_TABS : platform === "tiktok" ? TT_TABS : platform === "discord" ? DISCORD_TABS : platform === "threads" ? THREADS_TABS : YT_TABS;


  useEffect(() => {
    setSelectedVideo(null);
  }, [activeTab]);

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
      <div className="flex-1 overflow-y-auto bg-[#F8F8F7] animate-pulse">
        {/* Sub-Navigation (Tabs) Skeleton */}
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-6 border-b border-gray-100" style={{ height: 48 }}>
          <div className="flex gap-8 h-full">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-full flex items-center">
                <div className="w-16 h-3 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
          <div className="w-32 h-6 bg-gray-100 rounded-lg" />
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
              <div key={n} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-28 space-y-3">
                <div className="w-20 h-3 bg-gray-100/80 rounded" />
                <div className="w-24 h-6 bg-gray-200/80 rounded" />
              </div>
            ))}
          </div>

          {/* Chart skeleton */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-[350px] space-y-4">
            <div className="flex justify-between">
              <div className="w-48 h-4 bg-gray-100 rounded" />
              <div className="w-24 h-4 bg-gray-100 rounded" />
            </div>
            <div className="w-full h-[250px] bg-gray-50/50 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F8F7]">
      {/* Sub-Navigation (Tabs) */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 border-b border-gray-100" style={{ height: 48 }}>
        <div className="flex gap-8 h-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="h-full flex items-center text-[10px] font-bold tracking-wider transition-all relative"
              style={{ 
                color: activeTab === tab.id ? "#0A0A0A" : "#9CA3AF",
                borderBottom: activeTab === tab.id ? "2px solid #D9F99D" : "none" 
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
           <DateRangeFilter date={dateRange} setDate={setDateRange} />
           
           <button 
             onClick={handleRefresh}
             disabled={isRefreshing}
             className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 disabled:opacity-50 flex items-center justify-center"
             title="Làm mới dữ liệu (Đồng bộ từ API)"
           >
             {isRefreshing ? (
               <Loader2 size={16} className="animate-spin text-indigo-600" />
             ) : (
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-cw"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><polyline points="21 3 21 8 16 8"/></svg>
             )}
           </button>

           <button 
             onClick={() => setIsExportModalOpen(true)}
             className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
            >
             <Download size={16} />
           </button>
        </div>
      </div>

      <div className="p-6 max-w-[1400px] mx-auto space-y-6 pb-12">
        <div className="flex items-center justify-between">
           <h2 className="text-xl font-bold text-[#0A0A0A] capitalize tracking-tight">
             {activeTab === 'posts_list' ? 'List of Posts' : activeTab}
           </h2>
           
           <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
              <div className="w-6 h-6 rounded-lg overflow-hidden border border-gray-100">
                <img src={metrics?.profilePictureUrl} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <span className="text-[11px] font-bold text-gray-700">{metrics?.displayName}</span>
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
                  ) : platform === "discord" ? (
                    <BarChart2 size={10} className="text-white fill-white" />
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
                  <Diamond size={20} className="text-[#0A0A0A]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Unlock Full Potential</h3>
                  <p className="text-[11px] text-gray-400">Upgrade to learn more about your competitors' strategy and unlock 2 years of historical data.</p>
                </div>
            </div>
            <div className="flex items-center gap-4 relative z-10">
                <button onClick={() => navigate("/pricing")} className="px-5 py-2 bg-[#D9F99D] text-[#0A0A0A] rounded-xl text-xs font-bold hover:scale-105 transition-all shadow-md">
                  Upgrade Now
                </button>
                <button onClick={() => setShowInfo(false)} className="p-1.5 text-gray-500 hover:text-white transition-colors">
                  <X size={16} />
                </button>
            </div>
          </div>
        )}

        {platform === "discord" ? (
          <DiscordDashboard
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        ) : !metrics ? (
          <div className="h-96 flex flex-col items-center justify-center text-center bg-white border border-gray-100 rounded-3xl shadow-sm px-6">
             <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <div style={{ color: config.color }}>{config.icon}</div>
             </div>
             <h3 className="text-xl font-bold text-[#0A0A0A]">{config.name} account not connected</h3>
             <p className="text-sm text-gray-500 mt-2 mb-8 max-w-sm">Connect your {config.name} account to see real-time analytics, demographics, and video performance.</p>
             <button 
               onClick={() => openConnections(activeBrand?.id)}
               className="px-8 py-3 bg-[#0A0A0A] text-white rounded-xl text-sm font-bold hover:bg-black/90 transition-all shadow-lg"
             >
               Connect {config.name}
             </button>
          </div>
        ) : platform === "facebook" ? (
          <FacebookDashboard
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
            prevPageToken={prevPageToken}
            nextPageToken={nextPageToken}
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
          />
        ) : platform === "instagram" ? (
          <>
            {activeTab === "community" && (
              <div className="space-y-6">
                {(() => {
                  const igGrowthConfig = [
                    {
                      key: "followers",
                      label: "Followers",
                      color: "bg-[#8E9BEE] text-white",
                      chartColor: "#8E9BEE",
                      type: "area",
                      value: metrics?.instagramAccount?.followersCount || 0
                    },
                    {
                      key: "following",
                      label: "Following",
                      color: "bg-[#A7F3D0] text-gray-900",
                      chartColor: "#A7F3D0",
                      type: "line",
                      value: metrics?.instagramAccount?.followingCount || 0
                    },
                    {
                      key: "totalContent",
                      label: "Total content",
                      color: "bg-[#E6A34A] text-white",
                      chartColor: "#E6A34A",
                      type: "bar",
                      value: metrics?.instagramAccount?.mediaCount || 0
                    }
                  ];

                  return (
                    <GenericDashboardTab
                      title="Growth"
                      description="Growth metrics for Followers, Following, and Total Content"
                      data={communityGrowthData}
                      metricConfig={igGrowthConfig}
                      watermark="publicast"
                    />
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
                      value: metrics?.followersCount || 12500
                    },
                    {
                      key: "views",
                      label: "Views",
                      color: "bg-[#A7F3D0] text-gray-900",
                      chartColor: "#A7F3D0",
                      type: "line",
                      value: stats?.views || 32000
                    },
                    {
                      key: "likes",
                      label: "Likes",
                      color: "bg-[#E6A34A] text-white",
                      chartColor: "#E6A34A",
                      type: "bar",
                      value: stats?.likes || 2400
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
                      value: totalPeriodGained || 500
                    },
                    {
                      key: "lost",
                      label: "Lost",
                      color: "bg-[#F7A6E0] text-white",
                      chartColor: "#F7A6E0",
                      type: "area",
                      value: 120
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
                        value: stats?.subscribers || totalPeriodGained || 12
                      },
                      {
                        key: "views",
                        label: "Video views",
                        color: "bg-[#86EFAC] text-gray-900",
                        chartColor: "#86EFAC",
                        type: "line",
                        value: totalPeriodViews || 13
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
                        value: stats?.videos || 3
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
                        value: stats?.videos || 3
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
              selectedVideo ? (
                <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                  {/* Inline header with Back button */}
                  <div className="bg-[#2D1D35] p-6 text-white relative">
                     <div className="flex gap-4 items-center">
                        <button 
                          onClick={() => setSelectedVideo(null)} 
                          className="p-2 hover:bg-white/10 rounded-full transition-colors mr-2 cursor-pointer flex items-center justify-center shrink-0 border-none"
                          title="Back to list"
                        >
                           <ArrowLeft size={20} />
                        </button>
                        <img src={selectedVideo.thumbnailUrl} className="w-32 h-20 rounded-xl object-cover border border-white/10 shrink-0" />
                        <div className="flex-1 min-w-0">
                           <h3 className="text-lg font-bold line-clamp-2 leading-snug">{selectedVideo.title}</h3>
                           <div className="flex gap-4 mt-2">
                              <div className="flex flex-col">
                                 <span className="text-[10px] text-gray-400 uppercase font-bold">Views</span>
                                 <span className="text-base font-bold text-[#BEF264]">{parseInt(selectedVideo.views).toLocaleString()}</span>
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-[10px] text-gray-400 uppercase font-bold">Likes</span>
                                 <span className="text-base font-bold text-white">{parseInt(selectedVideo.likes).toLocaleString()}</span>
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-[10px] text-gray-400 uppercase font-bold">Published</span>
                                 <span className="text-base font-bold text-white">{new Date(selectedVideo.publishedAt).toLocaleDateString()}</span>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="p-8 space-y-6 bg-[#F8F8F7]">
                     <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                           <div>
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Growth Performance</h4>
                              <div className="flex items-center gap-2 mt-1">
                                 <div className="w-3 h-3 rounded-full bg-[#8E9BEE]" />
                                 <span className="text-[10px] font-bold text-gray-500">VIEWS OVER TIME</span>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-gray-400 uppercase">Filter:</span>
                              <DateRangeFilter date={dateRange} setDate={setDateRange} />
                           </div>
                        </div>
                        
                        {isVideoDetailLoading ? (
                          <div className="h-[300px] flex items-center justify-center"><Loader2 className="animate-spin text-gray-200" /></div>
                        ) : videoAnalytics.length === 0 ? (
                          <div className="h-[300px] flex flex-col items-center justify-center text-center">
                             <BarChart2 size={40} className="text-gray-100 mb-4" />
                             <p className="text-sm text-gray-400 font-medium">No historical data available for this range.</p>
                          </div>
                        ) : (
                          <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={videoAnalytics}>
                                  <defs>
                                    <linearGradient id="colorVideoViewsInline" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8E9BEE" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#8E9BEE" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="0" vertical={false} stroke="#F3F4F6" />
                                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                                  <Area type="monotone" dataKey="views" stroke="#8E9BEE" strokeWidth={3} fillOpacity={1} fill="url(#colorVideoViewsInline)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center">
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Avg. Watch Time</span>
                           <span className="text-2xl font-bold text-[#0A0A0A]">
                             {videoAnalytics.length > 0 && videoAnalytics[videoAnalytics.length - 1]?.avgWatchTime 
                               ? `${Math.round(videoAnalytics[videoAnalytics.length - 1].avgWatchTime / 60)}m` 
                               : "0m"}
                           </span>
                           <div className="w-full h-1 bg-gray-50 rounded-full mt-4">
                              <div className="h-full bg-[#D1EBD9] rounded-full w-[70%]" />
                           </div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center">
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Comments</span>
                           <span className="text-2xl font-bold text-[#0A0A0A]">{selectedVideo.comments || 0}</span>
                           <div className="w-full h-1 bg-gray-50 rounded-full mt-4">
                              <div className="h-full bg-[#8E9BEE] rounded-full w-[45%]" />
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
              ) : (
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
              )
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
              />
            )}
          </>
        )}
      </div>


      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-6 bg-white border border-gray-100 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0A0A0A] tracking-tight">Xuất báo cáo kênh {config.name}</DialogTitle>
            <DialogDescription className="text-xs text-gray-400">Chọn định dạng báo cáo bạn muốn tải xuống.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <button
              onClick={() => {
                handleExportCSV();
                setIsExportModalOpen(false);
              }}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-gray-100 hover:border-gray-900 bg-white hover:bg-gray-50/50 transition-all text-center group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600 font-bold text-sm group-hover:scale-105 transition-transform">
                CSV
              </div>
              <div className="text-xs font-bold text-[#0A0A0A]">Tải file CSV</div>
              <div className="text-[9px] text-gray-400">Dữ liệu bảng tính chi tiết cho tab {activeTab}</div>
            </button>
            <button
              onClick={() => {
                toast.info("Tính năng xuất PDF đang được phát triển.");
                setIsExportModalOpen(false);
              }}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-gray-100 hover:border-gray-900 bg-white hover:bg-gray-50/50 transition-all text-center group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-sm group-hover:scale-105 transition-transform">
                PDF
              </div>
              <div className="text-xs font-bold text-[#0A0A0A]">Tải file PDF</div>
              <div className="text-[9px] text-gray-400">Báo cáo trực quan kèm biểu đồ đồ họa</div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
