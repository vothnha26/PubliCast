import React from "react";

/**
 * Strategy pattern interface for rendering preview shapes matching real dashboard charts
 */
export const WidgetThumbnailRenderer = {
  getStrokePath: (points) => {
    if (!Array.isArray(points) || points.length < 2) return "M 0,20 L 100,20";
    const step = 100 / (points.length - 1);
    return points
      .map((point, index) => {
        const x = +(index * step).toFixed(2);
        const y = +(35 - Math.max(2, Math.min(33, point))).toFixed(2);
        return `${index === 0 ? "M" : "L"} ${x},${y}`;
      })
      .join(" ");
  },

  /**
   * Render a miniature line/area chart representing growth metrics
   */
  renderGrowthChart: (color, points = [11, 15, 10, 18, 14, 24, 20]) => {
    const gradientId = `growthGrad-${color.replace("#", "")}`;
    const linePath = WidgetThumbnailRenderer.getStrokePath(points);
    const areaPath = `${linePath} L 100,35 L 0,35 Z`;
    return (
      <svg viewBox="0 0 100 35" className="w-full h-12 overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <g stroke="#EEF2F7" strokeWidth="0.6">
          <line x1="0" y1="8" x2="100" y2="8" />
          <line x1="0" y1="17.5" x2="100" y2="17.5" />
          <line x1="0" y1="27" x2="100" y2="27" />
        </g>
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => {
          const x = (index * 100) / Math.max(1, points.length - 1);
          const y = 35 - Math.max(2, Math.min(33, point));
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={index === points.length - 1 ? 2.2 : 1.1}
              fill={index === points.length - 1 ? color : "#FFFFFF"}
              stroke={color}
              strokeWidth="0.7"
            />
          );
        })}
      </svg>
    );
  },

  /**
   * Render a miniature balance chart showing acquired (+) vs lost (-) paths
   */
  renderBalanceChart: (color, acquired = [14, 10, 18, 13, 20], lost = [20, 24, 18, 23, 17]) => {
    const acquiredPath = WidgetThumbnailRenderer.getStrokePath(acquired);
    const lostPath = WidgetThumbnailRenderer.getStrokePath(lost);
    return (
      <svg viewBox="0 0 100 35" className="w-full h-12 overflow-visible">
        <line x1="0" y1="17.5" x2="100" y2="17.5" stroke="#E5E7EB" strokeWidth="0.75" strokeDasharray="2 2" />
        {/* Acquired line */}
        <path d={acquiredPath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        {/* Lost line */}
        <path d={lostPath} fill="none" stroke="#F472B6" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    );
  },

  /**
   * Render a miniature views bar chart (columns structure)
   */
  renderBarChart: (color, values = [14, 8, 21, 16, 26, 12, 19]) => {
    return (
      <svg viewBox="0 0 100 35" className="w-full h-12">
        <g stroke="#EEF2F7" strokeWidth="0.6">
          <line x1="0" y1="8" x2="100" y2="8" />
          <line x1="0" y1="17.5" x2="100" y2="17.5" />
          <line x1="0" y1="27" x2="100" y2="27" />
        </g>
        <line x1="2" y1="34" x2="98" y2="34" stroke="#CBD5E1" strokeWidth="0.8" />
        {values.map((value, index) => {
          const x = 4 + index * 13;
          const h = Math.max(5, Math.min(30, value));
          const y = 35 - h;
          return (
            <rect
              key={index}
              x={x}
              y={y}
              width="7"
              height={h}
              rx="1"
              fill={index % 3 === 1 ? "#E5E7EB" : color}
              fillOpacity={index % 3 === 1 ? 1 : 0.82}
            />
          );
        })}
      </svg>
    );
  },

  /**
   * Render a mini pie/donut chart representing categories or breakdowns
   */
  renderDonutChart: (primaryColor, secondaryColor = "#E5E7EB", ratio = 0.62) => {
    const circumference = 75.39;
    const dashOffset = circumference * (1 - Math.max(0.08, Math.min(0.92, ratio)));
    return (
      <svg viewBox="0 0 100 35" className="w-full h-12 flex justify-center items-center">
        <circle cx="50" cy="17.5" r="15" fill="none" stroke="#F3F4F6" strokeWidth="0.7" />
        <circle cx="50" cy="17.5" r="12" fill="transparent" stroke={secondaryColor} strokeWidth="5.5" />
        <circle 
          cx="50" 
          cy="17.5" 
          r="12" 
          fill="transparent" 
          stroke={primaryColor} 
          strokeWidth="5.5" 
          strokeDasharray={circumference} 
          strokeDashoffset={dashOffset} 
          transform="rotate(-90 50 17.5)" 
        />
      </svg>
    );
  },

  /**
   * Render a miniature posts / videos list ranking shape
   */
  renderRankingList: (color, items = [
    { name: "Top Item #1", val: "85%" },
    { name: "Top Item #2", val: "60%" },
    { name: "Top Item #3", val: "40%" }
  ]) => {
    return (
      <div className="space-y-1.5 py-0.5">
        {items.map((item, idx) => (
          <div key={idx} className="space-y-0.5">
            <div className="flex justify-between items-center text-[5.5px] font-mono text-gray-400">
              <span className="truncate w-14 font-semibold">{item.name}</span>
              <span className="font-bold">{item.val}</span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: item.val, backgroundColor: color }} />
            </div>
          </div>
        ))}
      </div>
    );
  }
};
