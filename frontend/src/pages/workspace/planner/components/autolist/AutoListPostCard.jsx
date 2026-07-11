import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { 
  GripVertical, Trash2, Image, FileText, 
  Smile, Folder, Hash, Link2, Youtube, 
  Facebook, Instagram, PlaySquare, Film, X,
  MessageSquare, Languages
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { EmojiPickerPopover } from "@/components/workspace/post-creator/EmojiPickerPopover";
import { UTMGeneratorPopover } from "@/components/workspace/post-creator/UTMGeneratorPopover";
import { FirstCommentModal } from "@/components/workspace/post-creator/FirstCommentModal";
import { MediaDropdown } from "@/components/workspace/post-creator/MediaDropdown";
import { GoogleDrivePickerModal } from "@/components/workspace/post-creator/GoogleDrivePickerModal";
import { toast } from "sonner";
import apiService from "@/services/api";
import { buildMediaUrl } from "@/utils/url";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { PRODUCT_IDS } from "@/constants/products";

export function AutoListPostCard({ 
  post, 
  index, 
  onDelete, 
  onToggleStatus, 
  onUpdatePostFields,
  activeBrand,
  selectedPlatforms,
  // Drag & Drop handlers
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  draggedIndex
}) {
  const [caption, setCaption] = useState(post.caption || "");
  const [activePopover, setActivePopover] = useState(null); // 'emoji' | 'utm' | 'media' | null
  const [showFirstCommentModal, setShowFirstCommentModal] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { hasAccess } = useFeatureGate();
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sync state if post prop changes
  useEffect(() => {
    setCaption(post.caption || "");
  }, [post.caption]);

  const handleBlur = () => {
    if (caption !== post.caption) {
      onUpdatePostFields(post.id, { caption });
    }
  };

  const insertAtCursor = (textToInsert) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      const newCaption = caption + textToInsert;
      setCaption(newCaption);
      onUpdatePostFields(post.id, { caption: newCaption });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newCaption = caption.substring(0, start) + textToInsert + caption.substring(end);
    setCaption(newCaption);
    
    // Auto-save the new caption fields
    onUpdatePostFields(post.id, { caption: newCaption });

    // Focus back and position cursor
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
    }, 0);
  };

  const getMediaUrls = () => {
    if (!post.mediaUrls) return [];
    if (Array.isArray(post.mediaUrls)) return post.mediaUrls;
    if (typeof post.mediaUrls === 'string') return post.mediaUrls.split(',').filter(Boolean);
    return [];
  };

  const getMediaPreviewUrl = (url) => {
    return buildMediaUrl(url);
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    const toastId = toast.loading(`Uploading ${files.length} file(s)...`);

    try {
      const uploadedUrls = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("video", file); // Backend expects "video" key for uploads

        const res = await apiService.post(`/posts/upload?brandId=${activeBrand?.id}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });
        if (res.data?.videoUrl) {
          uploadedUrls.push(res.data.videoUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        const currentMedia = getMediaUrls();
        const updatedMedia = [...currentMedia, ...uploadedUrls];
        await onUpdatePostFields(post.id, { mediaUrls: updatedMedia });
        toast.success(`Successfully uploaded ${uploadedUrls.length} file(s)`, { id: toastId });
      } else {
        toast.error("Upload failed: No file path returned from server", { id: toastId });
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload files to server", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveMedia = (urlToRemove) => {
    const currentMedia = getMediaUrls();
    const updatedMedia = currentMedia.filter(url => url !== urlToRemove);
    onUpdatePostFields(post.id, { mediaUrls: updatedMedia });
    toast.success("Attachment removed");
  };

  const mediaList = getMediaUrls();

  // Map platform keys to React Icons
  const renderPlatformIcon = (platform) => {
    const p = platform.toUpperCase();
    if (p.includes("YOUTUBE")) {
      return <Youtube size={14} className="text-[#FF0000] fill-[#FF0000]" title="YouTube" />;
    }
    if (p.includes("FACEBOOK")) {
      return <Facebook size={14} className="text-[#1877F2] fill-[#1877F2]" title="Facebook" />;
    }
    if (p.includes("INSTAGRAM")) {
      return <Instagram size={14} className="text-[#E1306C]" title="Instagram" />;
    }
    if (p.includes("TIKTOK")) {
      return <span className="text-[12px] font-bold text-black font-sans leading-none cursor-default" title="TikTok">🎵</span>;
    }
    return null;
  };

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, index - 1)}
      onDragOver={(e) => onDragOver(e, index - 1)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, index - 1)}
      className={`bg-[#f0f2f5] rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all duration-300 text-left relative cursor-grab active:cursor-grabbing border ${
        draggedIndex === index - 1 ? "opacity-50 border-dashed border-gray-400" : "border-transparent"
      }`}
    >
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        multiple 
        accept="image/*,video/*" 
        className="hidden" 
        onChange={handleFileChange}
      />

      {/* Top Bar: Drag handle & Index pill */}
      <div className="flex items-center gap-2">
        <div className="text-gray-400 cursor-grab active:cursor-grabbing hover:text-gray-600">
          <GripVertical size={16} />
        </div>
        <div className="border border-gray-300 rounded-full px-2.5 py-0.5 bg-white text-[10px] font-bold text-gray-700 shadow-sm min-w-[24px] text-center">
          {index}
        </div>
      </div>

      {/* Editor Box */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3 flex flex-col min-h-[140px] justify-between shadow-inner focus-within:border-black transition-colors duration-200 relative">
        <textarea
          ref={textareaRef}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={handleBlur}
          placeholder="Write what you want to share..."
          rows={4}
          className="w-full bg-white border-none outline-none focus:ring-0 resize-none text-xs font-semibold text-gray-800 placeholder-gray-400/80 p-0 leading-relaxed"
        />

        {/* Media Preview if attached */}
        {mediaList.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50 animate-in fade-in">
            {mediaList.map((url, idx) => (
              <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-100 shadow-sm shrink-0 group/media">
                <img src={getMediaPreviewUrl(url)} alt="Attached media" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemoveMedia(url);
                  }}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover/media:opacity-100 transition-opacity cursor-pointer z-10"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Inner Footer: Attachment tools & Character count + Platform Icon */}
        <div className="flex items-center justify-between pt-1 text-gray-400 relative">
          {/* Left tools (Matches image order and styles) */}
          <div className="flex items-center gap-4">
            {/* Media Button */}
            <div className="relative">
              <button 
                type="button" 
                onClick={(e) => {
                  e.preventDefault();
                  setActivePopover(activePopover === 'media' ? null : 'media');
                }}
                className={`hover:text-gray-700 transition-colors cursor-pointer p-0.5 relative ${activePopover === 'media' ? 'text-black font-extrabold' : ''}`}
                title="Attach media"
              >
                <Image size={15} />
                <span className="absolute -top-1 -right-1 text-[7px] bg-white rounded-full border border-gray-200 w-2.5 h-2.5 flex items-center justify-center font-bold text-gray-500 shadow-sm leading-none">+</span>
              </button>
              {activePopover === 'media' && (
                <MediaDropdown 
                  onClose={() => setActivePopover(null)} 
                  onSelectImage={() => fileInputRef.current?.click()} 
                  onSelectVideo={() => fileInputRef.current?.click()} 
                  onSelectDrive={() => {
                    const hasDriveAccess = hasAccess(PRODUCT_IDS.GOOGLE_DRIVE);
                    if (!hasDriveAccess) {
                      toast.error("Tính năng import từ Google Drive yêu cầu gói PRO hoặc AGENCY.", {
                        action: {
                          label: "Nâng cấp",
                          onClick: () => window.location.href = '/pricing'
                        }
                      });
                    } else {
                      setIsDriveModalOpen(true);
                    }
                  }}
                />
              )}
            </div>

            {/* Emoji Button */}
            <div className="relative">
              <button 
                type="button" 
                onClick={(e) => {
                  e.preventDefault();
                  setActivePopover(activePopover === 'emoji' ? null : 'emoji');
                }}
                className={`hover:text-gray-700 transition-colors cursor-pointer p-0.5 ${activePopover === 'emoji' ? 'text-black' : ''}`}
                title="Add emoji"
              >
                <Smile size={15} />
              </button>
              {activePopover === 'emoji' && (
                <EmojiPickerPopover 
                  onSelectEmoji={(emoji) => {
                    insertAtCursor(emoji);
                    setActivePopover(null);
                  }}
                  onClose={() => setActivePopover(null)}
                />
              )}
            </div>

            {/* Message Button (First Comment Modal) */}
            <button 
              type="button"
              onClick={() => setShowFirstCommentModal(true)}
              className={`hover:text-gray-700 transition-colors cursor-pointer p-0.5 ${post.firstComment ? 'text-[#a855f7] bg-purple-50 rounded-lg' : ''}`}
              title="Add first comment"
            >
              <MessageSquare size={15} />
            </button>

            {/* Campaign URL Link (UTM) Button */}
            <div className="relative">
              <button 
                type="button" 
                onClick={(e) => {
                  e.preventDefault();
                  setActivePopover(activePopover === 'utm' ? null : 'utm');
                }}
                className={`hover:text-gray-700 transition-colors cursor-pointer p-0.5 ${activePopover === 'utm' ? 'text-black' : ''}`}
                title="Campaign link generator"
              >
                <Link2 size={15} />
              </button>
              {activePopover === 'utm' && (
                <UTMGeneratorPopover 
                  onAddUrl={(utmUrl) => {
                    insertAtCursor(utmUrl);
                    setActivePopover(null);
                  }}
                  onClose={() => setActivePopover(null)}
                />
              )}
            </div>

            {/* Translation Button */}
            <button 
              type="button"
              onClick={() => toast.info("Translation feature coming soon")}
              className="hover:text-gray-700 transition-colors cursor-pointer p-0.5" 
              title="Translate"
            >
              <Languages size={15} />
            </button>

            {/* Document Button */}
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="hover:text-gray-700 transition-colors cursor-pointer p-0.5" 
              title="Add document"
            >
              <FileText size={15} />
            </button>
          </div>

          {/* Right counter or Save action */}
          <div className="flex items-center gap-2.5 text-[10px] font-bold text-gray-400">
            {caption !== (post.caption || "") && (
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onUpdatePostFields(post.id, { caption });
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-2 py-0.5 rounded-lg transition-all cursor-pointer shadow-sm text-[9px]"
              >
                Save
              </button>
            )}
            <span className="flex items-center gap-1.5 select-none font-medium">
              {caption.length} / 2000
              
              {/* Selected Platform icons preview */}
              {((post.platforms && post.platforms.length > 0) ? post.platforms : (selectedPlatforms || [])).length > 0 ? (
                <span className="flex items-center gap-1 ml-1 animate-in fade-in duration-200">
                  {((post.platforms && post.platforms.length > 0) ? post.platforms : (selectedPlatforms || [])).map((plt, i) => (
                    <span key={i}>{renderPlatformIcon(plt)}</span>
                  ))}
                </span>
              ) : (
                <span className="text-gray-300 font-sans leading-none cursor-default ml-1">🎵</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Bar: On switch & Trash delete */}
      <div className="flex items-center justify-end gap-3 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-gray-600">
          <Switch 
            checked={post.status !== 'PAUSED'} 
            onCheckedChange={(checked) => onToggleStatus(post.id, checked ? 'DRAFT' : 'PAUSED')} 
            className="scale-90"
          />
          <span className="text-[11px] font-bold text-gray-500">{post.status !== 'PAUSED' ? 'On' : 'Off'}</span>
        </div>
        
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onDelete(post.id);
          }}
          className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer p-1"
          title="Delete post"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* First Comment Modal Overlay */}
      {showFirstCommentModal && (
        <FirstCommentModal 
          value={post.firstComment || ''}
          onAccept={(text) => {
            onUpdatePostFields(post.id, { firstComment: text });
            setShowFirstCommentModal(false);
          }}
          onCancel={() => setShowFirstCommentModal(false)}
        />
      )}

      {/* Google Drive Picker Modal */}
      <GoogleDrivePickerModal 
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        activeBrand={activeBrand}
        onSelectFile={(file) => {
          const url = file.thumbnailLink || file.webViewLink || '';
          const currentMedia = post.mediaUrls ? post.mediaUrls.split(',').filter(Boolean) : [];
          const updatedMedia = [...currentMedia, url];
          onUpdatePostFields(post.id, { mediaUrls: updatedMedia });
          setIsDriveModalOpen(false);
          toast.success(`Imported file from Google Drive`);
        }}
      />
    </div>
  );
}
