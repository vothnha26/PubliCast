import * as React from "react";
import { Check } from "lucide-react";

export function AutoListPlatformsCard({ connectedPlatforms, selectedPlatforms, onTogglePlatform }) {
  return (
    <div className="space-y-4 bg-card/80 backdrop-blur-md border border-border rounded-3xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-foreground tracking-tight">Target Platforms</h3>
      <div className="flex flex-col gap-2.5">
        {connectedPlatforms.length === 0 ? (
          <p className="text-xs text-muted-foreground font-semibold italic">No connected platforms found. Please connect accounts first.</p>
        ) : (
          connectedPlatforms.map((p) => {
            const isSelected = selectedPlatforms.includes(p.id);
            return (
              <button 
                key={p.id}
                onClick={() => onTogglePlatform(p.id)}
                className={`flex items-center justify-between px-5 py-3 border rounded-2xl transition-all duration-300 group cursor-pointer ${
                  isSelected 
                    ? 'border-foreground bg-muted/50 shadow-sm' 
                    : 'border-border bg-card hover:border-foreground/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="group-hover:scale-110 transition-transform duration-300">
                    {p.icon}
                  </div>
                  <span className={`text-xs font-bold ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {p.name}
                  </span>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-foreground flex items-center justify-center text-background scale-90">
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
