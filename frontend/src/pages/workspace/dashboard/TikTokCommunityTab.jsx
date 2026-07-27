import React from "react";
import { GenericDashboardTab } from "./GenericDashboardTab";

export function TikTokCommunityTab({ realData = {}, dateRange }) {
  const filteredGrowth = React.useMemo(() => {
    const rawGrowth = realData.growth || [];
    if (!dateRange || !dateRange.from) return rawGrowth;

    const fromDate = new Date(dateRange.from);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = dateRange.to ? new Date(dateRange.to) : new Date();
    toDate.setHours(23, 59, 59, 999);

    return rawGrowth.filter(g => {
      const gDate = new Date(g.date);
      return gDate >= fromDate && gDate <= toDate;
    });
  }, [realData.growth, dateRange]);

  const filteredBalance = React.useMemo(() => {
    const rawBalance = realData.balance || [];
    if (!dateRange || !dateRange.from) return rawBalance;

    const fromDate = new Date(dateRange.from);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = dateRange.to ? new Date(dateRange.to) : new Date();
    toDate.setHours(23, 59, 59, 999);

    return rawBalance.filter(b => {
      const bDate = new Date(b.date);
      return bDate >= fromDate && bDate <= toDate;
    });
  }, [realData.balance, dateRange]);

  const growthData = filteredGrowth;
  const balanceData = filteredBalance;
  const summary = realData.summary || {};

  const totalAcquired = balanceData.reduce((sum, d) => sum + (d.acquired || 0), 0);
  const totalLost = balanceData.reduce((sum, d) => sum + (d.lost || 0), 0);

  // Growth configuration
  const growthConfig = [
    {
      key: "followers",
      label: "Followers",
      color: "bg-[#8E9BEE] text-white",
      chartColor: "#8E9BEE",
      type: "area",
      value: summary.followers ?? growthData[growthData.length - 1]?.followers ?? 0
    },
    {
      key: "totalContent",
      label: "Posts",
      color: "bg-[#E6A34A] text-white",
      chartColor: "#E6A34A",
      type: "bar",
      yAxisId: "right",
      value: summary.totalContent ?? 0
    }
  ];

  // Balance configuration
  const balanceConfig = [
    {
      key: "acquired",
      label: "Gained",
      color: "bg-[#7EB299] text-white",
      chartColor: "#7EB299",
      type: "area",
      value: totalAcquired
    },
    {
      key: "lost",
      label: "Lost",
      color: "bg-[#F472B6] text-white",
      chartColor: "#F472B6",
      type: "line",
      value: totalLost
    }
  ];

  return (
    <div className="space-y-6">
      <GenericDashboardTab
        title="Growth"
        description="Biểu đồ tăng trưởng người theo dõi và bài đăng theo thời gian"
        data={growthData}
        metricConfig={growthConfig}
        watermark="tiktok"
      />

      <GenericDashboardTab
        title="Balance of Followers"
        description="Biến động số lượng người theo dõi mới và hủy theo dõi"
        data={balanceData}
        metricConfig={balanceConfig}
      />
    </div>
  );
}
