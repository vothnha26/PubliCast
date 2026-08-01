import React from "react";
import { ChevronDown } from "lucide-react";
import { PlatformIcon } from "./PlatformIcon";

export function WorkplaceHeader({ 
  name = "TechVN Studio", 
  initial = "T", 
  platforms = ["YouTube", "Facebook", "Instagram"],
  className = "" 
}) {
  return (
    <div className={`bg-[#F1F3F5] rounded-2xl p-4 border border-border max-w-xl flex items-center justify-between shadow-sm cursor-pointer hover:border-border transition-all ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#E1306C] flex items-center justify-center text-white font-black shadow-md">
          {initial}
        </div>
        <div>
          <div className="text-sm font-bold text-foreground">{name}</div>
          <div className="flex items-center gap-1 mt-0.5">
            {platforms.map((p) => (
              <PlatformIcon key={p} platform={p} size={12} />
            ))}
          </div>
        </div>
      </div>
      <ChevronDown size={18} className="text-muted-foreground" />
    </div>
  );
}
