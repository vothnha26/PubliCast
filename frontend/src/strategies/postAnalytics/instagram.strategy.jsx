import React from "react";
import { Eye, Heart, MessageCircle, Bookmark, PlayCircle, TrendingUp, Info } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import { format } from "date-fns";
import postService from "../../services/post.service";
import { POST_ANALYTICS_TAB } from "../../constants/postAnalyticsTabs";

/** Format compact numbers: 1234 → "1.2K", 1234567 → "1.2M" */
function fmt(n) {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export const instagramStrategy = {
  supportedTabs: [
    POST_ANALYTICS_TAB.OVERVIEW,
    POST_ANALYTICS_TAB.POSTS,
    POST_ANALYTICS_TAB.REELS,
    POST_ANALYTICS_TAB.STORIES,
  ],
  supportsDateRange: false,

  async fetchData(brandId, postId) {
    const result = {
      metadata: { status: "loading", data: null },
      insights: { status: "loading", data: null },
    };
    try {
      const res = await postService.getPostAnalytics(brandId, postId);
      const history = res?.data || [];
      const latest = history.length > 0 ? history[history.length - 1] : null;

      result.insights = { status: "success", data: { history, latest } };
      result.metadata = {
        status: "success",
        data: {
          id: postId,
          title: "Bài đăng Instagram",
          thumbnail: "",
          publishedAt: latest?.timestamp || new Date().toISOString(),
          status: "published",
          platform: "instagram",
        },
      };
    } catch (error) {
      console.error("Failed to fetch Instagram analytics:", error);
      result.metadata = { status: "error", error };
      result.insights = { status: "error", error };
    }
    return result;
  },

  renderHeaderStats(data) {
    const latest = data?.insights?.data?.latest;
    const er = latest && latest.reach > 0
      ? `${(((latest.likes || 0) + (latest.comments || 0)) / latest.reach * 100).toFixed(2)}%`
      : "—";

    const stats = [
      { label: "Reach", value: fmt(latest?.reach), icon: <Eye size={20} className="text-blue-500" />, bg: "bg-blue-50/50" },
      { label: "Impressions", value: fmt(latest?.impressions), icon: <TrendingUp size={20} className="text-indigo-500" />, bg: "bg-indigo-50/50" },
      { label: "Lượt thích", value: fmt(latest?.likes), icon: <Heart size={20} className="text-rose-500" />, bg: "bg-rose-50/50" },
      { label: "Bình luận", value: fmt(latest?.comments), icon: <MessageCircle size={20} className="text-purple-500" />, bg: "bg-purple-50/50" },
      { label: "Đã lưu", value: fmt(latest?.saved), icon: <Bookmark size={20} className="text-amber-500" />, bg: "bg-amber-50/50" },
      { label: "Reel Plays", value: fmt(latest?.reelPlays), icon: <PlayCircle size={20} className="text-pink-500" />, bg: "bg-pink-50/50" },
      { label: "Engagement Rate", value: er, icon: <TrendingUp size={20} className="text-emerald-500" />, bg: "bg-emerald-50/50" },
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-gray-200 transition-all">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</span>
            <span className="text-2xl font-black text-gray-900 mt-2">{stat.value}</span>
            <div className={`absolute right-3 bottom-3 p-2 rounded-xl ${stat.bg} group-hover:scale-110 transition-transform`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>
    );
  },

  renderTabContent(tab, data) {
    const insightsStatus = data?.insights?.status;
    const history = data?.insights?.data?.history || [];

    if (insightsStatus === "error") {
      return <div className="h-52 flex items-center justify-center text-xs text-red-500">Không thể tải dữ liệu Instagram.</div>;
    }
    if (insightsStatus === "loading") {
      return <div className="h-52 flex items-center justify-center text-xs text-gray-400">Đang tải dữ liệu...</div>;
    }

    if (tab === POST_ANALYTICS_TAB.OVERVIEW) {
      const chartData = history.map((d) => ({
        time: format(new Date(d.timestamp), "dd/MM"),
        reach: d.reach || 0,
        impressions: d.impressions || 0,
        likes: d.likes || 0,
      }));

      return (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">
              Tăng trưởng Reach & Impressions
            </h4>
            {chartData.length > 0 ? (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="igReachGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                    <Area type="monotone" dataKey="reach" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#igReachGrad)" name="Reach" />
                    <Area type="monotone" dataKey="impressions" stroke="#8b5cf6" strokeWidth={2} fillOpacity={0} name="Impressions" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-xs text-gray-400">
                Chưa có đủ dữ liệu lịch sử. Hệ thống đang thu thập số liệu.
              </div>
            )}
          </div>
        </div>
      );
    }

    if (tab === POST_ANALYTICS_TAB.POSTS) {
      const latest = data?.insights?.data?.latest;
      const items = [
        { label: "Reach", value: fmt(latest?.reach) },
        { label: "Impressions", value: fmt(latest?.impressions) },
        { label: "Lượt thích", value: fmt(latest?.likes) },
        { label: "Bình luận", value: fmt(latest?.comments) },
        { label: "Đã lưu", value: fmt(latest?.saved) },
        { label: "Profile Visits", value: fmt(latest?.profileVisits) },
      ];
      return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-5">
            Hiệu quả Feed Post
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-2xl p-4 text-center">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</div>
                <div className="text-xl font-black text-gray-900 mt-1">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (tab === POST_ANALYTICS_TAB.REELS) {
      const chartData = history.map((d) => ({
        time: format(new Date(d.timestamp), "dd/MM"),
        reelPlays: d.reelPlays || 0,
        likes: d.likes || 0,
      }));
      return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">
            Hiệu quả Reels — Lượt phát & Thích
          </h4>
          {chartData.length > 0 ? (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                  <Bar dataKey="reelPlays" fill="#ec4899" radius={[6, 6, 0, 0]} name="Reel Plays" />
                  <Bar dataKey="likes" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Likes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-xs text-gray-400">Chưa có dữ liệu Reel.</div>
          )}
        </div>
      );
    }

    if (tab === POST_ANALYTICS_TAB.STORIES) {
      return (
        <div className="flex flex-col items-center justify-center h-52 gap-3 bg-white rounded-3xl border border-gray-100 p-6">
          <Info size={28} className="text-gray-300" />
          <div className="text-center space-y-1.5">
            <p className="text-xs font-black text-gray-700 uppercase tracking-wider">Story Insights</p>
            <p className="text-[11px] text-gray-400 max-w-md">
              Dữ liệu Story (Reach, Taps Forward/Back, Exits) được truy xuất theo từng Story riêng lẻ qua Instagram Graph API — không gắn với post ID thông thường. Tính năng đang được phát triển.
            </p>
          </div>
        </div>
      );
    }

    return null;
  },
};
