import * as React from "react";
import { useState } from "react";
import { Plus, X, ImageIcon, GripVertical, Edit } from "lucide-react";
import { toast } from "sonner";
import { MediaUploadModal } from "./modals/MediaUploadModal";

export function FacebookAlbumComposer({ brandId, albumMedia = [], setAlbumMedia, onEditPhoto }) {
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleAcceptMedia = (items) => {
    const nonImages = items.filter(item => item.file && !item.file.type.startsWith("image/"));
    if (nonImages.length > 0) {
      toast.error("Only image files are allowed for Facebook Album");
    }

    const validItems = items.filter(item => {
      if (item.file) return item.file.type.startsWith("image/");
      return true;
    });

    const newMediaItems = validItems.map((item) => ({
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      previewUrl: item.previewUrl || item.path,
      path: item.path,
      caption: ""
    }));

    if (newMediaItems.length > 0) {
      setAlbumMedia((prev) => [...prev, ...newMediaItems]);
      toast.success(`Successfully added ${newMediaItems.length} photo(s)`);
    }
  };

  const handleCaptionChange = (id, text) => {
    setAlbumMedia((prev) =>
      prev.map((item) => (item.id === id ? { ...item, caption: text } : item))
    );
  };

  const handleRemovePhoto = (id) => {
    setAlbumMedia((prev) => {
      const removed = prev.find((item) => item.id === id);
      // previewUrl is a blob: URL created by MediaUploadModal for locally
      // uploaded files — never revoked here previously, leaking one blob
      // per removed photo for the rest of the tab's lifetime (#89).
      if (removed?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
          Album Photos ({albumMedia.length})
        </label>
        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-black text-white hover:bg-gray-800 transition-all rounded-xl cursor-pointer disabled:opacity-50"
        >
          <Plus size={12} />
          Add Photos
        </button>
      </div>

      {albumMedia.length === 0 ? (
        <div
          onClick={() => setShowUploadModal(true)}
          className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center hover:border-gray-300 transition-all cursor-pointer bg-gray-50/50"
        >
          <ImageIcon size={28} className="text-gray-400 mx-auto mb-2" />
          <p className="text-xs font-bold text-gray-500">No photos in album yet</p>
          <p className="text-[10px] text-gray-400 mt-1 font-medium leading-normal">Click to upload at least 2 images for Facebook Album</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
          {albumMedia.map((item, idx) => (
            <div key={item.id} className="flex gap-4 p-4 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-all relative group">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-gray-100 shrink-0 relative">
                <img src={item.previewUrl || item.path} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-1 left-1 bg-black/60 backdrop-blur text-[8px] font-black text-white px-1.5 py-0.5 rounded">
                  #{idx + 1}
                </span>
                
                {/* Nút sửa ảnh đè lên thumbnail */}
                {onEditPhoto && (
                  <button
                    type="button"
                    onClick={() => onEditPhoto(item)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center cursor-pointer transition-all opacity-0 group-hover:opacity-100 z-10"
                    title="Chỉnh sửa ảnh"
                  >
                    <Edit size={10} />
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-1.5 text-left">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">
                  Photo Caption
                </label>
                <textarea
                  value={item.caption}
                  onChange={(e) => handleCaptionChange(item.id, e.target.value)}
                  placeholder="Enter caption for this photo..."
                  className="w-full p-2 border border-gray-200 rounded-xl text-xs font-semibold focus:border-black outline-none resize-none min-h-[44px]"
                />
              </div>

              <button
                type="button"
                onClick={() => handleRemovePhoto(item.id)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center cursor-pointer transition-all opacity-0 group-hover:opacity-100"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <MediaUploadModal
        isOpen={showUploadModal}
        brandId={brandId}
        onClose={() => setShowUploadModal(false)}
        onAccept={handleAcceptMedia}
        multiple={true}
        initialTab="computer"
      />
    </div>
  );
}
