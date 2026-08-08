import React, { useMemo } from "react";
import { format, subDays, differenceInDays } from "date-fns";
import { Info, Send, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { SummaryStrategyFactory } from "../../../../services/strategies/summaryMetrics.strategy";

export function InsightsSummaryWidget({
  dateRange = {},
  metrics = null,
  stats = {},
  realData = {},
  communityGrowthData = [],
  publishedVideos = [],
  platform = "youtube",
  onSend,
  onExport,
}) {
  // Compute comparison dates
  const { currentText, compareText } = useMemo(() => {
    const from = dateRange.from || new Date(Date.now() - 29 * 86400000);
    const to = dateRange.to || new Date();
    const daysCount = Math.max(1, differenceInDays(to, from) + 1);

    const prevTo = subDays(from, 1);
    const prevFrom = subDays(from, daysCount);

    const currStr = `${format(from, "MMM d")} - ${format(to, "MMM d, yyyy")}`;
    const compStr = `${format(prevFrom, "MMM d")} - ${format(prevTo, "MMM d, yyyy")}`;

    return { currentText: currStr, compareText: compStr };
  }, [dateRange]);

  // Use Strategy Pattern to build metrics based on platform
  const summaryMetrics = useMemo(() => {
    const strategy = SummaryStrategyFactory.getStrategy(platform);
    return strategy.buildSummaryMetrics({
      communityGrowthData,
      stats,
      metrics,
      realData,
      publishedVideos,
    });
  }, [platform, communityGrowthData, stats, metrics, realData, publishedVideos]);

  return (
    <div className="bg-card p-6 rounded-3xl border border-border shadow-2xs relative overflow-hidden space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-lg font-bold text-foreground tracking-tight">Summary</h3>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            {currentText} <span className="opacity-60">·</span> Compared to {compareText}
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onSend && (
            <button
              onClick={onSend}
              title="Gửi báo cáo"
              className="p-2 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors border border-border/60 bg-background cursor-pointer"
            >
              <Send size={15} />
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              title="Xuất dữ liệu"
              className="p-2 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors border border-border/60 bg-background cursor-pointer"
            >
              <ExternalLink size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-3.5">
        {summaryMetrics.map((item) => (
          <div
            key={item.id}
            className="bg-background p-4 rounded-2xl border border-border/80 shadow-2xs flex flex-col justify-between h-[95px] relative group hover:border-border hover:shadow-xs transition-all"
          >
            {/* Top row */}
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-semibold text-muted-foreground truncate">{item.label}</span>
              <div title={item.tooltip} className="shrink-0">
                <Info size={12} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors cursor-pointer" />
              </div>
            </div>

            {/* Value & Trend */}
            <div className="flex items-baseline flex-wrap gap-2 mt-1">
              <span className="text-xl font-black text-foreground tracking-tight">{item.value}</span>
              {item.trendText && (
                <span
                  className={`text-[11px] font-extrabold inline-flex items-center gap-0.5 ${
                    item.isPositive ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {item.isPositive ? (
                    <TrendingUp size={12} className="stroke-[2.5]" />
                  ) : (
                    <TrendingDown size={12} className="stroke-[2.5]" />
                  )}
                  {item.trendText}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
