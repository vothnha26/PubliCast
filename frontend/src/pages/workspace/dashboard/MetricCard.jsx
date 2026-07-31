import React from 'react';

export function MetricCard({ isActive, color, value, label, trend, trendValue, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`px-5 py-3 rounded-2xl ${isActive ? color : "bg-gray-100 border border-gray-200 text-gray-400"} flex flex-col items-center min-w-[110px] shadow-sm cursor-pointer select-none transition-all duration-200 hover:scale-105 ${!isActive ? 'opacity-40' : ''}`}
    >
       <div className="flex items-center gap-1">
          <span className="text-xl font-bold">{value}</span>
          {trend && <span className="text-sm font-bold opacity-80">{trend} {trendValue}</span>}
       </div>
       <span className="text-[11px] font-semibold opacity-90 tracking-tight">{label}</span>
    </div>
  );
}
