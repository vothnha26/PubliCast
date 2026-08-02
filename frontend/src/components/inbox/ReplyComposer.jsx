import * as React from "react";
import { useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Youtube, Loader2, Smile, X, ImageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import EmojiPicker from "emoji-picker-react";
import { toast } from "sonner";
import { useBrand } from "../../context/BrandContext";
import { uploadMediaFile } from "../../services/mediaUpload.service";

// Facebook's Graph API accepts an attachment_url when posting/replying to a
// comment; YouTube's Data API v3 comment endpoints (commentThreads.insert /
// comments.insert) only accept plain text, no media field exists.
const PLATFORMS_SUPPORTING_ATTACHMENT = ["FACEBOOK"];

export const ReplyComposer = ({ replyText, setReplyText, onReply, isReplying, placeholder, platform }) => {
  const { t } = useTranslation(["manage", "common"]);
  const { activeBrand } = useBrand();
  const fileInputRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [emojiPosition, setEmojiPosition] = useState(null);
  const [attachmentUrl, setAttachmentUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Rendered via portal (see below) so the picker isn't clipped by this
  // composer's own overflow-hidden card — position it against the trigger
  // button's real screen coordinates instead of relying on a CSS-relative
  // ancestor, which a portal escapes.
  useLayoutEffect(() => {
    if (!isEmojiOpen || !emojiButtonRef.current) return;
    const rect = emojiButtonRef.current.getBoundingClientRect();
    setEmojiPosition({ top: rect.top, left: rect.left });
  }, [isEmojiOpen]);

  const normalizedPlatform = (platform || "").toUpperCase();
  const attachmentSupported = PLATFORMS_SUPPORTING_ATTACHMENT.includes(normalizedPlatform);

  const handleSubmit = (e) => {
    e.preventDefault();
    onReply(attachmentUrl || undefined);
    setAttachmentUrl(null);
  };

  const handleEmojiClick = (emojiData) => {
    setReplyText(replyText + emojiData.emoji);
    setIsEmojiOpen(false);
  };

  const handlePaperclipClick = () => {
    if (!attachmentSupported) {
      toast.error(t("inbox.attachmentNotSupported", "Nền tảng này không hỗ trợ đính kèm ảnh vào bình luận."));
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeBrand?.id) return;
    setIsUploading(true);
    try {
      const url = await uploadMediaFile(file, activeBrand.id);
      setAttachmentUrl(url);
    } catch (err) {
      toast.error(t("inbox.attachmentUploadFailed", "Tải ảnh lên thất bại."));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 bg-card border-t border-border">
      <div className="bg-card border border-border rounded-2xl overflow-hidden focus-within:border-ring transition-all shadow-sm">
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder={placeholder || t("inbox.replyPlaceholder")}
          rows={3}
          className="w-full p-4 text-[13px] bg-transparent text-foreground placeholder:text-muted-foreground border-none focus:ring-0 resize-none min-h-[100px]"
        />

        {attachmentUrl && (
          <div className="px-4 pb-2">
            <div className="relative inline-block">
              <img src={attachmentUrl} alt="Attachment preview" className="h-16 w-16 object-cover rounded-lg border border-border" />
              <button
                type="button"
                onClick={() => setAttachmentUrl(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center cursor-pointer"
                title="Remove attachment"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        <div className="px-4 py-3 bg-muted/50 flex items-center justify-between border-t border-border">
          <div className="flex gap-3 text-muted-foreground">
            <button ref={emojiButtonRef} type="button" onClick={() => setIsEmojiOpen((prev) => !prev)} className="hover:text-foreground cursor-pointer">
              <Smile size={18} />
            </button>
            <button
              type="button"
              onClick={handlePaperclipClick}
              disabled={isUploading}
              className={`hover:text-foreground cursor-pointer ${!attachmentSupported ? "opacity-50" : ""}`}
              title={attachmentSupported ? undefined : t("inbox.attachmentNotSupported", "Nền tảng này không hỗ trợ đính kèm ảnh vào bình luận.")}
            >
              {isUploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            {isEmojiOpen && emojiPosition && createPortal(
              <>
                <div className="fixed inset-0 z-[100]" onClick={() => setIsEmojiOpen(false)} />
                <div
                  className="fixed z-[101]"
                  style={{ top: emojiPosition.top - 358, left: emojiPosition.left }}
                >
                  <EmojiPicker onEmojiClick={handleEmojiClick} height={350} width={300} />
                </div>
              </>,
              document.body
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-muted-foreground">{replyText.length} / 10000</span>
              <div className="w-4 h-4 rounded bg-[#FF0000] flex items-center justify-center">
                <Youtube className="text-white fill-white" size={8} />
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isReplying || (!replyText && !attachmentUrl)}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-xl text-[12px] font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-20 cursor-pointer"
            >
              {isReplying ? <Loader2 size={16} className="animate-spin" /> : t("inbox.sendCtrlEnter")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
