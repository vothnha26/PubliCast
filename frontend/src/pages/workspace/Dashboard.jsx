import { useNavigate, useLocation } from "react-router-dom";
import { TrendingUp, FileText, CheckCircle2, Clock, AlertCircle, AlertTriangle, Plus, ChevronRight, Share2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { enUS, vi } from "date-fns/locale";
import { 
  XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid 
} from "recharts";

import { PlatformIcon } from "../../components/shared/PlatformIcon";
import { StatCard } from "../../components/shared/StatCard";
import { PostingGoalWidget } from "../../components/shared/PostingGoalWidget";
import { StreakStatCard } from "../../components/shared/StreakStatCard";
import { useBrand } from "../../context/BrandContext";
import socialService from "../../services/social.service";
import postService from "../../services/post.service";
import { POST_STATUS } from "../../constants/postStatus";
import { useTranslation } from "react-i18next";
import { usePostCreator } from "../../context/PostCreatorContext";

const PLATFORM_COLORS = {
  YouTube: "#FF0000",
  Facebook: "#1877F2",
  TikTok: "#010101",
  Instagram: "#E1306C",
  Threads: "#000000",
  Bluesky: "#0085FF",
  Twitch: "#9146FF",
  X: "#000000"
};

// Cấu hình nhãn tiếng Việt, màu sắc, icon cho từng trạng thái bài viết (tránh magic strings)
const STATUS_CONFIG = {
  [POST_STATUS.DRAFT]: {
    label: "Bản nháp",
    colorClass: "bg-muted text-foreground border-border",
    icon: <FileText size={12} className="text-muted-foreground" />
  },
  [POST_STATUS.PUBLISHED]: {
    label: "Đã đăng",
    colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 size={12} className="text-emerald-600" />
  },
  [POST_STATUS.SCHEDULED]: {
    label: "Đã lên lịch",
    colorClass: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <Clock size={12} className="text-blue-600" />
  },
  [POST_STATUS.PENDING_APPROVAL]: {
    label: "Chờ duyệt",
    colorClass: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <AlertCircle size={12} className="text-amber-600" />
  },
  [POST_STATUS.FAILED]: {
    label: "Thất bại",
    colorClass: "bg-rose-50 text-rose-700 border-rose-200",
    icon: <AlertTriangle size={12} className="text-rose-600" />
  }
};

const BRAND_PLATFORMS = [
  { name: "YouTube", apiKey: "YOUTUBE", label: "YouTube" },
  { name: "Facebook", apiKey: "FACEBOOK", label: "Facebook" },
  { name: "Instagram", apiKey: "INSTAGRAM", label: "Instagram" },
  { name: "TikTok", apiKey: "TIKTOK", label: "TikTok" },
  { name: "Threads", apiKey: "THREADS", label: "Threads" },
  { name: "Bluesky", apiKey: "BLUESKY", label: "Bluesky" }
];

// Strategy pattern for extracting metrics per platform to ensure SOLID OCP Compliance
const PLATFORM_METRICS_STRATEGIES = {
  YOUTUBE: {
    getSubscribers: (m) => m.youtubeChannel?.subscribersCount || 0,
    getViews: (m) => m.youtubeChannel?.totalViewsCount || 0,
    getVideos: (m) => m.youtubeChannel?.totalVideosCount || 0,
  },
  FACEBOOK: {
    getSubscribers: (m) => m.facebookPage?.followersCount || 0,
    getViews: (m) => m.facebookPage?.likesCount || 0,
    getVideos: (m) => 0,
  },
  INSTAGRAM: {
    getSubscribers: (m) => m.instagramAccount?.followersCount || 0,
    getViews: (m) => 0,
    getVideos: (m) => m.instagramAccount?.mediaCount || 0,
  },
  THREADS: {
    getSubscribers: (m) => m.instagramAccount?.followersCount || 0,
    getViews: (m) => 0,
    getVideos: (m) => m.instagramAccount?.mediaCount || 0,
  },
  TIKTOK: {
    getSubscribers: (m) => m.tikTokAccount?.followersCount || 0,
    getViews: (m) => m.tikTokAccount?.likesCount || 0,
    getVideos: (m) => m.tikTokAccount?.videoCount || 0,
  },
  TELEGRAM: {
    getSubscribers: (m) => m.telegramAccount?.memberCount || 0,
    getViews: (m) => 0,
    getVideos: (m) => 0,
  }
};

export function DashboardPage() {
  const { t, i18n } = useTranslation(["dashboard", "common"]);
  const navigate = useNavigate();
  const location = useLocation();
  const [metrics, setMetrics] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { activeBrand } = useBrand();
  const { openPostCreator } = usePostCreator();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("success") === "google_login") {
      toast.success(t("toast.googleSuccess"));
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate, t]);

  // Một brand mới tạo có onboardingCompleted=false cho tới khi user hoàn tất
  // setup — đưa họ sang trang onboarding thay vì hiện Dashboard rỗng. Trang
  // /manage/workplace/new set cờ này true khi Finalize (qua updateBrand).
  // Dùng cờ thật thay vì so activeBrand.name === "New Workspace" — so tên
  // vỡ nếu user chọn đặt tên brand thật trùng đúng placeholder mặc định.
  useEffect(() => {
    if (activeBrand && !activeBrand.onboardingCompleted) {
      navigate("/manage/workplace/new", { replace: true });
    }
  }, [activeBrand, navigate]);

  useEffect(() => {
    const loadData = async () => {
      if (!activeBrand) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [metricsRes, postsRes] = await Promise.all([
          socialService.getMetrics(activeBrand.id),
          postService.getPosts(activeBrand.id, { limit: 5 })
        ]);
        setMetrics(metricsRes || []);
        setRecentPosts(postsRes || []);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [activeBrand]);

  const getAggregatedStats = () => {
    let totalSubscribers = 0;
    let totalViews = 0;
    let totalVideos = 0;

    metrics.forEach(m => {
      const strategy = PLATFORM_METRICS_STRATEGIES[m.platform];
      if (strategy) {
        totalSubscribers += strategy.getSubscribers(m);
        totalViews += strategy.getViews(m);
        totalVideos += strategy.getVideos(m);
      }
    });

    return { subscribers: totalSubscribers, views: totalViews, videos: totalVideos };
  };

  const stats = getAggregatedStats();

  // Most recent sync across every connected account — SocialAccount.lastSyncAt
  // is set whenever the background/force sync in social.service.js's
  // getAggregatedMetrics completes, so this reflects real sync state rather
  // than "page load time".
  const lastSyncedAt = metrics.reduce((latest, m) => {
    if (!m.lastSyncAt) return latest;
    const syncTime = new Date(m.lastSyncAt);
    return !latest || syncTime > latest ? syncTime : latest;
  }, null);

  const getViewersByPlatform = () => {
    const list = [
      { platform: "YouTube", key: "YOUTUBE" },
      { platform: "Facebook", key: "FACEBOOK" },
      { platform: "TikTok", key: "TIKTOK" },
      { platform: "Instagram", key: "INSTAGRAM" },
    ];

    const maxSubscribers = Math.max(...metrics.map(m => {
      const strategy = PLATFORM_METRICS_STRATEGIES[m.platform];
      return strategy ? strategy.getSubscribers(m) : 0;
    }), 1);

    return list.map(item => {
      const acc = metrics.find(m => m.platform === item.key);
      const strategy = PLATFORM_METRICS_STRATEGIES[item.key];
      const val = acc && strategy ? strategy.getSubscribers(acc) : 0;
      return {
        platform: item.platform,
        viewers: val,
        pct: Math.min((val / maxSubscribers) * 100, 100)
      };
    });
  };

  const viewersByPlatform = getViewersByPlatform();

  const getWeeklyData = () => {
    const dailyGrowth = {};

    metrics.forEach(m => {
      if (!m.analytics?.[0]?.socialAnalytics?.audienceDemographicsJson) return;
      try {
        const raw = JSON.parse(m.analytics[0].socialAnalytics.audienceDemographicsJson);
        const growthList = raw.growth || [];
        growthList.forEach(row => {
          let dateStr = "";
          let gained = 0;
          let lost = 0;

          if (typeof row === 'object' && !Array.isArray(row)) {
            dateStr = row.date;
            gained = row.subscribersGained || row.acquired || 0;
            lost = row.subscribersLost || row.lost || 0;
          } else if (Array.isArray(row) && row.length >= 4) {
            dateStr = row[0];
            gained = row[2] || 0;
            lost = row[3] || 0;
          }

          if (dateStr) {
            if (!dailyGrowth[dateStr]) {
              dailyGrowth[dateStr] = { gained: 0, lost: 0 };
            }
            dailyGrowth[dateStr].gained += gained;
            dailyGrowth[dateStr].lost += lost;
          }
        });
      } catch (e) {
        console.error("Failed to parse growth analytics for account", m.id, e);
      }
    });

    const sortedDates = Object.keys(dailyGrowth).sort();
    
    if (sortedDates.length === 0) {
      const days = i18n.language === 'vi' 
        ? ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] 
        : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return days.map((day, idx) => ({
        day,
        viewers: Math.round(stats.subscribers * (0.8 + (idx * 0.2 / 6)))
      }));
    }

    let currentSubscribers = stats.subscribers;
    const result = [];

    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const dateStr = sortedDates[i];
      const growth = dailyGrowth[dateStr];
      const netChange = growth.gained - growth.lost;
      
      const dateObj = new Date(dateStr);
      const dayLabel = dateObj.toLocaleDateString(t("common:langLocale"), { weekday: 'short' });
      
      result.unshift({
        day: dayLabel,
        date: dateStr,
        viewers: currentSubscribers
      });

      currentSubscribers = Math.max(0, currentSubscribers - netChange);
    }

    return result.slice(-7);
  };

  const weeklyData = getWeeklyData();

  if (loading) {
    return (
      <div
        className="flex-1 overflow-y-auto bg-background text-foreground animate-pulse p-6 flex flex-col gap-5"
      >
        {/* Stat Cards Row Skeleton */}
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="bg-card p-6 rounded-2xl border border-border shadow-sm h-[110px] space-y-3">
              <div className="w-20 h-3 bg-muted rounded" />
              <div className="w-28 h-6 bg-muted/80 rounded" />
            </div>
          ))}
        </div>

        {/* Weekly Viewers Chart Skeleton */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm h-[200px] space-y-4">
          <div className="flex justify-between">
            <div className="w-32 h-4 bg-muted rounded" />
            <div className="w-20 h-4 bg-muted rounded" />
          </div>
          <div className="w-full h-[120px] bg-muted/50 rounded-xl" />
        </div>

        {/* Two Column Skeleton */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-7 bg-card border border-border rounded-3xl p-6 shadow-sm h-[320px] space-y-4">
            <div className="flex justify-between">
              <div className="w-24 h-4 bg-muted/80 rounded" />
              <div className="w-16 h-4 bg-muted/80 rounded" />
            </div>
            {[1, 2, 3].map((n) => (
              <div key={n} className="border border-border rounded-2xl h-16 bg-muted/30" />
            ))}
          </div>

          <div className="col-span-5 flex flex-col gap-6">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm h-[200px] space-y-3">
              <div className="w-32 h-4 bg-muted rounded" />
              {[1, 2, 3].map((n) => (
                <div key={n} className="w-full h-4 bg-muted/50 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto font-sans bg-background text-foreground p-6 flex flex-col gap-5"
    >
      {/* Last synced indicator — reflects SocialAccount.lastSyncAt, not page load time */}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <RefreshCw size={11} />
        {lastSyncedAt
          ? t("charts.lastSynced", {
              time: formatDistanceToNow(lastSyncedAt, { addSuffix: true, locale: i18n.language === "vi" ? vi : enUS })
            })
          : t("charts.neverSynced")}
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard
          label={t("stats.totalFollowers")}
          value={stats.subscribers.toLocaleString()}
          delta={t("stats.realTime")}
          deltaColor="#16A34A"
        />
        <StatCard
          label={t("stats.totalViews")}
          value={stats.views.toLocaleString()}
          note={t("stats.youtubeNote")}
        />
        <StatCard
          label={t("stats.totalVideos")}
          value={stats.videos.toLocaleString()}
          note={t("stats.uploadedNote")}
        />
        <StatCard
          label={t("stats.currentBrand")}
          value={activeBrand?.name || t("stats.unknownBrand")}
          delta={t("stats.selectedDelta")}
          deltaColor="#16A34A"
        />
        {activeBrand && <StreakStatCard brandId={activeBrand.id} />}
      </div>

      {/* Weekly Viewers Chart */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
             <TrendingUp size={16} className="text-muted-foreground" />
             <span className="text-sm font-bold text-foreground uppercase tracking-wider">{t("charts.audienceTrend")}</span>
          </div>
          <span onClick={() => navigate("/analytics")} className="text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">{t("charts.viewDetails")}</span>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #E5E7EB)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground, #9CA3AF)", fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground, #9CA3AF)", fontWeight: 700 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "var(--card, #0A0A0A)", border: "1px solid var(--border, #333)", borderRadius: 12, fontSize: 11, color: "var(--foreground, #FFF)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
              cursor={{ stroke: "var(--border, #E5E7EB)" }}
            />
            <Line type="monotone" dataKey="viewers" stroke="var(--foreground, #0A0A0A)" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Two Column */}
      <div className="grid grid-cols-12 gap-6">
        {/* Recent Posts Queue (Cột trái) */}
        <div className="col-span-7 bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col gap-5 min-h-[350px]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground uppercase tracking-wider">{t("recentQueue.title")}</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => openPostCreator()}
                className="flex items-center gap-1 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 transition-colors px-3 py-1.5 rounded-lg border-none cursor-pointer"
              >
                <Plus size={13} />
                {t("recentQueue.createPost")}
              </button>
              <button
                onClick={() => navigate("/planner")}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline bg-transparent border-none cursor-pointer"
              >
                {t("recentQueue.scheduleLink")}
              </button>
            </div>
          </div>

          {recentPosts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-2xl bg-muted/50">
              <FileText size={40} className="text-muted-foreground opacity-50 mb-3" />
              <p className="text-xs font-semibold text-foreground mb-1">{t("recentQueue.emptyTitle")}</p>
              <p className="text-[11px] text-muted-foreground max-w-[280px] mb-4">{t("recentQueue.emptySubtitle")}</p>
              <button
                onClick={() => openPostCreator()}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 bg-purple-500/10 px-4 py-2 rounded-lg border-none cursor-pointer transition-colors"
              >
                {t("recentQueue.createNow")}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recentPosts.map((post) => {
                const statusUpper = post.status ? post.status.toUpperCase() : POST_STATUS.DRAFT;
                const statusInfo = STATUS_CONFIG[statusUpper] || STATUS_CONFIG[POST_STATUS.DRAFT];
                
                return (
                  <div
                    key={post.id}
                    className="flex items-center justify-between p-3.5 border border-border hover:border-border rounded-2xl bg-card hover:bg-muted/50 shadow-sm transition-all group cursor-pointer"
                    onClick={() => navigate("/planner")}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Thumbnail or Icon */}
                      <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                        {post.thumbnail ? (
                          <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover" />
                        ) : (
                          <FileText size={18} className="text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-foreground truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors mb-1.5">
                          {post.title || t("recentQueue.untitled")}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {post.scheduledAt 
                              ? t("recentQueue.scheduledAt", { date: new Date(post.scheduledAt).toLocaleDateString(t("common:langLocale")) }) 
                              : t("recentQueue.createdAt", { date: new Date(post.createdAt).toLocaleDateString(t("common:langLocale")) })
                            }
                          </span>
                          <span className="text-[10px] text-muted-foreground">•</span>
                          {/* Target platforms */}
                          <div className="flex items-center gap-1">
                            {post.platforms?.map((plat) => (
                              <PlatformIcon key={plat} platform={plat} size={14} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Status Badge */}
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${statusInfo.colorClass}`}>
                        {statusInfo.icon}
                        <span>{t(`status.${statusUpper.toLowerCase()}`)}</span>
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Platform Status and Reach (Cột phải) */}
        <div className="col-span-5 flex flex-col gap-6">
          {/* Posting Goals */}
          {activeBrand && <PostingGoalWidget brandId={activeBrand.id} />}

          {/* Platform Connections Status */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-bold text-foreground uppercase tracking-widest">{t("connections.title")}</span>
              <button 
                onClick={() => navigate("/manage/connections")}
                className="text-[10px] font-black text-muted-foreground hover:text-foreground uppercase tracking-wider bg-muted hover:bg-muted/80 px-2.5 py-1 rounded-md border-none cursor-pointer transition-colors"
              >
                {t("connections.manage")}
              </button>
            </div>
            
            <div className="flex flex-col gap-1">
              {BRAND_PLATFORMS.map((platform, i, arr) => {
                const connected = metrics.some(m => m.platform === platform.apiKey);
                return (
                  <div
                    key={platform.name}
                    className={`flex items-center gap-3 py-3 ${i < arr.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <PlatformIcon platform={platform.name} size={18} />
                    <span className="text-xs font-bold text-foreground flex-1">{platform.label}</span>
                    {connected ? (
                      <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                        {t("connections.connected")}
                      </span>
                    ) : (
                      <button
                        onClick={() => navigate("/manage/connections")}
                        className="text-[9px] font-extrabold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 border-none px-2 py-0.5 rounded uppercase tracking-wider cursor-pointer transition-colors"
                      >
                        {t("connections.connect")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reach by Network */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex-1">
            <div className="text-sm font-bold text-foreground uppercase tracking-wider mb-6">{t("connections.reachByNetwork")}</div>
            <div className="flex flex-col gap-4.5">
              {viewersByPlatform.map((item) => (
                <div key={item.platform} className="flex items-center gap-3">
                  <PlatformIcon platform={item.platform} size={16} />
                  <span className="text-[10px] font-bold text-muted-foreground w-16 shrink-0 uppercase">{item.platform}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${item.pct}%`,
                        background: PLATFORM_COLORS[item.platform] || "#888" }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-foreground w-12 text-right shrink-0">
                    {item.viewers.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
