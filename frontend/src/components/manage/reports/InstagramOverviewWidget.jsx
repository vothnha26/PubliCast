import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar } from "lucide-react";

export function InstagramOverviewWidget({
  channel = null,
  posts = [],
  color = "#E1306C",
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
          <span className="text-xs font-bold text-gray-500">INSTAGRAM PERFORMANCE — Đang tải...</span>
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

  const likesVal = channel.likes || 0;
  const commentsVal = channel.comments || 0;
  const sharesVal = channel.shares || 0;
  const clicksVal = channel.clicks || 0;
  const totalEng = likesVal + commentsVal + sharesVal + clicksVal || 1;

  const chartData = [
    { name: "Thích", value: likesVal, percentage: ((likesVal / totalEng) * 100).toFixed(0) },
    { name: "Bình luận", value: commentsVal, percentage: ((commentsVal / totalEng) * 100).toFixed(0) },
    { name: "Chia sẻ", value: sharesVal, percentage: ((sharesVal / totalEng) * 100).toFixed(0) },
    { name: "Clicks", value: clicksVal, percentage: ((clicksVal / totalEng) * 100).toFixed(0) }
  ].filter(d => d.value > 0);

  // Default if no interactions
  const donutData = chartData.length > 0 ? chartData : [
    { name: "Chưa có tương tác", value: 1, percentage: "100" }
  ];

  const COLORS = [color, "#52C79F", "#E6A735", "#C65880"];

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num;
  };

  const topPosts = posts.filter(p => p.platform === "INSTAGRAM").slice(0, 3);

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 mb-2.5">
        <div className="p-2 bg-gradient-to-br from-white to-gray-50/50 border border-gray-100 rounded-xl shadow-sm hover:shadow transition-all duration-300">
          <span className="text-[6.5px] text-gray-400 font-extrabold uppercase tracking-wider block">Người theo dõi</span>
          <div className="text-xs font-black text-pink-600 font-mono mt-0.5">
            {formatNumber(channel.followers)}
          </div>
        </div>
        <div className="p-2 bg-gradient-to-br from-white to-gray-50/50 border border-gray-100 rounded-xl shadow-sm hover:shadow transition-all duration-300">
          <span className="text-[6.5px] text-gray-400 font-extrabold uppercase tracking-wider block">Lượt tiếp cận</span>
          <div className="text-xs font-black text-gray-800 font-mono mt-0.5">
            {formatNumber(channel.reach)}
          </div>
        </div>
        <div className="p-2 bg-gradient-to-br from-white to-gray-50/50 border border-gray-100 rounded-xl shadow-sm hover:shadow transition-all duration-300">
          <span className="text-[6.5px] text-gray-400 font-extrabold uppercase tracking-wider block">Lượt hiển thị</span>
          <div className="text-xs font-black text-gray-800 font-mono mt-0.5">
            {formatNumber(channel.impressions)}
          </div>
        </div>
        <div className="p-2 bg-gradient-to-br from-white to-gray-50/50 border border-gray-100 rounded-xl shadow-sm hover:shadow transition-all duration-300">
          <span className="text-[6.5px] text-gray-400 font-extrabold uppercase tracking-wider block">Bài đăng</span>
          <div className="text-xs font-black text-gray-800 font-mono mt-0.5">{channel.postsCount}</div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 items-stretch flex-1 min-h-0">
        {/* Interaction Donut Chart */}
        <div className="col-span-2 bg-gradient-to-br from-white to-gray-55/30 border border-gray-100 rounded-xl p-2 flex flex-col justify-between shadow-sm">
          <span className="text-[7px] font-extrabold text-gray-500 uppercase tracking-wider mb-1 block">Cơ cấu tương tác</span>
          <div className="flex-1 flex items-center justify-center min-h-0 relative">
            <ResponsiveContainer width="95%" height="95%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius="50%"
                  outerRadius="75%"
                  paddingAngle={2}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: "rgba(255, 255, 255, 0.95)", 
                    border: "1px solid #E2E8F0", 
                    borderRadius: "6px", 
                    fontSize: "6px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                    padding: "3px 6px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center label */}
            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[5px] text-gray-400 font-extrabold uppercase">Likes</span>
              <span className="text-[8px] font-black text-gray-700">
                {likesVal > 0 ? `${((likesVal / totalEng) * 100).toFixed(0)}%` : "0%"}
              </span>
            </div>
          </div>
          
          {/* Custom Legend */}
          <div className="grid grid-cols-2 gap-1 text-[5px] font-bold text-gray-500 font-mono mt-1 px-1">
            {donutData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="truncate">{item.name}: {item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Posts List */}
        <div className="col-span-3 bg-gradient-to-br from-white to-gray-50/30 border border-gray-100 rounded-xl p-3 flex flex-col justify-between shadow-sm">
          <span className="text-[7px] font-extrabold text-gray-500 uppercase tracking-wider mb-2 block">
            Bài viết tốt nhất (Top Posts)
          </span>
          <div className="space-y-2 overflow-y-auto max-h-[110px] pr-1">
            {topPosts.length > 0 ? topPosts.map((post, idx) => (
              <div 
                key={post.id || idx} 
                className="border-b border-gray-100 pb-1.5 last:border-b-0 last:pb-0 hover:bg-gray-50/50 p-1 rounded transition-all duration-200"
              >
                <p className="text-[7px] text-gray-700 font-bold truncate line-clamp-1 w-full">{post.title}</p>
                <div className="flex justify-between items-center text-[6px] text-gray-400 font-mono mt-1">
                  <span>Likes: {post.likes} · Comments: {post.comments}</span>
                  <span className="text-pink-500 font-extrabold">{post.engagementRate}% Engagement</span>
                </div>
              </div>
            )) : (
              <div className="text-[7.5px] text-gray-450 text-center py-6">Chưa có bài viết xuất bản</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
