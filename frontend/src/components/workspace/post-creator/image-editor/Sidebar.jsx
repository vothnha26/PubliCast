import * as React from "react";
import { Crop, Sliders, Palette, Smile, Pencil, Square, ShieldAlert, Maximize2 } from "lucide-react";

export const SIDEBAR_TABS = [
  { id: 'size', name: 'Size', icon: <Crop size={16} /> },
  { id: 'finetune', name: 'Finetune', icon: <Sliders size={16} /> },
  { id: 'filter', name: 'Filter', icon: <Palette size={16} /> },
  { id: 'sticker', name: 'Sticker', icon: <Smile size={16} /> },
  { id: 'draw', name: 'Draw', icon: <Pencil size={16} /> },
  { id: 'frame', name: 'Frame', icon: <Square size={16} /> },
  { id: 'censure', name: 'Censure', icon: <ShieldAlert size={16} /> },
  { id: 'resize', name: 'Resize', icon: <Maximize2 size={16} /> },
];

export function Sidebar({ activeTab, setActiveTab, setActiveStickerId, setActiveCensureId }) {
  return (
    <div className="w-[180px] border-r border-gray-100 bg-white flex flex-col p-4 space-y-1.5 shrink-0 select-none">
      {SIDEBAR_TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => {
            setActiveTab(tab.id);
            setActiveStickerId(null);
            setActiveCensureId(null);
          }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-bold tracking-wide transition-all cursor-pointer text-left ${
            activeTab === tab.id 
              ? 'bg-gray-100 text-black font-extrabold shadow-sm' 
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          {tab.icon}
          <span>{tab.name}</span>
        </button>
      ))}
    </div>
  );
}
