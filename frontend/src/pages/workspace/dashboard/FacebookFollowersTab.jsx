import React from "react";
import { GenericDashboardTab } from "./GenericDashboardTab";

export function FacebookFollowersTab({ realData = {} }) {
  const balanceData = realData.balance || [];
  const summary = realData.summary || {};

  const totalAcquired = balanceData.reduce((sum, d) => sum + (d.acquired || 0), 0);
  const totalLost = balanceData.reduce((sum, d) => sum + (d.lost || 0), 0);

  const metricConfig = [
    {
      key: "acquired",
      label: "Acquired",
      color: "bg-[#818CF8] text-white",
      chartColor: "#818CF8",
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
    },
    {
      key: "totalContent",
      label: "Total content",
      color: "bg-[#F59E0B] text-white",
      chartColor: "#F59E0B",
      type: "bar",
      yAxisId: "right",
      value: summary.totalContent || 0
    }
  ];

  return (
    <GenericDashboardTab
      title="Balance of Followers"
      description="Biến động của số lượng người theo dõi qua các ngày"
      data={balanceData}
      metricConfig={metricConfig}
    />
  );
}
