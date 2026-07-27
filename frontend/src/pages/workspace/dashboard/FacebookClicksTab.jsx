import React from "react";
import { GenericDashboardTab } from "./GenericDashboardTab";

export function FacebookClicksTab({ realData = {} }) {
  const clicksData = realData.clicks || [];
  const summary = realData.summary || {};

  const totalClicks = clicksData.reduce((sum, d) => sum + (d.totalClicks || 0), 0);
  const totalPageVisits = clicksData.reduce((sum, d) => sum + (d.pageVisits || 0), 0);

  const metricConfig = [
    {
      key: "totalClicks",
      label: "Clicks",
      color: "bg-[#86EFAC] text-gray-900",
      chartColor: "#4ADE80",
      type: "area",
      value: totalClicks
    },
    {
      key: "pageVisits",
      label: "Page visits",
      color: "bg-[#E9D5FF] text-gray-900",
      chartColor: "#A855F7",
      type: "line",
      value: totalPageVisits
    },
    {
      key: "totalContent",
      label: "Total content",
      color: "bg-[#FEF08A] text-gray-900",
      chartColor: "#EAB308",
      type: "bar",
      yAxisId: "right",
      value: summary.totalContent || 0
    }
  ];

  return (
    <GenericDashboardTab
      title="Clicks on page"
      description="Lượt click vào các nút hành động, thông tin liên hệ và lượt truy cập trang"
      data={clicksData}
      metricConfig={metricConfig}
    />
  );
}
