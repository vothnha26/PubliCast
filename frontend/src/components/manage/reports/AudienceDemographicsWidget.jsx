import React from "react";
import { ChartFactory } from "./ChartFactory";
import { CHART_TYPES } from "./constants";
import { PlatformIcon } from "../../shared/PlatformIcon";
import { Palette } from "lucide-react";

/**
 * AudienceDemographicsWidget
 * SRP component that handles rendering of platform-specific interaction structures
 * (such as Instagram demographics or interaction breakdowns) using Recharts Doughnut chart via ChartFactory.
 */
export function AudienceDemographicsWidget({
  isLoading,
  channelData,
  selectedColor = "#5C90A8",
  period = ""
}) {

  // Render loading skeleton
  if (isLoading) {
    return (
      <div className="bg-card dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
        <div className="flex justify-between items-center pb-3 border-b border-border dark:border-slate-800 animate-pulse">
          <div className="w-48 h-5 bg-gray-200 dark:bg-slate-800 rounded" />
          <div className="w-16 h-3 bg-gray-200 dark:bg-slate-800 rounded" />
        </div>
        <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-4">
          <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-slate-800 animate-pulse" />
          <div className="space-y-2 w-32">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-slate-800 animate-pulse" />
                <div className="w-20 h-3 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Fallback empty metrics structure
  const igChannel = channelData || {
    likes: 0,
    comments: 0,
    shares: 0,
    clicks: 0
  };

  const likesVal = igChannel.likes || 0;
  const commentsVal = igChannel.comments || 0;
  const sharesVal = igChannel.shares || 0;
  const clicksVal = igChannel.clicks || 0;
  const totalIgEng = likesVal + commentsVal + sharesVal + clicksVal || 1;

  const likesPct = (likesVal / totalIgEng) * 100;
  const commentsPct = (commentsVal / totalIgEng) * 100;
  const sharesPct = (sharesVal / totalIgEng) * 100;
  const clicksPct = (clicksVal / totalIgEng) * 100;

  // Format data for Recharts Doughnut Chart
  const doughnutData = [
    { name: "Thích (Likes)", value: likesVal, percentage: likesPct, color: selectedColor },
    { name: "Bình luận (Comments)", value: commentsVal, percentage: commentsPct, color: "#52C79F" },
    { name: "Chia sẻ (Shares)", value: sharesVal, percentage: sharesPct, color: "#E6A735" },
    { name: "Clicks", value: clicksVal, percentage: clicksPct, color: "#C65880" }
  ];

  return (
    <div className="bg-card dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Widget Header */}
      <div className="flex justify-between items-center pb-3 border-b border-border dark:border-slate-800">
        <h3 className="text-xs font-extrabold text-foreground dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          <Palette size={14} className="text-pink-500" />
          Cơ cấu tương tác thực tế (Instagram breakdown)
        </h3>
        <span className="text-[9px] font-mono text-muted-foreground dark:text-muted-foreground font-bold">
          {period}
        </span>
      </div>

      {/* Charts Display */}
      <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-2">
        {/* Doughnut Chart container */}
        <div className="w-28 h-28 relative flex items-center justify-center">
          <ChartFactory
            type={CHART_TYPES.DOUGHNUT}
            data={doughnutData}
            height={112}
          />
          {/* Absolute text in the middle of Doughnut chart */}
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-[8px] text-gray-450 dark:text-muted-foreground font-bold uppercase tracking-wider">
              Tương Tác
            </span>
            <span className="text-xs font-black text-foreground dark:text-white font-mono">
              {totalIgEng >= 1000 ? `${(totalIgEng / 1000).toFixed(1)}K` : totalIgEng.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Legend Grid */}
        <div className="flex flex-col gap-1.5 text-[10px] font-bold text-muted-foreground dark:text-muted-foreground font-mono">
          {doughnutData.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span>
                {item.name}: {item.percentage.toFixed(0)}%
              </span>
              <span className="text-muted-foreground dark:text-muted-foreground font-normal">
                ({item.value.toLocaleString()})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
