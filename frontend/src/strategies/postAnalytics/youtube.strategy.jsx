import React from "react";
import { Clock, ArrowUpRight, PlayCircle, Info } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import socialService from "../../services/social.service";
import { POST_ANALYTICS_TAB } from "../../constants/postAnalyticsTabs";

const COLORS = ["#8E9BEE", "#FF8042", "#00C49F", "#FFBB28", "#8884d8", "#82ca9d", "#ffc658"];

export const youtubeStrategy = {
  supportedTabs: [
    POST_ANALYTICS_TAB.OVERVIEW,
    POST_ANALYTICS_TAB.TRAFFIC,
    POST_ANALYTICS_TAB.DEVICES,
    POST_ANALYTICS_TAB.AUDIENCE,
    POST_ANALYTICS_TAB.GEOGRAPHY,
    POST_ANALYTICS_TAB.SEARCH
  ],
  supportsDateRange: true,

  async fetchData(brandId, postId, dateRange) {
    const result = {
      metadata: { status: "loading", data: null },
      insights: { status: "loading", data: null },
      analytics: { status: "loading", data: null }
    };

    // 1. Lifetime insights (summary/trafficSource/deviceType/demographics/geography/searchTerms)
    try {
      const insights = await socialService.getVideoInsights(brandId, postId);
      result.insights = { status: "success", data: insights };
      result.metadata = {
        status: "success",
        data: {
          id: postId,
          title: "Video YouTube",
          thumbnail: "",
          publishedAt: new Date().toISOString(),
          status: "published",
          platform: "youtube"
        }
      };
    } catch (error) {
      console.error("Failed to fetch YouTube video insights:", error);
      result.metadata = { status: "error", error };
      result.insights = { status: "error", error };
    }

    // 2. Growth timeseries (views over the selected dateRange)
    try {
      const formattedFrom = dateRange?.from ? dateRange.from.toISOString().split("T")[0] : null;
      const formattedTo = dateRange?.to ? dateRange.to.toISOString().split("T")[0] : null;
      const analyticsRes = await socialService.getVideoAnalytics(brandId, postId, formattedFrom, formattedTo);
      result.analytics = { status: "success", data: analyticsRes?.data || [] };
    } catch (error) {
      console.error("Failed to fetch YouTube video analytics:", error);
      result.analytics = { status: "error", error };
    }

    return result;
  },

  renderHeaderStats(data) {
    const insights = data?.insights?.data;
    const summary = insights?.summary;

    const stats = [
      {
        label: "Thời lượng xem",
        value: summary?.totalWatchHrs !== undefined && summary?.totalWatchHrs !== null ? `${summary.totalWatchHrs}h` : "—",
        icon: <Clock size={20} className="text-blue-500" />,
        bg: "bg-blue-50/50"
      },
      {
        label: "Tỷ lệ xem TB",
        value: summary?.avgViewPercentage !== undefined && summary?.avgViewPercentage !== null ? `${summary.avgViewPercentage}%` : "—",
        icon: <ArrowUpRight size={20} className="text-green-500" />,
        bg: "bg-green-50/50"
      },
      {
        label: "Lượng đăng ký Net",
        value: summary?.subscribersNet !== undefined && summary?.subscribersNet !== null
          ? (summary.subscribersNet >= 0 ? `+${summary.subscribersNet}` : `${summary.subscribersNet}`)
          : "—",
        icon: <PlayCircle size={20} className="text-lime-500" />,
        bg: "bg-lime-50/50"
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-gray-200 transition-all">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</span>
            <span className="text-xl font-black text-gray-900 mt-2">{stat.value}</span>
            <div className={`absolute right-3 bottom-3 p-2 rounded-xl ${stat.bg} group-hover:scale-110 transition-transform`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>
    );
  },

  renderTabContent(tab, data, dateRange, setDateRange) {
    const insightsStatus = data?.insights?.status;
    const insights = data?.insights?.data;
    const analyticsStatus = data?.analytics?.status;
    const analytics = data?.analytics?.data || [];

    if (insightsStatus === "loading") {
      return (
        <div className="h-52 flex items-center justify-center text-xs text-gray-400">
          Đang tải dữ liệu...
        </div>
      );
    }
    if (insightsStatus === "error") {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-red-50/50 rounded-3xl border border-dashed border-red-200 text-center max-w-md mx-auto my-12">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3">
            <Info size={24} />
          </div>
          <h4 className="text-sm font-bold text-red-950">Lỗi tải dữ liệu</h4>
          <p className="text-xs text-red-700 mt-1">
            {data.insights.error?.response?.data?.message || data.insights.error?.message || "Không thể tải dữ liệu phân tích video."}
          </p>
        </div>
      );
    }

    if (tab === POST_ANALYTICS_TAB.OVERVIEW) {
      return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
            Growth Performance — Lượt xem theo thời gian
          </h4>

          {analyticsStatus === "error" ? (
            <div className="h-[240px] flex flex-col items-center justify-center gap-2 text-center">
              <Info size={20} className="text-red-400" />
              <p className="text-xs text-red-500 font-medium">Không thể tải biểu đồ tăng trưởng.</p>
            </div>
          ) : analyticsStatus === "loading" ? (
            <div className="h-[240px] flex items-center justify-center text-xs text-gray-400">Đang tải...</div>
          ) : analytics.length === 0 ? (
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
                <AreaChart data={analytics}>
                  <defs>
                    <linearGradient id="colorVideoViewsRoute" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8E9BEE" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#8E9BEE" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                  <Area type="monotone" dataKey="views" stroke="#8E9BEE" strokeWidth={3} fillOpacity={1} fill="url(#colorVideoViewsRoute)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      );
    }

    if (tab === POST_ANALYTICS_TAB.TRAFFIC) {
      const trafficSource = insights?.trafficSource || [];
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Nguồn lưu lượng (%)</h4>
            {trafficSource.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-xs text-gray-400">Không có dữ liệu</div>
            ) : (
              <div className="h-[240px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={trafficSource} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="views" nameKey="label">
                      {trafficSource.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value.toLocaleString(), "Views"]} />
                    <Legend iconSize={10} layout="vertical" align="right" verticalAlign="middle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

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
                  {trafficSource.length > 0 ? trafficSource.map((src, idx) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2.5 font-semibold text-gray-800 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: src.color || COLORS[idx % COLORS.length] }} />
                        {src.label}
                      </td>
                      <td className="py-2.5 text-right font-medium text-gray-900">{src.views.toLocaleString()}</td>
                      <td className="py-2.5 text-right text-gray-500 font-bold">{src.pct}%</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="py-4 text-center text-gray-400">Không có dữ liệu</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    if (tab === POST_ANALYTICS_TAB.DEVICES) {
      const deviceType = insights?.deviceType || [];
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Thiết bị người xem</h4>
            {deviceType.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-xs text-gray-400">Không có dữ liệu</div>
            ) : (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deviceType}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => [value.toLocaleString(), "Thời gian xem (phút)"]} />
                    <Bar dataKey="watchMinutes" name="Thời gian xem" fill="#8D8DF1" radius={[8, 8, 0, 0]}>
                      {deviceType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

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
                  {deviceType.length > 0 ? deviceType.map((dev, idx) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2.5 font-semibold text-gray-800 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dev.color || COLORS[idx % COLORS.length] }} />
                        {dev.label}
                      </td>
                      <td className="py-2.5 text-right font-medium text-gray-900">{dev.watchMinutes.toLocaleString()}</td>
                      <td className="py-2.5 text-right text-gray-500 font-bold">{dev.pct}%</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="py-4 text-center text-gray-400">Không có dữ liệu</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    if (tab === POST_ANALYTICS_TAB.AUDIENCE) {
      const gender = insights?.demographics?.gender || [];
      const age = insights?.demographics?.age || [];
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Phân bố Giới tính</h4>
            {gender.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-xs text-gray-400">Không có dữ liệu</div>
            ) : (
              <div className="h-[240px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={gender} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="pct" nameKey="label">
                      {gender.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || (entry.gender === "FEMALE" ? "#ff7300" : "#387908")} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, "Tỷ lệ"]} />
                    <Legend iconSize={10} layout="horizontal" align="center" verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Phân bố Độ tuổi</h4>
            {age.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-xs text-gray-400">Không có dữ liệu</div>
            ) : (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={age}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis unit="%" tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => [`${value}%`, "Tỷ lệ"]} />
                    <Bar dataKey="pct" name="Tỷ lệ" fill="#8884d8" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (tab === POST_ANALYTICS_TAB.GEOGRAPHY) {
      const geography = insights?.geography || [];
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Quốc gia xem nhiều nhất</h4>
            {geography.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-xs text-gray-400">Không có dữ liệu</div>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={geography} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="countryName" type="category" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip formatter={(value) => [value.toLocaleString(), "Lượt xem"]} />
                    <Bar dataKey="views" name="Lượt xem" fill="#7C3AED" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

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
                  {geography.length > 0 ? geography.map((geo, idx) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2.5 font-semibold text-gray-800 flex items-center gap-2">
                        <span className="text-base shrink-0">{geo.flag}</span>
                        {geo.countryName}
                      </td>
                      <td className="py-2.5 text-right font-medium text-gray-900">{geo.views.toLocaleString()}</td>
                      <td className="py-2.5 text-right text-gray-500 font-bold">{geo.pct}%</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="py-4 text-center text-gray-400">Không có dữ liệu</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    if (tab === POST_ANALYTICS_TAB.SEARCH) {
      const searchTerms = insights?.searchTerms || [];
      return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Từ khóa tìm kiếm dẫn đến video</h4>
          {searchTerms.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-xs text-gray-400">Không có từ khóa nào được ghi nhận</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 font-bold text-gray-400">
                    <th className="py-2.5">Từ khóa</th>
                    <th className="py-2.5 text-right">Lượt xem</th>
                    <th className="py-2.5 text-right">Tỷ lệ {searchTerms[0]?.pctLabel || ""}</th>
                  </tr>
                </thead>
                <tbody>
                  {searchTerms.map((st, idx) => (
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
      );
    }

    return null;
  }
};
