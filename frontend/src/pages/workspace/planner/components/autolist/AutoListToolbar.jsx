import * as React from "react";
import { Plus, Sparkles, FileUp, Download, Trash2, Rss } from "lucide-react";

export function AutoListToolbar({ 
  onInsertPost, 
  onAddWithAI, 
  onImportCSV, 
  onDownloadCSV, 
  onDeleteAll, 
  onRssFeed,
  hasPosts
}) {
  return (
    <div className="space-y-4 text-left">
      {/* Title */}
      <h3 className="text-sm font-bold text-gray-800 tracking-tight">Content of the autolist</h3>
      
      {/* Plain Text Button Group */}
      <div className="flex items-center gap-6 flex-wrap text-xs text-gray-600 font-medium">
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onInsertPost();
          }}
          className="flex items-center gap-1.5 hover:text-black transition-colors cursor-pointer"
        >
          <Plus size={14} className="text-gray-400" /> Insert post
        </button>

        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onAddWithAI();
          }}
          className="flex items-center gap-1.5 hover:text-black transition-colors cursor-pointer"
        >
          <Plus size={14} className="text-gray-400" /> Add posts with AI
        </button>

        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onImportCSV();
          }}
          className="flex items-center gap-1.5 hover:text-black transition-colors cursor-pointer"
        >
          <FileUp size={14} className="text-gray-400" /> Add from file (CSV)
        </button>

        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onDownloadCSV();
          }}
          className="flex items-center gap-1.5 hover:text-black transition-colors cursor-pointer relative"
        >
          <Download size={14} className="text-gray-400" /> Download CSV
          <span className="w-2.5 h-2.5 rounded-full bg-[#EAB308] border border-white inline-block shadow-sm ml-0.5" title="Premium feature" />
        </button>

        {hasPosts && (
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onDeleteAll();
            }}
            className="flex items-center gap-1.5 text-red-600 hover:text-red-700 transition-colors cursor-pointer"
          >
            <Trash2 size={14} /> Delete all
          </button>
        )}

        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onRssFeed();
          }}
          className="flex items-center gap-1.5 hover:text-black transition-colors cursor-pointer"
        >
          <Rss size={14} className="text-gray-400" /> Linked RSS feed
        </button>
      </div>
    </div>
  );
}
