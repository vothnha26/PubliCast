import * as React from "react";

export function AutoListNameInput({ name, setName }) {
  return (
    <div className="space-y-4 bg-card/80 backdrop-blur-md border border-border rounded-3xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-foreground tracking-tight">Name</h3>
      <div className="relative">
        <label className="absolute -top-2 left-4 px-1.5 bg-card text-[9px] font-black text-muted-foreground uppercase tracking-widest z-10">Name</label>
        <input 
          type="text" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-5 py-3 border border-border bg-card text-foreground rounded-xl text-xs font-bold focus:border-foreground outline-none shadow-sm transition-all focus:ring-1 focus:ring-foreground/10 placeholder:text-muted-foreground"
          placeholder="Enter queue name..."
        />
      </div>
    </div>
  );
}
