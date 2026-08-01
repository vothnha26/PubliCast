import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Calendar } from "lucide-react";
import { PlatformIcon } from "../../shared/PlatformIcon";

const getCombinedGrowth = (channels) => {
  const days = Array.from({ length: 30 }, () => 0);
  if (!channels || !Array.isArray(channels)) return days;
  
  channels.forEach(ch => {
    const growth = ch.analyticsData?.growth;
    if (growth && Array.isArray(growth)) {
      growth.forEach((dayData, idx) => {
        if (idx < 30) {
          const eng = (dayData.reactions || dayData.likes || 0) + (dayData.comments || 0) + (dayData.shares || 0);
          days[idx] += eng;
        }
      });
    }
  });
  return days;
};

export function SummaryOverviewWidget({
  overview = { reach: 0, impressions: 0, engagements: 0, engagementRate: 0 },
  channels = [],
  color = "#5C90A8",
  period = "30 ngày qua",
  previewLoading = false,
  previewData = null
}) {
  if (previewLoading || !previewData) {
    return (
      <div className="w-full h-full flex flex-col justify-between p-2">
        <div className="flex flex-col items-center justify-center gap-2 text-center py-4 bg-muted border border-dashed border-border rounded-xl">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center animate-bounce">
            <Calendar size={16} className="text-muted-foreground" />
          </div>
          <span className="text-xs font-bold text-muted-foreground">TỔNG QUAN ĐA KÊNH — Đang tải dữ liệu...</span>
          <span className="text-[10px] text-muted-foreground max-w-[200px] leading-relaxed">
            Hệ thống đang tải số liệu phân tích từ các kênh đã kết nối.
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3 my-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-5 gap-3 h-24">
          <div className="col-span-2 bg-muted rounded-lg animate-pulse" />
          <div className="col-span-3 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  const combinedGrowth = getCombinedGrowth(channels);
  const chartData = combinedGrowth.map((val, idx) => ({
    name: `Ngày ${idx + 1}`,
    "Tương tác": val
  }));

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num;
  };

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <div 
          className="p-2.5 bg-gradient-to-br from-white to-gray-50/50 border border-border rounded-xl shadow-sm hover:shadow transition-all duration-300" 
          style={{ borderLeft: `4px solid ${color}` }}
        >
          <div className="text-[7px] text-muted-foreground font-extrabold uppercase tracking-wider">Tiếp cận (Reach)</div>
          <div className="text-sm font-black text-gray-850 font-mono mt-0.5">
            {formatNumber(overview.reach)}
          </div>
        </div>
        <div 
          className="p-2.5 bg-gradient-to-br from-white to-gray-50/50 border border-border rounded-xl shadow-sm hover:shadow transition-all duration-300" 
          style={{ borderLeft: `4px solid #52C79F` }}
        >
          <div className="text-[7px] text-muted-foreground font-extrabold uppercase tracking-wider">Hiển thị (Impressions)</div>
          <div className="text-sm font-black text-gray-850 font-mono mt-0.5">
            {formatNumber(overview.impressions)}
          </div>
        </div>
        <div 
          className="p-2.5 bg-gradient-to-br from-white to-gray-50/50 border border-border rounded-xl shadow-sm hover:shadow transition-all duration-300" 
          style={{ borderLeft: `4px solid #E6A735` }}
        >
          <div className="text-[7px] text-muted-foreground font-extrabold uppercase tracking-wider">Tương tác (Engagements)</div>
          <div className="text-sm font-black text-gray-850 font-mono mt-0.5">
            {formatNumber(overview.engagements)}
          </div>
        </div>
        <div 
          className="p-2.5 bg-gradient-to-br from-white to-gray-50/50 border border-border rounded-xl shadow-sm hover:shadow transition-all duration-300" 
          style={{ borderLeft: `4px solid #C65880` }}
        >
          <div className="text-[7px] text-muted-foreground font-extrabold uppercase tracking-wider">Tỷ lệ tương tác</div>
          <div className="text-sm font-black text-gray-850 font-mono mt-0.5">{overview.engagementRate}%</div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 items-stretch flex-1 min-h-0">
        {/* Active Channels List */}
        <div className="col-span-2 bg-gradient-to-br from-white to-gray-50/30 border border-border rounded-xl p-3 flex flex-col justify-between shadow-sm">
          <span className="text-[7.5px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2 block">
            Kênh hoạt động ({channels.length})
          </span>
          <div className="space-y-2 overflow-y-auto max-h-[105px] pr-1 scrollbar-thin">
            {channels.map((ch, idx) => (
              <div 
                key={idx} 
                className="flex justify-between items-center text-[7.5px] p-1.5 rounded-lg bg-muted/80 hover:bg-card hover:shadow-sm border border-transparent hover:border-border transition-all duration-200"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <PlatformIcon platform={ch.platform} size={11} />
                  <span className="font-extrabold text-foreground truncate w-20">{ch.displayName}</span>
                </div>
                <span className="font-mono font-black text-muted-foreground">
                  {formatNumber(ch.followers)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Interaction Trend Recharts Area Chart */}
        <div className="col-span-3 bg-gradient-to-br from-white to-gray-50/30 border border-border rounded-xl p-3 flex flex-col shadow-sm">
          <span className="text-[7.5px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2 block">
            Xu hướng tương tác (30 ngày)
          </span>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 2, right: 2, left: -25, bottom: 2 }}>
                <defs>
                  <linearGradient id={`sumGrad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 5, fill: "#94A3B8", fontWeight: "bold" }} 
                  axisLine={false} 
                  tickLine={false}
                  hide
                />
                <YAxis 
                  tick={{ fontSize: 6, fill: "#94A3B8", fontWeight: "bold", fontFamily: "monospace" }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <Tooltip 
                  contentStyle={{ 
                    background: "rgba(255, 255, 255, 0.95)", 
                    backdropFilter: "blur(4px)",
                    border: "1px solid #E2E8F0", 
                    borderRadius: "8px", 
                    fontSize: "7px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                    padding: "4px 8px"
                  }}
                  itemStyle={{ color: color, fontWeight: "bold", padding: 0 }}
                  labelStyle={{ fontWeight: "black", color: "#475569", marginBottom: "2px" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Tương tác" 
                  stroke={color} 
                  strokeWidth={1.5}
                  fill={`url(#sumGrad-${color.replace("#", "")})`} 
                  activeDot={{ r: 3, strokeWidth: 1, fill: color }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
