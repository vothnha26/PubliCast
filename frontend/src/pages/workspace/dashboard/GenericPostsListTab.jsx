import React, { useState, useMemo } from "react";
import { BarChart2, Loader2, PlayCircle, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Button } from "../../../components/ui/button";

export function GenericPostsListTab({
  posts = [],
  isLoading = false,
  pageSize = 5,
  setPageSize = () => {},
  prevPageToken = null,
  nextPageToken = null,
  fetchPublishedVideos = () => {},
  columns = [], // [{ header: string, className?: string, renderCell: (item) => ReactNode }]
  searchPlaceholder = "Search posts...",
  searchKeys = ["title", "caption", "message"],
  emptyStateTitle = "Oops! Nothing found",
  emptyStateDescription = "Try another search query or check if your current date range matches.",
  footerMessage = "",
  onRowClick = null
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, dir: null });

  const handleSort = (sortKey) => {
    if (!sortKey) return;
    setSortConfig(prev => {
      if (prev.key !== sortKey) return { key: sortKey, dir: "asc" };
      if (prev.dir === "asc") return { key: sortKey, dir: "desc" };
      return { key: null, dir: null };
    });
  };

  const filteredPosts = useMemo(() => {
    let list = (posts || []).filter(post =>
      searchKeys.some(key => {
        const val = post[key];
        return val && typeof val === "string" && val.toLowerCase().includes(searchQuery.toLowerCase());
      })
    );
    if (sortConfig.key && sortConfig.dir) {
      list = [...list].sort((a, b) => {
        const aVal = a[sortConfig.key] ?? "";
        const bVal = b[sortConfig.key] ?? "";
        const isNum = !isNaN(Number(aVal)) && !isNaN(Number(bVal));
        const cmp = isNum ? Number(aVal) - Number(bVal) : String(aVal).localeCompare(String(bVal));
        return sortConfig.dir === "desc" ? -cmp : cmp;
      });
    }
    return list;
  }, [posts, searchQuery, searchKeys, sortConfig]);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header controls */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/30">
        <div className="flex items-center gap-4">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">List of posts</h3>
          <div className="relative">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-4 py-1.5 text-xs bg-white border border-gray-200 rounded-full w-64 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
            />
            <BarChart2 size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Items per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value))}
              className="text-[10px] font-bold bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="20">20</option>
            </select>
          </div>

          {/* Render prev/next buttons if token-based pagination is used */}
          {(prevPageToken || nextPageToken) && (
            <>
              <div className="w-px h-4 bg-gray-200 mx-2 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] font-bold"
                  onClick={() => fetchPublishedVideos(prevPageToken)}
                  disabled={!prevPageToken || isLoading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] font-bold"
                  onClick={() => fetchPublishedVideos(nextPageToken)}
                  disabled={!nextPageToken || isLoading}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-white border-b border-gray-100">
              {columns.map((col, idx) => {
                const isSortable = !!col.sortKey;
                const isActive = sortConfig.key === col.sortKey;
                const SortIcon = isActive
                  ? (sortConfig.dir === "asc" ? ChevronUp : ChevronDown)
                  : ChevronsUpDown;
                return (
                  <th
                    key={idx}
                    className={`text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest ${col.className || ""} ${isSortable ? "cursor-pointer select-none hover:text-gray-600 transition-colors" : ""}`}
                    onClick={() => isSortable && handleSort(col.sortKey)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {col.header}
                      {isSortable && (
                        <SortIcon
                          size={12}
                          className={isActive ? "text-black" : "text-gray-300"}
                        />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          {isLoading ? (
            <tbody className="divide-y divide-gray-50">
              {[1, 2, 3].map((n) => (
                <tr key={n} className="animate-pulse">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-6 py-4">
                      {colIdx === 0 ? (
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-10 bg-gray-100 rounded-lg shrink-0" />
                          <div className="w-36 h-3 bg-gray-100 rounded" />
                        </div>
                      ) : colIdx === 1 ? (
                        <div className="w-16 h-4 bg-gray-100 rounded-full" />
                      ) : colIdx === 2 ? (
                        <div className="w-20 h-4 bg-gray-100 rounded" />
                      ) : (
                        <div className="w-12 h-3 bg-gray-50 rounded" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ) : (
            <tbody className="divide-y divide-gray-50">
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 text-gray-400 mb-2">
                        <PlayCircle size={20} />
                      </div>
                      <h4 className="text-xs font-bold text-gray-900">{emptyStateTitle}</h4>
                      <p className="text-[10px] text-gray-400">{emptyStateDescription}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className={`hover:bg-[#F8F8F7]/50 transition-colors ${onRowClick ? "cursor-pointer group" : ""}`}
                    onClick={() => onRowClick && onRowClick(post)}
                  >
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className="px-6 py-4">
                        {col.renderCell(post)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          )}
        </table>
      </div>

      {footerMessage && (
        <div className="px-6 py-4 bg-gray-50/30 flex items-center justify-between border-t border-gray-100">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {footerMessage}
          </span>
          {/* Pagination controls inside footer as backup */}
          {(prevPageToken || nextPageToken) && (
            <div className="flex gap-2 sm:hidden">
              <button
                onClick={() => fetchPublishedVideos(prevPageToken)}
                disabled={!prevPageToken}
                className="px-3 py-1 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-400 hover:bg-white transition-all disabled:opacity-30"
              >
                Previous
              </button>
              <button
                onClick={() => fetchPublishedVideos(nextPageToken)}
                disabled={!nextPageToken}
                className="px-3 py-1 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-400 hover:bg-white transition-all disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
