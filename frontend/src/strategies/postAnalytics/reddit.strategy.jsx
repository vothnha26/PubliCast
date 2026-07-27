import React from "react";
import { ThumbsUp, MessageSquare, Share2, Info } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import { format } from "date-fns";
import postService from "../../services/post.service";
import { POST_ANALYTICS_TAB } from "../../constants/postAnalyticsTabs";

export const redditStrategy = {
  supportedTabs: [
    POST_ANALYTICS_TAB.OVERVIEW,
    POST_ANALYTICS_TAB.AUDIENCE
  ],
  supportsDateRange: false,

  async fetchData(brandId, postId) {
    const result = {
      metadata: { status: "loading", data: null },
      insights: { status: "loading", data: null }
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
          title: "Bài đăng Reddit",
          thumbnail: "",
          publishedAt: latest?.timestamp || new Date().toISOString(),
          status: "published",
          platform: "reddit"
        }
      };
    } catch (error) {
      console.error("Failed to fetch Reddit post analytics history:", error);
      result.metadata = { status: "error", error };
      result.insights = { status: "error", error };
    }

    return result;
  },

  renderHeaderStats(data) {
    const latest = data?.insights?.data?.latest;

    const stats = [
      {
        label: "Upvotes (Điểm Karma)",
        value: latest ? (latest.likes || latest.reactions || 0).toLocaleString() : "—",
        icon: <ThumbsUp size={20} className="text-orange-500" />,
        bg: "bg-orange-50/50"
      },
      {
        label: "Bình luận",
        value: latest ? (latest.comments || 0).toLocaleString() : "—",
        icon: <MessageSquare size={20} className="text-blue-500" />,
        bg: "bg-blue-50/50"
      },
      {
        label: "Chia sẻ",
        value: latest ? (latest.shares || 0).toLocaleString() : "—",
        icon: <Share2 size={20} className="text-emerald-500" />,
        bg: "bg-emerald-50/50"
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
    const rawHistory = data?.insights?.data?.history;
    const history = Array.isArray(rawHistory) ? rawHistory : (rawHistory?.snapshots || []);

    if (insightsStatus === "error") {
      return (
        <div className="h-52 flex items-center justify-center text-xs text-red-500">
          Không thể tải dữ liệu phân tích bài đăng Reddit.
        </div>
      );
    }
    if (insightsStatus === "loading") {
      return (
        <div className="h-52 flex items-center justify-center text-xs text-gray-400">
          Đang tải dữ liệu...
        </div>
      );
    }

    const chartData = history.map((d) => ({
      time: format(new Date(d.timestamp), "HH:mm dd/MM"),
      upvotes: d.likes || d.reactions || 0,
      comments: d.comments || 0
    }));

    if (tab === POST_ANALYTICS_TAB.OVERVIEW) {
      return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">
            Tăng trưởng Upvotes & Bình luận Reddit
          </h4>
          {chartData.length > 0 ? (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="redditUpvotesColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff4500" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ff4500" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                  <Area type="monotone" dataKey="upvotes" stroke="#ff4500" strokeWidth={3} fillOpacity={1} fill="url(#redditUpvotesColor)" name="Upvotes" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-xs text-gray-400">
              Chưa có đủ dữ liệu lịch sử để hiển thị biểu đồ Reddit.
            </div>
          )}
        </div>
      );
    }

    if (tab === POST_ANALYTICS_TAB.AUDIENCE) {
      return (
        <div className="flex flex-col items-center justify-center h-52 gap-3 bg-white rounded-3xl border border-gray-100 p-6">
          <Info size={28} className="text-gray-300" />
          <div className="text-center space-y-1.5">
            <p className="text-xs font-black text-gray-700 uppercase tracking-wider">Thông tin người xem Reddit</p>
            <p className="text-[11px] text-gray-400 max-w-md">
              Dữ liệu nhân khẩu học người xem được ẩn danh bảo vệ theo quy định tính riêng tư người dùng của Reddit.
            </p>
          </div>
        </div>
      );
    }

    return null;
  }
};
