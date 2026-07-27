import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
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

export function TiktokOverviewWidget({
  channel = null,
  posts = [],
  color = "#FE2C55",
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
          <span className="text-xs font-bold text-gray-500">TIKTOK PERFORMANCE — Đang tải...</span>
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

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num;
  };

  const topVideos = posts.filter(p => p.platform === "TIKTOK").slice(0, 4);

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 mb-2.5">
        <div className="p-2 bg-gradient-to-br from-white to-gray-50/50 border border-gray-100 rounded-xl shadow-sm hover:shadow transition-all duration-300" style={{ borderTop: `2px solid #000000` }}>
          <span className="text-[6.5px] text-gray-450 font-bold uppercase tracking-wider block">Followers</span>
          <div className="text-xs font-black text-gray-900 font-mono mt-0.5">{formatNumber(channel.followers)}</div>
        </div>
        <div className="p-2 bg-gradient-to-br from-white to-gray-50/50 border border-gray-100 rounded-xl shadow-sm hover:shadow transition-all duration-300" style={{ borderTop: `2px solid #FE2C55` }}>
          <span className="text-[6.5px] text-gray-455 font-bold uppercase tracking-wider block">Total Views</span>
          <div className="text-xs font-black text-[#FE2C55] font-mono mt-0.5">{formatNumber(channel.impressions)}</div>
        </div>
        <div className="p-2 bg-gradient-to-br from-white to-gray-50/50 border border-gray-100 rounded-xl shadow-sm hover:shadow transition-all duration-300" style={{ borderTop: `2px solid #25F4EE` }}>
          <span className="text-[6.5px] text-gray-455 font-bold uppercase tracking-wider block">Total Likes</span>
          <div className="text-xs font-black text-[#1cc4be] font-mono mt-0.5">{formatNumber(channel.likes)}</div>
        </div>
        <div className="p-2 bg-gradient-to-br from-white to-gray-50/50 border border-gray-100 rounded-xl shadow-sm hover:shadow transition-all duration-300" style={{ borderTop: `2px solid ${color}` }}>
          <span className="text-[6.5px] text-gray-455 font-bold uppercase tracking-wider block">Avg Engagement</span>
          <div className="text-xs font-black font-mono mt-0.5" style={{ color }}>{channel.engagementRate}%</div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 items-stretch flex-1 min-h-0">
        {/* Weekly Views Bar Chart */}
        <div className="col-span-2 bg-gradient-to-br from-white to-gray-50/30 border border-gray-100 rounded-xl p-2.5 flex flex-col shadow-sm">
          <span className="text-[7px] font-extrabold text-gray-500 uppercase tracking-wider mb-2 block">Lượt xem theo tuần</span>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 2, right: 2, left: -25, bottom: 2 }}>
                <defs>
                  <linearGradient id="ttBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FE2C55" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#FE2C55" stopOpacity={0.4} />
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
                  itemStyle={{ color: "#FE2C55", fontWeight: "bold" }}
                />
                <Bar 
                  dataKey="Views" 
                  fill="url(#ttBarGrad)" 
                  radius={[3, 3, 0, 0]} 
                  maxBarSize={12}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top TikTok Videos */}
        <div className="col-span-3 bg-gradient-to-br from-white to-gray-50/30 border border-gray-100 rounded-xl p-3 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[7px] font-extrabold text-gray-500 uppercase tracking-wider">Top TikTok Videos</span>
            <span className="text-[5.5px] px-1.5 py-0.5 rounded font-black text-white bg-[#FE2C55]">TIKTOK</span>
          </div>
          <div className="space-y-1.5 overflow-y-auto max-h-[110px] pr-1">
            {topVideos.length > 0 ? topVideos.map((post, idx) => (
              <div 
                key={post.id || idx} 
                className="border-b border-gray-100 pb-1 last:border-b-0 last:pb-0 hover:bg-gray-50/50 p-1 rounded transition-all duration-200"
              >
                <p className="text-[7px] text-gray-700 font-bold truncate line-clamp-1 w-full">{post.title}</p>
                <div className="flex justify-between items-center text-[6px] text-gray-400 font-mono mt-0.5">
                  <span>❤️ {(post.likes || 0).toLocaleString()} · 💬 {(post.comments || 0).toLocaleString()}</span>
                  <span className="font-extrabold text-[#FE2C55]">{post.engagementRate}%</span>
                </div>
              </div>
            )) : (
              <div className="text-[7.5px] text-gray-450 text-center py-6">Chưa có video TikTok nào</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
