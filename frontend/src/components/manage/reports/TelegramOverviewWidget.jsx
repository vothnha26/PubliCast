import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Calendar } from "lucide-react";

const getWeeklyData = (growthArray, key) => {
  if (!growthArray || !Array.isArray(growthArray) || growthArray.length === 0) {
    return [0, 0, 0, 0];
  }
  const result = [0, 0, 0, 0];
  const itemsPerWeek = Math.max(1, Math.ceil(growthArray.length / 4));
  for (let i = 0; i < 4; i++) {
    const start = i * itemsPerWeek;
    const end = Math.min(growthArray.length, start + itemsPerWeek);
    let sum = 0;
    for (let j = start; j < end; j++) {
      if (growthArray[j] && typeof growthArray[j][key] === 'number') {
        sum += growthArray[j][key];
      }
    }
    if (key === 'followers' || key === 'members') {
      const lastIndex = end - 1;
      sum = (growthArray[lastIndex] && typeof growthArray[lastIndex][key] === 'number') ? growthArray[lastIndex][key] : 0;
    }
    result[i] = sum;
  }
  return result;
};

export function TelegramOverviewWidget({
  channel = null,
  posts = [],
  color = "#24A1DE",
  previewLoading = false,
  previewData = null
}) {
  if (previewLoading || !previewData || !channel) {
    return (
      <div className="w-full h-full flex flex-col justify-between p-2">
        <div className="flex flex-col items-center justify-center gap-2 text-center py-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center animate-bounce">
            <Calendar size={16} className="text-gray-400" />
          </div>
          <span className="text-xs font-bold text-gray-500">TELEGRAM PERFORMANCE — Đang tải...</span>
        </div>
        <div className="grid grid-cols-4 gap-3 my-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-5 gap-3 h-24">
          <div className="col-span-2 bg-gray-100 rounded-lg animate-pulse" />
          <div className="col-span-3 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  const weeklyViews = getWeeklyData(channel.analyticsData?.growth, "views");
  const chartData = weeklyViews.map((val, idx) => ({
    name: `W${idx + 1}`,
    "Views": val
  }));

  const weeklyMembers = getWeeklyData(channel.analyticsData?.growth, "followers");
  const initialTgMembers = weeklyMembers[0] || 0;
  const finalTgMembers = weeklyMembers[3] || 0;
  const tgGrowthPct = initialTgMembers > 0 ? (((finalTgMembers - initialTgMembers) / initialTgMembers) * 100).toFixed(1) : "0.0";

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num;
  };

  const topPosts = posts.filter(p => p.platform === "TELEGRAM").slice(0, 4);

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 mb-2.5">
        <div className="p-2 bg-gradient-to-br from-white to-gray-55/50 border border-gray-100 rounded-xl shadow-sm hover:shadow transition-all duration-300" style={{ borderTop: `2px solid #24A1DE` }}>
          <span className="text-[6.5px] text-gray-400 font-bold uppercase tracking-wider block">Subscribers</span>
          <div className="text-xs font-black text-[#24A1DE] font-mono mt-0.5">{formatNumber(channel.followers)}</div>
        </div>
        <div className="p-2 bg-gradient-to-br from-white to-gray-55/50 border border-gray-100 rounded-xl shadow-sm hover:shadow transition-all duration-300" style={{ borderTop: `2px solid #2AABEE` }}>
          <span className="text-[6.5px] text-gray-400 font-bold uppercase tracking-wider block">Avg Post Views</span>
          <div className="text-xs font-black text-[#1c8ec7] font-mono mt-0.5">{formatNumber(channel.reach)}</div>
        </div>
        <div className="p-2 bg-gradient-to-br from-white to-gray-55/50 border border-gray-100 rounded-xl shadow-sm hover:shadow transition-all duration-300" style={{ borderTop: `2px solid ${color}` }}>
          <span className="text-[6.5px] text-gray-400 font-bold uppercase tracking-wider block">Forwarded</span>
          <div className="text-xs font-black font-mono mt-0.5" style={{ color }}>{formatNumber(channel.shares)}</div>
        </div>
        <div className="p-2 bg-gradient-to-br from-white to-gray-55/50 border border-gray-100 rounded-xl shadow-sm hover:shadow transition-all duration-300" style={{ borderTop: `2px solid #52C79F` }}>
          <span className="text-[6.5px] text-gray-400 font-bold uppercase tracking-wider block">Reaction Rate</span>
          <div className="text-xs font-black text-[#25927D] font-mono mt-0.5">{channel.engagementRate}%</div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 items-stretch flex-1 min-h-0">
        {/* Views Trend Chart */}
        <div className="col-span-2 bg-gradient-to-br from-white to-gray-55/30 border border-gray-100 rounded-xl p-2.5 flex flex-col shadow-sm">
          <span className="text-[7px] font-extrabold text-gray-500 uppercase tracking-wider mb-2 block">Lượt xem bài đăng</span>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 2 }}>
                <defs>
                  <linearGradient id="tgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#24A1DE" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#24A1DE" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 5, fill: "#94A3B8", fontWeight: "bold" }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fontSize: 5, fill: "#94A3B8", fontWeight: "bold", fontFamily: "monospace" }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <Tooltip 
                  contentStyle={{ 
                    background: "rgba(255, 255, 255, 0.95)", 
                    border: "1px solid #E2E8F0", 
                    borderRadius: "6px", 
                    fontSize: "6px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                    padding: "3px 6px"
                  }}
                  itemStyle={{ color: "#24A1DE", fontWeight: "bold" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Views" 
                  stroke="#24A1DE" 
                  strokeWidth={1.5} 
                  fill="url(#tgGrad)" 
                  activeDot={{ r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Posts + Growth progress */}
        <div className="col-span-3 bg-gradient-to-br from-white to-gray-50/30 border border-gray-100 rounded-xl p-3 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[7px] font-extrabold text-gray-500 uppercase tracking-wider">Bài đăng nổi bật</span>
            <span className="text-[5.5px] px-1.5 py-0.5 rounded font-black text-white bg-[#24A1DE]">TELEGRAM</span>
          </div>
          
          <div className="space-y-1 overflow-y-auto max-h-[75px] pr-1">
            {topPosts.length > 0 ? topPosts.map((post, idx) => (
              <div 
                key={post.id || idx} 
                className="border-b border-gray-100 pb-1 last:border-b-0 last:pb-0 hover:bg-gray-50/50 p-0.5 rounded transition-all duration-200"
              >
                <p className="text-[7px] text-gray-700 font-bold truncate line-clamp-1 w-full">{post.title}</p>
                <div className="flex justify-between items-center text-[5.5px] text-gray-450 font-mono mt-0.5">
                  <span>👁 {(post.views || 0).toLocaleString()} views</span>
                  <span className="font-extrabold text-[#24A1DE]">{post.engagementRate}% reach</span>
                </div>
              </div>
            )) : (
              <div className="text-[7.5px] text-gray-455 text-center py-4">Chưa có bài viết xuất bản</div>
            )}
          </div>

          <div className="mt-2 pt-1.5 border-t border-gray-100">
            <div className="flex justify-between text-[6px] font-bold text-gray-500 mb-1">
              <span>Tăng trưởng subscribers (tháng)</span>
              <span className="text-green-500">+{tgGrowthPct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
              <div 
                className="h-full rounded-full transition-all duration-500" 
                style={{ width: `${initialTgMembers > 0 ? Math.min(100, Math.max(0, ((finalTgMembers - initialTgMembers) / initialTgMembers) * 100 * 10)) : 0}%`, backgroundColor: "#24A1DE" }} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
