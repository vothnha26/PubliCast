import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StatCard } from "./StatCard";
import streakService from "../../services/streak.service";

export function StreakStatCard({ brandId }) {
  const { t } = useTranslation("dashboard");
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    if (!brandId) return;
    streakService.getStreak(brandId)
      .then(setStreak)
      .catch((error) => console.error("Failed to load posting streak:", error));
  }, [brandId]);

  const current = streak?.currentStreak ?? 0;

  return (
    <StatCard
      label={t("stats.postingStreak", "Posting Streak")}
      value={`🔥 ${current}`}
      note={streak ? t("stats.longestStreak", "Best: {{count}}", { count: streak.longestStreak }) : undefined}
    />
  );
}
