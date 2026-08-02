import React from "react";
import { Radio } from "lucide-react";

/**
 * ListeningEmptyState — Component hiển thị trạng thái lắng nghe bình luận mới
 * Khớp 100% với thiết kế icon ((o)) màu xanh nhấp nháy phát sáng & thông điệp.
 */
export function ListeningEmptyState({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center my-6 animate-in fade-in duration-500 select-none">
      {/* Icon sóng phát vô tuyến màu xanh neon nhấp nháy */}
      <div className="relative mb-4 flex items-center justify-center">
        <div className="absolute w-16 h-16 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)] relative z-10">
          <Radio size={26} className="animate-pulse" />
        </div>
      </div>

      {/* Tiêu đề & Mô tả */}
      <h3 className="text-sm font-bold text-foreground tracking-wide">
        {title || "We're listening for new comments"}
      </h3>
      <p className="text-xs text-muted-foreground mt-1 font-medium max-w-sm">
        {description || "We'll let you know when someone comments on this post."}
      </p>
    </div>
  );
}
