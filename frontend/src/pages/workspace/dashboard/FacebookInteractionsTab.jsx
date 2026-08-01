import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { GenericDashboardTab } from "./GenericDashboardTab";

export function FacebookInteractionsTab({ realData = {} }) {
  const chartData = realData.growth || [];
  const interactions = realData.interactions || {};

  const metricConfig = [
    {
      key: "reactions",
      label: "Reactions",
      color: "bg-[#818CF8] text-white",
      chartColor: "#818CF8",
      type: "area",
      value: interactions.reactions || 0
    },
    {
      key: "comments",
      label: "Comments",
      color: "bg-[#4ADE80] text-foreground",
      chartColor: "#4ADE80",
      type: "line",
      value: interactions.comments || 0
    },
    {
      key: "shares",
      label: "Shared",
      color: "bg-[#F472B6] text-white",
      chartColor: "#F472B6",
      type: "line",
      value: interactions.shares || 0
    }
  ];

  const dailyAverages = [
    { label: "Daily reactions", value: interactions.dailyReactions || 0 },
    { label: "Reactions per post", value: interactions.reactionsPerPost || 0 },
    { label: "Daily comments", value: interactions.dailyComments || 0 },
    { label: "Comments per post", value: interactions.commentsPerPost || 0 },
    { label: "Shares per day", value: interactions.sharesPerDay || 0 },
    { label: "Shares per post", value: interactions.sharesPerPost || 0 }
  ];

  // Pie Charts Data
  const typesData = [
    { name: "Album", value: interactions.typesBreakdown?.album || 0, color: "#818CF8" },
    { name: "Image", value: interactions.typesBreakdown?.image || 100, color: "#F472B6" }
  ].filter(d => d.value > 0);

  // Backend no longer returns a fabricated organic/promoted split (#69) —
  // only render the donut when real data is present, instead of falling
  // back to a fake-but-plausible ratio.
  const viewsData = interactions.viewsBreakdown
    ? [
        { name: "Organic", value: interactions.viewsBreakdown.organic || 0, color: "#4ADE80" },
        { name: "Promoted", value: interactions.viewsBreakdown.promoted || 0, color: "#A855F7" }
      ]
    : null;

  return (
    <div className="space-y-8">
      {/* Top chart and grid of averages */}
      <GenericDashboardTab
        title="Interactions"
        description="Lượng tương tác bao gồm thích, bình luận và chia sẻ bài viết"
        data={chartData}
        metricConfig={metricConfig}
        summaryGrid={dailyAverages}
      />

      {/* Breakdown Section: Pie Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Types breakdown */}
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col items-center">
          <h4 className="text-sm font-bold text-foreground mb-4 self-start">Types</h4>
          <div className="w-full h-48 flex items-center justify-around">
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie
                  data={typesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2">
              {typesData.map((t, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="text-xs font-bold text-muted-foreground">{t.name}: {t.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Views breakdown */}
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col items-center">
          <h4 className="text-sm font-bold text-foreground mb-4 self-start">Views</h4>
          {viewsData ? (
            <div className="w-full h-48 flex items-center justify-around">
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie
                    data={viewsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {viewsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2">
                {viewsData.map((v, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: v.color }} />
                    <span className="text-xs font-bold text-muted-foreground">{v.name}: {v.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full h-48 flex items-center justify-center text-sm text-muted-foreground">
              Không có dữ liệu
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
