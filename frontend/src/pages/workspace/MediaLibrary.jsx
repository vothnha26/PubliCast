import React, { useState } from "react";
import { Search, Upload, LayoutGrid, List, Folder, Image as ImageIcon } from "lucide-react";
import { useMediaLibrary } from "../../hooks/useMediaLibrary";
import { MediaGrid } from "./media-library/MediaGrid";
import { MediaListTable } from "./media-library/MediaListTable";
import { MediaDetailPanel } from "./media-library/MediaDetailPanel";
import { BulkActionsBar } from "./media-library/BulkActionsBar";
import { useTranslation } from "react-i18next";
import StockMediaPicker from "../../components/shared/StockMediaPicker";

export function MediaLibraryPage() {
  const { t } = useTranslation("medialibrary");
  const fileInputRef = React.useRef(null);
  const [showStockPicker, setShowStockPicker] = useState(false);
  const {
    filters,
    updateFilters,
    clearFilters,
    view,
    typeFilter,
    searchTerm,
    setSearchTerm,
    loading,
    uploading,
    selected,
    toggleSelect,
    clearSelection,
    deleteSelected,
    deleteFile,
    renameFile,
    uploadFiles,
    detail,
    setDetail,
    dragging,
    setDragging,
    filteredMedia,
    folders,
    createFolder,
    totalEntries,
    totalPages,
    currentPage
  } = useMediaLibrary();

  const handleCreateFolder = () => {
    const name = prompt(t("promptFolderName"));
    if (name) createFolder(name);
  };

  const handleFileChange = (e) => {
    if (e.target.files?.length > 0) {
      uploadFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length > 0) {
      uploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{ background: "#F8F8F7" }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragging && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          style={{ background: "rgba(255,255,255,0.9)", border: "2px dashed #E5E7EB" }}
        >
          <div className="text-center">
            <Upload size={32} style={{ color: "#D1D5DB", margin: "0 auto 8px" }} />
            <div style={{ fontSize: 16, fontWeight: 500, color: "#0A0A0A" }}>{t("dragOverlayText")}</div>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*,video/*"
        style={{ display: "none" }}
      />

      <div
        className="flex items-center gap-3 px-6 py-3"
        style={{ background: "#FFF", borderBottom: "0.5px solid #E5E7EB" }}
      >
        <div className="relative" style={{ flex: "0 0 240px" }}>
          <Search
            size={13}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9CA3AF"
            }}
          />
          <input
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 10px 7px 30px",
              borderRadius: 8,
              border: "0.5px solid #E5E7EB",
              fontSize: 12,
              outline: "none"
            }}
          />
        </div>
        <div className="flex items-center gap-1">
          {[
            { key: "All", label: t("filterAll") },
            { key: "Images", label: t("filterImages") },
            { key: "Videos", label: t("filterVideos") },
            { key: "GIFs", label: t("filterGifs") }
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => updateFilters({ type: item.key })}
              className="cursor-pointer"
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 11,
                background: typeFilter === item.key ? "#0A0A0A" : "#FFF",
                color: typeFilter === item.key ? "#FFF" : "#6B7280",
                border: "0.5px solid #E5E7EB"
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Clear Filters Button */}
        {(filters.search || typeFilter !== "All") && (
          <button
            onClick={() => {
              setSearchTerm("");
              clearFilters();
            }}
            className="cursor-pointer text-xs text-muted-foreground hover:text-black transition-colors"
            style={{ fontSize: 12, fontWeight: 500, background: "none", border: "none", outline: "none" }}
          >
            {t("clearFilters")}
          </button>
        )}

        <div style={{ flex: 1 }} />
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateFolder}
            className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-card border border-border rounded-xl text-xs font-bold text-foreground hover:bg-muted transition-all"
          >
            <Folder size={14} className="text-yellow-500" />
            {t("newFolder")}
          </button>
          
          <button
            onClick={() => setShowStockPicker(true)}
            className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-700 hover:bg-blue-100 transition-all"
          >
            <ImageIcon size={14} className="text-blue-600" />
            Stock Media
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 cursor-pointer rounded-xl disabled:opacity-50 transition-all bg-[#0A0A0A] text-white hover:bg-black shadow-lg shadow-black/5"
            style={{ padding: "8px 16px", fontSize: 12, fontWeight: 700 }}
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-white" />
            ) : (
              <Upload size={14} />
            )}
            {uploading ? t("uploading") : t("uploadFiles")}
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      {filters.folderId && (
        <div className="px-6 py-2 flex items-center gap-2 text-[11px] font-bold text-muted-foreground bg-muted/50">
           <button 
             onClick={() => updateFilters({ folderId: null })}
             className="hover:text-black cursor-pointer"
           >
             {t("breadcrumbMediaLibrary")}
           </button>
           <span>/</span>
           <span className="text-foreground">{t("breadcrumbFolder")}</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "16px 24px" }}>
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0A0A0A]" />
            </div>
          ) : view === "grid" ? (
            <MediaGrid
              folders={searchTerm ? [] : folders}
              filteredMedia={filteredMedia}
              setDetail={setDetail}
              selected={selected}
              toggleSelect={toggleSelect}
              clearFilters={clearFilters}
              updateFilters={updateFilters}
            />
          ) : (
            <MediaListTable
              filteredMedia={filteredMedia}
              setDetail={setDetail}
              selected={selected}
              toggleSelect={toggleSelect}
              clearFilters={clearFilters}
            />
          )}

        </div>

        {/* Detail Panel */}
        {detail && <MediaDetailPanel detail={detail} setDetail={setDetail} onDelete={deleteFile} onRename={renameFile} />}
      </div>

      {/* Pagination Footer */}
      <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-card">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          {t("showingFiles", { count: filteredMedia.length, total: totalEntries })}
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage <= 1 || loading}
            onClick={() => updateFilters({ page: currentPage - 1 })}
            className="px-4 py-2 border rounded-xl text-[10px] font-bold text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            {t("previous")}
          </button>
          <button
            disabled={currentPage >= totalPages || loading}
            onClick={() => updateFilters({ page: currentPage + 1 })}
            className="px-4 py-2 border rounded-xl text-[10px] font-bold text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            {t("next")}
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      <BulkActionsBar selected={selected} clearSelection={clearSelection} onDelete={deleteSelected} />

      {/* Stock Media Picker Modal */}
      {showStockPicker && (
        <StockMediaPicker
          brandId={filters.brandId || "default"}
          onSelectMedia={() => {
            clearFilters();
          }}
          onClose={() => setShowStockPicker(false)}
        />
      )}
    </div>
  );
}
