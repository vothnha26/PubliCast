import React from "react";
import { Search, Upload, LayoutGrid, List, Folder } from "lucide-react";
import { useMediaLibrary } from "../../hooks/useMediaLibrary";
import { MediaGrid } from "./media-library/MediaGrid";
import { MediaListTable } from "./media-library/MediaListTable";
import { MediaDetailPanel } from "./media-library/MediaDetailPanel";
import { BulkActionsBar } from "./media-library/BulkActionsBar";

export function MediaLibraryPage() {
  const fileInputRef = React.useRef(null);
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
    const name = prompt("Enter folder name:");
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
            <div style={{ fontSize: 16, fontWeight: 500, color: "#0A0A0A" }}>Drop files to upload</div>
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
            placeholder="Search media..."
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
          {["All", "Images", "Videos", "GIFs"].map((t) => (
            <button
              key={t}
              onClick={() => updateFilters({ type: t })}
              className="cursor-pointer"
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 11,
                background: typeFilter === t ? "#0A0A0A" : "#FFF",
                color: typeFilter === t ? "#FFF" : "#6B7280",
                border: "0.5px solid #E5E7EB"
              }}
            >
              {t}
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
            className="cursor-pointer text-xs text-gray-500 hover:text-black transition-colors"
            style={{ fontSize: 12, fontWeight: 500, background: "none", border: "none", outline: "none" }}
          >
            Clear Filters
          </button>
        )}

        <div style={{ flex: 1 }} />
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateFolder}
            className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all"
          >
            <Folder size={14} className="text-yellow-500" />
            New Folder
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
            {uploading ? "Uploading..." : "Upload Files"}
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      {filters.folderId && (
        <div className="px-6 py-2 flex items-center gap-2 text-[11px] font-bold text-gray-400 bg-gray-50/50">
           <button 
             onClick={() => updateFilters({ folderId: null })}
             className="hover:text-black cursor-pointer"
           >
             Media Library
           </button>
           <span>/</span>
           <span className="text-gray-900">Folder</span>
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
      <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-white">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Showing {filteredMedia.length} of {totalEntries} files
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage <= 1 || loading}
            onClick={() => updateFilters({ page: currentPage - 1 })}
            className="px-4 py-2 border rounded-xl text-[10px] font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            disabled={currentPage >= totalPages || loading}
            onClick={() => updateFilters({ page: currentPage + 1 })}
            className="px-4 py-2 border rounded-xl text-[10px] font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      <BulkActionsBar selected={selected} clearSelection={clearSelection} onDelete={deleteSelected} />
    </div>
  );
}
