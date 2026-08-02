import React, { useState } from "react";
import { Play, Database, LayoutGrid, PanelLeftClose, PanelLeftOpen, Film } from "lucide-react";

/**
 * PostsGridSidebar — Component hiển thị danh sách bài viết / Reels dạng Grid 3 cột
 * bên trái cho chế độ view "By post".
 */
export function PostsGridSidebar({
  posts = [],
  activePostId = null,
  onSelectPost,
  loading = false,
  // Collapses the grid body to free up width for the Thread panel — the
  // header (with this same toggle button) stays visible so the user can
  // expand it again from the same spot.
  collapsed = false,
  onToggleCollapsed,
}) {
  const [viewStyle, setViewStyle] = useState("grid"); // 'stack' | 'grid'

  const displayPosts = posts;

  return (
    <div className={`${collapsed ? "w-14 self-start" : "w-[320px] h-full"} shrink-0 bg-card rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden select-none transition-all duration-200`}>
      {/* Header Panel "Posts" + Mode Switcher Icons */}
      <div className={`p-3.5 border-b border-border flex items-center bg-card ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && <h3 className="text-xs font-bold text-foreground tracking-wide">Posts</h3>}

        <div className="flex items-center gap-1">
          {!collapsed && (
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/50">
              <button
                type="button"
                onClick={() => setViewStyle("stack")}
                title="Stack view"
                className={`p-1 rounded-md transition-all cursor-pointer ${
                  viewStyle === "stack"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Database size={13} />
              </button>
              <button
                type="button"
                onClick={() => setViewStyle("grid")}
                title="Grid view"
                className={`p-1 rounded-md transition-all cursor-pointer ${
                  viewStyle === "grid"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid size={13} />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => onToggleCollapsed?.(!collapsed)}
            title={collapsed ? "Expand posts panel" : "Collapse posts panel"}
            className="p-1 rounded-md transition-all cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
      </div>

      {/* Posts Thumbnail Grid Container */}
      {!collapsed && (
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        {loading ? (
          <div className="grid grid-cols-3 gap-2 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[9/14] bg-muted rounded-xl" />
            ))}
          </div>
        ) : (
          <div
            className={`grid gap-2.5 ${viewStyle === "stack" ? "grid-cols-1" : "grid-cols-3"}`}
          >
            {displayPosts.map((post) => {
              const isActive = activePostId === post.id;
              const hasUnread = post.unreadCount > 0 || post.unread;
              let rawThumb = 
                post.thumbnailUrl || 
                post.mediaUrl || 
                post.videoContext?.thumbnailUrl || 
                post.videoContext?.thumbnail ||
                post.rawItem?.videoContext?.thumbnailUrl ||
                post.rawItem?.mediaUrl ||
                post.rawItem?.thumbnailUrl;

              if (rawThumb && (rawThumb.includes('dicebear') || rawThumb.includes('avataaars') || rawThumb.includes('unsplash'))) {
                rawThumb = null;
              }

              // Extract 11-character YouTube video ID
              let ytId = null;
              const candList = [
                post.videoContext?.id,
                post.rawItem?.videoContext?.id,
                post.rawItem?.platformItemId,
                post.rawItem?.postId,
                post.platformItemId,
                post.id
              ];
              for (const cand of candList) {
                if (cand && typeof cand === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(cand)) {
                  ytId = cand;
                  break;
                }
              }

              const thumbnailUrl = rawThumb || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null);

              return (
                <div
                  key={post.id}
                  onClick={() => onSelectPost(post)}
                  className="flex flex-col gap-1 cursor-pointer group"
                >
                  <div
                    className={`relative aspect-[9/14] rounded-xl overflow-hidden cursor-pointer group border transition-all ${
                      isActive
                        ? "ring-2 ring-emerald-500 border-emerald-500 shadow-md scale-[0.98]"
                        : "border-border/60 hover:border-border hover:opacity-95"
                    }`}
                  >
                    {/* Thumbnail Image or Neutral Dark Gradient Placeholder */}
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={post.title || "Post thumbnail"}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-zinc-900 to-black flex flex-col items-center justify-center p-2 text-center">
                        <Film size={20} className="text-muted-foreground/60 mb-1" />
                        <span className="text-[9px] text-muted-foreground line-clamp-2 leading-tight">
                          {post.title || "Bài viết"}
                        </span>
                      </div>
                    )}

                    {/* Dark Gradient Overlay */}
                    <div className="absolute inset-0 bg-black/25 group-hover:bg-black/40 transition-colors" />

                    {/* Play Button Overlay (Image 2 style) */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white border border-white/30 group-hover:scale-110 transition-transform">
                        <Play size={10} className="fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Active Selection Indicator */}
                    {isActive && (
                      <div className="absolute inset-0 border-2 border-emerald-500 rounded-xl pointer-events-none" />
                    )}

                    {/* Bottom Right Badge (Unread/Comment count) */}
                    <div className="absolute bottom-1.5 right-1.5 w-5 h-5 bg-emerald-500 text-slate-950 font-extrabold text-[10px] rounded-full shadow-xs flex items-center justify-center leading-none">
                      {post.unreadCount || post.commentCount || 1}
                    </div>
                  </div>
                  {/* Subtle indicator line under card */}
                  <div className={`h-1 w-full rounded-full transition-colors ${isActive ? "bg-emerald-500" : "bg-border/30 group-hover:bg-border/60"}`} />
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
