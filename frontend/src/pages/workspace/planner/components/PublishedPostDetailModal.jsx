import React, { useState, useEffect } from "react";
import { X, ExternalLink, Heart, MessageSquare, Share2, Eye, TrendingUp, BarChart2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PlatformIcon } from "@/components/shared/PlatformIcon";
import { getPlatformPostUrl, resolvePlatformTarget } from "@/utils/postUrlHelper";
import { format } from "date-fns";
import socialService from "@/services/social.service";

export function PublishedPostDetailModal({ post, onClose }) {
  const { t } = useTranslation("planner");
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);

  const { platform, platformPostId } = resolvePlatformTarget(post);
  const postUrl = getPlatformPostUrl(post);

  const caption = post?.caption || post?.message || post?.title || t("postDetail.noCaption", "No caption provided");
  const mediaUrl = post?.thumbnail || post?.thumbnailUrl || post?.mediaUrls?.[0] || null;
  const publishedAt = post?.publishedAt || post?.scheduledAt || post?.createdAt;

  useEffect(() => {
    let isMounted = true;
    async function fetchPostMetrics() {
      if (!platform || !platformPostId) return;
      setLoading(true);
      try {
        let res = null;
        if (platform === "FACEBOOK") {
          res = await socialService.getFacebookPostDetails(post.brandId, platformPostId, post.socialAccountId);
        } else if (platform === "YOUTUBE") {
          res = await socialService.getYoutubeVideoDetails(post.brandId, platformPostId, post.socialAccountId);
        }
        if (isMounted && res) {
          setMetrics(res);
        }
      } catch (err) {
        console.warn("[PublishedPostDetailModal] Failed to fetch post metrics:", err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchPostMetrics();
    return () => {
      isMounted = false;
    };
  }, [platform, platformPostId, post?.brandId, post?.socialAccountId]);

  const reactionsCount = metrics?.reactions?.total ?? metrics?.reactions ?? post?.reactionsCount ?? post?.likeCount ?? 0;
  const commentsCount = metrics?.comments ?? post?.commentsCount ?? post?.commentCount ?? 0;
  const sharesCount = metrics?.shares ?? post?.sharesCount ?? post?.repostCount ?? 0;
  const viewsCount = metrics?.views ?? metrics?.reach ?? post?.viewsCount ?? post?.viewCount ?? 0;
  const engagementRate = metrics?.engagement ? `${metrics.engagement}%` : post?.engagementRate ? `${post.engagementRate}%` : "N/A";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <PlatformIcon platform={platform || "YOUTUBE"} className="w-6 h-6" />
            <div>
              <h2 className="text-base font-semibold text-foreground leading-tight">
                {t("postDetail.title", "Chi tiết bài đăng")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {publishedAt ? format(new Date(publishedAt), "PPP p") : t("postDetail.published", "Đã xuất bản")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Media Preview */}
          {mediaUrl && (
            <div className="relative w-full max-h-64 rounded-lg overflow-hidden bg-black/5 border border-border flex items-center justify-center">
              <img
                src={mediaUrl}
                alt="Post Preview"
                className="max-h-64 w-full object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </div>
          )}

          {/* Caption */}
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("postDetail.captionHeader", "Nội dung bài viết")}
            </h4>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-muted/40 p-3 rounded-lg border border-border/50">
              {caption}
            </p>
          </div>

          {/* Analytics Overview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <BarChart2 size={14} />
                {t("postDetail.analyticsHeader", "Chỉ số hiệu suất")}
              </h4>
              {loading && <span className="text-xs text-muted-foreground animate-pulse">Đang cập nhật...</span>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-muted/30 border border-border rounded-lg text-center space-y-1">
                <div className="flex items-center justify-center gap-1 text-rose-500 text-xs font-medium">
                  <Heart size={14} />
                  <span>Reactions</span>
                </div>
                <p className="text-base font-bold text-foreground">{reactionsCount.toLocaleString()}</p>
              </div>

              <div className="p-3 bg-muted/30 border border-border rounded-lg text-center space-y-1">
                <div className="flex items-center justify-center gap-1 text-blue-500 text-xs font-medium">
                  <MessageSquare size={14} />
                  <span>Comments</span>
                </div>
                <p className="text-base font-bold text-foreground">{commentsCount.toLocaleString()}</p>
              </div>

              <div className="p-3 bg-muted/30 border border-border rounded-lg text-center space-y-1">
                <div className="flex items-center justify-center gap-1 text-emerald-500 text-xs font-medium">
                  <Share2 size={14} />
                  <span>Shares</span>
                </div>
                <p className="text-base font-bold text-foreground">{sharesCount.toLocaleString()}</p>
              </div>

              <div className="p-3 bg-muted/30 border border-border rounded-lg text-center space-y-1">
                <div className="flex items-center justify-center gap-1 text-amber-500 text-xs font-medium">
                  <Eye size={14} />
                  <span>Views / Reach</span>
                </div>
                <p className="text-base font-bold text-foreground">{viewsCount.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg mt-2">
              <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <TrendingUp size={14} className="text-primary" />
                Engagement Rate:
              </span>
              <span className="text-sm font-bold text-primary">{engagementRate}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
          >
            {t("postDetail.close", "Đóng")}
          </button>

          {postUrl ? (
            <a
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <span>{t("postDetail.viewOnPlatform", "Xem bài viết gốc")}</span>
              <ExternalLink size={14} />
            </a>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              {t("postDetail.noUrl", "Không có URL bài viết")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
