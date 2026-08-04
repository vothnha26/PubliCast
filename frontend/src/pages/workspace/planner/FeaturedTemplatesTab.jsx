import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePostCreator } from "../../../context/PostCreatorContext";
import templateService from "../../../services/template.service";

export function FeaturedTemplatesTab() {
  const { t } = useTranslation("planner");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { openPostCreator } = usePostCreator();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    templateService.getFeaturedTemplates()
      .then((res) => {
        if (cancelled) return;
        setCategories(res?.data || res || []);
      })
      .catch(() => {
        if (!cancelled) toast.error(t("postsLibrary.featured.toasts.loadFail", "Failed to load featured templates"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [t]);

  const applyTemplate = (template) => {
    openPostCreator({ template: { caption: template.body || template.description, title: template.title } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasTemplates = categories.some((cat) => (cat.templates || []).length > 0);

  if (!hasTemplates) {
    return (
      <div className="mt-8 bg-card border border-border rounded-3xl p-12 text-center">
        <div className="w-16 h-16 bg-lime-100/60 dark:bg-lime-900/30 border border-lime-300/50 dark:border-lime-700/50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Sparkles size={28} className="text-lime-700 dark:text-lime-400" />
        </div>
        <h3 className="text-lg font-bold text-foreground">{t("postsLibrary.featured.emptyTitle", "No featured templates yet")}</h3>
        <p className="text-muted-foreground text-sm font-medium mt-2">{t("postsLibrary.featured.emptyDesc", "Check back soon — new content ideas are added regularly.")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground font-medium">{t("postsLibrary.featured.subtitle", "Helpful starting points to plan your next post.")}</p>
      {categories.map((category) => {
        const templates = category.templates || [];
        if (templates.length === 0) return null;
        return (
          <div key={category.id} className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">{category.name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  className="text-left bg-card border border-border rounded-2xl p-5 space-y-2 hover:border-foreground hover:shadow-lg transition-all cursor-pointer active:scale-[0.98]"
                >
                  <div className="text-2xl">{template.emoji || "📝"}</div>
                  <h4 className="text-[13px] font-bold text-foreground leading-snug">{template.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{template.description}</p>
                  <span className="inline-block text-[10px] font-black text-lime-700 dark:text-lime-400 uppercase tracking-wider pt-1">
                    {t("postsLibrary.featured.useThisIdea", "Use this idea")} →
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
