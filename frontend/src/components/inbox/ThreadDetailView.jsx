import { useState, useMemo, useEffect } from "react";
import { AlertCircle, EyeOff, CheckCircle, ExternalLink, Loader2, MessageSquare, Youtube, Facebook, Instagram } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SafeAvatar } from "./ConversationItem";
import { VideoContextCard } from "./VideoContextCard";
import { InlineCommentThread } from "./InlineCommentThread";
import { ReplyComposer } from "./ReplyComposer";

export const ThreadDetailView = ({
  activeConv,
  videoContext,
  thread = [],
  threadLoading = false,
  activeBrand,
  replyText,
  setReplyText,
  onReply,
  isReplying,
  onUpdateStatus,
  platform,
  onResolve,
  // Separate from replyText/onReply (which always target a specific
  // existing comment) — this posts a brand-new top-level comment on the
  // post, available even when it already has other comments.
  newCommentText,
  setNewCommentText,
  onPostNewComment,
  isPostingNewComment,
}) => {
  const { t } = useTranslation(["manage", "common"]);
  const [activeCommentId, setActiveCommentId] = useState(null);

  // Posts with no synced InboxItem yet (0 real comments) have nothing
  // genuine to show as a "comment" — activeConv here is just the post
  // itself, not a comment someone wrote, so fabricating one from its title
  // would be misleading. Show an empty state + first-comment composer
  // instead of falling back to a fake comment bubble.
  const hasNoComments = activeConv?.isSyntheticPost && (!thread || thread.length === 0);

  // Derive comments list to render
  const displayComments = useMemo(() => {
    if (thread && thread.length > 0) return thread;
    if (activeConv && !activeConv.isSyntheticPost) {
      return [{
        id: activeConv.id,
        author: activeConv.user || activeConv.author || "User",
        avatar: activeConv.avatar,
        text: activeConv.preview || activeConv.content || activeConv.text || "",
        time: activeConv.time || activeConv.createdAt || "Recently",
        from: "user"
      }];
    }
    return [];
  }, [thread, activeConv]);

  // Group the flat comment list into { root, replies[] } so a reply from
  // the page renders nested under the comment it answers (like a real
  // Facebook/YouTube thread) instead of as its own independent comment
  // card. thread already arrives pre-ordered as [root, ...its replies,
  // root, ...its replies, ...] (see getConversationThread), so a comment
  // with no parentItemId starts a new group and anything with a
  // parentItemId attaches to the most recent group.
  const commentGroups = useMemo(() => {
    const groups = [];
    const byId = new Map();
    for (const msg of displayComments) {
      if (!msg.parentItemId) {
        const group = { root: msg, replies: [] };
        groups.push(group);
        byId.set(msg.id, group);
      } else {
        const parentGroup = byId.get(msg.parentItemId);
        if (parentGroup) {
          parentGroup.replies.push(msg);
        } else {
          // Parent not present in this batch (shouldn't normally happen —
          // getCommentsByPost always includes a comment's own replies) —
          // fall back to showing it as its own top-level card rather than
          // silently dropping it.
          groups.push({ root: msg, replies: [] });
        }
      }
    }
    return groups;
  }, [displayComments]);

  // Reset activeCommentId when switching active conversation
  useEffect(() => {
    setActiveCommentId(null);
  }, [activeConv?.id]);

  if (!activeConv) {
    return (
      <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden relative">
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-6">
            <AlertCircle size={40} strokeWidth={1.5} />
          </div>
          <h3 className="text-[15px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
            {t("inbox.selectConversationPrompt", "Chọn một cuộc trò chuyện để xem chi tiết")}
          </h3>
        </div>
      </div>
    );
  }

  const effectiveVideoContext = videoContext || activeConv?.videoContext;
  const videoId = effectiveVideoContext?.id || activeConv?.videoContext?.id;
  const rawTitle = effectiveVideoContext?.channelTitle || effectiveVideoContext?.title || activeConv?.videoContext?.title || activeConv?.title;
  const displayTitle = rawTitle || activeConv?.user || "@Thanhkhoa95";
  const displayPlatform = activeConv?.platform || platform || "YOUTUBE";
  const displayAvatar = effectiveVideoContext?.thumbnailUrl || activeConv?.videoContext?.thumbnailUrl || activeConv?.avatar;

  // The external "view on platform" link must point at the post's own
  // platform, not always YouTube — a Facebook post's videoId is a Facebook
  // post ID, and building a youtube.com/watch?v= URL from it just bounces
  // to YouTube's homepage with junk tracking params. Prefer a real
  // platform-supplied postUrl; only fall back to constructing a YouTube URL
  // when the post is actually on YouTube.
  const postUrl =
    effectiveVideoContext?.postUrl ||
    activeConv?.videoContext?.postUrl ||
    (videoId && displayPlatform?.toUpperCase() === "YOUTUBE" ? `https://www.youtube.com/watch?v=${videoId}` : null) ||
    (videoId && displayPlatform?.toUpperCase() === "FACEBOOK" ? `https://www.facebook.com/${videoId}` : null);

  return (
    <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden relative">
      {/* Top Header of Detail Panel (Post / Video Title) */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0">
            <SafeAvatar
              src={displayAvatar}
              name={displayTitle}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-foreground truncate max-w-[360px]">
              {displayTitle}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {displayPlatform}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-[10px] font-bold text-emerald-500">Live Comments</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onUpdateStatus && (
            <>
              <button
                onClick={() => onUpdateStatus(activeConv.id, activeConv.unread ? "READ" : "UNREAD")}
                className="p-2 border-none bg-transparent cursor-pointer transition-colors"
                style={{ color: activeConv.unread ? "var(--foreground)" : "var(--muted-foreground)" }}
                title={activeConv.unread ? "Mark as Read" : "Mark as Unread"}
              >
                <EyeOff size={18} />
              </button>
              <button
                onClick={() => onUpdateStatus(activeConv.id, "RESOLVED")}
                className="p-2 border-none bg-transparent cursor-pointer transition-colors"
                style={{ color: activeConv.status === "resolved" ? "#22c55e" : "var(--muted-foreground)" }}
                title="Mark as Resolved"
              >
                <CheckCircle size={18} />
              </button>
            </>
          )}
          {postUrl && (
            <a
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-all"
              title={`View on ${displayPlatform}`}
            >
              <ExternalLink size={16} />
            </a>
          )}
        </div>
      </div>

      {/* Main Scroll Content Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-thin bg-background">
        {threadLoading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" size={40} /></div>
        ) : (
          <>
            {/* 1. Top Video/Post Context Card Preview */}
            <VideoContextCard videoContext={effectiveVideoContext} activeConv={activeConv} />

            {!hasNoComments && (
              /* 2. Stats Bar matching Screenshot 1 & 2 (0 replied / X comments ... Includes replies via <platform>) */
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground max-w-[640px] w-full mx-auto px-1 py-1">
                <div>
                  <span className="font-bold text-foreground">0 replied</span>
                  <span> / </span>
                  <span>{displayComments.length} comment{displayComments.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Includes replies via</span>
                  <span className="flex items-center gap-1 font-semibold text-foreground uppercase">
                    {displayPlatform?.toUpperCase() === "FACEBOOK" ? (
                      <Facebook className="w-3.5 h-3.5 text-[#1877F2] fill-[#1877F2]" />
                    ) : displayPlatform?.toUpperCase() === "INSTAGRAM" ? (
                      <Instagram className="w-3.5 h-3.5 text-[#E1306C]" />
                    ) : (
                      <Youtube className="w-3.5 h-3.5 text-red-600 fill-red-600" />
                    )}
                    {displayPlatform}
                  </span>
                </div>
              </div>
            )}

            {hasNoComments ? (
              /* Post has no real comments yet — offer to write the first one
                 instead of showing a comment thread that doesn't exist. */
              <div className="flex-1 flex flex-col items-center justify-center max-w-[640px] w-full mx-auto py-10 gap-6">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <MessageSquare size={28} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    {t("inbox.noCommentsYetTitle", "Chưa có bình luận nào")}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-[360px]">
                    {t("inbox.noCommentsYetSubtitle", "Hãy là người đầu tiên bình luận trên bài viết này.")}
                  </p>
                </div>
                <div className="w-full">
                  <ReplyComposer
                    replyText={replyText}
                    setReplyText={setReplyText}
                    onReply={onReply}
                    isReplying={isReplying}
                    platform={displayPlatform}
                  />
                </div>
              </div>
            ) : (
              /* 3. Comments List with Expandable Embedded Reply Box matching Screenshot 1 & 2 */
              <div className="flex flex-col gap-5 max-w-[640px] w-full mx-auto pb-4">
                {onPostNewComment && (
                  /* Write a brand-new top-level comment — pinned above the
                     list, distinct from replying to any specific comment
                     below. */
                  <div className="border border-border/80 rounded-2xl overflow-hidden">
                    <ReplyComposer
                      replyText={newCommentText}
                      setReplyText={setNewCommentText}
                      onReply={onPostNewComment}
                      isReplying={isPostingNewComment}
                      placeholder={t("inbox.newCommentPlaceholder", "Viết bình luận mới...")}
                      platform={displayPlatform}
                    />
                  </div>
                )}
                {commentGroups.map(({ root: msg, replies }, i) => {
                  const commentId = msg.id || `msg-${i}`;
                  const isExpanded = activeCommentId === commentId;

                  const commentAuthor = msg.author || msg.user || activeConv.user;
                  const commentAvatar = msg.avatar || activeConv.avatar;
                  const commentTime = msg.time || msg.createdAt || "Recently";
                  const commentText = msg.text || msg.preview || msg.content || "";

                  return (
                    <InlineCommentThread
                      key={commentId}
                      comment={{
                        author: commentAuthor,
                        avatar: commentAvatar,
                        time: commentTime,
                        text: commentText
                      }}
                      replies={replies}
                      activeBrand={activeBrand}
                      replyText={replyText}
                      setReplyText={setReplyText}
                      onReply={onReply}
                      isReplying={isReplying}
                      platform={displayPlatform}
                      onResolve={() => (onResolve ? onResolve(commentId) : onUpdateStatus && onUpdateStatus(activeConv.id, "RESOLVED"))}
                      isExpanded={isExpanded}
                      onToggleExpand={() => setActiveCommentId(isExpanded ? null : commentId)}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
