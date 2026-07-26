import React from "react";
import { Eye, Heart, MessageCircle, Repeat, Quote } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import { format } from "date-fns";
import postService from "../../services/post.service";
import { POST_ANALYTICS_TAB } from "../../constants/postAnalyticsTabs";

function fmt(n) {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export const threadsStrategy = {
  supportedTabs: [
    POST_ANALYTICS_TAB.OVERVIEW,
    POST_ANALYTICS_TAB.POSTS,
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
          title: "Bài đăng Threads",
          thumbnail: "",
          publishedAt: latest?.timestamp || new Date().toISOString(),
          status: "published",
          platform: "threads",
        },
      };
    } catch (error) {
      console.error("Failed to fetch Threads analytics:", error);
      result.metadata = { status: "error", error };
      result.insights = { status: "error", error };
    }
    return result;
  },

  renderHeaderStats(data) {
    const latest = data?.insights?.data?.latest;

    const stats = [
      { label: "Lượt xem", value: fmt(latest?.views), icon: <Eye size={20} className="text-gray-500" />, bg: "bg-gray-100" },
      { label: "Lượt thích", value: fmt(latest?.likes), icon: <Heart size={20} className="text-rose-500" />, bg: "bg-rose-50/50" },
      { label: "Replies", value: fmt(latest?.replies), icon: <MessageCircle size={20} className="text-blue-500" />, bg: "bg-blue-50/50" },
      { label: "Reposts", value: fmt(latest?.reposts), icon: <Repeat size={20} className="text-emerald-500" />, bg: "bg-emerald-50/50" },
      { label: "Quotes", value: fmt(latest?.quotes), icon: <Quote size={20} className="text-purple-500" />, bg: "bg-purple-50/50" },
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
    const latest = data?.insights?.data?.latest;

    if (insightsStatus === "error") {
      return <div className="h-52 flex items-center justify-center text-xs text-red-500">Không thể tải dữ liệu Threads.</div>;
    }
    if (insightsStatus === "loading") {
      return <div className="h-52 flex items-center justify-center text-xs text-gray-400">Đang tải dữ liệu...</div>;
    }

    if (tab === POST_ANALYTICS_TAB.OVERVIEW) {
      const chartData = history.map((d) => ({
        time: format(new Date(d.timestamp), "dd/MM"),
        views: d.views || 0,
        likes: d.likes || 0,
        replies: d.replies || 0,
        reposts: d.reposts || 0,
      }));

      return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">
            Tăng trưởng tương tác Threads
          </h4>
          {chartData.length > 0 ? (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="thViewsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#374151" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#374151" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="thLikesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                  <Area type="monotone" dataKey="views" stroke="#374151" strokeWidth={2} fillOpacity={1} fill="url(#thViewsGrad)" name="Views" />
                  <Area type="monotone" dataKey="likes" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#thLikesGrad)" name="Likes" />
                  <Area type="monotone" dataKey="reposts" stroke="#10b981" strokeWidth={2} fillOpacity={0} name="Reposts" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-xs text-gray-400">
              Chưa có đủ dữ liệu. Hệ thống đang thu thập số liệu.
            </div>
          )}
        </div>
      );
    }

    if (tab === POST_ANALYTICS_TAB.POSTS) {
      const metrics = [
        { label: "Lượt xem", value: fmt(latest?.views) },
        { label: "Lượt thích", value: fmt(latest?.likes) },
        { label: "Replies", value: fmt(latest?.replies) },
        { label: "Reposts", value: fmt(latest?.reposts) },
        { label: "Quotes", value: fmt(latest?.quotes) },
      ];
      return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-5">
            Hiệu quả Thread Post (Snapshot mới nhất)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {metrics.map((m) => (
              <div key={m.label} className="bg-gray-50 rounded-2xl p-4 text-center">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{m.label}</div>
                <div className="text-xl font-black text-gray-900 mt-1">{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  },
};
