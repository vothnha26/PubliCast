import React from "react";
import { GenericDashboardTab } from "../common/GenericDashboardTab";
import { InsightsSummaryWidget } from "../common/InsightsSummaryWidget";

export function YouTubeCommunityTab({
  dateRange,
  metrics,
  stats,
  realData = {},
  communityGrowthData = [],
  publishedVideos = [],
  totalPeriodGained = 0,
  totalPeriodViews = 0,
  totalPeriodVideos = 0
}) {
  const ytGrowthConfig = [
    {
      key: "subscribers",
      label: "Subscribers",
      color: "bg-[#8E9BEE] text-white",
      chartColor: "#8E9BEE",
      type: "area",
      value: totalPeriodGained ?? stats?.subscribers ?? 0
    },
    {
      key: "views",
      label: "Video views",
      color: "bg-[#86EFAC] text-foreground",
      chartColor: "#86EFAC",
      type: "line",
      value: totalPeriodViews ?? 0
    },
    {
      key: "revenue",
      label: "Revenue",
      color: "bg-[#C084FC] text-white",
      chartColor: "#C084FC",
      type: "line",
      value: "0"
    },
    {
      key: "videos",
      label: "Videos",
      color: "bg-[#E6A34A] text-white",
      chartColor: "#E6A34A",
      type: "bar",
      yAxisId: "right",
      value: totalPeriodVideos ?? stats?.videos ?? 0
    }
  ];

  const ytBalanceConfig = [
    {
      key: "gained",
      dataKey: "new",
      label: "Gained",
      color: "bg-[#8E9BEE] text-white",
      chartColor: "#8E9BEE",
      type: "area",
      value: totalPeriodGained || 0
    },
    {
      key: "lost",
      label: "Lost",
      color: "bg-[#F7A6E0] text-white",
      chartColor: "#F7A6E0",
      type: "area",
      value: "0"
    },
    {
      key: "videos",
      label: "Videos",
      color: "bg-[#E6A34A] text-white",
      chartColor: "#E6A34A",
      type: "bar",
      yAxisId: "right",
      value: stats?.videos || 0
    }
  ];

  return (
    <div className="space-y-6">
      <InsightsSummaryWidget
        dateRange={dateRange}
        metrics={metrics}
        stats={stats}
        realData={realData}
        communityGrowthData={communityGrowthData}
        publishedVideos={publishedVideos}
        platform="youtube"
      />

      <GenericDashboardTab
        title="Growth"
        description="Biểu đồ tăng trưởng người theo dõi, lượt xem và doanh thu"
        data={communityGrowthData}
        metricConfig={ytGrowthConfig}
        watermark="publicast"
      />

      <GenericDashboardTab
        title="Balance of Subscribers"
        description="Biến động số lượng người đăng ký mới và hủy đăng ký"
        data={communityGrowthData}
        metricConfig={ytBalanceConfig}
        watermark="publicast"
      />
    </div>
  );
}
