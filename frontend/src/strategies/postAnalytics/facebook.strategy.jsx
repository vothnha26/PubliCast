import React from "react";
import { 
  Eye, Heart, MessageCircle, Share2, Info, Users, 
  BarChart2, RefreshCw, AlertCircle 
} from "lucide-react";
import {
  ResponsiveContainer, BarChart as ReChartsBarChart, Bar,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import socialService from "../../services/social.service";
import { POST_ANALYTICS_TAB } from "../../constants/postAnalyticsTabs";

const COLD_START_MAX_RETRIES = 2;
const COLD_START_DEFAULT_RETRY_AFTER_SEC = 5;

/**
 * Cold-start contract: while the backend is seeding the first snapshot for a
 * post, getFacebookPostAnalytics may respond with { retryAfter } instead of
 * { series, historicalDataAvailableFrom }. Auto-retry up to COLD_START_MAX_RETRIES
 * times before surfacing a hard error.
 */
async function fetchAnalyticsWithColdStartRetry(brandId, postId, formattedFrom, formattedTo) {
  for (let attempt = 0; attempt <= COLD_START_MAX_RETRIES; attempt++) {
    const res = await socialService.getFacebookPostAnalytics(brandId, postId, formattedFrom, formattedTo);
    const payload = res?.data || res;
    if (payload?.retryAfter && attempt < COLD_START_MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, (payload.retryAfter || COLD_START_DEFAULT_RETRY_AFTER_SEC) * 1000));
      continue;
    }
    return payload;
  }
  return { series: [], historicalDataAvailableFrom: null };
}

export const facebookStrategy = {
  supportedTabs: [
    POST_ANALYTICS_TAB.OVERVIEW,
    POST_ANALYTICS_TAB.REACTIONS,
    POST_ANALYTICS_TAB.AUDIENCE
  ],
  supportsDateRange: true,

  async fetchData(brandId, postId, dateRange) {
    const result = {
      metadata: { status: "loading", data: null },
      insights: { status: "loading", data: null },
      analytics: { status: "loading", data: null }
    };

    // 1. Fetch Facebook Insights
    try {
      const insightsData = await socialService.getFacebookPostInsights(brandId, postId);
      const dataObj = insightsData?.data || insightsData;
      result.insights = { status: "success", data: dataObj };
      result.metadata = {
        status: "success",
        data: {
          id: dataObj?.postDetails?.id || postId,
          title: dataObj?.postDetails?.message || "Bài đăng Facebook",
          thumbnail: dataObj?.postDetails?.mediaUrl || "",
          publishedAt: dataObj?.postDetails?.date || new Date().toISOString(),
          status: "published",
          platform: "facebook"
        }
      };
    } catch (error) {
      console.error("Failed to fetch Facebook insights:", error);
      result.metadata = { status: "error", error };
      result.insights = { status: "error", error };
    }

    // 2. Fetch Facebook Analytics (Timeseries), auto-retrying on cold-start
    try {
      const formattedFrom = dateRange?.from ? dateRange.from.toISOString().split('T')[0] : null;
      const formattedTo = dateRange?.to ? dateRange.to.toISOString().split('T')[0] : null;
      const payload = await fetchAnalyticsWithColdStartRetry(brandId, postId, formattedFrom, formattedTo);
      result.analytics = {
        status: "success",
        data: payload?.series || [],
        historicalDataAvailableFrom: payload?.historicalDataAvailableFrom || null
      };
    } catch (error) {
      console.error("Failed to fetch Facebook analytics:", error);
      result.analytics = { status: "error", error };
    }

    return result;
  },

  renderHeaderStats(data) {
    const insights = data?.insights?.data;
    // Meta's reach metric (post_total_media_view_unique) only applies to posts
    // with media — for other post types it returns empty, which is a real
    // "not available" state, not a genuine 0 reach. Show "—" instead of "0"
    // whenever views prove the post did have activity but reach came back empty.
    const reachDisplay = !insights
      ? "—"
      : (insights.reach > 0 ? insights.reach.toLocaleString() : (insights.views > 0 ? "—" : "0"));

    const stats = [
      {
        label: "Reach",
        value: reachDisplay,
        icon: <Eye size={20} className="text-blue-500" />,
        bg: "bg-blue-50/50"
      },
      {
        label: "Cảm xúc",
        value: insights?.reactions?.total !== undefined ? insights.reactions.total.toLocaleString() : "—",
        icon: <Heart size={20} className="text-rose-500" />,
        bg: "bg-rose-50/50"
      },
      {
        label: "Bình luận",
        value: insights?.comments !== undefined ? insights.comments.toLocaleString() : "—",
        icon: <MessageCircle size={20} className="text-purple-500" />,
        bg: "bg-purple-50/50"
      },
      {
        label: "Chia sẻ",
        value: insights?.shares !== undefined ? insights.shares.toLocaleString() : "—",
        icon: <Share2 size={20} className="text-emerald-500" />,
        bg: "bg-emerald-50/50"
      }
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

  renderTabContent(tab, data, dateRange, setDateRange) {
    const insights = data?.insights?.data;
    const analytics = data?.analytics?.data;

    if (tab === POST_ANALYTICS_TAB.OVERVIEW) {
      return (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  Tăng trưởng lượt xem bài viết
                </h4>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Số liệu tổng hợp lượt xem, reach và click của bài viết
                </p>
              </div>
            </div>

            {data?.analytics?.status === "error" ? (
              <div className="h-[240px] flex flex-col items-center justify-center gap-2 text-center">
                <AlertCircle size={20} className="text-red-400" />
                <p className="text-xs text-red-500 font-medium">Không thể tải dữ liệu biểu đồ phân tích.</p>
              </div>
            ) : data?.analytics?.status === "loading" ? (
              <div className="h-[240px] flex items-center justify-center text-xs text-gray-400">
                Đang tải dữ liệu tăng trưởng...
              </div>
            ) : analytics && analytics.length > 0 ? (
              <>
                {(() => {
                  const latest = analytics[analytics.length - 1];
                  // Same "—" fallback as renderHeaderStats: reach only applies to
                  // media posts, so an empty reach alongside real views isn't a genuine 0.
                  const reachDisplay = latest.reach > 0
                    ? latest.reach.toLocaleString()
                    : (latest.views > 0 ? "—" : "0");
                  const summaryStats = [
                    { label: "Lượt xem", value: (latest.views || 0).toLocaleString() },
                    { label: "Reach", value: reachDisplay },
                    { label: "Lượt click", value: (latest.clicks || 0).toLocaleString() }
                  ];
                  return (
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {summaryStats.map((stat) => (
                        <div key={stat.label} className="bg-gray-50 rounded-2xl p-4 text-center">
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</div>
                          <div className="text-xl font-black text-black mt-1">{stat.value}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics}>
                      <defs>
                        <linearGradient id="colorFbViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8E9BEE" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#8E9BEE" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="0" vertical={false} stroke="#F3F4F6" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                      <Area type="monotone" dataKey={(d) => d.viewsDelta !== undefined ? d.viewsDelta : d.views} stroke="#8E9BEE" strokeWidth={3} fillOpacity={1} fill="url(#colorFbViews)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {data?.analytics?.historicalDataAvailableFrom && (
                  <p className="text-[10px] text-gray-400 mt-3">
                    Dữ liệu trước ngày {data.analytics.historicalDataAvailableFrom} chưa khả dụng.
                  </p>
                )}
              </>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-xs text-gray-400">
                Chưa có đủ dữ liệu để hiển thị biểu đồ.
              </div>
            )}
          </div>

          {data?.insights?.error && (
            <div className="flex items-start gap-2.5 p-4 bg-red-50 rounded-2xl border border-red-100">
              <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-700 leading-normal">
                {typeof data.insights.error === "string" ? data.insights.error : "Lỗi tải thông tin chi tiết bài đăng từ Graph API."}
              </p>
            </div>
          )}
        </div>
      );
    }

    if (tab === POST_ANALYTICS_TAB.REACTIONS) {
      const breakdown = insights?.reactions?.breakdown || {};
      const chartData = Object.entries(breakdown).map(([type, value]) => ({ type, value }));

      return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">
            Phân tích cảm xúc (Reactions Breakdown)
          </h4>

          {data?.insights?.status === "error" ? (
            <div className="h-40 flex items-center justify-center text-xs text-red-500">
              Không thể tải dữ liệu cảm xúc.
            </div>
          ) : data?.insights?.status === "loading" ? (
            <div className="h-40 flex items-center justify-center text-xs text-gray-400">
              Đang tải dữ liệu cảm xúc...
            </div>
          ) : chartData.length > 0 ? (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ReChartsBarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="type" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                  <Bar dataKey="value" fill="#8E9BEE" radius={[6, 6, 0, 0]} />
                </ReChartsBarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-xs text-gray-400">
              Chưa có đủ dữ liệu cảm xúc để hiển thị.
            </div>
          )}
        </div>
      );
    }

    if (tab === POST_ANALYTICS_TAB.AUDIENCE) {
      const geography = insights?.geography || {};

      return (
        <div className="space-y-6">
          {/* Age/Gender Demographics deprecated alert */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 flex items-start gap-3">
            <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Facebook đã ngừng cung cấp dữ liệu nhân khẩu học theo độ tuổi/giới tính qua Graph API.
            </p>
          </div>

          {/* Geography */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">
              Địa lý người theo dõi (Page-level)
            </h4>

            {data?.insights?.status === "error" ? (
              <div className="h-32 flex items-center justify-center text-xs text-red-500">
                Không thể tải dữ liệu địa lý.
              </div>
            ) : data?.insights?.status === "loading" ? (
              <div className="h-32 flex items-center justify-center text-xs text-gray-400">
                Đang tải dữ liệu địa lý...
              </div>
            ) : geography?.available ? (
              <div className="space-y-2">
                {Object.entries(geography.data)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 8)
                  .map(([country, count]) => (
                    <div key={country} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50">
                      <span className="text-gray-600 font-medium">{country}</span>
                      <span className="text-gray-900 font-bold">{count.toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            ) : geography?.reason === "insufficient_data" ? (
              <div className="h-32 flex items-center justify-center text-center text-xs text-gray-400 max-w-sm mx-auto">
                Trang chưa có đủ dữ liệu để thống kê địa lý (yêu cầu số lượng người theo dõi tối thiểu từ Meta).
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-xs text-gray-400">
                Chưa có dữ liệu địa lý.
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  }
};
