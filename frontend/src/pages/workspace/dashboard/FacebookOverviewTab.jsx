import React from "react";
import { GenericDashboardTab } from "./GenericDashboardTab";

function SectionLabel({ children }) {
  return (
    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
      {children}
    </h3>
  );
}

export function FacebookOverviewTab({ realData = {} }) {
  const growthData    = realData.growth       || [];
  const balanceData   = realData.balance      || [];
  const postsData     = realData.postsPeriod  || [];
  const summary       = realData.summary      || {};

  // Tính tổng từ growthData (đã được filter theo dateRange) để card đồng bộ với chart
  const periodViews      = growthData.reduce((s, d) => s + (d.views      || 0), 0);
  const periodPageVisits = growthData.reduce((s, d) => s + (d.pageVisits || 0), 0);
  const periodContent    = growthData.reduce((s, d) => s + (d.totalContent || 0), 0);
  // followers là snapshot tại thời điểm cuối kỳ, không phải tổng cộng
  const periodFollowers  = growthData.length > 0
    ? (growthData[growthData.length - 1].followers ?? summary.followers ?? 0)
    : (summary.followers || 0);

  // ── 1. GROWTH ─────────────────────────────────────────────────────────────
  const growthConfig = [
    {
      key: "followers",
      label: "Followers",
      color: "bg-[#86EFAC] text-foreground",
      chartColor: "#4ADE80",
      type: "area",
      value: periodFollowers,
    },
    {
      key: "views",
      label: "Views",
      color: "bg-[#818CF8] text-white",
      chartColor: "#818CF8",
      type: "line",
      value: periodViews,
    },
    {
      key: "pageVisits",
      label: "Page visits",
      color: "bg-[#A7F3D0] text-foreground",
      chartColor: "#34D399",
      type: "line",
      value: periodPageVisits,
    },
    {
      key: "totalContent",
      label: "Total contents",
      color: "bg-[#FEF08A] text-foreground",
      chartColor: "#EAB308",
      type: "bar",
      yAxisId: "right",
      value: periodContent,
    },
  ];

  const growthSummary = [
    { label: "Daily page views", value: summary.dailyPageViews ?? 0 },
    { label: "Posts per week",   value: summary.postsPerWeek ?? 0 },
  ];

  // ── 2. BALANCE OF FOLLOWERS ───────────────────────────────────────────────
  const totalAcquired = balanceData.reduce((s, d) => s + (d.acquired || 0), 0);
  const totalLost     = balanceData.reduce((s, d) => s + (d.lost     || 0), 0);

  const balanceConfig = [
    {
      key: "acquired",
      label: "Acquired",
      color: "bg-[#818CF8] text-white",
      chartColor: "#818CF8",
      type: "area",
      value: totalAcquired,
    },
    {
      key: "lost",
      label: "Lost",
      color: "bg-[#F472B6] text-white",
      chartColor: "#F472B6",
      type: "line",
      value: totalLost,
    },
    {
      key: "totalContent",
      label: "Total content",
      color: "bg-[#FEF08A] text-foreground",
      chartColor: "#EAB308",
      type: "bar",
      yAxisId: "right",
      value: summary.totalContent || 0,
    },
  ];

  const balanceSummary = [
    { label: "Average daily new followers", value: summary.averageDailyNewFollowers ?? 0 },
  ];

  // ── 3. POSTS VIEWED IN PERIOD ─────────────────────────────────────────────
  const totalViews     = postsData.reduce((s, d) => s + (d.views     || 0), 0);
  const totalReactions = postsData.reduce((s, d) => s + (d.reactions || 0), 0);

  const viewedConfig = [
    {
      key: "views",
      label: "Views",
      color: "bg-[#EC4899] text-white",
      chartColor: "#EC4899",
      type: "area",
      value: totalViews,
    },
    {
      key: "reactions",
      label: "Reactions",
      color: "bg-[#F59E0B] text-white",
      chartColor: "#F59E0B",
      type: "line",
      value: totalReactions,
    },
  ];

  return (
    <div className="space-y-10">
      {/* ── GROWTH ────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Growth</SectionLabel>
        <GenericDashboardTab
          title="Growth"
          description="Biến động của Followers, Views, Page Visits và Total Contents"
          data={growthData}
          metricConfig={growthConfig}
          summaryGrid={growthSummary}
        />
      </div>

      {/* ── BALANCE OF FOLLOWERS ───────────────────────────────────────── */}
      <div>
        <SectionLabel>Balance of Followers</SectionLabel>
        <GenericDashboardTab
          title="Balance of Followers"
          description="Biến động của số lượng người theo dõi qua các ngày"
          data={balanceData}
          metricConfig={balanceConfig}
          summaryGrid={balanceSummary}
        />
      </div>

      {/* ── POSTS VIEWED IN PERIOD ─────────────────────────────────────── */}
      <div>
        <SectionLabel>Posts viewed in period</SectionLabel>
        <GenericDashboardTab
          title="Posts viewed in period"
          description="Lượt hiển thị và lượng tương tác của các bài viết trong khoảng thời gian"
          data={postsData}
          metricConfig={viewedConfig}
        />
      </div>
    </div>
  );
}
