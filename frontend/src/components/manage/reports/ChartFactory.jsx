import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { CHART_TYPES } from "./constants";

/**
 * Custom Tooltip for premium look and feel
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-2.5 rounded-xl shadow-xl backdrop-blur-md">
        <p className="text-[10px] font-bold text-gray-450 dark:text-gray-400 font-mono mb-1">{label}</p>
        <div className="space-y-1">
          {payload.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
              <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">
                {item.name}: {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

/**
 * ChartFactory Component
 * Factory Pattern for rendering different Recharts based on type.
 */
export function ChartFactory({ type, data, config, color = "#5C90A8", height = 200 }) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center bg-gray-50 dark:bg-slate-900 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800" style={{ height }}>
        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Không có dữ liệu biểu đồ</span>
      </div>
    );
  }

  // Generate unique gradient IDs to avoid SVG conflicts
  const gradientId = `grad-${color.replace("#", "")}`;

  const renderAreaChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
          {config.map((c, i) => {
            const extraGradId = `grad-${c.key}-${i}`;
            return (
              <linearGradient key={extraGradId} id={extraGradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.chartColor || color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={c.chartColor || color} stopOpacity={0.0} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: "#9CA3AF", fontSize: 9, fontWeight: 600, fontFamily: "monospace" }} 
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: "#9CA3AF", fontSize: 9, fontWeight: 600, fontFamily: "monospace" }}
          yAxisId="left"
        />
        {config.some(c => c.yAxisId === "right") && (
          <YAxis 
            orientation="right"
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "#9CA3AF", fontSize: 9, fontWeight: 600, fontFamily: "monospace" }}
            yAxisId="right"
          />
        )}
        <Tooltip content={<CustomTooltip />} />
        {config.map((c) => {
          if (c.type === "line") {
            return (
              <Line
                key={c.key}
                yAxisId={c.yAxisId || "left"}
                type="monotone"
                dataKey={c.key}
                name={c.label}
                stroke={c.chartColor || color}
                strokeWidth={2}
                dot={{ r: 2, strokeWidth: 1 }}
                activeDot={{ r: 4 }}
              />
            );
          }
          if (c.type === "bar") {
            return (
              <Bar
                key={c.key}
                yAxisId={c.yAxisId || "left"}
                dataKey={c.key}
                name={c.label}
                fill={c.chartColor || color}
                radius={[4, 4, 0, 0]}
              />
            );
          }
          return (
            <Area
              key={c.key}
              yAxisId={c.yAxisId || "left"}
              type="monotone"
              dataKey={c.key}
              name={c.label}
              stroke={c.chartColor || color}
              strokeWidth={2}
              fill={`url(#grad-${c.key}-${config.indexOf(c)})`}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: "#9CA3AF", fontSize: 9, fontWeight: 600, fontFamily: "monospace" }} 
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: "#9CA3AF", fontSize: 9, fontWeight: 600, fontFamily: "monospace" }} 
        />
        <Tooltip content={<CustomTooltip />} />
        {config.map((c) => (
          <Line
            key={c.key}
            type="monotone"
            dataKey={c.key}
            name={c.label}
            stroke={c.chartColor || color}
            strokeWidth={2}
            dot={{ r: 2, strokeWidth: 1 }}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: "#9CA3AF", fontSize: 9, fontWeight: 600, fontFamily: "monospace" }} 
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: "#9CA3AF", fontSize: 9, fontWeight: 600, fontFamily: "monospace" }} 
        />
        <Tooltip content={<CustomTooltip />} />
        {config.map((c) => (
          <Bar
            key={c.key}
            dataKey={c.key}
            name={c.label}
            fill={c.chartColor || color}
            radius={[4, 4, 0, 0]}
            maxBarSize={30}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPieChart = (isDoughnut = false) => {
    // Standard cell coloring matching preset colors if cellColor is not present
    const defaultPalette = ["#5C90A8", "#52C79F", "#E6A735", "#C65880", "#895E8B", "#72C9DA"];
    
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={isDoughnut ? "60%" : 0}
            outerRadius="80%"
            paddingAngle={isDoughnut ? 4 : 0}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || defaultPalette[index % defaultPalette.length]} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  // Factory Switch logic
  switch (type) {
    case CHART_TYPES.AREA:
      return renderAreaChart();
    case CHART_TYPES.LINE:
      return renderLineChart();
    case CHART_TYPES.BAR:
      return renderBarChart();
    case CHART_TYPES.DOUGHNUT:
      return renderPieChart(true);
    case CHART_TYPES.PIE:
      return renderPieChart(false);
    default:
      return renderAreaChart();
  }
}
