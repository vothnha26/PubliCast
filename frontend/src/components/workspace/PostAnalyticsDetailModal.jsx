import React, { useState, useEffect } from "react";
import { 
  X, BarChart2, Users, Heart, MessageCircle, Share2, 
  Bookmark, Eye, RefreshCw, AlertCircle, ArrowUpRight, TrendingUp, Search, Info
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart as ReChartsBarChart, Bar, Legend
} from "recharts";
import { PlatformIcon } from "../shared/PlatformIcon";
import { format } from "date-fns";
import socialService from "../../services/social.service";
import postService from "../../services/post.service";

export function PostAnalyticsDetailModal({ isOpen, onClose, post, brandId }) {
  const [activeTab, setActiveTab] = useState("overview"); // overview, traffic, audience
  const [activePlatform, setActivePlatform] = useState("");
  const [ytAnalytics, setYtAnalytics] = useState(null);
  const [loadingYt, setLoadingYt] = useState(false);

  // TikTok / General history metrics
  const [historyAnalytics, setHistoryAnalytics] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Get available platforms for this post
  const platforms = post?.platforms || [];

  // Set initial active platform
  useEffect(() => {
    if (platforms.length > 0) {
      setActivePlatform(platforms[0]);
    }
  }, [post, isOpen]);

  // Fetch YouTube analytics if the active platform is YouTube
  useEffect(() => {
    if (!isOpen || !post || activePlatform.toLowerCase() !== "youtube") {
      setYtAnalytics(null);
      return;
    }

    const fetchYt = async () => {
      setLoadingYt(true);
      try {
        let ytVideoId = null;
        if (post.platformPostId) {
          if (typeof post.platformPostId === 'object') {
            ytVideoId = post.platformPostId.youtube || post.platformPostId.YOUTUBE;
          } else {
            try {
              const parsed = JSON.parse(post.platformPostId);
              ytVideoId = parsed.youtube || parsed.YOUTUBE;
            } catch (e) {
              ytVideoId = post.platformPostId;
            }
          }
        }

        if (ytVideoId) {
          const res = await socialService.getVideoAnalytics(brandId, ytVideoId);
          if (res && res.data && res.data.length > 0) {
            setYtAnalytics(res.data);
          }
        }
      } catch (err) {
        console.error("Failed to load YouTube video analytics:", err);
      } finally {
        setLoadingYt(false);
      }
    };

    fetchYt();
  }, [activePlatform, post, isOpen, brandId]);

  // Fetch general platform history metrics (e.g. TikTok)
  useEffect(() => {
    if (!isOpen || !post || activePlatform.toLowerCase() !== "tiktok") {
      setHistoryAnalytics(null);
      return;
    }

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await postService.getPostAnalytics(brandId, post.id);
        if (res && res.data) {
          setHistoryAnalytics(res.data);
        }
      } catch (err) {
        console.error("Failed to load post metrics history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [activePlatform, post, isOpen, brandId]);

  if (!isOpen || !post) return null;

  const isYouTube = activePlatform.toLowerCase() === "youtube";
  const isTikTok = activePlatform.toLowerCase() === "tiktok";
  const isSupported = isYouTube || isTikTok;

  // ── YouTube Metrics Aggregation ──────────────────────────────────────────
  const ytTotalViews = ytAnalytics ? ytAnalytics.reduce((sum, d) => sum + (d.views || 0), 0) : null;
  const ytTotalWatchTimeMin = ytAnalytics ? ytAnalytics.reduce((sum, d) => sum + (d.estimatedMinutesWatched || 0), 0) : null;
  const ytAvgViewDuration = ytAnalytics ? ytAnalytics.reduce((sum, d) => sum + (d.averageViewDuration || 0), 0) / Math.max(ytAnalytics.length, 1) : null;
  const ytAvgViewPct = ytAnalytics ? ytAnalytics.reduce((sum, d) => sum + (d.averageViewPercentage || 0), 0) / Math.max(ytAnalytics.length, 1) : null;

  const retentionData = ytAnalytics && ytAnalytics.length > 0
    ? ytAnalytics.map((d, i) => ({ second: d.date || `Day ${i + 1}`, percentage: d.averageViewPercentage || 0 }))
    : [];

  // ── TikTok Metrics Extraction ─────────────────────────────────────────────
  const latestTikTokSnapshot = historyAnalytics && historyAnalytics.length > 0
    ? historyAnalytics[historyAnalytics.length - 1]
    : null;

  const tiktokTotalViews = latestTikTokSnapshot ? latestTikTokSnapshot.views : 0;
  const tiktokTotalLikes = latestTikTokSnapshot ? latestTikTokSnapshot.likes : 0;
  const tiktokTotalComments = latestTikTokSnapshot ? latestTikTokSnapshot.comments : 0;
  const tiktokTotalShares = latestTikTokSnapshot ? latestTikTokSnapshot.shares : 0;

  // Build growth chart data for TikTok (Hourly growth/increments)
  const tiktokChartData = historyAnalytics
    ? historyAnalytics.map((d, index) => {
        const prev = historyAnalytics[index - 1];
        const hourlyViews = prev ? Math.max(0, d.views - prev.views) : d.views;
        const hourlyLikes = prev ? Math.max(0, d.likes - prev.likes) : d.likes;
        const hourlyComments = prev ? Math.max(0, d.comments - prev.comments) : d.comments;
        const hourlyShares = prev ? Math.max(0, d.shares - prev.shares) : d.shares;
        return {
          time: format(new Date(d.timestamp), "HH:mm dd/MM"),
          views: hourlyViews,
          cumulativeViews: d.views,
          likes: hourlyLikes,
          comments: hourlyComments,
          shares: hourlyShares
        };
      })
    : [];

  const formatWatchTime = (minutes) => {
    if (!minutes && minutes !== 0) return "—";
    const hrs = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const isLoading = isYouTube ? loadingYt : loadingHistory;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Block */}
        <div className="bg-[#2D1D35] text-white p-6 relative shrink-0">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#D9F99D]/10 rounded-full -mr-20 -mt-20 blur-3xl" />
          
          <div className="flex items-start justify-between relative z-10">
            <div className="flex gap-4 items-center">
              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-lg relative bg-black flex items-center justify-center">
                {post.thumbnail ? (
                  <img src={post.thumbnail} className="w-full h-full object-cover" alt="Post thumbnail" />
                ) : (
                  <span className="text-2xl">📝</span>
                )}
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D9F99D]/20 text-[#D9F99D] mb-1.5 uppercase tracking-wider">
                  Đã đăng
                </span>
                <h3 className="text-base font-black line-clamp-1 leading-snug tracking-tight pr-4">
                  {post.title || "Bài viết không có tiêu đề"}
                </h3>
                <p className="text-[11px] text-gray-400 mt-1 line-clamp-1 max-w-xl">
                  {post.caption || "Không có nội dung chi tiết..."}
                </p>
                <div className="text-[10px] text-gray-400 mt-1">
                  Đăng lúc: {post.scheduledAt ? format(new Date(post.scheduledAt), "HH:mm, dd/MM/yyyy") : "Vừa xong"}
                </div>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Platform Tabs inside Header */}
          {platforms.length > 1 && (
            <div className="flex gap-2 mt-4 relative z-10 border-t border-white/5 pt-3">
              {platforms.map(plt => (
                <button
                  key={plt}
                  onClick={() => setActivePlatform(plt)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                    activePlatform === plt
                      ? "bg-white text-black border-white"
                      : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  <PlatformIcon platform={plt} size={12} />
                  {plt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div className="bg-white border-b border-gray-100 px-6 flex justify-between items-center shrink-0">
          <div className="flex gap-6">
            {[
              { id: "overview", label: "Tổng quan", icon: <BarChart2 size={13} /> },
              { id: "traffic", label: "Tương tác chi tiết", icon: <ArrowUpRight size={13} /> },
              { id: "audience", label: "Người xem", icon: <Users size={13} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "border-black text-black"
                    : "border-transparent text-gray-400 hover:text-black"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Được cập nhật tự động
          </div>
        </div>

        {/* Body Content - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-[#F8F8F7] p-6 space-y-6">
          
          {isLoading ? (
            <div className="w-full h-64 flex items-center justify-center gap-3">
              <RefreshCw className="animate-spin text-gray-300" size={20} />
              <span className="text-xs text-gray-500 font-bold">Đang tải dữ liệu số liệu...</span>
            </div>
          ) : !isSupported ? (
            /* Unsupported platform notice */
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                <BarChart2 size={32} className="text-gray-300" />
              </div>
              <div className="text-center space-y-1.5 max-w-sm">
                <h4 className="text-sm font-black text-gray-700">Chưa hỗ trợ phân tích chi tiết</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Hiện tại phân tích số liệu chi tiết cấp bài viết hỗ trợ cho <strong>YouTube</strong> và <strong>TikTok</strong>. 
                  Các nền tảng khác ({activePlatform}) chưa được đồng bộ số liệu chi tiết.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  
                  {/* Grid Statistics */}
                  {isYouTube ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group hover:border-gray-200 transition-all">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lượt xem</span>
                        <span className="text-2xl font-black text-black mt-2">
                          {ytTotalViews !== null ? ytTotalViews.toLocaleString() : "—"}
                        </span>
                        <div className="absolute right-3 bottom-3 text-blue-100 group-hover:text-blue-500 transition-colors">
                          <Eye size={20} />
                        </div>
                      </div>
                      
                      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group hover:border-gray-200 transition-all">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Thời gian xem</span>
                        <span className="text-2xl font-black text-black mt-2">
                          {ytTotalWatchTimeMin !== null ? formatWatchTime(ytTotalWatchTimeMin) : "—"}
                        </span>
                        <div className="absolute right-3 bottom-3 text-green-100 group-hover:text-green-500 transition-colors">
                          <TrendingUp size={20} />
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group hover:border-gray-200 transition-all">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Xem TB (giây)</span>
                        <span className="text-2xl font-black text-black mt-2">
                          {ytAvgViewDuration !== null ? `${Math.round(ytAvgViewDuration)}s` : "—"}
                        </span>
                        <div className="absolute right-3 bottom-3 text-purple-100 group-hover:text-purple-500 transition-colors">
                          <BarChart2 size={20} />
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group hover:border-gray-200 transition-all">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">% Xem TB</span>
                        <span className="text-2xl font-black text-black mt-2">
                          {ytAvgViewPct !== null ? `${ytAvgViewPct.toFixed(1)}%` : "—"}
                        </span>
                        <div className="absolute right-3 bottom-3 text-amber-100 group-hover:text-amber-500 transition-colors">
                          <Bookmark size={20} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* TikTok Overview Metrics */
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group hover:border-gray-200 transition-all">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lượt xem</span>
                        <span className="text-2xl font-black text-black mt-2">
                          {tiktokTotalViews.toLocaleString()}
                        </span>
                        <div className="absolute right-3 bottom-3 text-blue-100 group-hover:text-blue-500 transition-colors">
                          <Eye size={20} />
                        </div>
                      </div>
                      
                      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group hover:border-gray-200 transition-all">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lượt thích</span>
                        <span className="text-2xl font-black text-black mt-2">
                          {tiktokTotalLikes.toLocaleString()}
                        </span>
                        <div className="absolute right-3 bottom-3 text-rose-100 group-hover:text-rose-500 transition-colors">
                          <Heart size={20} />
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group hover:border-gray-200 transition-all">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bình luận</span>
                        <span className="text-2xl font-black text-black mt-2">
                          {tiktokTotalComments.toLocaleString()}
                        </span>
                        <div className="absolute right-3 bottom-3 text-purple-100 group-hover:text-purple-500 transition-colors">
                          <MessageCircle size={20} />
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group hover:border-gray-200 transition-all">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chia sẻ</span>
                        <span className="text-2xl font-black text-black mt-2">
                          {tiktokTotalShares.toLocaleString()}
                        </span>
                        <div className="absolute right-3 bottom-3 text-green-100 group-hover:text-green-500 transition-colors">
                          <Share2 size={20} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Views Chart */}
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                          {isYouTube ? "Tỷ lệ xem trung bình theo ngày" : "Tăng trưởng lượt xem video"}
                        </h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {isYouTube 
                            ? "Phần trăm thời lượng video xem trung bình mỗi ngày" 
                            : "Biểu đồ thể hiện lượt xem tăng thêm qua từng khung giờ"}
                        </p>
                      </div>
                    </div>

                    {isYouTube ? (
                      retentionData.length > 0 ? (
                        <div className="h-[260px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={retentionData}>
                              <defs>
                                <linearGradient id="retentionColor" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#8E9BEE" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#8E9BEE" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="0" vertical={false} stroke="#F3F4F6" />
                              <XAxis dataKey="second" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                              <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Xem TB']} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                              <Area type="monotone" dataKey="percentage" stroke="#8E9BEE" strokeWidth={3} fillOpacity={1} fill="url(#retentionColor)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-40 flex items-center justify-center text-xs text-gray-400">
                          Chưa có đủ dữ liệu để hiển thị biểu đồ.
                        </div>
                      )
                    ) : (
                      /* TikTok Views Chart */
                      tiktokChartData.length > 0 ? (
                        <div className="h-[260px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={tiktokChartData}>
                              <defs>
                                <linearGradient id="tiktokViewsColor" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#4facfe" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                              <Tooltip formatter={(value) => [value.toLocaleString(), 'Lượt xem mới']} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                              <Area type="monotone" dataKey="views" stroke="#00f2fe" strokeWidth={3} fillOpacity={1} fill="url(#tiktokViewsColor)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-40 flex items-center justify-center text-xs text-gray-400">
                          Chưa có đủ dữ liệu lịch sử để hiển thị biểu đồ. Hệ thống đang tiến hành thu thập số liệu.
                        </div>
                      )
                    )}
                  </div>

                  {isYouTube && ytAnalytics && ytAnalytics.length === 0 && (
                    <div className="flex items-start gap-2.5 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-700 leading-normal">
                        Dữ liệu YouTube Analytics thường mất 24–72 giờ để cập nhật sau khi video được đăng.
                      </p>
                    </div>
                  )}

                  {isTikTok && (!historyAnalytics || historyAnalytics.length === 0) && (
                    <div className="flex items-start gap-2.5 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-blue-700 leading-normal">
                        Hệ thống PubliCast đang theo dõi bài viết này. Dữ liệu lịch sử sẽ tự động được cập nhật sau mỗi 1 giờ kể từ khi xuất bản.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: TRAFFIC */}
              {activeTab === "traffic" && (
                isYouTube ? (
                  <div className="flex flex-col items-center justify-center h-52 gap-3">
                    <Info size={28} className="text-gray-300" />
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-500">Nguồn lưu lượng</p>
                      <p className="text-[11px] text-gray-400 mt-1">API YouTube Analytics cấp bài viết chưa hỗ trợ phân tách nguồn lưu lượng.</p>
                    </div>
                  </div>
                ) : (
                  /* TikTok Engagement Growth Details */
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">
                        Tương tác chi tiết theo thời gian (Thích, Bình luận, Chia sẻ)
                      </h4>
                      {tiktokChartData.length > 0 ? (
                        <div className="h-[280px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={tiktokChartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                              <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                              <Legend verticalAlign="top" height={36} iconType="circle" />
                              <Area type="monotone" name="Thích" dataKey="likes" stroke="#f43f5e" strokeWidth={2} fill="#f43f5e" fillOpacity={0.05} />
                              <Area type="monotone" name="Bình luận" dataKey="comments" stroke="#a855f7" strokeWidth={2} fill="#a855f7" fillOpacity={0.05} />
                              <Area type="monotone" name="Chia sẻ" dataKey="shares" stroke="#22c55e" strokeWidth={2} fill="#22c55e" fillOpacity={0.05} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-40 flex items-center justify-center text-xs text-gray-400">
                          Chưa có đủ dữ liệu lịch sử tương tác để hiển thị.
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}

              {/* TAB 3: AUDIENCE */}
              {activeTab === "audience" && (
                isYouTube ? (
                  <div className="flex flex-col items-center justify-center h-52 gap-3">
                    <Users size={28} className="text-gray-300" />
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-500">Nhân khẩu học người xem</p>
                      <p className="text-[11px] text-gray-400 mt-1">Dữ liệu audience per-video chưa được hỗ trợ. Vui lòng xem tab Demographics trên YouTube Dashboard.</p>
                    </div>
                  </div>
                ) : (
                  /* TikTok Demographics */
                  <div className="flex flex-col items-center justify-center h-52 gap-3 bg-white rounded-3xl border border-gray-100 p-6">
                    <Users size={28} className="text-gray-300" />
                    <div className="text-center space-y-1.5">
                      <p className="text-xs font-black text-gray-700 uppercase tracking-wider">Thông tin người xem TikTok</p>
                      <p className="text-[11px] text-gray-400 max-w-md">
                        Số liệu nhân khẩu học người xem (độ tuổi, giới tính, quốc gia) cấp độ bài viết đơn lẻ chưa được hỗ trợ thông qua API TikTok. 
                        Bạn có thể xem chi tiết tại công cụ phân tích của TikTok Creator Studio trên điện thoại hoặc web.
                      </p>
                    </div>
                  </div>
                )
              )}
            </>
          )}

        </div>

        {/* Footer Actions */}
        <div className="bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-[11px] font-black uppercase tracking-wider text-gray-500 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
