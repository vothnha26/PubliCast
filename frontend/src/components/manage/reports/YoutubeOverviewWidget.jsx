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

export function YoutubeOverviewWidget({
  channel = null,
  posts = [],
  color = "#FF0000",
  previewLoading = false,
  previewData = null
}) {
  if (previewLoading || !previewData || !channel) {
    return (
      <div className="w-full h-full flex flex-col justify-between p-2">
        <div className="flex flex-col items-center justify-center gap-2 text-center py-4 bg-muted border border-dashed border-border rounded-xl">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center animate-bounce">
            <Calendar size={16} className="text-muted-foreground" />
          </div>
          <span className="text-xs font-bold text-muted-foreground">YOUTUBE PERFORMANCE — Đang tải...</span>
        </div>
        <div className="grid grid-cols-4 gap-3 my-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-5 gap-3 h-24">
          <div className="col-span-2 bg-muted rounded-lg animate-pulse" />
          <div className="col-span-3 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  const weeklySubs = getWeeklyData(channel.analyticsData?.growth, "subscribersGained");
  const chartData = weeklySubs.map((val, idx) => ({
    name: `W${idx + 1}`,
    "Subscribers": val
  }));

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num;
  };

  const topVideos = posts.filter(p => p.platform === "YOUTUBE").slice(0, 3);

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 mb-2.5">
        <div className="p-2 bg-gradient-to-br from-white to-gray-50/50 border border-border rounded-xl shadow-sm hover:shadow transition-all duration-300">
          <span className="text-[6.5px] text-gray-450 font-extrabold uppercase tracking-wider block">Subscribers</span>
          <div className="text-xs font-black text-red-655 font-mono mt-0.5">
            {formatNumber(channel.followers)}
          </div>
        </div>
        <div className="p-2 bg-gradient-to-br from-white to-gray-50/50 border border-border rounded-xl shadow-sm hover:shadow transition-all duration-300">
          <span className="text-[6.5px] text-gray-450 font-bold uppercase block">Lượt xem</span>
          <div className="text-xs font-black text-foreground font-mono mt-0.5">
            {formatNumber(channel.impressions)}
          </div>
        </div>
        <div className="p-2 bg-gradient-to-br from-white to-gray-50/50 border border-border rounded-xl shadow-sm hover:shadow transition-all duration-300">
          <span className="text-[6.5px] text-gray-450 font-bold uppercase block">Videos đã đăng</span>
          <div className="text-xs font-black text-foreground font-mono mt-0.5">{channel.postsCount}</div>
        </div>
        <div className="p-2 bg-gradient-to-br from-white to-gray-50/50 border border-border rounded-xl shadow-sm hover:shadow transition-all duration-300">
          <span className="text-[6.5px] text-gray-450 font-bold uppercase block">Tương tác TB</span>
          <div className="text-xs font-black text-foreground font-mono mt-0.5">{channel.engagementRate}%</div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 items-stretch flex-1 min-h-0">
        {/* Subscriber Growth Line Chart */}
        <div className="col-span-2 bg-gradient-to-br from-white to-gray-50/30 border border-border rounded-xl p-2.5 flex flex-col shadow-sm">
          <span className="text-[7px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2 block">Tăng trưởng Subscribers</span>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 2 }}>
                <defs>
                  <linearGradient id={`ytGrad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.01} />
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
                  itemStyle={{ color: color, fontWeight: "bold" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Subscribers" 
                  stroke={color} 
                  strokeWidth={1.5} 
                  fill={`url(#ytGrad-${color.replace("#", "")})`} 
                  activeDot={{ r: 3, fill: color }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Videos List */}
        <div className="col-span-3 bg-gradient-to-br from-white to-gray-50/30 border border-border rounded-xl p-3 flex flex-col justify-between shadow-sm">
          <span className="text-[7px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2 block">
            Video nổi bật nhất (Top Videos)
          </span>
          <div className="space-y-2 overflow-y-auto max-h-[110px] pr-1">
            {topVideos.length > 0 ? topVideos.map((post, idx) => (
              <div 
                key={post.id || idx} 
                className="border-b border-border pb-1.5 last:border-b-0 last:pb-0 hover:bg-muted/50 p-1 rounded transition-all duration-200"
              >
                <p className="text-[7px] text-foreground font-bold truncate line-clamp-1 w-full">{post.title}</p>
                <div className="flex justify-between items-center text-[6px] text-muted-foreground font-mono mt-1">
                  <span>Xem: {post.likes * 12} · Thích: {post.likes}</span>
                  <span className="text-red-500 font-extrabold">{post.engagementRate}%</span>
                </div>
              </div>
            )) : (
              <div className="text-[7.5px] text-gray-450 text-center py-6">Chưa có video xuất bản</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
