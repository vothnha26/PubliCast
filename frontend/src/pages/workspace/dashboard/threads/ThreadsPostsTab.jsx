import React from "react";
import { useTranslation } from "react-i18next";
import { eachDayOfInterval, format, subDays } from "date-fns";
import { GenericDashboardTab } from "../common/GenericDashboardTab";
import { Clock } from "lucide-react";
import { ThreadsPostsListTab } from "./ThreadsPostsListTab";

const TYPE_COLORS = {
  TEXT: "#6B7280",
  IMAGE: "#8B5CF6",
  VIDEO: "#EC4899",
};

const VIEWS_COLORS = {
  Organic: "#8E9BEE",
  Promoted: "#F59E0B",
};

function ViewChartBtn({ children }) {
  return (
    <button className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">
      <Clock size={12} />
      {children}
    </button>
  );
}

function TypesTable({ typesBreakdown, t }) {
  const rows = Object.entries(typesBreakdown || {})
    .map(([key, count]) => ({
      group: key,
      count,
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="overflow-auto rounded-2xl border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/60">
          <tr>
            <th className="px-4 py-3 text-left font-bold text-muted-foreground text-[10px] uppercase tracking-wider">
              {t?.("growth.postType", "Loại bài viết") || "Loại bài viết"}
            </th>
            <th className="px-4 py-3 text-right font-bold text-muted-foreground text-[10px] uppercase tracking-wider">
              {t?.("growth.quantity", "Số lượng") || "Số lượng"}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground text-xs">
                {t?.("growth.noData", "Chưa có dữ liệu") || "Chưa có dữ liệu"}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full inline-block shrink-0"
                    style={{
                      backgroundColor: TYPE_COLORS[r.group] || "#9CA3AF",
                    }}
                  />
                  {r.group}
                </td>
                <td className="px-4 py-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
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

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const { name, value } = payload[0];
    return (
      <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2 text-xs font-bold text-foreground">
        {name}: {value.toLocaleString()}
      </div>
    );
  }
  return null;
}

function ViewsDonut({ viewsBreakdown }) {
  // Backend no longer returns a fabricated organic/promoted split (#97) —
  // only render when real data is present.
  if (!viewsBreakdown) {
    return (
      <div className="w-full h-40 flex items-center justify-center text-sm text-muted-foreground">
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
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-black text-foreground">
            {total.toLocaleString()}
          </span>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
            Lượt xem
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-xs font-semibold text-muted-foreground">
                {d.name}
              </span>
            </div>
            <span className="text-xs font-bold text-foreground">
              {d.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
      {children}
    </h3>
  );
}

export function ThreadsPostsTab({
  realData = {},
  publishedVideos = [],
  isPublishedLoading = false,
  pageSize = 5,
  setPageSize = () => {},
  fetchPublishedVideos = () => {},
  prevPageToken = null,
  nextPageToken = null,
  onVideoClick = null,
  dateRange = {},
}) {
  const { t } = useTranslation("dashboard");
  const postsData = realData.growth || [];
  const summary = realData.summary || {};
  const interactions = realData.interactions || {};
  const clicksData = realData.clicks || [];

  const listViews = publishedVideos.reduce((s, p) => s + (p.views || p.viewsCount || 0), 0);
  const listLikes = publishedVideos.reduce((s, p) => s + (p.likes || p.reactions || p.likeCount || 0), 0);
  const listReplies = publishedVideos.reduce((s, p) => s + (p.replies || p.comments || p.replyCount || 0), 0);
  const listReposts = publishedVideos.reduce((s, p) => s + (p.reposts || p.shares || p.repostCount || 0), 0);

  const totalViews = summary.views || listViews || 0;
  const totalLikes = summary.likes || listLikes || 0;
  const totalReplies = summary.replies || listReplies || 0;
  const totalReposts = summary.reposts || listReposts || 0;
  const totalClicks = clicksData.reduce((s, d) => s + (d.totalClicks || 0), 0);

  const totalInteractions = totalLikes + totalReplies + totalReposts + totalClicks;
  const totalPostsCount = summary.totalContent || publishedVideos.length || 0;

  // Tính Tỷ lệ tương tác (Eng. Rate):
  // Ưu tiên chia cho (Followers * TotalPosts) nếu có, fallback chia cho totalViews
  const followersCount = realData.summary?.followersCount || 0;
  const baseDenominator = (totalPostsCount > 0 && followersCount > 0)
    ? (followersCount * totalPostsCount)
    : (totalViews > 0 ? totalViews : 1);

  const avgEngagement = parseFloat(((totalInteractions / baseDenominator) * 100).toFixed(2));

  const overviewConfig = [
    {
      key: "engagement",
      label: "Engagement",
      color: "bg-[#86EFAC] text-foreground",
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
      color: "bg-[#FEF08A] text-foreground",
      chartColor: "#EAB308",
      type: "bar",
      yAxisId: "right",
      value: totalPostsCount,
    },
  ];

  const overviewSummary = [
    { label: "Tỉ lệ tương tác", value: `${avgEngagement}%` },
    { label: "Tổng tương tác", value: totalInteractions },
    { label: "Tổng bài đăng", value: totalPostsCount },
  ];

  // Tạo map từng bài đăng theo ngày để tra cứu nhanh
  const postsByDate = React.useMemo(() => {
    const map = {};
    (publishedVideos || []).forEach(post => {
      if (!post.date) return;
      const d = new Date(post.date);
      const key = d.toISOString().split("T")[0];
      if (!map[key]) {
        map[key] = { views: 0, reach: 0, reactions: 0, comments: 0, shares: 0, clicks: 0, totalContent: 0 };
      }
      const v = post.views || post.viewsCount || post.reach || 0;
      map[key].views += v;
      map[key].reach += (post.reach || v);
      map[key].reactions += (post.reactions || post.likes || post.likeCount || 0);
      map[key].comments += (post.comments || post.replies || post.replyCount || 0);
      map[key].shares += (post.shares || post.reposts || post.repostCount || 0);
      map[key].clicks += (post.clicks || 0);
      map[key].totalContent += 1;
    });
    return map;
  }, [publishedVideos]);

  const chartSourceData = React.useMemo(() => {
    const startDate = dateRange?.from ? new Date(dateRange.from) : subDays(new Date(), 29);
    const endDate = dateRange?.to ? new Date(dateRange.to) : new Date();

    // Map metrics/postsData by YYYY-MM-DD
    const metricsByDate = {};
    (postsData || []).forEach(d => {
      if (d.date) {
        metricsByDate[d.date] = d;
      }
    });

    if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      try {
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        return days.map(day => {
          const key = format(day, "yyyy-MM-dd");
          const name = format(day, "MMM d");
          const dayPost = postsByDate[key] || {};
          const dayMetric = metricsByDate[key] || {};

          const views = dayMetric.views || dayMetric.value || dayPost.views || 0;
          const reach = dayMetric.reach || dayPost.reach || views;
          const reactions = dayMetric.likes || dayMetric.reactions || dayPost.reactions || 0;
          const comments = dayMetric.comments || dayPost.comments || 0;
          const shares = dayMetric.shares || dayPost.shares || 0;
          const clicks = dayMetric.clicks || dayPost.clicks || 0;
          const totalContent = dayMetric.totalContent || dayMetric.posts || dayPost.totalContent || 0;

          return {
            date: key,
            name,
            views,
            reach,
            reactions,
            comments,
            shares,
            clicks,
            totalContent,
            posts: totalContent,
          };
        });
      } catch (e) {
        console.error("Failed to build daily chart range:", e);
      }
    }

    const allKeys = Array.from(new Set([...Object.keys(postsByDate), ...Object.keys(metricsByDate)])).sort();
    return allKeys.map(key => {
      const dayPost = postsByDate[key] || {};
      const dayMetric = metricsByDate[key] || {};
      let name = key;
      try {
        const d = new Date(key);
        if (!isNaN(d.getTime())) name = format(d, "MMM d");
      } catch (e) {}

      const views = dayMetric.views || dayMetric.value || dayPost.views || 0;
      const reach = dayMetric.reach || dayPost.reach || views;
      const reactions = dayMetric.likes || dayMetric.reactions || dayPost.reactions || 0;
      const comments = dayMetric.comments || dayPost.comments || 0;
      const shares = dayMetric.shares || dayPost.shares || 0;
      const clicks = dayMetric.clicks || dayPost.clicks || 0;
      const totalContent = dayMetric.totalContent || dayMetric.posts || dayPost.totalContent || 0;

      return {
        date: key,
        name,
        views,
        reach,
        reactions,
        comments,
        shares,
        clicks,
        totalContent,
        posts: totalContent,
      };
    });
  }, [postsData, publishedVideos, dateRange, postsByDate]);

  const postsOverviewData = chartSourceData.map(d => {
    const dayClicks = clicksData.find(c => c.date === d.date)?.totalClicks || d.clicks || 0;
    const postInteractions = (d.reactions || 0) + (d.comments || 0) + (d.shares || 0) + dayClicks;
    const reach = d.views || d.reach || 0;
    const engagement = reach ? parseFloat(((postInteractions / reach) * 100).toFixed(2)) : 0;
    return {
      ...d,
      interactions: postInteractions,
      engagement
    };
  });

  const interactionsConfig = [
    {
      key: "reactions",
      label: "Likes",
      color: "bg-[#818CF8] text-white",
      chartColor: "#818CF8",
      type: "area",
      value: totalLikes,
    },
    {
      key: "comments",
      label: "Replies",
      color: "bg-[#4ADE80] text-foreground",
      chartColor: "#4ADE80",
      type: "line",
      value: totalReplies,
    },
    {
      key: "shares",
      label: "Reposts",
      color: "bg-[#F472B6] text-white",
      chartColor: "#F472B6",
      type: "line",
      value: totalReposts,
    },
    {
      key: "clicks",
      label: "Clicks",
      color: "bg-[#E9D5FF] text-foreground",
      chartColor: "#A855F7",
      type: "line",
      value: totalClicks,
    },
  ];

  const interactionsSummary = [
    { label: "Likes", value: totalLikes },
    { label: "Replies", value: totalReplies },
    { label: "Reposts", value: totalReposts },
    { label: "Clicks", value: totalClicks },
  ];

  const interactionsChartData = chartSourceData.map(d => {
    const dayClicks = clicksData.find(c => c.date === d.date)?.totalClicks || d.clicks || 0;
    return {
      ...d,
      clicks: dayClicks
    };
  });

  return (
    <div className="space-y-10">
      <div>
        <SectionLabel>{t("growth.summaryTitle", "Tóm tắt (Summary)")}</SectionLabel>
        <GenericDashboardTab
          title={t("growth.summaryTitle", "Tóm tắt (Summary)")}
          description={t("growth.summaryDesc", "Sự tương quan giữa số lượng bài đăng và lượng tương tác mang lại")}
          data={postsOverviewData}
          metricConfig={overviewConfig}
          summaryGrid={overviewSummary}
        />
      </div>

      <div>
        <SectionLabel>{t("growth.interactionsTitle", "Tương tác (Interactions)")}</SectionLabel>
        <GenericDashboardTab
          title={t("growth.interactionsTitle", "Tương tác (Interactions)")}
          description={t("growth.interactionsDesc", "Lượng tương tác bao gồm thích, phản hồi, đăng lại và số lượt clicks")}
          data={interactionsChartData}
          metricConfig={interactionsConfig}
          summaryGrid={interactionsSummary}
        />
      </div>

      <div>
        <SectionLabel>{t("growth.typesViewsTitle", "Phân loại & Lượt xem (Types & Views)")}</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-foreground">{t("growth.typesTitle", "Phân loại (Types)")}</h4>
              <ViewChartBtn>{t("growth.viewChart", "Xem biểu đồ")}</ViewChartBtn>
            </div>
            <TypesTable typesBreakdown={interactions.typesBreakdown} t={t} />
          </div>

          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-foreground">{t("growth.viewsTitle", "Lượt xem (Views)")}</h4>
              <ViewChartBtn>{t("growth.viewTable", "Xem bảng")}</ViewChartBtn>
            </div>
            <ViewsDonut viewsBreakdown={interactions.viewsBreakdown} />
          </div>
        </div>
      </div>

      <div>
        <SectionLabel>{t("growth.listOfPostsTitle", "Danh sách bài đăng (List of posts)")}</SectionLabel>
        <ThreadsPostsListTab
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
