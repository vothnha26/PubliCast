import React from "react";
import { Info } from "lucide-react";

export function PreviewFooter() {
  return (
    <div className="shrink-0 p-6 border-t border-gray-100 bg-[#F9FAFB]">
      <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-white rounded-xl shadow-sm text-blue-500">
          <Info size={16} />
        </div>
        <p className="text-xs text-blue-900 leading-relaxed font-medium font-sans">
          Previews are an approximation of how your post will look when published. The final post may look slightly different.
        </p>
      </div>
    </div>
  );
}
