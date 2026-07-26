import React from "react";
import { Eye, Share2, Users, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
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

const REACTION_EMOJIS = {
  thumbsUp: "👍",
  heart: "❤️",
  fire: "🔥",
  clap: "👏",
  party: "🥳",
};

export const telegramStrategy = {
  supportedTabs: [
    POST_ANALYTICS_TAB.OVERVIEW,
    POST_ANALYTICS_TAB.MESSAGES,
    POST_ANALYTICS_TAB.SUBSCRIBERS,
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
          title: "Bài đăng Telegram",
          thumbnail: "",
          publishedAt: latest?.timestamp || new Date().toISOString(),
          status: "published",
          platform: "telegram",
        },
      };
    } catch (error) {
      console.error("Failed to fetch Telegram analytics:", error);
      result.metadata = { status: "error", error };
      result.insights = { status: "error", error };
    }
    return result;
  },

  renderHeaderStats(data) {
    const latest = data?.insights?.data?.latest;
    const engagementPerPost = latest && latest.views > 0
      ? `${(((latest.forwards || 0) + (latest.reactions?.total || 0)) / latest.views * 100).toFixed(2)}%`
      : "—";

    const stats = [
      { label: "Lượt xem", value: fmt(latest?.views), icon: <Eye size={20} className="text-blue-500" />, bg: "bg-blue-50/50" },
      { label: "Lượt chuyển tiếp", value: fmt(latest?.forwards), icon: <Share2 size={20} className="text-indigo-500" />, bg: "bg-indigo-50/50" },
      { label: "Thành viên mới", value: fmt(latest?.newMembers), icon: <Users size={20} className="text-emerald-500" />, bg: "bg-emerald-50/50" },
      { label: "Tương tác / lượt xem", value: engagementPerPost, icon: <TrendingUp size={20} className="text-amber-500" />, bg: "bg-amber-50/50" },
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
    const latest = data?.insights?.data?.latest;

    if (insightsStatus === "error") {
      return <div className="h-52 flex items-center justify-center text-xs text-red-500">Không thể tải dữ liệu Telegram.</div>;
    }
    if (insightsStatus === "loading") {
      return <div className="h-52 flex items-center justify-center text-xs text-gray-400">Đang tải dữ liệu...</div>;
    }

    if (tab === POST_ANALYTICS_TAB.OVERVIEW) {
      // Reactions breakdown
      const reactions = latest?.reactions || {};
      const reactionData = Object.entries(REACTION_EMOJIS).map(([key, emoji]) => ({
        name: emoji,
        value: reactions[key] || 0,
      }));

      return (
        <div className="space-y-6">
          {/* Reactions breakdown */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">
              Phân tích Reactions
            </h4>
            {reactionData.some((r) => r.value > 0) ? (
              <div className="flex items-end gap-6 justify-center">
                {reactionData.map((r) => (
                  <div key={r.name} className="flex flex-col items-center gap-2">
                    <span className="text-xl font-bold text-gray-700">{fmt(r.value)}</span>
                    <span className="text-3xl">{r.name}</span>
                    <div
                      className="w-8 rounded-t-lg bg-gradient-to-t from-blue-500 to-indigo-400 transition-all duration-700"
                      style={{ height: `${Math.max(8, (r.value / Math.max(...reactionData.map((x) => x.value), 1)) * 80)}px` }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-xs text-gray-400">
                Chưa có reaction nào được ghi nhận.
              </div>
            )}
          </div>

          {/* Views timeseries */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">
              Lượt xem theo thời gian
            </h4>
            {history.length > 0 ? (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history.map((d) => ({
                    time: format(new Date(d.timestamp), "dd/MM"),
                    views: d.views || 0,
                  }))}>
                    <defs>
                      <linearGradient id="tgViewsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                    <Area type="monotone" dataKey="views" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#tgViewsGrad)" name="Lượt xem" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-xs text-gray-400">Chưa có dữ liệu lịch sử.</div>
            )}
          </div>
        </div>
      );
    }

    if (tab === POST_ANALYTICS_TAB.MESSAGES) {
      const chartData = history.map((d) => ({
        time: format(new Date(d.timestamp), "dd/MM"),
        forwards: d.forwards || 0,
        reactions: (d.reactions?.total) || 0,
      }));
      return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">
            Phân tích Message — Forwards & Reactions
          </h4>
          {chartData.length > 0 ? (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                  <Bar dataKey="forwards" fill="#6366f1" radius={[6, 6, 0, 0]} name="Forwards" />
                  <Bar dataKey="reactions" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Reactions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-xs text-gray-400">Chưa có dữ liệu.</div>
          )}
        </div>
      );
    }

    if (tab === POST_ANALYTICS_TAB.SUBSCRIBERS) {
      const chartData = history.map((d) => ({
        time: format(new Date(d.timestamp), "dd/MM"),
        newMembers: d.newMembers || 0,
        totalMembers: d.totalMembers || 0,
      }));
      return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">
            Tăng trưởng thành viên kênh
          </h4>
          {chartData.length > 0 ? (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="tgMembersGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                  <Area type="monotone" dataKey="totalMembers" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#tgMembersGrad)" name="Tổng thành viên" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-xs text-gray-400">Chưa có dữ liệu thành viên.</div>
          )}
        </div>
      );
    }

    return null;
  },
};
