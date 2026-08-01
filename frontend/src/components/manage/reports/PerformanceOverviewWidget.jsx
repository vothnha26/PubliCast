import React from "react";
import { PlatformIcon } from "../../shared/PlatformIcon";
import { ChartFactory } from "./ChartFactory";
import { CHART_TYPES } from "./constants";
import { Layers } from "lucide-react";

/**
 * PerformanceOverviewWidget
 * SRP component that handles rendering of overview KPIs and aggregate engagement trends.
 */
export function PerformanceOverviewWidget({
  isLoading,
  overview,
  channels = [],
  selectedColor = "#5C90A8",
  period = ""
}) {
  
  // Render loading skeleton
  if (isLoading) {
    return (
      <div className="bg-card dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl p-6 space-y-6 shadow-sm">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center pb-4 border-b border-border dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="w-40 h-5 bg-gray-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          </div>
          <div className="w-24 h-4 bg-gray-200 dark:bg-slate-800 rounded-lg animate-pulse" />
        </div>

        {/* KPIs Grid Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-muted dark:bg-slate-950 border border-border dark:border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="w-16 h-3 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="w-24 h-6 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Content Layout Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 bg-muted dark:bg-slate-950 border border-border dark:border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="w-24 h-4 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="w-20 h-3 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
                  <div className="w-10 h-3 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-3 bg-muted dark:bg-slate-950 border border-border dark:border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="w-32 h-4 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="w-full h-32 bg-gray-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Format Helper
  const formatNumber = (num) => {
    if (num === undefined || num === null) return "0";
    return num >= 1000 ? `${(num / 1000).toFixed(1)}K` : num.toString();
  };

  // Process data for charts
  const getCombinedGrowthData = () => {
    const days = Array.from({ length: 30 }, (_, i) => ({
      name: `Day ${i + 1}`,
      engagement: 0
    }));

    if (!channels || !Array.isArray(channels)) return days;

    channels.forEach((ch) => {
      const growth = ch.analyticsData?.growth;
      if (growth && Array.isArray(growth)) {
        growth.forEach((dayData, idx) => {
          if (idx < 30) {
            const eng =
              (dayData.reactions || dayData.likes || 0) +
              (dayData.comments || 0) +
              (dayData.shares || 0);
            days[idx].engagement += eng;
          }
        });
      }
    });
    return days;
  };

  const chartData = getCombinedGrowthData();

  return (
    <div className="bg-card dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl p-6 space-y-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Widget Header */}
      <div className="flex justify-between items-center pb-4 border-b border-border dark:border-slate-800">
        <h3 className="text-base font-extrabold text-foreground dark:text-white uppercase tracking-tight flex items-center gap-2">
          <Layers size={18} className="text-[#3B82F6]" />
          Tổng Quan Đa Kênh (Performance Overview)
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground dark:text-muted-foreground font-bold tracking-widest uppercase">
          {period}
        </span>
      </div>

      {/* KPIs Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Tiếp cận (Reach)", value: formatNumber(overview?.reach), borderLeft: selectedColor },
          { label: "Hiển thị (Impressions)", value: formatNumber(overview?.impressions), borderLeft: "#52C79F" },
          { label: "Tương tác (Engagements)", value: formatNumber(overview?.engagements), borderLeft: "#E6A735" },
          { label: "Tỷ lệ tương tác", value: `${overview?.engagementRate || 0}%`, borderLeft: "#C65880" }
        ].map((kpi, i) => (
          <div
            key={i}
            className="bg-muted dark:bg-slate-950 border border-border dark:border-slate-850 rounded-2xl p-4 transition-all duration-300 hover:shadow-sm"
            style={{ borderLeft: `4px solid ${kpi.borderLeft}` }}
          >
            <span className="text-[10px] text-muted-foreground dark:text-muted-foreground font-bold uppercase tracking-wider block">
              {kpi.label}
            </span>
            <div className="text-xl font-black text-gray-850 dark:text-white font-mono mt-1">
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Sections: Connected channels and graph */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Connected Channels List */}
        <div className="lg:col-span-2 bg-muted dark:bg-slate-950 border border-border dark:border-slate-850 rounded-2xl p-4.5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider mb-3 block">
              Kênh Hoạt Động
            </span>
            <div className="space-y-2.5">
              {channels.length > 0 ? (
                channels.map((ch, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <PlatformIcon platform={ch.platform} size={14} />
                      <span className="font-bold text-foreground dark:text-gray-300 truncate w-32">
                        {ch.displayName}
                      </span>
                    </div>
                    <span className="font-mono font-extrabold text-muted-foreground dark:text-muted-foreground">
                      {formatNumber(ch.followers)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground text-center py-4">Chưa liên kết kênh nào</div>
              )}
            </div>
          </div>
        </div>

        {/* Chart Trend Area */}
        <div className="lg:col-span-3 bg-muted dark:bg-slate-950 border border-border dark:border-slate-850 rounded-2xl p-4.5 flex flex-col justify-between">
          <span className="text-[10px] font-extrabold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider block mb-2">
            Xu hướng tương tác thực tế
          </span>
          <div className="w-full flex-1 min-h-[120px]">
            <ChartFactory
              type={CHART_TYPES.AREA}
              data={chartData}
              config={[{ key: "engagement", label: "Tương tác", chartColor: selectedColor }]}
              color={selectedColor}
              height={130}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
