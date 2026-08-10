import React, { useState, useEffect } from "react";
import {
  X, ExternalLink, ThumbsUp, MessageSquare, Activity, Eye,
  BarChart2, MoreVertical, Tag, Play, Share2, Target, MousePointerClick,
  ChevronUp, Loader2
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { resolvePlatformTarget, getPlatformPostUrl } from "@/utils/postUrlHelper";
import socialService from "@/services/social.service";
import { PlatformMetricsStrategyFactory } from "@/services/strategies/platformMetrics.strategy";
import { useBrand } from "@/context/BrandContext";
import { PlatformIcon } from "@/components/shared/PlatformIcon";
import { formatInBrandTimezone } from "@/utils/brandTimezone";

export function PublishedPostDetailModal({ post, onClose }) {
  const { t } = useTranslation("planner");
  const { activeBrand } = useBrand();
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [showInsights, setShowInsights] = useState(false);
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(null);
  const [insightsFetched, setInsightsFetched] = useState(false);

  const resolvedTarget = resolvePlatformTarget(post || {});
  const postUrl = getPlatformPostUrl(post || {});

  const rawPlatform = (
    post?.platform ||
    resolvedTarget.platform ||
    (postUrl?.includes("facebook") ? "FACEBOOK" :
     postUrl?.includes("instagram") ? "INSTAGRAM" :
     postUrl?.includes("tiktok") ? "TIKTOK" :
     postUrl?.includes("youtube") ? "YOUTUBE" :
     postUrl?.includes("threads") ? "THREADS" :
     postUrl?.includes("bsky") ? "BLUESKY" : "YOUTUBE")
  ).toUpperCase();

  const platform = rawPlatform;
  const platformPostId = resolvedTarget.platformPostId;

  const caption = post?.caption || post?.message || post?.title || "";
  const mediaUrl = post?.thumbnail || post?.thumbnailUrl || post?.mediaUrl || post?.mediaUrls?.[0] || null;
  const publishedAt = post?.publishedAt || post?.scheduledAt || post?.createdAt || post?.date;
  const channelTitle = post?.channelTitle || post?.authorName || post?.socialAccount?.displayName || post?.socialAccount?.accountName || post?.brandName || "Social Channel";
  const avatarUrl = post?.avatarUrl || post?.avatar || post?.socialAccount?.profilePictureUrl || post?.socialAccount?.avatarUrl || null;

  const brandId = post?.brandId || post?.activeBrandId || activeBrand?.id || (typeof window !== "undefined" ? (window.activeBrandId || localStorage.getItem("activeBrandId")) : null);
  const targetPostId = platformPostId || post?.id || post?.videoId || post?.platformItemId || post?.relatedPostId || null;

  useEffect(() => {
    let isMounted = true;
    async function fetchPostMetrics() {
      if (!platform || !targetPostId || !brandId) return;
      setLoading(true);
      try {
        const strategy = PlatformMetricsStrategyFactory.getStrategy(platform);
        let res = null;
        if (strategy) {
          res = await strategy.fetchMetrics(brandId, targetPostId, post?.socialAccountId);
        } else if (platform === "FACEBOOK") {
          res = await socialService.getFacebookPostDetails(brandId, targetPostId, post?.socialAccountId);
        } else if (platform === "YOUTUBE") {
          res = await socialService.getYoutubeVideoDetails(brandId, targetPostId, post?.socialAccountId);
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
  }, [platform, targetPostId, brandId, post?.socialAccountId]);

  // Lazy: only fetches on first expand, not on modal open — most opens are
  // just to glance at basic metrics, not the deep-dive breakdown. Only
  // platforms whose strategy implements fetchInsights (currently YouTube)
  // return real data; others resolve to null and the section stays hidden.
  const handleToggleInsights = async () => {
    const next = !showInsights;
    setShowInsights(next);
    if (!next || insightsFetched) return;

    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const strategy = PlatformMetricsStrategyFactory.getStrategy(platform);
      const res = strategy ? await strategy.fetchInsights(brandId, targetPostId, post?.socialAccountId) : null;
      setInsights(res);
    } catch (err) {
      setInsightsError(err?.message || "Failed to load insights");
    } finally {
      setInsightsLoading(false);
      setInsightsFetched(true);
    }
  };

  // 100% Real metrics extraction directly from API response or post object
  const reactionsCount = (typeof metrics?.reactions === 'object' ? metrics?.reactions?.total : metrics?.reactions) || post?.stats?.likes || post?.stats?.reactions || post?.reactionsCount || post?.likeCount || post?.likes || post?.reactions || 0;
  const commentsCount = metrics?.comments || post?.stats?.comments || post?.commentsCount || post?.commentCount || post?.comments || 0;
  const viewsCount = metrics?.views || post?.stats?.views || post?.viewsCount || post?.viewCount || post?.views || 0;
  const impressionsCount = metrics?.impressions || metrics?.reach || post?.stats?.impressions || post?.stats?.reach || post?.impressionsCount || post?.impressions || post?.reach || 0;
  const sharesCount = metrics?.shares || post?.stats?.shares || post?.sharesCount || post?.repostCount || 0;
  const clicksCount = metrics?.clicks || post?.stats?.clicks || post?.clicksCount || post?.clicks || 0;

  const rawEng = metrics?.engagement || post?.stats?.engagement || post?.stats?.engagementRate || post?.engagementRate;
  const engagementRate = rawEng !== undefined && rawEng !== null && rawEng !== "-" ? (String(rawEng).endsWith("%") ? rawEng : `${rawEng}%`) : "-";

  const formattedDate = publishedAt
    ? formatInBrandTimezone(publishedAt, activeBrand?.timezone, { locale: "en-US", month: "short", day: "numeric", year: undefined, hour: "numeric", minute: "2-digit", hour12: true })
    : "Jul 11, 4:14 PM";
  const targetLabel = post?.targetPlatforms || post?.options?.targetType || t("postDetail.custom", "Custom");

  const isFacebook = platform === "FACEBOOK";
  const isInstagram = platform === "INSTAGRAM";
  const isYoutube = platform === "YOUTUBE";
  const isTikTok = platform === "TIKTOK";
  const isVideoPlatform = isYoutube || isTikTok;

  // Layout mode: Facebook / Instagram displays caption top, image below. YouTube / TikTok displays vertical video box left.
  const isTopCaptionLayout = !isVideoPlatform;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-[640px] bg-card text-card-foreground border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border text-xs text-muted-foreground bg-muted/20">
          <div className="flex items-center gap-1.5 font-medium">
            <span>{t("postDetail.publishedOn", "Published on")} {formattedDate}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground/70">📌</span> {targetLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[65vh] scrollbar-thin">
          {/* Author / Channel Info Header */}
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={channelTitle} className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-emerald-600 dark:bg-emerald-700 flex items-center justify-center text-white font-bold text-sm">
                  {channelTitle.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow-sm flex items-center justify-center">
                <PlatformIcon platform={platform} size={14} variant="flat" />
              </div>
            </div>
            <span className="font-bold text-sm text-foreground tracking-tight">{channelTitle}</span>
          </div>

          {/* Media & Content Area */}
          {isTopCaptionLayout ? (
            /* Facebook / Instagram Layout: Caption on Top, Media Image Below */
            <div className="space-y-3">
              {caption && (
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-normal">
                  {caption}
                </div>
              )}
              {mediaUrl && (
                <div
                  onClick={() => postUrl && window.open(postUrl, "_blank", "noopener,noreferrer")}
                  role={postUrl ? "button" : undefined}
                  title={postUrl ? t("postDetail.goToPost", "Go to post") : undefined}
                  className={`relative w-full max-h-[300px] rounded-xl overflow-hidden bg-muted/40 border border-border flex items-center justify-center ${postUrl ? "cursor-pointer" : ""}`}
                >
                  <img src={mediaUrl} alt="Preview" className="w-full max-h-[300px] object-cover" />
                </div>
              )}
            </div>
          ) : (
            /* YouTube / Video Layout: Vertical Thumbnail Left, Caption Right */
            <div className="flex gap-4 items-start">
              {mediaUrl && (
                <div
                  onClick={() => postUrl && window.open(postUrl, "_blank", "noopener,noreferrer")}
                  role={postUrl ? "button" : undefined}
                  title={postUrl ? t("postDetail.goToPost", "Go to post") : undefined}
                  className={`relative w-[180px] h-[240px] rounded-xl overflow-hidden bg-muted/40 border border-border shrink-0 group ${postUrl ? "cursor-pointer" : ""}`}
                >
                  <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                      <Play size={18} className="fill-white text-white ml-0.5" />
                    </div>
                  </div>
                </div>
              )}
              {caption && (
                <div className="flex-1 text-sm text-foreground leading-relaxed font-normal py-1 max-h-[240px] overflow-y-auto scrollbar-thin">
                  {caption}
                </div>
              )}
            </div>
          )}

          {/* Action / Tag Row */}
          <div className="pt-1">
            <button className="w-8 h-8 rounded-lg bg-muted/60 border border-border hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              <Tag size={15} />
            </button>
          </div>
        </div>

        {/* Performance Metrics Section (Horizontal Stats Bar - No Scrollbar) */}
        <div className="px-4 py-3.5 border-t border-b border-border bg-muted/30">
          <div className="flex items-center justify-between text-xs font-semibold gap-2">
            <div className="flex items-center justify-between flex-1 gap-1 sm:gap-2 overflow-hidden">
              {/* Reactions */}
              <div className="flex items-center gap-1 shrink-0">
                <ThumbsUp size={13} className="text-muted-foreground shrink-0" />
                <span className="text-muted-foreground text-[11px] sm:text-xs">{t("postDetail.reactions", "Cảm xúc")}</span>
                <span className="font-bold text-foreground text-xs">{reactionsCount}</span>
              </div>

              {/* Comments */}
              <div className="flex items-center gap-1 shrink-0">
                <MessageSquare size={13} className="text-muted-foreground shrink-0" />
                <span className="text-muted-foreground text-[11px] sm:text-xs">{t("postDetail.comments", "Bình luận")}</span>
                <span className="font-bold text-foreground text-xs">{commentsCount}</span>
              </div>

              {/* Eng. Rate */}
              <div className="flex items-center gap-1 shrink-0">
                <Activity size={13} className="text-muted-foreground shrink-0" />
                <span className="text-muted-foreground text-[11px] sm:text-xs">{t("postDetail.engRate", "Tương tác")}</span>
                <span className="font-bold text-foreground text-xs">{engagementRate}</span>
              </div>

              {/* Impressions or Views */}
              {isFacebook || impressionsCount > 0 ? (
                <div className="flex items-center gap-1 shrink-0">
                  <Target size={13} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground text-[11px] sm:text-xs">{t("postDetail.impressions", "Lượt hiển thị")}</span>
                  <span className="font-bold text-foreground text-xs">{impressionsCount.toLocaleString()}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 shrink-0">
                  <Eye size={13} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground text-[11px] sm:text-xs">{t("postDetail.views", "Lượt xem")}</span>
                  <span className="font-bold text-foreground text-xs">{viewsCount.toLocaleString()}</span>
                </div>
              )}

              {/* Shares (for Facebook / Instagram) */}
              {(isFacebook || sharesCount > 0) && (
                <div className="flex items-center gap-1 shrink-0">
                  <Share2 size={13} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground text-[11px] sm:text-xs">{t("postDetail.shares", "Chia sẻ")}</span>
                  <span className="font-bold text-foreground text-xs">{sharesCount}</span>
                </div>
              )}

              {/* Clicks (for Facebook) */}
              {(isFacebook || clicksCount > 0) && (
                <div className="flex items-center gap-1 shrink-0">
                  <MousePointerClick size={13} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground text-[11px] sm:text-xs">{t("postDetail.clicks", "Lượt nhấp")}</span>
                  <span className="font-bold text-foreground text-xs">{clicksCount.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Chart icon — only shown for platforms whose strategy exposes
                deep-dive insights (currently YouTube only); other platforms
                have no fetchInsights implementation, so hide it rather than
                show a toggle that always opens an empty section. */}
            {isYoutube && (
              <button
                onClick={handleToggleInsights}
                className="p-1.5 rounded-lg bg-muted/60 border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 ml-1"
                title={t("postDetail.viewInsights", "Xem phân tích chi tiết")}
              >
                {showInsights ? <ChevronUp size={15} /> : <BarChart2 size={15} />}
              </button>
            )}
          </div>
        </div>

        {/* Deep-Dive Insights Section (basic video metrics) */}
        {showInsights && (
          <div className="px-5 py-4 border-b border-border bg-muted/10 overflow-y-auto max-h-[40vh] scrollbar-thin space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
              <span>{t("postDetail.youtubeMetricsTitle", "Phân tích số liệu Video YouTube")}</span>
            </div>
            {insightsLoading ? (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-6">
                <Loader2 size={14} className="animate-spin" />
                <span>{t("postDetail.loadingInsights", "Đang tải phân tích...")}</span>
              </div>
            ) : insightsError ? (
              <div className="text-xs text-rose-600 text-center py-6">{insightsError}</div>
            ) : !insights ? (
              <div className="text-xs text-muted-foreground text-center py-6">
                {t("postDetail.noInsights", "Chưa có dữ liệu phân tích chi tiết cho video này.")}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                {/* 1. Views */}
                <div className="rounded-xl bg-card border border-border p-3 flex flex-col items-center justify-center text-center shadow-xs">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Eye size={13} />
                    <span className="text-[10px] font-medium uppercase tracking-wider">{t("postDetail.views", "Lượt xem")}</span>
                  </div>
                  <div className="text-base font-extrabold text-foreground">{(insights.views || 0).toLocaleString()}</div>
                </div>

                {/* 2. Watch Time */}
                <div className="rounded-xl bg-card border border-border p-3 flex flex-col items-center justify-center text-center shadow-xs">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <BarChart2 size={13} />
                    <span className="text-[10px] font-medium uppercase tracking-wider">{t("postDetail.watchTime", "Giờ xem")}</span>
                  </div>
                  <div className="text-base font-extrabold text-foreground">{insights.totalWatchHrs ?? insights.watchTime ?? 0}h</div>
                </div>

                {/* 3. Avg View Duration */}
                <div className="rounded-xl bg-card border border-border p-3 flex flex-col items-center justify-center text-center shadow-xs">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Activity size={13} />
                    <span className="text-[10px] font-medium uppercase tracking-wider">{t("postDetail.avgViewDuration", "Xem TB")}</span>
                  </div>
                  <div className="text-base font-extrabold text-foreground">
                    {insights.avgViewDuration ? `${Math.floor(insights.avgViewDuration / 60)}:${String(insights.avgViewDuration % 60).padStart(2, '0')}` : "00:00"}
                  </div>
                </div>

                {/* 4. Likes */}
                <div className="rounded-xl bg-card border border-border p-3 flex flex-col items-center justify-center text-center shadow-xs">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <ThumbsUp size={13} />
                    <span className="text-[10px] font-medium uppercase tracking-wider">{t("postDetail.reactions", "Thích")}</span>
                  </div>
                  <div className="text-base font-extrabold text-foreground">{(insights.likes || 0).toLocaleString()}</div>
                </div>

                {/* 5. Comments */}
                <div className="rounded-xl bg-card border border-border p-3 flex flex-col items-center justify-center text-center shadow-xs">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <MessageSquare size={13} />
                    <span className="text-[10px] font-medium uppercase tracking-wider">{t("postDetail.comments", "Bình luận")}</span>
                  </div>
                  <div className="text-base font-extrabold text-foreground">{(insights.comments || 0).toLocaleString()}</div>
                </div>

                {/* 6. Shares */}
                <div className="rounded-xl bg-card border border-border p-3 flex flex-col items-center justify-center text-center shadow-xs">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Share2 size={13} />
                    <span className="text-[10px] font-medium uppercase tracking-wider">{t("postDetail.shares", "Chia sẻ")}</span>
                  </div>
                  <div className="text-base font-extrabold text-foreground">{(insights.shares || 0).toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-muted/40">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>{t("postDetail.publishedVia", "Published via")}</span>
            <div className="flex items-center gap-1.5 text-foreground font-semibold">
              <PlatformIcon platform={platform} size={15} variant="flat" />
              <span className="capitalize">{platform === "YOUTUBE" ? "YouTube" : platform === "TIKTOK" ? "TikTok" : platform.toLowerCase()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {postUrl ? (
              <a
                href={postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3.5 py-1.5 bg-muted hover:bg-muted/80 border border-border text-foreground text-xs font-semibold rounded-xl transition-all no-underline cursor-pointer"
              >
                <ExternalLink size={13} />
                <span>{t("postDetail.goToPost", "Go to post")}</span>
              </a>
            ) : (
              <button
                disabled
                className="flex items-center gap-2 px-3.5 py-1.5 bg-muted/30 border border-border/50 text-muted-foreground/50 text-xs font-semibold rounded-xl cursor-not-allowed"
              >
                <ExternalLink size={13} />
                <span>{t("postDetail.goToPost", "Go to post")}</span>
              </button>
            )}

            <button className="p-1.5 bg-muted hover:bg-muted/80 border border-border text-muted-foreground hover:text-foreground rounded-xl transition-colors cursor-pointer">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
