import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import socialService from "../../services/social.service";

/**
 * Fair Use daily posting cap indicator for a single connected account —
 * mirrors the same rolling-24h enforcement query the backend uses at
 * publish time, so what's shown here always matches what would block a post.
 */
export function DailyPostingUsageBadge({ brandId, socialAccountId }) {
  const { t } = useTranslation("topbar");
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUsage = useCallback(async () => {
    if (!brandId || !socialAccountId) return;
    try {
      const list = await socialService.getPostingUsage(brandId);
      setUsage((list || []).find((u) => u.socialAccountId === socialAccountId) || null);
    } catch (error) {
      console.error("Failed to load daily posting usage:", error);
    } finally {
      setLoading(false);
    }
  }, [brandId, socialAccountId]);

  useEffect(() => {
    setLoading(true);
    loadUsage();
  }, [loadUsage]);

  if (loading || !usage || !usage.configured) return null;

  const pct = Math.min((usage.publishedCount / usage.maxPostsPerDay) * 100, 100);
  const atCap = usage.remaining === 0;

  return (
    <div className="flex items-center gap-2" title={t("channels.dailyLimitTooltip", "Số bài đăng trong 24 giờ qua")}>
      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${atCap ? "bg-red-500" : "bg-purple-600"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[11px] font-semibold ${atCap ? "text-red-500" : "text-muted-foreground"}`}>
        {usage.publishedCount}/{usage.maxPostsPerDay}
      </span>
    </div>
  );
}
