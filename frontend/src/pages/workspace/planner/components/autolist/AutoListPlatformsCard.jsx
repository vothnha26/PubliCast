import * as React from "react";
import { Check } from "lucide-react";

export function AutoListPlatformsCard({ connectedPlatforms, selectedPlatforms, onTogglePlatform }) {
  return (
    <div className="space-y-4 bg-white/80 backdrop-blur-md border border-gray-100 rounded-3xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-gray-800 tracking-tight">Target Platforms</h3>
      <div className="flex flex-col gap-2.5">
        {connectedPlatforms.length === 0 ? (
          <p className="text-xs text-gray-400 font-semibold italic">No connected platforms found. Please connect accounts first.</p>
        ) : (
          connectedPlatforms.map((p) => {
            const isSelected = selectedPlatforms.includes(p.id);
            return (
              <button 
                key={p.id}
                onClick={() => onTogglePlatform(p.id)}
                className={`flex items-center justify-between px-5 py-3 border.5 rounded-2xl transition-all duration-300 group cursor-pointer ${
                  isSelected 
                    ? 'border-gray-900 bg-gray-50/50 shadow-sm' 
                    : 'border-gray-100 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="group-hover:scale-110 transition-transform duration-300">
                    {p.icon}
                  </div>
                  <span className={`text-xs font-bold ${isSelected ? 'text-black' : 'text-gray-600'}`}>
                    {p.name}
                  </span>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center text-white scale-90">
                    <Check size={10} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
