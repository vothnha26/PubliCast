import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Youtube, Instagram, Facebook, PlayCircle, Linkedin,
  Info, Download, Loader2, Diamond, X, BarChart2, ArrowLeft,
  ArrowUpRight, Eye, Play, MessageSquare, ThumbsUp, Calendar, Clock, MapPin, Smartphone, Share2, Users, Search
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
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend
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
import { PostAnalyticsDetailModal } from "../../components/workspace/PostAnalyticsDetailModal";
import { usePlatformDashboard } from "../../hooks/usePlatformDashboard";
import { DateRangeFilter } from "../../components/app/DateRangeFilter";
import { useConnections } from "../../context/ConnectionsContext";
import socialService from "../../services/social.service";

const COUNTRY_MAP = {
  VN: "Việt Nam",
  US: "Mỹ (United States)",
  JP: "Nhật Bản",
  KR: "Hàn Quốc",
  CN: "Trung Quốc",
  GB: "Anh (United Kingdom)",
  DE: "Đức",
  FR: "Pháp",
  IN: "Ấn Độ",
  CA: "Canada",
  AU: "Australia",
  SG: "Singapore",
  TH: "Thái Lan",
  ID: "Indonesia",
  MY: "Malaysia",
  PH: "Philippines"
};

const COLORS = ["#8E9BEE", "#FF8042", "#00C49F", "#FFBB28", "#8884d8", "#82ca9d", "#ffc658"];

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
    videoInsights,
    isVideoDetailLoading,
    isVideoInsightsLoading,
    videoInsightsError,
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
    activeBrand,
    isPlatformLocked,
    platformLockReason
  } = usePlatformDashboard(platform);

  const { openConnections } = useConnections();
  const navigate = useNavigate();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [detailSubTab, setDetailSubTab] = useState("overview");

  const hasRealAnalytics = useMemo(() => {
    return (videoAnalytics || []).some(d => (d.views > 0 || d.avgWatchTime > 0));
  }, [videoAnalytics]);

  const avgWatchTimeSeconds = useMemo(() => {
    if (!videoAnalytics || videoAnalytics.length === 0) return 0;
    let totalViews = 0;
    let totalWatchTime = 0;
    videoAnalytics.forEach(d => {
      if (d.views > 0) {
        totalViews += d.views;
        totalWatchTime += (d.avgWatchTime || 0) * d.views;
      }
    });
    return totalViews > 0 ? (totalWatchTime / totalViews) : 0;
  }, [videoAnalytics]);

  const formattedAvgWatchTime = useMemo(() => {
    if (!hasRealAnalytics || avgWatchTimeSeconds === 0) return "—";
    if (avgWatchTimeSeconds < 60) return `${Math.round(avgWatchTimeSeconds)}s`;
    const mins = Math.floor(avgWatchTimeSeconds / 60);
    const secs = Math.round(avgWatchTimeSeconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }, [hasRealAnalytics, avgWatchTimeSeconds]);

  const tabs = platform === "instagram" ? IG_TABS : platform === "facebook" ? FB_TABS : platform === "tiktok" ? TT_TABS : platform === "discord" ? DISCORD_TABS : platform === "threads" ? THREADS_TABS : YT_TABS;


  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      prevTabRef.current = activeTab;
      setSelectedVideo(null);
    }
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
        <div className="sticky top-0 z-20 bg-white flex items-center justify-between px-6 border-b border-gray-100" style={{ height: 48 }}>
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
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 border-b border-gray-100" style={{ height: 48 }}>
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
             onClick={() => !isPlatformLocked && handleRefresh()}
             disabled={isRefreshing || isPlatformLocked}
             className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
             title={isPlatformLocked ? "Không thể đồng bộ dữ liệu vì nền tảng đang bị khóa" : "Làm mới dữ liệu (Đồng bộ từ API)"}
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
                  {metrics.syncStatus === "FAILED" && "Quá trình đồng bộ dữ liệu gặp lỗi hoặc token đã hết hạn. Vui lòng bấm nút Làm mới hoặc kết nối lại tài khoản."}
                </p>
              </div>
            </div>
            {metrics.syncStatus === "FAILED" && (
              <button 
                onClick={() => handleRefresh()}
                disabled={isRefreshing}
                className="px-4 py-2 bg-red-900 text-white rounded-xl text-xs font-bold hover:bg-red-950 transition-all shadow-md flex items-center gap-2"
              >
                {isRefreshing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><polyline points="21 3 21 8 16 8"/></svg>
                )}
                Đồng bộ lại
              </button>
            )}
          </div>
        )}

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
                      color: "bg-[#A7F3D0] text-gray-900",
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
                        color: "bg-[#86EFAC] text-gray-900",
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
              selectedVideo ? (
                <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                  {/* Inline header with Back button */}
                  <div className="bg-[#2D1D35] p-6 text-white relative">
                     <div className="flex gap-4 items-center">
                        <button 
                          onClick={() => {
                            setSelectedVideo(null);
                            setDetailSubTab("overview");
                          }} 
                          className="p-2 hover:bg-white/10 rounded-full transition-colors mr-2 cursor-pointer flex items-center justify-center shrink-0 border-none"
                          title="Quay lại danh sách"
                        >
                           <ArrowLeft size={20} />
                        </button>
                        <img src={selectedVideo.thumbnailUrl} className="w-32 h-20 rounded-xl object-cover border border-white/10 shrink-0" />
                        <div className="flex-1 min-w-0">
                           <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#D9F99D]/20 text-[#D9F99D] mb-1.5 uppercase tracking-wider">
                             YouTube Video
                           </span>
                           <h3 className="text-base font-bold line-clamp-2 leading-snug">{selectedVideo.title}</h3>
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

                  {/* Sub-tab selection */}
                  <div className="bg-white border-b border-gray-100 px-6 flex justify-between items-center shrink-0">
                    <div className="flex gap-6">
                      {[
                        { id: "overview", label: "Tổng quan", icon: <BarChart2 size={13} /> },
                        { id: "traffic", label: "Nguồn lưu lượng", icon: <ArrowUpRight size={13} /> },
                        { id: "devices", label: "Thiết bị", icon: <Smartphone size={13} /> },
                        { id: "audience", label: "Khán giả", icon: <Users size={13} /> },
                        { id: "geography", label: "Quốc gia", icon: <MapPin size={13} /> },
                        { id: "search", label: "Từ khóa tìm kiếm", icon: <Search size={13} /> }
                      ].map(subTab => (
                        <button
                          key={subTab.id}
                          onClick={() => setDetailSubTab(subTab.id)}
                          className={`py-3 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                            detailSubTab === subTab.id
                              ? "border-black text-black"
                              : "border-transparent text-gray-400 hover:text-black"
                          }`}
                        >
                          {subTab.icon}
                          {subTab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tab Body */}
                  <div className="p-8 space-y-6 bg-[#F8F8F7] min-h-[500px]">
                    {/* Render Loader / Error / Empty states */}
                    {(isVideoDetailLoading || isVideoInsightsLoading) ? (
                      /* Skeleton Loading */
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
                          {[1, 2, 3].map((n) => (
                            <div key={n} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[96px]">
                              <div className="w-16 h-3 bg-gray-100 rounded" />
                              <div className="w-24 h-6 bg-gray-100 rounded mt-2" />
                            </div>
                          ))}
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm animate-pulse space-y-4">
                          <div className="w-1/3 h-4 bg-gray-100 rounded-lg" />
                          <div className="w-full h-[240px] bg-gray-50 rounded-2xl" />
                        </div>
                      </div>
                    ) : videoInsightsError ? (
                      /* Error State */
                      <div className="flex flex-col items-center justify-center p-12 bg-red-50/50 rounded-3xl border border-dashed border-red-200 text-center max-w-md mx-auto my-12">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3">
                          <Info size={24} />
                        </div>
                        <h4 className="text-sm font-bold text-red-950">Lỗi tải dữ liệu</h4>
                        <p className="text-xs text-red-700 mt-1">{videoInsightsError}</p>
                      </div>
                    ) : (
                      /* Data State */
                      <>
                        {detailSubTab === "overview" && (
                          <div className="space-y-6 animate-in fade-in duration-200">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group hover:border-gray-200 transition-all">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Thời lượng xem</span>
                                <span className="text-xl font-black text-black mt-2">
                                  {videoInsights?.summary?.totalWatchHrs !== undefined && videoInsights?.summary?.totalWatchHrs !== null
                                    ? `${parseFloat(videoInsights.summary.totalWatchHrs.toFixed(2))}h` 
                                    : "—"}
                                </span>
                                <div className="absolute right-3 bottom-3 text-blue-100 group-hover:text-blue-500 transition-colors">
                                  <Clock size={20} />
                                </div>
                              </div>
                              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group hover:border-gray-200 transition-all">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tỷ lệ xem TB</span>
                                <span className="text-xl font-black text-black mt-2">
                                  {videoInsights?.summary?.avgViewPercentage !== undefined && videoInsights?.summary?.avgViewPercentage !== null
                                    ? `${videoInsights.summary.avgViewPercentage}%`
                                    : "—"}
                                </span>
                                <div className="absolute right-3 bottom-3 text-green-100 group-hover:text-green-500 transition-colors">
                                  <ArrowUpRight size={20} />
                                </div>
                              </div>
                              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group hover:border-gray-200 transition-all">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lượng đăng ký Net</span>
                                <span className="text-xl font-black text-[#4D7C0F] mt-2">
                                  {videoInsights?.summary?.subscribersNet !== undefined && videoInsights?.summary?.subscribersNet !== null
                                    ? (videoInsights.summary.subscribersNet >= 0 
                                        ? `+${videoInsights.summary.subscribersNet}` 
                                        : `${videoInsights.summary.subscribersNet}`)
                                    : "—"}
                                </span>
                                <div className="absolute right-3 bottom-3 text-lime-100 group-hover:text-lime-500 transition-colors">
                                  <PlayCircle size={20} />
                                </div>
                              </div>
                            </div>

                            {/* View Growth Chart */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                              <div className="flex justify-between items-center mb-6">
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
                              {(!videoAnalytics || videoAnalytics.length === 0 || !hasRealAnalytics) ? (
                                <div className="h-[240px] flex flex-col items-center justify-center text-center p-6 bg-amber-50/40 rounded-3xl border border-dashed border-amber-200/80 max-w-sm mx-auto">
                                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-2">
                                    <Info size={16} />
                                  </div>
                                  <h4 className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Chưa có dữ liệu thống kê chi tiết</h4>
                                  <p className="text-[10px] text-amber-700/90 mt-1 max-w-xs leading-relaxed">
                                    Thống kê lịch sử của YouTube thường có độ trễ từ 24 đến 72 giờ kể từ lúc xuất bản.
                                  </p>
                                </div>
                              ) : (
                                <div className="h-[240px] w-full">
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
                          </div>
                        )}

                        {detailSubTab === "traffic" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
                            {/* Traffic Pie Chart */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Nguồn lưu lượng (%)</h4>
                              {(!videoInsights?.trafficSource || videoInsights.trafficSource.length === 0) ? (
                                <div className="h-[240px] flex items-center justify-center text-xs text-gray-400">Không có dữ liệu</div>
                              ) : (
                                <div className="h-[240px] w-full flex items-center justify-center">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
                                        data={videoInsights.trafficSource}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="views"
                                        nameKey="label"
                                      >
                                        {videoInsights.trafficSource.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                        ))}
                                      </Pie>
                                      <Tooltip formatter={(value) => [value.toLocaleString(), 'Views']} />
                                      <Legend iconSize={10} layout="vertical" align="right" verticalAlign="middle" />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                            </div>

                            {/* Traffic Table */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Chi tiết nguồn lưu lượng</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="border-b border-gray-100 font-bold text-gray-400">
                                      <th className="py-2.5">Nguồn</th>
                                      <th className="py-2.5 text-right">Lượt xem</th>
                                      <th className="py-2.5 text-right">Tỷ lệ</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {videoInsights?.trafficSource?.map((src, idx) => (
                                      <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="py-2.5 font-semibold text-gray-800 flex items-center gap-2">
                                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: src.color || COLORS[idx % COLORS.length] }} />
                                          {src.label}
                                        </td>
                                        <td className="py-2.5 text-right font-medium text-gray-900">{src.views.toLocaleString()}</td>
                                        <td className="py-2.5 text-right text-gray-500 font-bold">{src.pct}%</td>
                                      </tr>
                                    )) || (
                                      <tr>
                                        <td colSpan={3} className="py-4 text-center text-gray-400">Không có dữ liệu</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}

                        {detailSubTab === "devices" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
                            {/* Device Types Chart */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Thiết bị người xem</h4>
                              {(!videoInsights?.deviceType || videoInsights.deviceType.length === 0) ? (
                                <div className="h-[240px] flex items-center justify-center text-xs text-gray-400">Không có dữ liệu</div>
                              ) : (
                                <div className="h-[240px] w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={videoInsights.deviceType}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                                      <YAxis tick={{ fontSize: 10 }} />
                                      <Tooltip formatter={(value) => [value.toLocaleString(), 'Thời gian xem (phút)']} />
                                      <Bar dataKey="watchMinutes" name="Thời gian xem" fill="#8D8DF1" radius={[8, 8, 0, 0]}>
                                        {videoInsights.deviceType.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                        ))}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                            </div>

                            {/* Device Types Table */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Chi tiết thiết bị</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="border-b border-gray-100 font-bold text-gray-400">
                                      <th className="py-2.5">Thiết bị</th>
                                      <th className="py-2.5 text-right">Thời gian xem (phút)</th>
                                      <th className="py-2.5 text-right">Tỷ lệ</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {videoInsights?.deviceType?.map((dev, idx) => (
                                      <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="py-2.5 font-semibold text-gray-800 flex items-center gap-2">
                                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dev.color || COLORS[idx % COLORS.length] }} />
                                          {dev.label}
                                        </td>
                                        <td className="py-2.5 text-right font-medium text-gray-900">{dev.watchMinutes.toLocaleString()}</td>
                                        <td className="py-2.5 text-right text-gray-500 font-bold">{dev.pct}%</td>
                                      </tr>
                                    )) || (
                                      <tr>
                                        <td colSpan={3} className="py-4 text-center text-gray-400">Không có dữ liệu</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}

                        {detailSubTab === "audience" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
                            {/* Gender Distribution */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Phân bố Giới tính</h4>
                              {(!videoInsights?.demographics?.gender || videoInsights.demographics.gender.length === 0) ? (
                                <div className="h-[240px] flex items-center justify-center text-xs text-gray-400">Không có dữ liệu</div>
                              ) : (
                                <div className="h-[240px] w-full flex items-center justify-center">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
                                        data={videoInsights.demographics.gender}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="pct"
                                        nameKey="label"
                                      >
                                        {videoInsights.demographics.gender.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color || (entry.gender === 'FEMALE' ? '#ff7300' : '#387908')} />
                                        ))}
                                      </Pie>
                                      <Tooltip formatter={(value) => [`${value}%`, 'Tỷ lệ']} />
                                      <Legend iconSize={10} layout="horizontal" align="center" verticalAlign="bottom" />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                            </div>

                            {/* Age Distribution */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Phân bố Độ tuổi</h4>
                              {(!videoInsights?.demographics?.age || videoInsights.demographics.age.length === 0) ? (
                                <div className="h-[240px] flex items-center justify-center text-xs text-gray-400">Không có dữ liệu</div>
                              ) : (
                                <div className="h-[240px] w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={videoInsights.demographics.age}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                                      <YAxis unit="%" tick={{ fontSize: 10 }} />
                                      <Tooltip formatter={(value) => [`${value}%`, 'Tỷ lệ']} />
                                      <Bar dataKey="pct" name="Tỷ lệ" fill="#8884d8" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {detailSubTab === "geography" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
                            {/* Geography Chart */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Quốc gia xem nhiều nhất</h4>
                              {(!videoInsights?.geography || videoInsights.geography.length === 0) ? (
                                <div className="h-[280px] flex items-center justify-center text-xs text-gray-400">Không có dữ liệu</div>
                              ) : (
                                <div className="h-[280px] w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                      data={videoInsights.geography}
                                      layout="vertical"
                                      margin={{ left: 20, right: 20 }}
                                    >
                                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                                      <XAxis type="number" tick={{ fontSize: 10 }} />
                                      <YAxis dataKey="countryName" type="category" tick={{ fontSize: 10 }} width={80} />
                                      <Tooltip formatter={(value) => [value.toLocaleString(), 'Lượt xem']} />
                                      <Bar dataKey="views" name="Lượt xem" fill="#7C3AED" radius={[0, 8, 8, 0]} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                            </div>

                            {/* Geography Table */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Chi tiết quốc gia</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="border-b border-gray-100 font-bold text-gray-400">
                                      <th className="py-2.5">Quốc gia</th>
                                      <th className="py-2.5 text-right">Lượt xem</th>
                                      <th className="py-2.5 text-right">Tỷ lệ</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {videoInsights?.geography?.map((geo, idx) => (
                                      <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="py-2.5 font-semibold text-gray-800 flex items-center gap-2">
                                          <span className="text-base shrink-0">{geo.flag}</span>
                                          {geo.countryName}
                                        </td>
                                        <td className="py-2.5 text-right font-medium text-gray-900">{geo.views.toLocaleString()}</td>
                                        <td className="py-2.5 text-right text-gray-500 font-bold">{geo.pct}%</td>
                                      </tr>
                                    )) || (
                                      <tr>
                                        <td colSpan={3} className="py-4 text-center text-gray-400">Không có dữ liệu</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}

                        {detailSubTab === "search" && (
                          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm animate-in fade-in duration-200">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Từ khóa tìm kiếm dẫn đến video</h4>
                            {(!videoInsights?.searchTerms || videoInsights.searchTerms.length === 0) ? (
                              <div className="h-[240px] flex items-center justify-center text-xs text-gray-400">Không có từ khóa nào được ghi nhận</div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="border-b border-gray-100 font-bold text-gray-400">
                                      <th className="py-2.5">Từ khóa</th>
                                      <th className="py-2.5 text-right">Lượt xem</th>
                                      <th className="py-2.5 text-right">Tỷ lệ {videoInsights.searchTerms[0]?.pctLabel || ''}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {videoInsights.searchTerms.map((st, idx) => (
                                      <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="py-2.5 font-semibold text-gray-800">"{st.term}"</td>
                                        <td className="py-2.5 text-right font-medium text-gray-900">{st.views.toLocaleString()}</td>
                                        <td className="py-2.5 text-right text-gray-500 font-bold">{st.pct}%</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
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

      {platform !== "youtube" && selectedVideo && (
        <PostAnalyticsDetailModal
          isOpen={isVideoDetailModalOpen}
          onClose={() => {
            setSelectedVideo(null);
            setIsVideoDetailModalOpen(false);
          }}
          post={selectedVideo}
          brandId={activeBrand?.id}
        />
      )}
    </div>
  );
}
