import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { 
  GripVertical, Trash2, Image, FileText, 
  Smile, Folder, Hash, Link2, Youtube, 
  Facebook, Instagram, PlaySquare, Film, X,
  MessageSquare, Languages, AlertCircle, Pencil,
  MoreVertical, Copy, Sparkles, Building2, Crown
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmojiPickerPopover } from "@/components/workspace/post-creator/popovers/EmojiPickerPopover";
import { UTMGeneratorPopover } from "@/components/workspace/post-creator/popovers/UTMGeneratorPopover";
import { FirstCommentModal } from "@/components/workspace/post-creator/modals/FirstCommentModal";
import { MediaDropdown } from "@/components/workspace/post-creator/MediaDropdown";
import { GoogleDrivePickerModal } from "@/components/workspace/post-creator/modals/GoogleDrivePickerModal";
import { ImageEditorModal } from "@/components/workspace/post-creator/modals/ImageEditorModal";
import { toast } from "sonner";
import { uploadMediaFile } from "@/services/mediaUpload.service";
import { buildMediaUrl, isVideoPath } from "@/utils/url";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { PlatformIcon } from "@/components/shared/PlatformIcon";
import { validatePostForm } from "@/utils/postValidation";
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
  const [editingMediaIndex, setEditingMediaIndex] = useState(null);
  const [editingImageUrl, setEditingImageUrl] = useState(null);
  const { hasAccess } = useFeatureGate();
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleSaveEditedImage = (newImageUrl) => {
    if (editingMediaIndex === null) return;
    const currentMedia = getMediaUrls();
    const updatedMedia = [...currentMedia];
    updatedMedia[editingMediaIndex] = newImageUrl;
    onUpdatePostFields(post.id, { mediaUrls: updatedMedia });
    setEditingImageUrl(null);
    setEditingMediaIndex(null);
    toast.success("Image edited and saved!");
  };

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
    const toastId = toast.loading(`Preparing ${files.length} file(s)...`);

    try {
      const uploadedUrls = [];
      for (const file of files) {
        toast.loading(`Uploading ${file.name}... 0%`, { id: toastId });
        const finalUrl = await uploadMediaFile(file, activeBrand?.id, (percent) => {
          toast.loading(`Uploading ${file.name}... ${percent}%`, { id: toastId });
        });
        if (finalUrl) {
          uploadedUrls.push(finalUrl);
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
      const errorMessage = err.response?.data?.message || err.message || "Failed to upload files to server";
      console.error("Upload error:", err);
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsUploading(false);
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  const handleRemoveMedia = (urlToRemove) => {
    const currentMedia = getMediaUrls();
    const updatedMedia = currentMedia.filter(url => url !== urlToRemove);
    onUpdatePostFields(post.id, { mediaUrls: updatedMedia });
    toast.success("Attachment removed");
  };

  const mediaList = getMediaUrls();
  const firstMediaUrl = mediaList.length > 0 ? mediaList[0] : null;
  const isVid = firstMediaUrl ? isVideoPath(firstMediaUrl) : false;

  const validationErrors = validatePostForm({
    isLibrary: false,
    selectedPublishId: 'schedule',
    scheduledDate: post.scheduledAt || new Date(),
    selectedPlatforms: selectedPlatforms || [],
    facebookType: post.options?.facebookType || 'post',
    youtubeType: post.options?.youtubeType || 'video',
    instagramType: post.options?.instagramType || 'post',
    videoFileUrl: firstMediaUrl,
    uploadedVideoPath: firstMediaUrl,
    videoFile: null,
    mediaCount: mediaList.length,
    postMedia: mediaList.map(url => ({ path: url }))
  });

  // Map platform keys to React Icons using shared PlatformIcon component
  const renderPlatformIcon = (platform) => {
    return <PlatformIcon platform={platform} size={14} variant="flat" className="inline-block" />;
  };

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, index - 1)}
      onDragOver={(e) => onDragOver(e, index - 1)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, index - 1)}
      className={`bg-[#f0f2f5] rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all duration-300 text-left relative cursor-grab active:cursor-grabbing border ${
        validationErrors.length > 0 ? "border-red-300 ring-1 ring-red-200" : "border-transparent"
      } ${
        draggedIndex === index - 1 ? "opacity-50 border-dashed border-gray-400" : ""
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

      {/* Top Bar: Drag handle & Index pill & Validation Badge & Action Menu */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-gray-400 cursor-grab active:cursor-grabbing hover:text-gray-600">
            <GripVertical size={16} />
          </div>
          <div className="border border-gray-300 rounded-full px-2.5 py-0.5 bg-white text-[10px] font-bold text-gray-700 shadow-sm min-w-[24px] text-center">
            {index}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {validationErrors.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-red-100 border border-red-200 text-red-700 rounded-full text-[10px] font-extrabold font-sans">
              <AlertCircle size={12} className="text-red-500 shrink-0" />
              <span>{validationErrors.length} {validationErrors.length === 1 ? 'Error' : 'Errors'}</span>
            </div>
          )}

          {/* Action Dropdown Menu matching image.png */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                type="button" 
                className="p-1 rounded-lg hover:bg-gray-200/80 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer outline-none"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-1.5 bg-white rounded-xl shadow-xl border border-gray-100 font-sans z-50">
              {/* Copy link */}
              <DropdownMenuItem 
                onClick={() => {
                  navigator.clipboard.writeText(caption);
                  toast.success("Post content copied to clipboard!");
                }}
                className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
              >
                <Link2 size={16} className="text-gray-600 shrink-0" />
                <span>Copy link</span>
              </DropdownMenuItem>

              {/* Send to review (Highlighted / Premium style like screenshot) */}
              <DropdownMenuItem 
                onClick={() => toast.info("Sent to review")}
                className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-gray-500 bg-amber-50/60 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-amber-300/60 flex items-center justify-center shrink-0">
                  <Crown size={12} className="text-amber-800" />
                </div>
                <span className="text-gray-400">Send to review</span>
              </DropdownMenuItem>

              {/* Duplicate in another brand */}
              <DropdownMenuItem 
                onClick={() => toast.info("Duplicate in another brand")}
                className="flex flex-col items-start gap-0.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 font-semibold text-gray-800">
                  <Building2 size={16} className="text-gray-600 shrink-0" />
                  <span>Duplicate in another brand</span>
                </div>
                <p className="text-[10px] text-gray-400 pl-7 leading-tight">
                  Copy to other brands with a simple day and time setup
                </p>
              </DropdownMenuItem>

              {/* Duplicate in another brand (advanced) */}
              <DropdownMenuItem 
                onClick={() => toast.info("Duplicate in another brand (advanced)")}
                className="flex flex-col items-start gap-0.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 font-semibold text-gray-800">
                  <Sparkles size={16} className="text-gray-600 shrink-0" />
                  <span>Duplicate in another brand (advanced)</span>
                </div>
                <p className="text-[10px] text-gray-400 pl-7 leading-tight">
                  Copy to other brands and schedule cadency, duration, and best times
                </p>
              </DropdownMenuItem>

              {/* Delete */}
              <DropdownMenuItem 
                onClick={() => onDelete(post.id)}
                className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors mt-0.5 border-t border-gray-100"
              >
                <Trash2 size={16} className="text-red-500 shrink-0" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

        {/* Validation Errors Panel inside Post Card */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50/90 border border-red-200 rounded-xl p-3 space-y-1 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 text-red-700 font-bold text-xs font-sans">
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <span>Platform Requirements Notice</span>
            </div>
            <div className="space-y-1 pl-5">
              {validationErrors.map((err, idx) => (
                <p key={idx} className="text-[11px] font-semibold text-red-600 font-sans leading-relaxed">
                  • {err}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Media Preview if attached */}
        {mediaList.length > 0 && (
          <div className="flex flex-wrap gap-2.5 pt-2 border-t border-gray-50 animate-in fade-in">
            {mediaList.map((url, idx) => {
              const fullUrl = getMediaPreviewUrl(url);
              const isVideo = isVideoPath(url);

              return (
                <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 shadow-sm shrink-0 group/media bg-gray-900 transition-all hover:shadow-md">
                  {isVideo ? (
                    <div className="w-full h-full relative">
                      <video 
                        src={fullUrl} 
                        className="w-full h-full object-cover" 
                        muted 
                        playsInline 
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Film size={16} className="text-white drop-shadow-md" />
                      </div>
                    </div>
                  ) : (
                    <img 
                      src={fullUrl} 
                      alt="Attached media" 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                        e.target.className = "w-full h-full object-center p-3 bg-gray-100";
                      }}
                    />
                  )}

                  {/* Hover Overlay with Edit & Delete action buttons */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/media:opacity-100 transition-all duration-200 flex items-center justify-center gap-1.5 p-1 z-10 backdrop-blur-[1px]">
                    {!isVideo && (
                      <button
                        type="button"
                        title="Edit image with Canvas"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingMediaIndex(idx);
                          setEditingImageUrl(fullUrl);
                        }}
                        className="w-6 h-6 rounded-full bg-white hover:bg-gray-100 text-gray-800 flex items-center justify-center shadow-md transition-all hover:scale-110 cursor-pointer"
                      >
                        <Pencil size={11} />
                      </button>
                    )}
                    <button
                      type="button"
                      title="Remove attachment"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemoveMedia(url);
                      }}
                      className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-all hover:scale-110 cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
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

      {/* Image Editor (Canvas) Modal */}
      {editingImageUrl && (
        <ImageEditorModal
          isOpen={!!editingImageUrl}
          imageUrl={editingImageUrl}
          brandId={activeBrand?.id}
          onClose={() => {
            setEditingImageUrl(null);
            setEditingMediaIndex(null);
          }}
          onSave={handleSaveEditedImage}
        />
      )}
    </div>
  );
}
