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

export function FacebookOverviewWidget({
  channel = null,
  posts = [],
  color = "#1877F2",
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
          <span className="text-xs font-bold text-muted-foreground">FACEBOOK PERFORMANCE — Đang tải...</span>
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

  const weeklyReach = getWeeklyData(channel.analyticsData?.growth, "pageVisits");
  const chartData = weeklyReach.map((val, idx) => ({
    name: `Tuần ${idx + 1}`,
    "Reach": val
  }));

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num;
  };

  const topPosts = posts.filter(p => p.platform === "FACEBOOK").slice(0, 3);

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 mb-2.5">
        <div className="p-2 bg-gradient-to-br from-white to-gray-50/50 border border-border rounded-xl shadow-sm hover:shadow transition-all duration-300">
          <span className="text-[6.5px] text-gray-450 font-extrabold uppercase tracking-wider block">Người theo dõi</span>
          <div className="text-xs font-black text-blue-600 font-mono mt-0.5">
            {formatNumber(channel.followers)}
          </div>
        </div>
        <div className="p-2 bg-gradient-to-br from-white to-gray-50/50 border border-border rounded-xl shadow-sm hover:shadow transition-all duration-300">
          <span className="text-[6.5px] text-gray-450 font-extrabold uppercase tracking-wider block">Tiếp cận trang</span>
          <div className="text-xs font-black text-foreground font-mono mt-0.5">
            {formatNumber(channel.reach)}
          </div>
        </div>
        <div className="p-2 bg-gradient-to-br from-white to-gray-50/50 border border-border rounded-xl shadow-sm hover:shadow transition-all duration-300">
          <span className="text-[6.5px] text-gray-450 font-extrabold uppercase tracking-wider block">Số bài viết</span>
          <div className="text-xs font-black text-foreground font-mono mt-0.5">{channel.postsCount}</div>
        </div>
        <div className="p-2 bg-gradient-to-br from-white to-gray-50/50 border border-border rounded-xl shadow-sm hover:shadow transition-all duration-300">
          <span className="text-[6.5px] text-gray-450 font-extrabold uppercase tracking-wider block">Tương tác TB</span>
          <div className="text-xs font-black text-foreground font-mono mt-0.5">{channel.engagementRate}%</div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 items-stretch flex-1 min-h-0">
        {/* Reach Chart */}
        <div className="col-span-2 bg-gradient-to-br from-white to-gray-50/30 border border-border rounded-xl p-2.5 flex flex-col shadow-sm">
          <span className="text-[7px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2 block">Lượt tiếp cận theo tuần</span>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 2, right: 2, left: -25, bottom: 2 }}>
                <defs>
                  <linearGradient id={`fbBarGrad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.4} />
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
                <Bar 
                  dataKey="Reach" 
                  fill={`url(#fbBarGrad-${color.replace("#", "")})`} 
                  radius={[3, 3, 0, 0]} 
                  maxBarSize={12}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Posts List */}
        <div className="col-span-3 bg-gradient-to-br from-white to-gray-50/30 border border-border rounded-xl p-3 flex flex-col justify-between shadow-sm">
          <span className="text-[7px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2 block">
            Bài viết tốt nhất (Top Posts)
          </span>
          <div className="space-y-2 overflow-y-auto max-h-[110px] pr-1">
            {topPosts.length > 0 ? topPosts.map((post, idx) => (
              <div 
                key={post.id || idx} 
                className="border-b border-border pb-1.5 last:border-b-0 last:pb-0 hover:bg-muted/50 p-1 rounded transition-all duration-200"
              >
                <p className="text-[7px] text-foreground font-bold truncate line-clamp-1 w-full">{post.title}</p>
                <div className="flex justify-between items-center text-[6px] text-muted-foreground font-mono mt-1">
                  <span>Likes: {post.likes} · Shares: {post.shares}</span>
                  <span className="text-[#3B82F6] font-extrabold">{post.engagementRate}% Engagement</span>
                </div>
              </div>
            )) : (
              <div className="text-[7.5px] text-muted-foreground text-center py-6">Chưa có bài viết xuất bản</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
