import React from "react";
import { MoreHorizontal, Folder, Play } from "lucide-react";
import { useTranslation } from "react-i18next";

export function MediaGrid({ folders = [], filteredMedia, setDetail, selected, toggleSelect, clearFilters, updateFilters }) {
  const { t } = useTranslation("medialibrary");

  if (filteredMedia.length === 0 && folders.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-card rounded-2xl border border-border shadow-sm"
        style={{ padding: "80px 16px", gap: 8 }}
      >
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-2">
           <Folder size={32} className="text-gray-200" />
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A" }}>{t("grid.noFiles")}</span>
        <span style={{ fontSize: 12, color: "#9CA3AF" }}>{t("grid.noFilesDesc")}</span>
        <button
          onClick={clearFilters}
          className="mt-4 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border border-border bg-card hover:bg-muted"
        >
          {t("clearFilters")}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
      {/* Render Folders */}
      {folders.map((folder) => (
        <div
          key={folder.id}
          className="group relative rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all hover:shadow-md bg-card border border-border"
          onClick={() => updateFilters({ folderId: folder.id })}
        >
          <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center text-yellow-600">
            <Folder size={20} fill="currentColor" fillOpacity={0.2} />
          </div>
          <div className="flex-1 overflow-hidden">
             <div className="text-xs font-bold text-foreground truncate">{folder.name}</div>
             <div className="text-[10px] text-muted-foreground font-medium">{folder._count?.media || 0} {t("breadcrumbFolder").toLowerCase() === 'folder' ? 'items' : 'mục'}</div>
          </div>
          <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded-lg transition-all">
             <MoreHorizontal size={14} className="text-muted-foreground" />
          </button>
        </div>
      ))}

      {/* Render Media Files */}
      {filteredMedia.map((item) => (
        <div
          key={item.id}
          className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-lg bg-card border border-border"
          onClick={() => setDetail(item)}
        >
          {/* Thumbnail */}
          <div
            className="relative flex items-center justify-center overflow-hidden"
            style={{ background: "#F9FAFB", aspectRatio: "1/1" }}
          >
            {item.thumbnail ? (
              <img 
                src={item.thumbnail} 
                alt={item.name} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
              />
            ) : (
              <span className="text-4xl">{item.emoji}</span>
            )}

            {item.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                <div className="w-10 h-10 bg-card/90 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                  <Play size={16} fill="currentColor" className="text-foreground ml-0.5" />
                </div>
              </div>
            )}

            {item.duration && (
              <span
                className="font-bold tracking-wider"
                style={{
                  position: "absolute",
                  bottom: 10,
                  right: 10,
                  background: "rgba(0,0,0,0.6)",
                  backdropFilter: "blur(4px)",
                  color: "#FFF",
                  fontSize: 9,
                  padding: "3px 8px",
                  borderRadius: 6
                }}
              >
                {item.duration}
              </span>
            )}

            <div
              className="absolute"
              style={{
                top: 10,
                right: 10,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: item.used ? "#10B981" : "#D1D5DB",
                border: "2px solid white",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}
            />

            {/* Selection Checkbox */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                toggleSelect(item.id);
              }}
              className={`absolute top-2.5 left-2.5 w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${
                selected.has(item.id) 
                  ? "bg-black border-black text-white" 
                  : "bg-card/80 border-white/50 opacity-0 group-hover:opacity-100"
              }`}
            >
              {selected.has(item.id) && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>

            {/* Hover actions */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                <button
                  className="w-full py-2 bg-card/95 backdrop-blur-sm hover:bg-card text-foreground text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl border border-border active:scale-95 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle use in post
                  }}
                >
                  {t("detailPanel.useInPost")}
                </button>
            </div>
          </div>
          
          <div className="p-3">
            <div className="text-[11px] font-bold text-foreground mb-0.5 truncate pr-4">
              {item.name}
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter bg-muted px-1.5 py-0.5 rounded">
                  {item.type}
               </span>
               <span className="text-[10px] text-muted-foreground font-medium">
                {item.size} · {item.date}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
