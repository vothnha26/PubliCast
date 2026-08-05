import React, { useState, useMemo, useEffect } from "react";
import { 
  BarChart2, Loader2, PlayCircle, ChevronUp, ChevronDown, 
  ChevronsUpDown, Star, MoreVertical, Film, Image as ImageIcon, 
  Layers, Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Sparkles, X, ExternalLink
} from "lucide-react";
import { Button } from "../../../components/ui/button";

export function GenericPostsListTab({
  posts = [],
  isLoading = false,
  pageSize = 5,
  setPageSize = () => {},
  prevPageToken = null,
  nextPageToken = null,
  fetchPublishedVideos = () => {},
  searchPlaceholder = "Search posts...",
  searchKeys = ["title", "caption", "message", "text"],
  emptyStateTitle = "Oops! Nothing found",
  emptyStateDescription = "Try another search query or check if your current date range matches.",
  footerMessage = "",
  onRowClick = null
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "views", dir: "desc" });
  const [selectedPost, setSelectedPost] = useState(null); // Trạng thái cho Modal Chi tiết Bài đăng

  // Quản lý việc tích chọn các hàng (Checkboxes)
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Quản lý trạng thái đánh dấu yêu thích (Star ⭐) sử dụng LocalStorage để lưu giữ dữ liệu
  const [starredIds, setStarredIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("starred_posts") || "[]"));
    } catch {
      return new Set();
    }
  });

  // Đồng bộ Starred IDs vào LocalStorage khi thay đổi
  useEffect(() => {
    localStorage.setItem("starred_posts", JSON.stringify(Array.from(starredIds)));
  }, [starredIds]);

  const toggleStar = (postId, e) => {
    e.stopPropagation();
    setStarredIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  // Helper trích xuất nội dung text chính
  const getPostText = (item) => {
    return item.message || item.caption || item.title || item.text || "No content message";
  };

  // Helper trích xuất thumbnail hình ảnh
  // thumbnailUrl phải được ưu tiên trước mediaUrl: với video/reel, mediaUrl
  // trỏ thẳng tới file .mp4 gốc, mà <img> không thể render video đó thành
  // ảnh — thumbnailUrl mới là ảnh preview thật (xem instagram-post.service.js).
  const getPostThumbnail = (item) => {
    return item.picture || item.thumbnailUrl || item.thumbnail || item.mediaUrl || "";
  };

  // Helper định dạng số lượt xem, thích, bình luận (ví dụ: 25.81K)
  const formatMetricNumber = (num) => {
    if (num === undefined || num === null || isNaN(num)) return "0";
    const val = Number(num);
    if (val >= 1000000) {
      return parseFloat((val / 1000000).toFixed(2)) + "M";
    }
    if (val >= 1000) {
      return parseFloat((val / 1000).toFixed(2)) + "K";
    }
    return val.toLocaleString();
  };

  // Helper định dạng độ dài video (ví dụ: 0:23)
  const formatDuration = (sec) => {
    if (sec === undefined || sec === null || sec === "") return "-";
    
    // Parse YouTube ISO 8601 duration format (e.g. PT2M15S)
    if (typeof sec === "string" && sec.startsWith("PT")) {
      const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
      const matches = sec.match(regex);
      if (matches) {
        const hours = parseInt(matches[1] || 0, 10);
        const minutes = parseInt(matches[2] || 0, 10);
        const seconds = parseInt(matches[3] || 0, 10);
        
        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
      }
    }

    if (typeof sec === "string") {
      if (sec.includes(":")) return sec;
      sec = Number(sec);
    }
    if (isNaN(sec)) return "-";
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Nhận dạng loại bài viết (Video/Image/Carousel)
  const getPostType = (item) => {
    const isVideo = item.isVideo || item.duration || item.youtubeVideoType || 
                    item.instagramPostType === "REEL" || item.facebookPostType === "REEL" ||
                    (item.mediaUrl && item.mediaUrl.includes(".mp4")) ||
                    (item.thumbnailUrl && (item.title || item.views));
    
    // Nếu có nhiều hơn 1 media URL
    const isCarousel = item.instagramPostType === "STORY" || item.facebookPostType === "STORY" ||
                       (item.mediaUrls && item.mediaUrls.split(",").length > 1);
    
    if (isVideo) return "video";
    if (isCarousel) return "carousel";
    return "image";
  };

  // Helper để lấy link gốc của bài đăng
  const getPostUrl = (post) => {
    if (post.postUrl) return post.postUrl;
    if (post.shareUrl) return post.shareUrl;
    
    const idStr = post.id ? String(post.id) : "";
    if (post.platform === 'YOUTUBE' || post.platform === 'youtube' || idStr.length === 11) {
      return `https://www.youtube.com/watch?v=${idStr}`;
    }
    if (post.platform === 'TIKTOK' || post.platform === 'tiktok' || (!isNaN(idStr) && idStr.length > 15)) {
      return `https://www.tiktok.com/@user/video/${idStr}`;
    }
    return "#";
  };

  // Sắp xếp
  const handleSort = (sortKey) => {
    if (!sortKey) return;
    setSortConfig(prev => {
      if (prev.key !== sortKey) return { key: sortKey, dir: "asc" };
      if (prev.dir === "asc") return { key: sortKey, dir: "desc" };
      return { key: null, dir: null };
    });
  };

  // Lọc và chuẩn hóa dữ liệu bài đăng cho bảng thống nhất
  const processedPosts = useMemo(() => {
    return (posts || []).map(post => {
      const views = Number(post.views || post.reach || 0);
      const likes = Number(post.likes || post.reactions || 0);
      const comments = Number(post.comments || 0);
      const shares = Number(post.shares || 0);
      const duration = post.duration || "";
      const text = getPostText(post);
      const id = post.id || post.videoId || text; // Unique ID key
      return {
        ...post,
        id,
        text,
        views,
        likes,
        comments,
        shares,
        duration
      };
    });
  }, [posts]);

  // Thực hiện tìm kiếm & Sắp xếp bài đăng
  const filteredPosts = useMemo(() => {
    let list = processedPosts.filter(post =>
      searchKeys.some(key => {
        const val = post[key];
        return val && typeof val === "string" && val.toLowerCase().includes(searchQuery.toLowerCase());
      })
    );

    if (sortConfig.key && sortConfig.dir) {
      list = [...list].sort((a, b) => {
        const aVal = a[sortConfig.key] ?? 0;
        const bVal = b[sortConfig.key] ?? 0;
        
        const cmp = aVal - bVal;
        return sortConfig.dir === "desc" ? -cmp : cmp;
      });
    }
    return list;
  }, [processedPosts, searchQuery, searchKeys, sortConfig]);

  // Logic Chọn nhiều / Chọn tất cả bài viết
  const handleSelectAll = () => {
    if (selectedIds.size === filteredPosts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPosts.map(p => p.id)));
    }
  };

  const handleSelectRow = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Phân trang đơn giản cho Dashboard List (không có next/prev page tokens thì tự động phân trang client-side)
  const isServerPaged = !!(prevPageToken || nextPageToken);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredPosts.length / (parseInt(pageSize) || 5));

  const pagedPosts = useMemo(() => {
    if (isServerPaged) return filteredPosts;
    const startIdx = (currentPage - 1) * parseInt(pageSize);
    return filteredPosts.slice(startIdx, startIdx + parseInt(pageSize));
  }, [filteredPosts, currentPage, pageSize, isServerPaged]);

  // Khi thay đổi page size, reset trang về 1
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  return (
    <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col transition-all">
      {/* Thanh công cụ và tìm kiếm */}
      <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30">
        <div className="flex items-center gap-4">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Danh sách bài đăng</h3>
          <div className="relative">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-4 py-1.5 text-xs bg-background border border-border rounded-full w-64 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium text-foreground"
            />
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
        </div>
      </div>

      {/* Bảng dữ liệu chính */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="bg-card border-b border-border">
              {/* Checkbox Header */}
              <th className="w-12 pl-6 py-4 text-left">
                <div 
                  onClick={handleSelectAll}
                  className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all ${
                    selectedIds.size > 0 && selectedIds.size === filteredPosts.length 
                      ? "bg-primary border-primary text-primary-foreground" 
                      : "border-border hover:border-muted-foreground bg-card"
                  }`}
                >
                  {selectedIds.size > 0 && selectedIds.size === filteredPosts.length && (
                    <Check size={10} className="stroke-[3]" />
                  )}
                </div>
              </th>
              
              {/* Post Header */}
              <th className="text-left px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest min-w-[280px]">Posts</th>
              
              {/* Type Header */}
              <th className="text-center px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-16">Type</th>
              
              {/* Date Header */}
              <th className="text-left px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-32">Date</th>
              
              {/* Metric Headers with Sortable */}
              {["views", "likes", "comments", "shares"].map((metric) => {
                const isSortActive = sortConfig.key === metric;
                return (
                  <th
                    key={metric}
                    className="text-right px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest cursor-pointer select-none hover:text-foreground transition-colors w-24"
                    onClick={() => handleSort(metric)}
                  >
                    <span className="inline-flex items-center gap-1 justify-end w-full">
                      <span className="capitalize">{metric}</span>
                      {isSortActive ? (
                        sortConfig.dir === "asc" ? <ChevronUp size={11} className="text-foreground" /> : <ChevronDown size={11} className="text-foreground" />
                      ) : (
                        <ChevronsUpDown size={11} className="text-muted-foreground" />
                      )}
                    </span>
                  </th>
                );
              })}

              {/* Comment Score Header */}
              <th
                className="text-right px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest cursor-pointer select-none hover:text-foreground transition-colors w-24"
                onClick={() => handleSort("commentScore")}
              >
                <span className="inline-flex items-center gap-1 justify-end w-full">
                  <span>Score</span>
                  {sortConfig.key === "commentScore" ? (
                    sortConfig.dir === "asc" ? <ChevronUp size={11} className="text-foreground" /> : <ChevronDown size={11} className="text-foreground" />
                  ) : (
                    <ChevronsUpDown size={11} className="text-muted-foreground" />
                  )}
                </span>
              </th>

              {/* Duration Header */}
              <th className="text-center px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-24">Duration</th>
            </tr>
          </thead>

          {isLoading ? (
            <tbody className="divide-y divide-border">
              {[1, 2, 3].map((n) => (
                <tr key={n} className="animate-pulse">
                  <td className="pl-6 py-4"><div className="w-4 h-4 bg-muted rounded" /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-muted rounded-lg shrink-0" />
                      <div className="w-36 h-3 bg-muted rounded" />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center"><div className="w-8 h-4 bg-muted/60 rounded mx-auto" /></td>
                  <td className="px-6 py-4"><div className="w-16 h-3 bg-muted rounded" /></td>
                  <td className="px-6 py-4"><div className="w-12 h-3 bg-muted rounded ml-auto" /></td>
                  <td className="px-6 py-4"><div className="w-10 h-3 bg-muted rounded ml-auto" /></td>
                  <td className="px-6 py-4"><div className="w-10 h-3 bg-muted rounded ml-auto" /></td>
                  <td className="px-6 py-4"><div className="w-10 h-3 bg-muted rounded ml-auto" /></td>
                  <td className="px-6 py-4 text-center"><div className="w-8 h-3 bg-muted/60 rounded mx-auto" /></td>
                </tr>
              ))}
            </tbody>
          ) : (
            <tbody className="divide-y divide-border">
              {pagedPosts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border border-border text-muted-foreground mb-2">
                        <PlayCircle size={20} />
                      </div>
                      <h4 className="text-xs font-bold text-foreground">{emptyStateTitle}</h4>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{emptyStateDescription}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedPosts.map((post, idx) => {
                  const isStarred = starredIds.has(post.id);
                  const isChecked = selectedIds.has(post.id);
                  const thumbnail = getPostThumbnail(post);
                  const postType = getPostType(post);
                  const postText = getPostText(post);
                  const pubDate = new Date(post.publishedAt || post.date || new Date());

                  return (
                    <tr
                      key={post.id || idx}
                      className={`hover:bg-muted/50 transition-colors group border-b border-border`}
                    >
                      {/* Checkbox Cell */}
                      <td className="pl-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div 
                          onClick={(e) => handleSelectRow(post.id, e)}
                          className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all ${
                            isChecked 
                              ? "bg-primary border-primary text-primary-foreground" 
                              : "border-border hover:border-muted-foreground bg-card"
                          }`}
                        >
                          {isChecked && <Check size={10} className="stroke-[3]" />}
                        </div>
                      </td>

                      {/* Post content and Actions cell */}
                      <td className="px-6 py-4 min-w-[280px]">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            {thumbnail ? (
                              <div className="w-12 h-12 rounded-xl overflow-hidden border border-border shadow-sm shrink-0 bg-muted relative">
                                <img src={thumbnail} className="w-full h-full object-cover" alt="Post" />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0 shadow-sm">
                                {postType === "video" ? <Film size={16} /> : <ImageIcon size={16} />}
                              </div>
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-semibold text-foreground line-clamp-2 leading-relaxed max-w-[260px]">
                                {postText}
                              </span>
                              {getPostUrl(post) !== "#" && (
                                <a
                                  href={getPostUrl(post)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-blue-500 hover:text-blue-700 dark:text-blue-400 hover:underline w-fit transition-colors"
                                >
                                  <ExternalLink size={10} />
                                  <span>Xem bài đăng</span>
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Quick action bar y hệt như hình ảnh thiết kế (star, graph, status badge, 3-dot) */}
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-card/95 px-2.5 py-1.5 rounded-full border border-border shadow-lg shrink-0" onClick={(e) => e.stopPropagation()}>
                            {/* Star button */}
                            <button
                              onClick={(e) => toggleStar(post.id, e)}
                              className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-amber-500 transition-colors border-none bg-transparent cursor-pointer"
                              title={isStarred ? "Bỏ yêu thích" : "Đánh dấu yêu thích"}
                            >
                              <Star size={13} className={isStarred ? "text-amber-500 fill-amber-500" : ""} />
                            </button>

                            {/* Green Badge */}
                            <div className="bg-[#E8FAD0] dark:bg-lime-950/60 text-[#4D7C0F] dark:text-lime-400 border border-[#D9F99D] dark:border-lime-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                              <div className="w-1 h-1 rounded-full bg-[#4D7C0F] dark:bg-lime-400 animate-pulse" />
                              <span>Live</span>
                            </div>

                            {/* External Link button */}
                            <a
                              href={getPostUrl(post)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-blue-500 transition-colors border-none bg-transparent cursor-pointer"
                              title="Xem trực tiếp trên nền tảng"
                            >
                              <ExternalLink size={13} />
                            </a>

                            {/* More button */}
                            <button
                              className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors border-none bg-transparent cursor-pointer"
                            >
                              <MoreVertical size={13} />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Type Cell */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-muted border border-border text-muted-foreground shadow-sm">
                          {postType === "video" ? (
                            <Film size={14} className="text-indigo-500 dark:text-indigo-400" />
                          ) : postType === "carousel" ? (
                            <Layers size={14} className="text-amber-500 dark:text-amber-400" />
                          ) : (
                            <ImageIcon size={14} className="text-emerald-500 dark:text-emerald-400" />
                          )}
                        </div>
                      </td>

                      {/* Date Cell */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-foreground">
                            {pubDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-bold uppercase mt-0.5">
                            {pubDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                      </td>

                      {/* Metrics Cells */}
                      <td className="px-6 py-4 text-right text-xs font-bold text-foreground">
                        {formatMetricNumber(post.views)}
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-bold text-foreground">
                        {formatMetricNumber(post.likes)}
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-bold text-foreground">
                        {formatMetricNumber(post.comments)}
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-bold text-foreground">
                        {formatMetricNumber(post.shares)}
                      </td>

                      {/* Comment Score Cell — null (e.g. Threads has no real
                          reach figure to score against) renders as "—"
                          rather than formatMetricNumber's "0", so a missing
                          score is never confused with a real zero score. */}
                      <td className="px-6 py-4 text-right text-xs font-bold text-foreground">
                        {post.commentScore === null || post.commentScore === undefined ? "—" : post.commentScore}
                      </td>

                      {/* Duration Cell */}
                      <td className="px-6 py-4 text-center text-xs font-bold text-muted-foreground">
                        {formatDuration(post.duration)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          )}
        </table>
      </div>

      {/* Bộ phân trang Premium Circle Design y hệt như hình 1 */}
      <div className="px-6 py-4 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border select-none">
        <div className="flex items-center gap-6">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {footerMessage || `Hiển thị ${pagedPosts.length}/${filteredPosts.length} bài viết`}
          </span>
          <div className="flex items-center gap-2 border-l border-border pl-6">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Số dòng hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
              className="text-[10px] font-bold bg-card border border-border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer text-foreground shadow-sm"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="20">20</option>
            </select>
          </div>
        </div>

        {/* Các nút phân trang tròn */}
        {(!isServerPaged ? totalPages > 1 : (prevPageToken || nextPageToken)) && (
          <div className="flex items-center gap-4">
            {/* Range text */}
            <span className="text-[11px] font-extrabold text-muted-foreground">
              {isServerPaged ? (
                "Phân trang nền tảng"
              ) : (
                `${(currentPage - 1) * parseInt(pageSize) + 1}-${Math.min(currentPage * parseInt(pageSize), filteredPosts.length)} của ${filteredPosts.length}`
              )}
            </span>

            <div className="flex items-center gap-1.5">
              {/* Đầu tiên */}
              <button
                disabled={isServerPaged ? !prevPageToken : currentPage === 1}
                onClick={() => isServerPaged ? fetchPublishedVideos(null) : setCurrentPage(1)}
                className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all disabled:opacity-30 disabled:hover:bg-card disabled:cursor-not-allowed cursor-pointer shadow-sm"
              >
                <ChevronsLeft size={13} />
              </button>

              {/* Trước */}
              <button
                disabled={isServerPaged ? !prevPageToken : currentPage === 1}
                onClick={() => isServerPaged ? fetchPublishedVideos(prevPageToken) : setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all disabled:opacity-30 disabled:hover:bg-card disabled:cursor-not-allowed cursor-pointer shadow-sm"
              >
                <ChevronLeft size={13} />
              </button>

              {/* Sau */}
              <button
                disabled={isServerPaged ? !nextPageToken : currentPage === totalPages}
                onClick={() => isServerPaged ? fetchPublishedVideos(nextPageToken) : setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all disabled:opacity-30 disabled:hover:bg-card disabled:cursor-not-allowed cursor-pointer shadow-sm"
              >
                <ChevronRight size={13} />
              </button>

              {/* Cuối cùng */}
              <button
                disabled={isServerPaged ? !nextPageToken : currentPage === totalPages}
                onClick={() => isServerPaged ? fetchPublishedVideos(nextPageToken) : setCurrentPage(totalPages)}
                className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all disabled:opacity-30 disabled:hover:bg-card disabled:cursor-not-allowed cursor-pointer shadow-sm"
              >
                <ChevronsRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
