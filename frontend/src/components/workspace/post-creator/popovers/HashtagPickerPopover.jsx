import * as React from "react";
import { useState, useEffect } from "react";
import { Hash, ChevronRight, X, Loader2 } from "lucide-react";
import { useBrand } from "../../../../context/BrandContext";
import hashtagService from "../../../../services/hashtag.service";

export function HashtagPickerPopover({ onInsert, onClose }) {
  const { activeBrand } = useBrand();
  const [hashtagSets, setHashtagSets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedSet, setExpandedSet] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadHashtagSets = async () => {
      if (!activeBrand?.id) return;
      setLoading(true);
      try {
        const res = await hashtagService.getHashtags(activeBrand.id);
        if (isMounted) {
          setHashtagSets(res.sets || res.data?.sets || []);
        }
      } catch (error) {
        console.error("Failed to fetch hashtag sets in popover:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadHashtagSets();
    return () => {
      isMounted = false;
    };
  }, [activeBrand?.id]);

  const handleInsertSet = (tags) => {
    onInsert("\n" + tags.join(" "));
    onClose();
  };

  const handleInsertTag = (tag) => {
    onInsert(" " + tag);
    onClose();
  };

  return (
    <div className="absolute bottom-full left-0 mb-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[300] animate-in fade-in slide-in-from-bottom-2 duration-150 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Hash size={14} className="text-[#0A0A0A]" />
          <span className="text-[11px] font-bold text-[#0A0A0A] uppercase tracking-widest">Hashtag Sets</span>
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-black transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-xs text-gray-400 font-semibold gap-2">
            <Loader2 size={14} className="animate-spin text-blue-500" />
            Đang tải bộ hashtag...
          </div>
        ) : hashtagSets.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-gray-400 font-medium">
            Chưa có bộ hashtag nào.
            <br />
            Hãy tạo bộ hashtag trong mục <strong>Hashtag Manager</strong>.
          </div>
        ) : (
          hashtagSets.map((set, idx) => {
            const tags = set.hashtags ? set.hashtags.split(",") : [];
            return (
              <div key={set.id || idx} className="border-b border-gray-50 last:border-0">
                <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors group">
                  <button
                    type="button"
                    onClick={() => setExpandedSet(expandedSet === idx ? null : idx)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <ChevronRight
                      size={12}
                      className={`text-gray-400 transition-transform ${expandedSet === idx ? "rotate-90" : ""}`}
                    />
                    <span className="text-[11px] font-semibold text-gray-700">{set.name}</span>
                    <span className="text-[9px] text-gray-400 font-medium">{tags.length} tags</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSet(tags)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold uppercase tracking-wider text-white bg-[#0A0A0A] px-2 py-1 rounded-lg hover:bg-gray-800 shrink-0 cursor-pointer"
                  >
                    Insert All
                  </button>
                </div>
                {expandedSet === idx && (
                  <div className="px-4 pb-3 flex flex-wrap gap-1.5 animate-in fade-in duration-150">
                    {tags.map((tag, tagIdx) => (
                      <button
                        type="button"
                        key={tagIdx}
                        onClick={() => handleInsertTag(tag)}
                        className="text-[10px] font-medium text-[#1877F2] bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <p className="text-[9px] text-gray-400 font-medium">
          Rê chuột vào bộ rồi nhấn <strong>Insert All</strong>, hoặc mở rộng để chọn từng tag.
        </p>
      </div>
    </div>
  );
}
