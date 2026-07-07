import React from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
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

export function DiscordOverviewWidget({
  channel = null,
  color = "#5865F2",
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
          <span className="text-xs font-bold text-gray-500">DISCORD SERVER INSIGHTS — Đang tải...</span>
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

  const weeklyMembers = getWeeklyData(channel.analyticsData?.growth, "followers");
  const growthChartData = weeklyMembers.map((val, idx) => ({
    name: `W${idx + 1}`,
    "Members": val
  }));

  const weeklyMessages = getWeeklyData(channel.analyticsData?.growth, "totalContent");
  const msgChartData = weeklyMessages.map((val, idx) => ({
    name: `W${idx + 1}`,
    "Messages": val
  }));

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num;
  };

  const activeRatio = channel.followers > 0 ? ((channel.clicks / channel.followers) * 100).toFixed(1) : "0.0";

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 mb-2.5">
        <div className="p-2 bg-gradient-to-br from-white to-gray-55/50 border border-gray-100 rounded-xl shadow-sm hover:shadow transition-all duration-300" style={{ borderTop: `2px solid #5865F2` }}>
          <span className="text-[6.5px] text-gray-400 font-bold uppercase tracking-wider block">Total Members</span>
          <div className="text-xs font-black text-[#5865F2] font-mono mt-0.5">{formatNumber(channel.followers)}</div>
        </div>
        <div className="p-2 bg-gradient-to-br from-white to-gray-55/50 border border-gray-100 rounded-xl shadow-sm hover:shadow transition-all duration-300" style={{ borderTop: `2px solid #57F287` }}>
          <span className="text-[6.5px] text-gray-400 font-bold uppercase tracking-wider block">Active Users</span>
          <div className="text-xs font-black text-[#30ca60] font-mono mt-0.5">{formatNumber(channel.clicks)}</div>
        </div>
        <div className="p-2 bg-gradient-to-br from-white to-gray-55/50 border border-gray-100 rounded-xl shadow-sm hover:shadow transition-all duration-300" style={{ borderTop: `2px solid ${color}` }}>
          <span className="text-[6.5px] text-gray-400 font-bold uppercase tracking-wider block">New Members</span>
          <div className="text-xs font-black font-mono mt-0.5" style={{ color }}>+{channel.likes}</div>
        </div>
        <div className="p-2 bg-gradient-to-br from-white to-gray-55/50 border border-gray-100 rounded-xl shadow-sm hover:shadow transition-all duration-300" style={{ borderTop: `2px solid #FEE75C` }}>
          <span className="text-[6.5px] text-gray-400 font-bold uppercase tracking-wider block">Messages</span>
          <div className="text-xs font-black text-[#dca61d] font-mono mt-0.5">{formatNumber(channel.postsCount)}</div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 items-stretch flex-1 min-h-0">
        {/* Members Growth Chart */}
        <div className="col-span-2 bg-gradient-to-br from-white to-gray-50/30 border border-gray-100 rounded-xl p-2.5 flex flex-col shadow-sm">
          <span className="text-[7px] font-extrabold text-gray-500 uppercase tracking-wider mb-2 block">Tăng trưởng thành viên</span>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthChartData} margin={{ top: 5, right: 5, left: -25, bottom: 2 }}>
                <defs>
                  <linearGradient id="dcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5865F2" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#5865F2" stopOpacity={0.01} />
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
                  itemStyle={{ color: "#5865F2", fontWeight: "bold" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Members" 
                  stroke="#5865F2" 
                  strokeWidth={1.5} 
                  fill="url(#dcGrad)" 
                  activeDot={{ r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity & Messages */}
        <div className="col-span-3 bg-gradient-to-br from-white to-gray-50/30 border border-gray-100 rounded-xl p-3 flex flex-col justify-between shadow-sm">
          <span className="text-[7px] font-extrabold text-gray-500 uppercase tracking-wider mb-2 block">Hoạt động Server</span>
          
          {/* Active ratio progress bar */}
          <div className="mb-2">
            <div className="flex justify-between text-[6px] font-bold text-gray-500 mb-1">
              <span>Tỷ lệ thành viên hoạt động</span>
              <span style={{ color: "#57F287" }}>{activeRatio}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
              <div 
                className="h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, parseFloat(activeRatio))}%`, backgroundColor: "#57F287" }} 
              />
            </div>
          </div>

          {/* Message activity weekly bar chart */}
          <div className="flex-1 min-h-0 flex flex-col justify-between">
            <span className="text-[6.5px] text-gray-400 font-extrabold uppercase tracking-wider block mb-1">Tin nhắn theo tuần</span>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={msgChartData} margin={{ top: 2, right: 2, left: -25, bottom: 2 }}>
                  <defs>
                    <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FEE75C" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#FEE75C" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#F1F5F9" />
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
                      padding: "3px 6px"
                    }}
                    itemStyle={{ color: "#dca61d", fontWeight: "bold" }}
                  />
                  <Bar 
                    dataKey="Messages" 
                    fill="url(#msgGrad)" 
                    radius={[2, 2, 0, 0]} 
                    maxBarSize={15}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-2 pt-1 border-t border-gray-100">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[6.5px] text-gray-500 font-extrabold">
              <span className="text-green-500">{channel.clicks}</span> thành viên online ngay bây giờ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
