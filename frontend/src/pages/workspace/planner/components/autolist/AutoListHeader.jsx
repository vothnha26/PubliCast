import * as React from "react";
import { ArrowLeft, Loader2, Check } from "lucide-react";

export function AutoListHeader({ isNew, isSaving, onSave, onDelete, onBack }) {
  return (
    <div className="px-8 py-4 flex items-center justify-between border-b border-gray-100 bg-white/95 backdrop-blur-md sticky top-0 z-50 shrink-0">
      <div className="flex items-center gap-4">
        <h2 className="text-base font-bold text-gray-900">
          {isNew ? "Create autolist" : "Edit autolist"}
        </h2>
        {!isNew && (
          <button 
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 text-xs font-bold transition-colors cursor-pointer border border-transparent hover:border-red-100 rounded-lg px-2.5 py-1 hover:bg-red-50"
          >
            Delete Autolist
          </button>
        )}
      </div>
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-black transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-gray-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
        >
          {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {isNew ? "Create queue" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
