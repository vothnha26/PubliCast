import React, { useState } from "react";
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, Line, Bar } from "recharts";
import { MetricCard } from "./MetricCard";

export function GenericDashboardTab({
  title,
  description,
  data = [],
  metricConfig = [], // [{ key, label, color, type: 'area' | 'line' | 'bar', chartColor, yAxisId: 'left' | 'right' }]
  watermark = "",
  summaryGrid = [] // [{ label, value }]
}) {
  // Initialize toggle states
  const [selectedMetrics, setSelectedMetrics] = useState(() =>
    metricConfig.reduce((acc, m) => {
      acc[m.key] = m.initialActive !== false;
      return acc;
    }, {})
  );

  const toggleMetric = (key) => {
    setSelectedMetrics((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Check if we need a right Y Axis
  const hasRightAxis = metricConfig.some(
    (m) => m.yAxisId === "right" && selectedMetrics[m.key]
  );

  return (
    <div className="space-y-6">
      {/* Chart Block */}
      <div className="bg-card p-8 rounded-3xl border border-border shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <h3 className="text-base font-bold text-foreground">{title}</h3>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>

          {/* Metric Selector Cards */}
          <div className="flex flex-wrap gap-3 z-10">
            {metricConfig.map((m) => (
              <MetricCard
                key={m.key}
                isActive={selectedMetrics[m.key]}
                color={m.color || "bg-muted text-foreground"}
                value={m.value ?? 0}
                label={m.label}
                onClick={() => toggleMetric(m.key)}
              />
            ))}
          </div>
        </div>

        {/* Recharts Area */}
        <div className="relative h-[320px] w-full">
          {watermark && (
            <div className="absolute inset-0 flex items-center justify-around pointer-events-none opacity-[0.02] select-none">
              <span className="text-6xl font-black rotate-[-15deg]">{watermark}</span>
              <span className="text-6xl font-black rotate-[-15deg] hidden lg:block">{watermark}</span>
            </div>
          )}

          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="0" vertical={false} stroke="var(--border, #F3F4F6)" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--muted-foreground, #9CA3AF)", fontWeight: 600 }}
                dy={10}
                interval={
                  data.length <= 7 ? 0 :
                  data.length <= 14 ? 1 :
                  data.length <= 31 ? 2 :
                  Math.floor(data.length / 10)
                }
              />
              <YAxis
                yAxisId="left"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--muted-foreground, #9CA3AF)", fontWeight: 600 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--muted-foreground, #9CA3AF)", fontWeight: 600 }}
                hide={!hasRightAxis}
              />
              <Tooltip
                cursor={{ fill: "var(--muted, #F9FAFB)" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--foreground)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                }}
              />

              {metricConfig.map((m) => {
                if (!selectedMetrics[m.key]) return null;

                const yId = m.yAxisId || "left";
                const strokeColor = m.chartColor || "#8E9BEE";
                const dataKey = m.dataKey || m.key;

                if (m.type === "area") {
                  return (
                    <Area
                      key={m.key}
                      yAxisId={yId}
                      type="monotone"
                      dataKey={dataKey}
                      stroke={strokeColor}
                      fill={m.fillColor || `rgba(${parseInt(strokeColor.slice(1,3),16)}, ${parseInt(strokeColor.slice(3,5),16)}, ${parseInt(strokeColor.slice(5,7),16)}, 0.05)`}
                      strokeWidth={3}
                      dot={{ fill: strokeColor, strokeWidth: 2, r: 4, stroke: "var(--card)" }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  );
                } else if (m.type === "line") {
                  return (
                    <Line
                      key={m.key}
                      yAxisId={yId}
                      type="monotone"
                      dataKey={dataKey}
                      stroke={strokeColor}
                      strokeWidth={3}
                      dot={{ fill: strokeColor, strokeWidth: 2, r: 4, stroke: "var(--card)" }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  );
                } else if (m.type === "bar") {
                  return (
                    <Bar
                      key={m.key}
                      yAxisId={yId}
                      dataKey={dataKey}
                      fill={strokeColor}
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                      opacity={0.8}
                    />
                  );
                }
                return null;
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Grid */}
      {summaryGrid && summaryGrid.length > 0 && (
        <div className={`grid grid-cols-2 sm:grid-cols-3 ${summaryGrid.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-6'} gap-3`}>
          {summaryGrid.map((item, idx) => (
            <div
              key={idx}
              className="bg-muted/40 p-4 rounded-2xl border border-border shadow-xs flex flex-col items-center justify-center min-h-[85px] transition-all hover:bg-muted/60"
            >
              <span className="text-xl font-bold text-foreground">{item.value}</span>
              <span className="text-[11px] text-muted-foreground font-medium mt-1 text-center">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
