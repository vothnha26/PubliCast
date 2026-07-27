import React from 'react';

export function MetricCard({ isActive, color, value, label, trend, trendValue, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`px-5 py-3 rounded-2xl ${isActive ? color : "bg-gray-100 border border-gray-200"} flex flex-col items-center min-w-[100px] shadow-sm cursor-pointer select-none transition-all duration-200 hover:scale-105 ${!isActive ? 'opacity-40' : ''}`}
    >
       <div className="flex items-center gap-1">
          <span className={`text-xl font-bold ${isActive ? 'text-white/90' : 'text-gray-400'}`}>{value}</span>
          {trend && <span className={`text-sm font-bold ${isActive ? 'text-white/80' : 'text-gray-300'}`}>{trend} {trendValue}</span>}
       </div>
       <span className={`text-[10px] font-bold ${isActive ? 'text-white/70' : 'text-gray-400'} uppercase tracking-tighter`}>{label}</span>
    </div>
  );
}
