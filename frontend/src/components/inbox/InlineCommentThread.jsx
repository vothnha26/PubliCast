import * as React from "react";
import { useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  Youtube, Facebook, Instagram, Sparkles, Languages, Smile, Clipboard, FileText, Send, Check, CornerDownRight
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { SafeAvatar } from "./ConversationItem";
import { useTranslation } from "react-i18next";

const PLATFORM_BADGE = {
  FACEBOOK: { Icon: Facebook, bg: "bg-[#1877F2]" },
  INSTAGRAM: { Icon: Instagram, bg: "bg-[#E1306C]" },
  YOUTUBE: { Icon: Youtube, bg: "bg-red-600" },
};

export const InlineCommentThread = ({
  comment,
  // Replies already posted to this comment (e.g. the page's own past
  // replies fetched from the platform) — rendered nested underneath the
  // comment, distinct from the reply-composer box below which is for
  // writing a NEW reply.
  replies = [],
  activeBrand,
  replyText,
  setReplyText,
  onReply,
  isReplying,
  platform,
  onResolve,
  isExpanded = true,
  onToggleExpand
}) => {
  const { t } = useTranslation(["manage", "common"]);
  const emojiButtonRef = useRef(null);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [emojiPosition, setEmojiPosition] = useState(null);

  // Rendered via portal so the picker isn't clipped by this card's own
  // stacking/overflow — position against the trigger button's real screen
  // coordinates since a portal escapes any CSS-relative ancestor.
  useLayoutEffect(() => {
    if (!isEmojiOpen || !emojiButtonRef.current) return;
    const rect = emojiButtonRef.current.getBoundingClientRect();
    setEmojiPosition({ top: rect.top, left: rect.left });
  }, [isEmojiOpen]);

  const handleEmojiClick = (emojiData) => {
    setReplyText(replyText + emojiData.emoji);
    setIsEmojiOpen(false);
  };

  const rawAuthor = comment?.author || comment?.user || comment?.senderName || "User";
  const authorName = rawAuthor.startsWith('@') ? rawAuthor.slice(1) : rawAuthor;
  const authorAvatar = comment?.avatar;
  const timeAgo = comment?.time || comment?.createdAt || "";
  const commentText = comment?.text || comment?.preview || comment?.content || "";
  const badge = PLATFORM_BADGE[(platform || "").toUpperCase()] || PLATFORM_BADGE.YOUTUBE;

  // AI Quick Suggestion Chips matching screenshot
  const aiChips = [
    "Glad you enjoyed it! 😂",
    "Your laugh made my day! 😄"
  ];

  const handleChipClick = (chipText) => {
    setReplyText(chipText);
  };

  return (
    <div className="w-full max-w-[640px] mx-auto bg-card border border-border/80 rounded-2xl p-5 shadow-lg flex flex-col gap-4 text-left animate-in fade-in duration-300">
      {/* 1. Main Comment Row */}
      <div 
        onClick={onToggleExpand}
        className={`flex items-start gap-3.5 relative ${!isExpanded ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`}
      >
        {/* Avatar with Platform Badge */}
        <div className="relative shrink-0 z-10">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-border/60 bg-amber-600 text-white font-bold text-sm flex items-center justify-center uppercase shadow-xs">
            <SafeAvatar src={authorAvatar} name={authorName} className="w-full h-full object-cover" />
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${badge.bg} border border-card flex items-center justify-center text-white shadow-xs`}>
            <badge.Icon size={9} className="fill-white text-white" />
          </div>
        </div>

        {/* Author Name & Comment Content */}
        <div className="flex-1 space-y-1 pt-0.5">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-foreground tracking-tight">
              {authorName}
            </h4>
            <span className="text-[11px] text-muted-foreground font-medium">
              {timeAgo}
            </span>
          </div>
          <p className="text-xs text-foreground/90 font-normal leading-relaxed">
            {commentText}
          </p>
        </div>
      </div>

      {/* 1b. Existing Replies (already posted — e.g. the page's own past
          reply) — nested under the comment they answer instead of shown as
          separate top-level comment cards. */}
      {replies.length > 0 && (
        <div className="flex flex-col gap-3">
          {replies.map((reply, i) => {
            const replyAuthor = reply.author || reply.user || "Page";
            const replyAvatar = reply.avatar;
            const replyTime = reply.time || reply.createdAt || "";
            const replyText = reply.text || reply.preview || reply.content || "";
            const isPage = reply.from === "me";
            return (
              <div key={reply.id || `reply-${i}`} className="flex items-start gap-3.5 pl-5 relative">
                <div className="absolute left-[19px] -top-3 bottom-1/2 w-0.5 bg-border/60 rounded-full pointer-events-none" />
                <div className="relative shrink-0 z-10">
                  {isPage ? (
                    <div className="w-8 h-8 rounded-full bg-[#EC4899] text-white font-bold text-xs flex items-center justify-center uppercase shadow-xs border border-card">
                      {activeBrand?.name?.charAt(0) || "C"}
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-border/60 bg-muted flex items-center justify-center">
                      <SafeAvatar src={replyAvatar} name={replyAuthor} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-0.5 pt-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-foreground tracking-tight">
                      {isPage ? (activeBrand?.name || "Page") : replyAuthor}
                    </h4>
                    <span className="text-[11px] text-muted-foreground font-medium">{replyTime}</span>
                  </div>
                  <p className="text-xs text-foreground/90 font-normal leading-relaxed">{replyText}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Vertical Thread Connector Line & Inline Embedded Reply Container (Only when expanded) */}
      {isExpanded && (
        <div className="flex items-start gap-3.5 pl-5 relative">
        {/* Connecting Vertical & Curved Thread Line */}
        <div className="absolute left-[19px] -top-3 bottom-5 w-0.5 bg-border/60 rounded-full pointer-events-none" />

        {/* Reply Brand Avatar (Magenta circle 'C') */}
        <div className="relative shrink-0 z-10 pt-1">
          <div className="w-8 h-8 rounded-full bg-[#EC4899] text-white font-bold text-xs flex items-center justify-center uppercase shadow-xs border border-card">
            {activeBrand?.name?.charAt(0) || "C"}
          </div>
        </div>

        {/* Reply Box Outer Container */}
        <div className="flex-1 flex items-start gap-3">
          {/* Main Reply Input Box with Green Border */}
          <div className="flex-1 bg-background border border-emerald-500/80 rounded-2xl p-3.5 shadow-md flex flex-col gap-3 transition-all focus-within:ring-1 focus-within:ring-emerald-500">
            {/* Header: Replying to @Author + AI Suggestion Chips */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <CornerDownRight size={13} className="text-muted-foreground/80" />
                <span>Replying to</span>
                <span className="font-bold text-foreground">@{authorName}</span>
              </div>

              {/* AI Quick Response Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {aiChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    className="px-3 py-1 bg-muted/80 hover:bg-muted active:scale-95 text-foreground rounded-full text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap shadow-2xs border border-border/40"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea Container */}
            <div className="relative bg-muted/30 border border-emerald-500/60 rounded-xl p-3 focus-within:border-emerald-500 transition-colors">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t("inbox.typeReply", "Type in your reply...")}
                rows={3}
                className="w-full bg-transparent border-0 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-none leading-relaxed"
              />

              {/* Floating Action Icons inside Textarea (Magic Wand & Translation) */}
              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-card/80 backdrop-blur-xs p-1 rounded-lg border border-border/50 shadow-xs">
                <button
                  type="button"
                  title="AI Magic Rewrite"
                  className="p-1 hover:bg-muted text-muted-foreground hover:text-emerald-500 rounded-md transition-colors cursor-pointer"
                >
                  <Sparkles size={14} />
                </button>
                <button
                  type="button"
                  title="Translate Reply"
                  className="p-1 hover:bg-muted text-muted-foreground hover:text-blue-500 rounded-md transition-colors cursor-pointer"
                >
                  <Languages size={14} />
                </button>
              </div>
            </div>

            {/* Bottom Footer Toolbar */}
            <div className="flex items-center justify-between pt-0.5">
              {/* Left Utilities Icons (Emoji, Clipboard, Note) */}
              <div className="flex items-center gap-1 text-muted-foreground">
                <button
                  ref={emojiButtonRef}
                  type="button"
                  title="Add Emoji"
                  onClick={() => setIsEmojiOpen((prev) => !prev)}
                  className="p-1.5 hover:bg-muted rounded-lg hover:text-foreground transition-colors cursor-pointer"
                >
                  <Smile size={16} />
                </button>
                <button type="button" title="Saved Replies" className="p-1.5 hover:bg-muted rounded-lg hover:text-foreground transition-colors cursor-pointer">
                  <Clipboard size={16} />
                </button>
                <button type="button" title="Internal Note" className="p-1.5 hover:bg-muted rounded-lg hover:text-foreground transition-colors cursor-pointer">
                  <FileText size={16} />
                </button>

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

              {/* Right Side: Char Counter + Send Button */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-muted-foreground">
                  {replyText.length}/9000
                </span>
                <button
                  type="button"
                  onClick={() => onReply && onReply()}
                  disabled={!replyText.trim() || isReplying}
                  className="p-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 text-slate-950 rounded-xl transition-all font-bold cursor-pointer shadow-xs flex items-center justify-center"
                >
                  <Send size={15} className="fill-slate-950" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Action Checkmark Button (Resolve / Mark Done) */}
          <button
            type="button"
            onClick={onResolve}
            title="Mark as Resolved"
            className="p-2.5 rounded-full border border-border/80 bg-card hover:border-emerald-500 hover:text-emerald-500 text-muted-foreground transition-all cursor-pointer shrink-0 mt-2 shadow-xs"
          >
            <Check size={16} />
          </button>
        </div>
      </div>
      )}
    </div>
  );
};
