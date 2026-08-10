import * as React from "react";
import { useState, useEffect, useRef } from "react";
import {
  GripVertical, Trash2, MessageSquare, AlertCircle,
  MoreVertical, Link2, Sparkles, Building2, Crown
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CaptionToolbar } from "@/components/workspace/post-creator/CaptionToolbar";
import { MediaThumbnailGrid } from "@/components/workspace/post-creator/MediaThumbnailGrid";
import { FirstCommentModal } from "@/components/workspace/post-creator/modals/FirstCommentModal";
import { GoogleDrivePickerModal } from "@/components/workspace/post-creator/modals/GoogleDrivePickerModal";
import { ImageEditorModal } from "@/components/workspace/post-creator/modals/ImageEditorModal";
import { toast } from "sonner";
import { uploadMediaFileWithMetadata } from "@/services/mediaUpload.service";
import { buildMediaUrl } from "@/utils/url";
import { PlatformIcon } from "@/components/shared/PlatformIcon";
import { validatePostAgainstAllPresets } from "@/utils/postValidation";
import socialService from "@/services/social.service";

export function AutoListPostCard({
  post,
  index,
  onDelete,
  onToggleStatus,
  onUpdatePostFields,
  activeBrand,
  selectedPlatforms,
  // { facebook: [], youtube: [], instagram: [] } — one effective preset
  // settings object PER SELECTED ACCOUNT of each platform (from
  // AutoListEdit's networkCustom), consumed by validatePostAgainstAllPresets
  // to check every channel, not just one, since each channel gets its own
  // Title/Audience/etc applied independently at publish time.
  validationPresets = {},
  // Drag & Drop handlers
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  draggedIndex
}) {
  const [caption, setCaption] = useState(post.caption || "");
  const [activePopover, setActivePopover] = useState(null); // 'media' | 'emoji' | 'hashtag' | 'utm' | null
  const [showFirstCommentModal, setShowFirstCommentModal] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingMediaIndex, setEditingMediaIndex] = useState(null);
  const [editingImageUrl, setEditingImageUrl] = useState(null);
  // Freshly-picked media, not yet uploaded/saved — {file, previewUrl}[].
  // Upload is deferred until the card's unified Save button is clicked
  // (see handleSaveCard), instead of uploading on pick and autosaving
  // immediately, which is what caused per-file "Uploading... 0%" toasts to
  // appear stuck on slow connections/large files.
  const [pendingMedia, setPendingMedia] = useState([]);
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

  // Revoke any outstanding pending-media blob URLs on unmount (covers card
  // deletion too, since onDelete removing this post from the parent's list
  // unmounts this component).
  useEffect(() => {
    return () => {
      pendingMedia.forEach(p => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasUnsavedChanges = caption !== (post.caption || "") || pendingMedia.length > 0;

  const handleSaveCard = async () => {
    setIsSaving(true);
    try {
      let uploadedUrls = [];
      if (pendingMedia.length > 0) {
        const results = await Promise.allSettled(
          pendingMedia.map(p => uploadMediaFileWithMetadata(p.file, activeBrand?.id))
        );
        const failed = results.find(r => r.status === 'rejected');
        if (failed) {
          toast.error(`Failed to upload: ${failed.reason?.response?.data?.message || failed.reason?.message || "unknown error"}`);
          setIsSaving(false);
          return;
        }
        uploadedUrls = results.map(r => r.value.url);
      }

      const fields = {};
      if (caption !== (post.caption || "")) fields.caption = caption;
      if (uploadedUrls.length > 0) fields.mediaUrls = [...getMediaUrls(), ...uploadedUrls];

      await onUpdatePostFields(post.id, fields);

      pendingMedia.forEach(p => URL.revokeObjectURL(p.previewUrl));
      setPendingMedia([]);
    } catch (err) {
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const insertAtCursor = (textToInsert) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setCaption(caption + textToInsert);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newCaption = caption.substring(0, start) + textToInsert + caption.substring(end);
    setCaption(newCaption);

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

  const handlePickFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (e.target) e.target.value = "";
    if (files.length === 0) return;

    // Upload is deferred until Save — just add to pendingMedia with local
    // blob previews, no network call and no autosave here.
    setPendingMedia(prev => [
      ...prev,
      ...files.map(file => ({ file, previewUrl: URL.createObjectURL(file) }))
    ]);
  };

  // Removing an already-saved URL stays an immediate, explicit committed
  // action (unlike adding media, which only takes effect on Save) — deleting
  // saved media isn't something to batch/undo the way an unsaved pending
  // item is.
  const handleRemoveSavedMedia = (url) => {
    const currentMedia = getMediaUrls();
    const updatedMedia = currentMedia.filter(u => u !== url);
    onUpdatePostFields(post.id, { mediaUrls: updatedMedia });
    toast.success("Attachment removed");
  };

  const handleRemovePendingMedia = (pendingIdx) => {
    setPendingMedia(prev => {
      const removed = prev[pendingIdx];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== pendingIdx);
    });
  };

  const mediaList = getMediaUrls();
  const savedItems = mediaList.map(url => buildMediaUrl(url));
  // MediaThumbnailGrid takes one flat items array — pending items appended
  // after saved ones, with isPending() distinguishing them by index so
  // remove/edit route to the right handler (savedItems.length is the pending
  // section's start offset).
  const gridItems = [...savedItems, ...pendingMedia];

  const handleGridRemove = (gridIndex) => {
    if (gridIndex < savedItems.length) {
      handleRemoveSavedMedia(mediaList[gridIndex]);
    } else {
      handleRemovePendingMedia(gridIndex - savedItems.length);
    }
  };

  const validationErrors = validatePostAgainstAllPresets(post, validationPresets, selectedPlatforms, pendingMedia);

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
      className={`bg-muted/40 rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all duration-300 text-left relative cursor-grab active:cursor-grabbing border ${
        validationErrors.length > 0 ? "border-red-500/30 ring-1 ring-red-500/20" : "border-border"
      } ${
        draggedIndex === index - 1 ? "opacity-50 border-dashed border-border" : ""
      }`}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={handlePickFiles}
      />

      {/* Top Bar: Drag handle & Index pill & Validation Badge & Action Menu */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground cursor-grab active:cursor-grabbing hover:text-foreground">
            <GripVertical size={16} />
          </div>
          <div className="border border-border rounded-full px-2.5 py-0.5 bg-card text-[10px] font-bold text-foreground shadow-sm min-w-[24px] text-center">
            {index}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {validationErrors.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full text-[10px] font-extrabold font-sans">
              <AlertCircle size={12} className="text-red-500 shrink-0" />
              <span>{validationErrors.length} {validationErrors.length === 1 ? 'Error' : 'Errors'}</span>
            </div>
          )}

          {/* Action Dropdown Menu matching image.png */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer outline-none"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-1.5 bg-card rounded-xl shadow-xl border border-border font-sans z-50 text-foreground">
              {/* Copy link */}
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(caption);
                  toast.success("Post content copied to clipboard!");
                }}
                className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted rounded-lg cursor-pointer transition-colors"
              >
                <Link2 size={16} className="text-muted-foreground shrink-0" />
                <span>Copy link</span>
              </DropdownMenuItem>

              {/* Send to review (Highlighted / Premium style like screenshot) */}
              <DropdownMenuItem
                onClick={() => toast.info("Sent to review")}
                className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-muted-foreground bg-amber-500/10 hover:bg-amber-500/20 rounded-lg cursor-pointer transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Crown size={12} className="text-amber-500" />
                </div>
                <span className="text-muted-foreground">Send to review</span>
              </DropdownMenuItem>

              {/* Duplicate in another brand */}
              <DropdownMenuItem
                onClick={() => toast.info("Duplicate in another brand")}
                className="flex flex-col items-start gap-0.5 px-3 py-2 text-xs text-foreground hover:bg-muted rounded-lg cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 font-semibold text-foreground">
                  <Building2 size={16} className="text-muted-foreground shrink-0" />
                  <span>Duplicate in another brand</span>
                </div>
                <p className="text-[10px] text-muted-foreground pl-7 leading-tight">
                  Copy to other brands with a simple day and time setup
                </p>
              </DropdownMenuItem>

              {/* Duplicate in another brand (advanced) */}
              <DropdownMenuItem
                onClick={() => toast.info("Duplicate in another brand (advanced)")}
                className="flex flex-col items-start gap-0.5 px-3 py-2 text-xs text-foreground hover:bg-muted rounded-lg cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 font-semibold text-foreground">
                  <Sparkles size={16} className="text-muted-foreground shrink-0" />
                  <span>Duplicate in another brand (advanced)</span>
                </div>
                <p className="text-[10px] text-muted-foreground pl-7 leading-tight">
                  Copy to other brands and schedule cadency, duration, and best times
                </p>
              </DropdownMenuItem>

              {/* Delete */}
              <DropdownMenuItem
                onClick={() => onDelete(post.id)}
                className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors mt-0.5 border-t border-border"
              >
                <Trash2 size={16} className="text-red-500 shrink-0" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Editor Box */}
      <div className="bg-card border border-border rounded-xl p-3 space-y-3 flex flex-col min-h-[140px] justify-between shadow-inner focus-within:border-foreground transition-colors duration-200 relative">
        <textarea
          ref={textareaRef}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write what you want to share..."
          rows={4}
          className="w-full bg-card border-none outline-none focus:ring-0 resize-none text-xs font-semibold text-foreground placeholder:text-muted-foreground p-0 leading-relaxed"
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

        {/* Media Preview — saved media + picked-but-unsaved pending media in
            one grid, shared with the Post Composer. */}
        <MediaThumbnailGrid
          items={gridItems}
          isPending={(item, gridIndex) => gridIndex >= savedItems.length}
          onEditImage={(gridIndex) => {
            if (gridIndex >= savedItems.length) return; // no editor for pending items yet
            setEditingMediaIndex(gridIndex);
            setEditingImageUrl(savedItems[gridIndex]);
          }}
          onRemove={handleGridRemove}
        />

        {/* Toolbar: Attachment tools & Character count + Platform Icon */}
        <div className="flex items-center justify-between pt-1 text-muted-foreground relative">
          <CaptionToolbar
            activePopover={activePopover}
            setActivePopover={setActivePopover}
            onSelectMediaImage={() => fileInputRef.current?.click()}
            onSelectMediaVideo={() => fileInputRef.current?.click()}
            onSelectMediaDrive={() => setIsDriveModalOpen(true)}
            onSelectEmoji={(emoji) => insertAtCursor(emoji)}
            onInsertHashtag={(text) => insertAtCursor(text)}
            onAddUtmUrl={(utmUrl) => insertAtCursor(utmUrl)}
            iconSize={15}
          >
            {/* First Comment Button — AutoList-specific, not part of the
                shared toolbar's fixed 4 buttons. */}
            <button
              type="button"
              onClick={() => setShowFirstCommentModal(true)}
              className={`text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg cursor-pointer ${post.firstComment ? 'text-[#a855f7] bg-purple-50' : ''}`}
              title="Add first comment"
            >
              <MessageSquare size={15} />
            </button>
          </CaptionToolbar>

          {/* Right counter or unified Save action (caption + pending media) */}
          <div className="flex items-center gap-2.5 text-[10px] font-bold text-muted-foreground">
            {hasUnsavedChanges && (
              <button
                type="button"
                disabled={isSaving}
                onClick={(e) => {
                  e.preventDefault();
                  handleSaveCard();
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-2 py-0.5 rounded-lg transition-all cursor-pointer shadow-sm text-[9px] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save"}
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
        <div className="flex items-center gap-1.5 font-semibold text-muted-foreground">
          <Switch
            checked={post.status !== 'PAUSED'}
            onCheckedChange={(checked) => onToggleStatus(post.id, checked ? 'DRAFT' : 'PAUSED')}
            className="scale-90"
          />
          <span className="text-[11px] font-bold text-muted-foreground">{post.status !== 'PAUSED' ? 'On' : 'Off'}</span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onDelete(post.id);
          }}
          className="text-muted-foreground hover:text-red-500 transition-colors cursor-pointer p-1"
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
        onSelectFile={async (file) => {
          setIsDriveModalOpen(false);
          // Store the raw Drive thumbnailLink/webViewLink directly instead of
          // downloading+re-uploading — those links carry no file extension,
          // which broke isVideoPath's extension-based video detection and
          // made platforms like YouTube/TikTok reject the post as "not a
          // video" even when the imported file was one. Route through the
          // same backend download endpoint the main Post Composer uses
          // (usePostCreatorForm's handleSelectDriveFile), which re-uploads
          // the file and returns a URL with the correct extension.
          const toastId = `import-drive-${post.id}`;
          toast.loading(`Importing "${file.name}" from Google Drive...`, { id: toastId });
          try {
            const res = await socialService.downloadGoogleDriveFile(activeBrand.id, file.id, file.name);
            if (!res.videoUrl) throw new Error("Invalid response received from import service");
            const currentMedia = getMediaUrls();
            const updatedMedia = [...currentMedia, res.videoUrl];
            await onUpdatePostFields(post.id, { mediaUrls: updatedMedia });
            toast.success(`Imported "${file.name}" from Google Drive!`, { id: toastId });
          } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || "Failed to import from Google Drive", { id: toastId });
          }
        }}
      />

      {/* Image Editor (Canvas) Modal */}
      {editingImageUrl && (
        <ImageEditorModal
          isOpen={!!editingImageUrl}
          imageUrl={editingImageUrl}
          brandId={activeBrand?.id}
          eager
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
