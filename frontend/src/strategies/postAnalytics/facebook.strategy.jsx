import React from "react";
import { 
  Eye, Heart, MessageCircle, Share2, Info, Users, 
  BarChart2, RefreshCw, AlertCircle 
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart as ReChartsBarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip 
} from "recharts";
import socialService from "../../services/social.service";
import { POST_ANALYTICS_TAB } from "../../constants/postAnalyticsTabs";

export const facebookStrategy = {
  supportedTabs: [
    POST_ANALYTICS_TAB.OVERVIEW,
    POST_ANALYTICS_TAB.REACTIONS,
    POST_ANALYTICS_TAB.AUDIENCE
  ],

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

    // 2. Fetch Facebook Analytics (Timeseries)
    try {
      const formattedFrom = dateRange?.from ? dateRange.from.toISOString().split('T')[0] : null;
      const formattedTo = dateRange?.to ? dateRange.to.toISOString().split('T')[0] : null;
      const analyticsData = await socialService.getFacebookPostAnalytics(brandId, postId, formattedFrom, formattedTo);
      result.analytics = { status: "success", data: analyticsData?.data || analyticsData || [] };
    } catch (error) {
      console.error("Failed to fetch Facebook analytics:", error);
      result.analytics = { status: "error", error };
    }

    return result;
  },

  renderHeaderStats(data) {
    const insights = data?.insights?.data;
    
    const stats = [
      {
        label: "Reach",
        value: insights ? (insights.reach || 0).toLocaleString() : "—",
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
              <div className="h-40 flex flex-col items-center justify-center gap-2 text-center">
                <AlertCircle size={20} className="text-red-400" />
                <p className="text-xs text-red-500 font-medium">Không thể tải dữ liệu biểu đồ phân tích.</p>
              </div>
            ) : data?.analytics?.status === "loading" ? (
              <div className="h-40 flex items-center justify-center text-xs text-gray-400">
                Đang tải dữ liệu tăng trưởng...
              </div>
            ) : analytics && analytics.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Lượt xem", value: analytics[0].views },
                  { label: "Reach", value: analytics[0].reach },
                  { label: "Lượt click", value: analytics[0].clicks }
                ].map((stat) => (
                  <div key={stat.label} className="bg-gray-50 rounded-2xl p-4 text-center">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</div>
                    <div className="text-xl font-black text-black mt-1">{(stat.value || 0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-xs text-gray-400">
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
