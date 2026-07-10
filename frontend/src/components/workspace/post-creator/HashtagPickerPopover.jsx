import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { Hash, ChevronRight, X, Loader2, Search } from "lucide-react";
import { useBrand } from "../../../context/BrandContext";
import apiService from "../../../services/api";

// SOLID: Định nghĩa các hằng số nguồn Hashtag để tránh Magic Strings
const HASHTAG_SOURCE_TYPES = {
  SET: "Bộ sưu tập",
  TRACKER: "Hashtag Tracker"
};

const SEARCH_LIMIT = 50;

export function HashtagPickerPopover({ onInsert, onClose }) {
  const { activeBrand } = useBrand();
  const [hashtagSets, setHashtagSets] = useState([]);
  const [trackedHashtags, setTrackedHashtags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedSet, setExpandedSet] = useState(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;
    const loadHashtagsData = async () => {
      if (!activeBrand?.id) return;
      setLoading(true);
      try {
        const res = await apiService.get(`/hashtags?brandId=${activeBrand.id}`);
        if (isMounted) {
          setHashtagSets(res.data.sets || []);
          setTrackedHashtags(res.data.trackers || []);
        }
      } catch (error) {
        console.error("Failed to fetch hashtags data in popover:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadHashtagsData();
    return () => {
      isMounted = false;
    };
  }, [activeBrand?.id]);

  const handleInsertSet = (tags) => {
    onInsert("\n" + tags.join(" "));
    onClose();
  };

  const handleInsertTag = (tag) => {
    // Đảm bảo tag luôn có dấu #
    const formattedTag = tag.startsWith("#") ? tag : `#${tag}`;
    onInsert(" " + formattedTag);
    onClose();
  };

  // SOLID: Lọc và kết hợp các hashtag một cách có hệ thống, tránh trùng lặp
  const filteredSearchTags = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.trim().toLowerCase().replace("#", "");
    const results = [];
    const seenTags = new Set();

    // 1. Quét từ Hashtag Sets
    hashtagSets.forEach((set) => {
      const tags = set.hashtags ? set.hashtags.split(",") : [];
      tags.forEach((tag) => {
        const cleanTag = tag.trim().replace("#", "");
        if (cleanTag.toLowerCase().includes(query)) {
          const formatted = `#${cleanTag}`;
          if (!seenTags.has(formatted)) {
            seenTags.add(formatted);
            results.push({
              tag: formatted,
              source: HASHTAG_SOURCE_TYPES.SET,
              sourceName: set.name
            });
          }
        }
      });
    });

    // 2. Quét từ Hashtag Trackers
    trackedHashtags.forEach((tracker) => {
      const cleanTag = tracker.hashtag.trim().replace("#", "");
      if (cleanTag.toLowerCase().includes(query)) {
        const formatted = `#${cleanTag}`;
        if (!seenTags.has(formatted)) {
          seenTags.add(formatted);
          results.push({
            tag: formatted,
            source: HASHTAG_SOURCE_TYPES.TRACKER,
            sourceName: tracker.platform || "Platform"
          });
        }
      }
    });

    return results.slice(0, SEARCH_LIMIT);
  }, [searchQuery, hashtagSets, trackedHashtags]);

  return (
    <div className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[300] animate-in fade-in slide-in-from-bottom-2 duration-150 overflow-hidden flex flex-col font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <Hash size={14} className="text-[#0A0A0A]" />
          <span className="text-[11px] font-black text-[#0A0A0A] uppercase tracking-widest">
            {searchQuery.trim() ? "Tìm kiếm Hashtags" : "Bộ Hashtag thương hiệu"}
          </span>
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-black transition-colors cursor-pointer">
          <X size={14} />
        </button>
      </div>

      {/* Search Input Bar (Hashtag Searcher) */}
      <div className="px-4 py-2 border-b border-gray-50 bg-gray-50/50 flex-shrink-0">
        <div className="relative flex items-center bg-white rounded-xl border border-gray-200 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-400 transition-all overflow-hidden px-3 py-1.5">
          <Search size={13} className="text-gray-400 mr-2 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm hashtag (ví dụ: marketing...)"
            className="w-full text-xs font-semibold text-gray-800 placeholder-gray-400 bg-transparent outline-none border-none p-0"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-gray-400 hover:text-gray-700 ml-1.5 flex-shrink-0 cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Main List Area */}
      <div className="max-h-64 overflow-y-auto flex-grow">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-xs text-gray-400 font-bold gap-2">
            <Loader2 size={14} className="animate-spin text-purple-600" />
            Đang tải dữ liệu...
          </div>
        ) : searchQuery.trim() ? (
          /* --- Search Results State --- */
          <div className="p-3">
            {filteredSearchTags.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400 font-semibold">
                Không tìm thấy hashtag nào phù hợp cho từ khóa "{searchQuery}"
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1 px-1">
                  Kết quả tìm thấy ({filteredSearchTags.length})
                </p>
                {filteredSearchTags.map((resultItem, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleInsertTag(resultItem.tag)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-purple-50/50 text-left transition-all cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-purple-700">{resultItem.tag}</span>
                    <span className="text-[9px] bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-md group-hover:bg-purple-100 group-hover:text-purple-700 transition-all">
                      {resultItem.source === HASHTAG_SOURCE_TYPES.SET 
                        ? `${resultItem.sourceName}`
                        : `${resultItem.source} (${resultItem.sourceName})`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* --- Default Folder sets state --- */
          <div>
            {hashtagSets.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-gray-400 font-medium leading-relaxed">
                Chưa có bộ hashtag nào.
                <br />
                Hãy tạo bộ hashtag trong mục <strong className="text-gray-700">Hashtag Manager</strong> hoặc gõ tìm kiếm để lọc nhanh!
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
                        className="flex items-center gap-2 flex-1 text-left cursor-pointer"
                      >
                        <ChevronRight
                          size={12}
                          className={`text-gray-400 transition-transform ${expandedSet === idx ? "rotate-90 text-purple-600" : ""}`}
                        />
                        <span className="text-[11px] font-bold text-gray-700">{set.name}</span>
                        <span className="text-[9px] text-gray-400 font-semibold">{tags.length} tags</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertSet(tags)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black uppercase tracking-wider text-white bg-purple-600 px-2 py-1 rounded-lg hover:bg-purple-700 shrink-0 cursor-pointer"
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
                            className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
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
        )}
      </div>

      {/* Footer Instructions */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex-shrink-0">
        <p className="text-[9px] text-gray-400 font-semibold leading-relaxed">
          {searchQuery.trim() 
            ? "Nhấp vào hashtag để chèn nhanh vào bài viết." 
            : "Rê chuột vào bộ rồi nhấn Insert All, hoặc mở rộng để chọn từng tag."}
        </p>
      </div>

    </div>
  );
}
