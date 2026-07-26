import React from "react";
import { Eye, Users, Clock, UserPlus, Scissors, Radio, Info } from "lucide-react";
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

export const twitchStrategy = {
  supportedTabs: [
    POST_ANALYTICS_TAB.STREAMS,
    POST_ANALYTICS_TAB.CLIPS,
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
          title: "Twitch Livestream & Clips",
          thumbnail: "",
          publishedAt: latest?.timestamp || new Date().toISOString(),
          status: "published",
          platform: "twitch",
        },
      };
    } catch (error) {
      console.error("Failed to fetch Twitch analytics:", error);
      result.metadata = { status: "error", error };
      result.insights = { status: "error", error };
    }
    return result;
  },

  renderHeaderStats(data) {
    const latest = data?.insights?.data?.latest;

    const stats = [
      {
        label: "Peak Viewers",
        value: fmt(latest?.peakViewers),
        icon: <Eye size={20} className="text-purple-600" />,
        bg: "bg-purple-50/50",
      },
      {
        label: "Average Viewers",
        value: fmt(latest?.avgViewers),
        icon: <Users size={20} className="text-indigo-500" />,
        bg: "bg-indigo-50/50",
      },
      {
        label: "Hours Watched",
        value: latest?.hoursWatched !== undefined ? `${fmt(latest.hoursWatched)}h` : "—",
        icon: <Clock size={20} className="text-blue-500" />,
        bg: "bg-blue-50/50",
      },
      {
        label: "New Followers",
        value: fmt(latest?.newFollowers),
        icon: <UserPlus size={20} className="text-emerald-500" />,
        bg: "bg-emerald-50/50",
      },
      {
        label: "Clips Tạo",
        value: fmt(latest?.clipsCount),
        icon: <Scissors size={20} className="text-pink-500" />,
        bg: "bg-pink-50/50",
      },
      {
        label: "Trạng thái",
        value: latest?.isLive ? "Đang LIVE" : "Ngoại tuyến",
        icon: <Radio size={20} className={latest?.isLive ? "text-red-500 animate-pulse" : "text-gray-400"} />,
        bg: latest?.isLive ? "bg-red-50/50" : "bg-gray-50/50",
      },
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-purple-200 transition-all">
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
      return <div className="h-52 flex items-center justify-center text-xs text-red-500">Không thể tải dữ liệu Twitch.</div>;
    }
    if (insightsStatus === "loading") {
      return <div className="h-52 flex items-center justify-center text-xs text-gray-400">Đang tải dữ liệu...</div>;
    }

    if (tab === POST_ANALYTICS_TAB.STREAMS) {
      const chartData = history.map((d) => ({
        time: format(new Date(d.timestamp), "HH:mm dd/MM"),
        peakViewers: d.peakViewers || 0,
        avgViewers: d.avgViewers || 0,
        newFollowers: d.newFollowers || 0,
      }));

      return (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h4 className="text-xs font-black text-purple-600 uppercase tracking-widest mb-6">
              Stream Overview — Peak & Average Viewers
            </h4>
            {chartData.length > 0 ? (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="twPeakGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9146FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#9146FF" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="twAvgGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                    <Tooltip
                      formatter={(value) => [value.toLocaleString(), ""]}
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                    />
                    <Area type="monotone" dataKey="peakViewers" stroke="#9146FF" strokeWidth={3} fillOpacity={1} fill="url(#twPeakGrad)" name="Peak Viewers" />
                    <Area type="monotone" dataKey="avgViewers" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#twAvgGrad)" name="Avg Viewers" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-xs text-gray-400">
                Chưa có dữ liệu livestream. Dữ liệu được thu thập khi channel LIVE.
              </div>
            )}
          </div>

          {/* New Followers per session */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-5">
              New Followers theo phiên Stream
            </h4>
            {chartData.length > 0 ? (
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                    <Bar dataKey="newFollowers" fill="#10b981" radius={[6, 6, 0, 0]} name="New Followers" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-xs text-gray-400">Chưa có dữ liệu.</div>
            )}
          </div>
        </div>
      );
    }

    if (tab === POST_ANALYTICS_TAB.CLIPS) {
      const clips = latest?.clips || [];
      return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="text-xs font-black text-purple-600 uppercase tracking-widest mb-5">
            Clip Studio Highlights
          </h4>
          {clips.length > 0 ? (
            <div className="space-y-3">
              {clips.map((clip, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-purple-50/30 rounded-2xl border border-purple-100 hover:border-purple-300 transition-all">
                  {clip.thumbnailUrl && (
                    <img
                      src={clip.thumbnailUrl}
                      alt={clip.title}
                      className="w-20 h-12 object-cover rounded-lg border border-purple-200 shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{clip.title || `Clip #${i + 1}`}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1"><Eye size={10} /> {fmt(clip.viewCount)} lượt xem</span>
                      {clip.duration && <span className="flex items-center gap-1"><Clock size={10} /> {clip.duration}s</span>}
                    </div>
                  </div>
                  {clip.url && (
                    <a
                      href={clip.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-600 font-semibold hover:underline shrink-0"
                    >
                      Xem ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <Info size={28} className="text-gray-300" />
              <p className="text-xs text-gray-400 text-center max-w-xs">
                Chưa có Clip nào được tạo. Sử dụng Twitch Instant Clip Studio để tạo clip highlight từ stream đang LIVE.
              </p>
            </div>
          )}
        </div>
      );
    }

    return null;
  },
};
