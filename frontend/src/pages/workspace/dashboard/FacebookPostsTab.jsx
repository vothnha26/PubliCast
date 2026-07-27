import React, { useMemo } from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from "recharts";
import { GenericDashboardTab } from "./GenericDashboardTab";
import { Clock } from "lucide-react";
import { FacebookPostsListTab } from "./FacebookPostsListTab";

// ─── Màu sắc cho từng loại post (Types panel) ──────────────────────────────
const TYPE_COLORS = {
  Image:      "#8B5CF6",
  Video:      "#EC4899",
  Reel:       "#F59E0B",
  Link:       "#3B82F6",
  Text:       "#6B7280",
  Carousel:   "#10B981",
  Album:      "#F97316",
  Live_Video: "#EF4444",
  Story:      "#06B6D4",
};

const VIEWS_COLORS = {
  Organic:  "#8B8EF8",   // màu tím nhạt giống ảnh tham chiếu
  Promoted: "#F59E0B",
};

// ─── Custom Tooltip cho PieChart ───────────────────────────────────────────
function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const { name, value } = payload[0];
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs font-bold text-gray-700">
        {name}: {value.toLocaleString()}
      </div>
    );
  }
  return null;
}

// ─── "View chart" button nhỏ ───────────────────────────────────────────────
function ViewChartBtn({ children }) {
  return (
    <button className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-indigo-500 transition-colors">
      <Clock size={12} />
      {children}
    </button>
  );
}

// ─── Types Table (left side của ảnh tham chiếu) ────────────────────────────
function TypesTable({ typesBreakdown }) {
  const rows = Object.entries(typesBreakdown || {})
    .map(([key, count]) => ({
      group: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
      count,
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="overflow-auto rounded-2xl border border-gray-100">
      <table className="w-full text-xs">
        <thead className="bg-gray-50/60">
          <tr>
            <th className="px-4 py-3 text-left font-bold text-gray-400 text-[10px] uppercase tracking-wider">
              Group
            </th>
            <th className="px-4 py-3 text-right font-bold text-gray-400 text-[10px] uppercase tracking-wider">
              Count
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={2} className="px-4 py-6 text-center text-gray-300 text-xs">
                No data yet
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 font-semibold text-[#0A0A0A] flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full inline-block shrink-0"
                    style={{
                      backgroundColor:
                        TYPE_COLORS[r.group.replace(" ", "_")] || "#9CA3AF",
                    }}
                  />
                  {r.group}
                </td>
                <td className="px-4 py-3 text-right font-bold text-indigo-600">
                  {r.count.toLocaleString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Views Donut (right side của ảnh tham chiếu) ──────────────────────────
function ViewsDonut({ viewsBreakdown }) {
  // Backend no longer returns a fabricated organic/promoted split (#69) —
  // only render when real data is present.
  if (!viewsBreakdown) {
    return (
      <div className="w-full h-40 flex items-center justify-center text-sm text-gray-400">
        Không có dữ liệu
      </div>
    );
  }

  const data = [
    {
      name: "Organic",
      value: viewsBreakdown.organic ?? 0,
      color: VIEWS_COLORS.Organic,
    },
    {
      name: "Promoted",
      value: viewsBreakdown.promoted ?? 0,
      color: VIEWS_COLORS.Promoted,
    },
  ].filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={72}
              paddingAngle={4}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-black text-[#0A0A0A]">
            {total.toLocaleString()}
          </span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
            Total
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 w-full">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-xs font-semibold text-gray-600">
                {d.name} (Views)
              </span>
            </div>
            <span className="text-xs font-bold text-[#0A0A0A]">
              {d.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section header ────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
      {children}
    </h3>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export function FacebookPostsTab({
  realData = {},
  publishedVideos = [],
  isPublishedLoading = false,
  pageSize = 5,
  setPageSize = () => {},
  fetchPublishedVideos = () => {},
  prevPageToken = null,
  nextPageToken = null,
  onVideoClick = null,
}) {
  const postsData    = realData.postsPeriod || [];
  const summary      = realData.summary     || {};
  const interactions = realData.interactions || {};
  const chartData    = realData.growth      || [];
  const clicksData    = realData.clicks      || [];

  // ── 1. POSTS OVERVIEW ─────────────────────────────────────────────────────
  const totalViews     = postsData.reduce((s, d) => s + (d.views     || 0), 0);
  const totalReactions = postsData.reduce((s, d) => s + (d.reactions || 0), 0);
  const totalComments  = interactions.comments || 0;
  const totalShares    = interactions.shares   || 0;
  const totalClicks    = clicksData.reduce((s, d) => s + (d.totalClicks || 0), 0);

  const totalInteractions = totalReactions + totalComments + totalShares + totalClicks;
  const avgReach          = summary.totalContent ? Math.round(totalViews / summary.totalContent) : 0;
  const avgEngagement     = totalViews ? parseFloat(((totalInteractions / totalViews) * 100).toFixed(2)) : 0;

  const overviewConfig = [
    {
      key: "engagement",
      label: "Engagement",
      color: "bg-[#86EFAC] text-gray-900",
      chartColor: "#4ADE80",
      type: "line",
      value: avgEngagement,
    },
    {
      key: "interactions",
      label: "Interactions",
      color: "bg-[#818CF8] text-white",
      chartColor: "#818CF8",
      type: "line",
      value: totalInteractions,
    },
    {
      key: "avgReach",
      label: "Avg reach/post",
      color: "bg-[#A7F3D0] text-gray-900",
      chartColor: "#34D399",
      type: "area",
      value: avgReach,
    },
    {
      key: "views",
      label: "Views",
      color: "bg-[#EC4899] text-white",
      chartColor: "#EC4899",
      type: "line",
      value: totalViews,
    },
    {
      key: "totalContent",
      label: "Posts",
      color: "bg-[#FEF08A] text-gray-900",
      chartColor: "#EAB308",
      type: "bar",
      yAxisId: "right",
      value: summary.totalContent || 0,
    },
  ];

  const overviewSummary = [
    { label: "Engagement",          value: `${avgEngagement}%` },
    { label: "Total interactions",    value: totalInteractions },
    { label: "Avg reach per post",    value: avgReach },
  ];

  // Daily mapper for overview chart
  const postsOverviewData = chartData.map(d => {
    const dayClicks = clicksData.find(c => c.date === d.date)?.totalClicks || 0;
    const postInteractions = (d.reactions || 0) + (d.comments || 0) + (d.shares || 0) + dayClicks;
    const reach = d.views || 0;
    const dayAvgReach = d.totalContent ? Math.round(reach / d.totalContent) : 0;
    const engagement = reach ? parseFloat(((postInteractions / reach) * 100).toFixed(2)) : 0;
    return {
      ...d,
      interactions: postInteractions,
      avgReach: dayAvgReach,
      engagement
    };
  });

  // ── 2. INTERACTIONS ───────────────────────────────────────────────────────
  const interactionsConfig = [
    {
      key: "reactions",
      label: "Reactions",
      color: "bg-[#818CF8] text-white",
      chartColor: "#818CF8",
      type: "area",
      value: totalReactions,
    },
    {
      key: "comments",
      label: "Comments",
      color: "bg-[#4ADE80] text-gray-900",
      chartColor: "#4ADE80",
      type: "line",
      value: totalComments,
    },
    {
      key: "shares",
      label: "Shared",
      color: "bg-[#F472B6] text-white",
      chartColor: "#F472B6",
      type: "line",
      value: totalShares,
    },
    {
      key: "clicks",
      label: "Clicks",
      color: "bg-[#E9D5FF] text-gray-900",
      chartColor: "#A855F7",
      type: "line",
      value: totalClicks,
    },
    {
      key: "totalContent",
      label: "Posts",
      color: "bg-[#FEF08A] text-gray-900",
      chartColor: "#EAB308",
      type: "bar",
      yAxisId: "right",
      value: summary.totalContent || 0,
    },
  ];

  const interactionsSummary = [
    { label: "Daily reactions",      value: interactions.dailyReactions    || 0 },
    { label: "Reactions per post",   value: interactions.reactionsPerPost  || 0 },
    { label: "Daily comments",       value: interactions.dailyComments     || 0 },
    { label: "Comments per post",    value: interactions.commentsPerPost   || 0 },
    { label: "Shared per day",       value: interactions.sharesPerDay      || 0 },
    { label: "Shared per post",      value: interactions.sharesPerPost     || 0 },
  ];

  // Daily mapper for interactions chart
  const interactionsChartData = chartData.map(d => {
    const dayClicks = clicksData.find(c => c.date === d.date)?.totalClicks || 0;
    return {
      ...d,
      clicks: dayClicks
    };
  });

  return (
    <div className="space-y-10">
      {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Overview</SectionLabel>
        <GenericDashboardTab
          title="Overview"
          description="Sự tương quan giữa số lượng bài đăng và lượng tương tác mang lại"
          data={postsOverviewData}
          metricConfig={overviewConfig}
          summaryGrid={overviewSummary}
        />
      </div>

      {/* ── INTERACTIONS ──────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Interactions</SectionLabel>
        <GenericDashboardTab
          title="Interactions"
          description="Lượng tương tác bao gồm thích, bình luận, chia sẻ bài viết và lượt clicks"
          data={interactionsChartData}
          metricConfig={interactionsConfig}
          summaryGrid={interactionsSummary}
        />
      </div>

      {/* ── TYPES  +  VIEWS DONUT ────────────────────────────────────── */}
      <div>
        <SectionLabel>Types &amp; Views</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Types panel — trái */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-[#0A0A0A]">Types</h4>
              <ViewChartBtn>View chart</ViewChartBtn>
            </div>
            <TypesTable typesBreakdown={interactions.typesBreakdown} />
          </div>

          {/* Views donut — phải */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-[#0A0A0A]">Views</h4>
              <ViewChartBtn>View table</ViewChartBtn>
            </div>
            <ViewsDonut viewsBreakdown={interactions.viewsBreakdown} />
          </div>
        </div>
      </div>

      {/* ── LIST OF POSTS ────────────────────────────────────────────── */}
      <div>
        <SectionLabel>List of posts</SectionLabel>
        <FacebookPostsListTab
          publishedVideos={publishedVideos}
          isPublishedLoading={isPublishedLoading}
          pageSize={pageSize}
          setPageSize={setPageSize}
          fetchPublishedVideos={fetchPublishedVideos}
          prevPageToken={prevPageToken}
          nextPageToken={nextPageToken}
          onRowClick={onVideoClick}
        />
      </div>
    </div>
  );
}
