import { useState, useEffect, useCallback } from "react";
import { Target, Pencil, Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import postingGoalService from "../../services/postingGoal.service";

const PERIODS = ["WEEKLY", "MONTHLY"];

export function PostingGoalWidget({ brandId }) {
  const { t } = useTranslation("dashboard");
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [draftValue, setDraftValue] = useState("");
  const [saving, setSaving] = useState(false);

  const loadGoals = useCallback(async () => {
    if (!brandId) return;
    try {
      const res = await postingGoalService.getGoals(brandId);
      setGoals(res?.goals || []);
    } catch (error) {
      console.error("Failed to load posting goals:", error);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    setLoading(true);
    loadGoals();
  }, [loadGoals]);

  const startEdit = (period, currentTarget) => {
    setEditingPeriod(period);
    setDraftValue(currentTarget != null ? String(currentTarget) : "");
  };

  const cancelEdit = () => {
    setEditingPeriod(null);
    setDraftValue("");
  };

  const saveEdit = async (period) => {
    const targetCount = parseInt(draftValue, 10);
    if (!Number.isInteger(targetCount) || targetCount < 1) return;

    setSaving(true);
    try {
      await postingGoalService.saveGoal({ brandId, period, targetCount });
      await loadGoals();
      setEditingPeriod(null);
      setDraftValue("");
    } catch (error) {
      console.error("Failed to save posting goal:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-3xl p-6 shadow-sm animate-pulse">
        <div className="w-32 h-4 bg-muted rounded mb-4" />
        <div className="w-full h-3 bg-muted/60 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <Target size={16} className="text-muted-foreground" />
        <span className="text-sm font-bold text-foreground uppercase tracking-wider">
          {t("postingGoals.title", "Posting Goals")}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {PERIODS.map((period) => {
          const goal = goals.find((g) => g.period === period);
          const isEditing = editingPeriod === period;
          const pct = goal ? Math.min((goal.currentCount / goal.targetCount) * 100, 100) : 0;
          const periodLabel = period === "WEEKLY"
            ? t("postingGoals.weekly", "This week")
            : t("postingGoals.monthly", "This month");

          return (
            <div key={period}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                  {periodLabel}
                </span>
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      autoFocus
                      value={draftValue}
                      onChange={(e) => setDraftValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(period);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="w-14 px-1.5 py-0.5 text-xs rounded border border-border bg-background text-foreground"
                    />
                    <button
                      onClick={() => saveEdit(period)}
                      disabled={saving}
                      className="p-1 rounded text-emerald-600 hover:bg-emerald-500/10"
                    >
                      <Check size={14} />
                    </button>
                    <button onClick={cancelEdit} className="p-1 rounded text-muted-foreground hover:bg-muted">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(period, goal?.targetCount)}
                    className="flex items-center gap-1 text-[11px] font-bold text-foreground hover:text-purple-600 dark:hover:text-purple-400 bg-transparent border-none cursor-pointer"
                  >
                    {goal ? `${goal.currentCount}/${goal.targetCount}` : t("postingGoals.setGoal", "Set goal")}
                    <Pencil size={11} className="text-muted-foreground" />
                  </button>
                )}
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-600 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
