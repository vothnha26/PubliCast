import * as React from "react";

export function AutoListNameInput({ name, setName }) {
  return (
    <div className="space-y-4 bg-white/80 backdrop-blur-md border border-gray-100 rounded-3xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-gray-800 tracking-tight">Name</h3>
      <div className="relative">
        <label className="absolute -top-2 left-4 px-1.5 bg-white text-[9px] font-black text-gray-400 uppercase tracking-widest z-10">Name</label>
        <input 
          type="text" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-5 py-3 border border-gray-200 rounded-xl text-xs font-bold focus:border-black outline-none shadow-sm transition-all focus:ring-1 focus:ring-black/10"
          placeholder="Enter queue name..."
        />
      </div>
    </div>
  );
}
