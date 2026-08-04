import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Loader2, Search, Filter, X, MoreHorizontal, Copy, PenSquare } from "lucide-react";
import { toast } from "sonner";
import { useBrand } from "../../../context/BrandContext";
import { usePostCreator } from "../../../context/PostCreatorContext";
import templateService from "../../../services/template.service";
import postService from "../../../services/post.service";
import { POST_TYPE } from "../../../constants/postTypes";
import { POST_STATUS } from "../../../constants/postStatus";
import { CHANNEL_GROUP_VISIBILITY } from "../../../constants/channelGroupVisibility";
import { TEMPLATE_FORMAT_LABELS, TEMPLATE_GOAL_LABELS } from "../../../constants/templateAttributes";

const VISIBILITY_OPTIONS = [
  { value: CHANNEL_GROUP_VISIBILITY.TEAM, label: "Team" },
  { value: CHANNEL_GROUP_VISIBILITY.PRIVATE, label: "Only me" },
];

function TemplateCard({ template, onOpen, onDuplicate }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative shrink-0 w-64">
      <button
        onClick={() => onOpen(template)}
        className="text-left w-full bg-muted/60 hover:bg-muted border border-border rounded-2xl p-4 space-y-2 transition-all cursor-pointer active:scale-[0.98]"
      >
        <div className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center text-sm">
          {template.emoji || "📝"}
        </div>
        <h4 className="text-[13px] font-bold text-foreground leading-snug line-clamp-2 pr-6">{template.title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{template.description}</p>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
        className="absolute top-3 right-3 w-6 h-6 rounded-md flex items-center justify-center cursor-pointer border-none bg-transparent text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
      >
        <MoreHorizontal size={14} />
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-2 top-10 z-50 w-36 rounded-xl border shadow-lg py-1 bg-card border-border">
            <button
              onClick={() => { setMenuOpen(false); onDuplicate(template); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium cursor-pointer border-none bg-transparent text-left text-foreground hover:bg-muted transition-colors"
            >
              <Copy size={13} /> Duplicate
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TemplatePreviewModal({ template, onClose, onUseTemplate, onDuplicate }) {
  if (!template) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-6">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300 max-h-[85vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer border-none bg-transparent z-10"
        >
          <X size={20} />
        </button>
        <div className="p-8 overflow-y-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center text-2xl">
            {template.emoji || "📝"}
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground leading-snug">{template.title}</h2>
            <p className="text-sm text-muted-foreground mt-1.5">{template.description}</p>
          </div>
          {template.body && (
            <div className="bg-lime-50/60 dark:bg-lime-950/20 border border-lime-200/60 dark:border-lime-900/40 rounded-2xl p-4">
              <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{template.body}</p>
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => onDuplicate(template)}
              className="w-10 h-10 rounded-xl border border-border hover:bg-muted flex items-center justify-center cursor-pointer transition-all"
              title="Duplicate"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={() => onUseTemplate(template)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#D9F99D] hover:bg-[#bef264] text-foreground rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
            >
              <PenSquare size={14} /> Use Template
            </button>
          </div>
          {(template.categoryNames?.length > 0 || template.format || template.goal) && (
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-border">
              {template.format && (
                <span className="px-2 py-0.5 bg-lime-100 dark:bg-lime-900/40 text-lime-700 dark:text-lime-400 text-[10px] font-bold rounded-lg">
                  {TEMPLATE_FORMAT_LABELS[template.format] || template.format}
                </span>
              )}
              {template.goal && (
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded-lg">
                  {TEMPLATE_GOAL_LABELS[template.goal] || template.goal}
                </span>
              )}
              {template.categoryNames?.map((name) => (
                <span key={name} className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-bold rounded-lg">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DuplicateTemplateModal({ template, onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState(CHANNEL_GROUP_VISIBILITY.TEAM);
  const [saving, setSaving] = useState(false);
  const { activeBrand } = useBrand();

  useEffect(() => {
    if (!template) return;
    setTitle(`${template.title} (copy)`);
    setDescription(template.description || "");
    setBody(template.body || "");
    setVisibility(CHANNEL_GROUP_VISIBILITY.TEAM);
  }, [template]);

  if (!template) return null;

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await postService.createPost({
        brandId: activeBrand.id,
        title: title.trim(),
        caption: body.trim() || description.trim(),
        type: POST_TYPE.IMAGE,
        status: POST_STATUS.DRAFT,
        isLibrary: true,
        libraryVisibility: visibility
      });
      toast.success("Template duplicated to My Templates");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Failed to duplicate template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-6">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300 max-h-[85vh]">
        <button
          onClick={onClose}
          disabled={saving}
          className="absolute -top-3 -right-3 w-10 h-10 bg-[#2D1D35] text-white rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-lg z-10 border-2 border-white cursor-pointer disabled:opacity-50"
        >
          <X size={20} />
        </button>
        <div className="p-8 overflow-y-auto space-y-4">
          <h2 className="text-lg font-bold text-foreground">Duplicate Template</h2>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm font-medium resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm font-medium resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm font-semibold bg-card"
            >
              {VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-muted transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#D9F99D] hover:bg-[#bef264] text-foreground rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Create Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeaturedTemplatesTab({ onDuplicated }) {
  const { t } = useTranslation("planner");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [duplicateTemplate, setDuplicateTemplate] = useState(null);
  const { openPostCreator } = usePostCreator();

  const fetchTemplates = () => {
    setLoading(true);
    templateService.getFeaturedTemplates()
      .then((res) => setCategories(res?.data || res || []))
      .catch(() => toast.error(t("postsLibrary.featured.toasts.loadFail", "Failed to load featured templates")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryNamesByTemplateId = useMemo(() => {
    const map = new Map();
    categories.forEach((cat) => (cat.templates || []).forEach((tpl) => {
      const names = map.get(tpl.id) || [];
      names.push(cat.name);
      map.set(tpl.id, names);
    }));
    return map;
  }, [categories]);

  const withCategoryNames = (template) => ({ ...template, categoryNames: categoryNamesByTemplateId.get(template.id) || [] });

  const useTemplateInComposer = (template) => {
    setPreviewTemplate(null);
    openPostCreator({ template: { caption: template.body || template.description, title: template.title } });
  };

  // "Our top picks" — every template across all categories, deduplicated by
  // id (a template tagged under multiple categories only appears once
  // here), same set Buffer's own "Featured templates" strip pulls from.
  const allTemplates = useMemo(() => {
    const seen = new Map();
    categories.forEach((cat) => (cat.templates || []).forEach((tpl) => {
      if (!seen.has(tpl.id)) seen.set(tpl.id, tpl);
    }));
    return Array.from(seen.values());
  }, [categories]);

  const query = searchTerm.trim().toLowerCase();
  const matchesQuery = (template) => !query
    || template.title.toLowerCase().includes(query)
    || template.description.toLowerCase().includes(query);

  const visibleCategories = categories.filter((cat) => !activeCategoryId || cat.id === activeCategoryId);
  const featuredPicks = allTemplates.filter(matchesQuery).slice(0, 6);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (allTemplates.length === 0) {
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
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("postsLibrary.featured.searchPlaceholder", "Search templates...")}
            className="w-full bg-card border border-border rounded-xl py-2 pl-9 pr-4 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#D9F99D]/50 transition-all"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilter((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
              activeCategoryId ? "bg-[#0A0A0A] text-white border-[#0A0A0A]" : "bg-card text-muted-foreground border-border hover:border-foreground"
            }`}
          >
            <Filter size={13} />
            {activeCategoryId ? categories.find((c) => c.id === activeCategoryId)?.name : t("postsLibrary.featured.filter", "Filter")}
            {activeCategoryId && (
              <X
                size={12}
                onClick={(e) => { e.stopPropagation(); setActiveCategoryId(null); }}
              />
            )}
          </button>
          {showFilter && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowFilter(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl border shadow-lg py-1 bg-card border-border max-h-64 overflow-y-auto">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { setActiveCategoryId(cat.id); setShowFilter(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-[12px] font-medium cursor-pointer border-none bg-transparent text-left hover:bg-muted transition-colors"
                    style={{ color: activeCategoryId === cat.id ? "var(--foreground)" : "var(--muted-foreground)" }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {featuredPicks.length > 0 && (
        <div className="bg-lime-50/60 dark:bg-lime-950/20 border border-lime-200/60 dark:border-lime-900/40 rounded-3xl p-6 flex gap-6">
          <div className="w-48 shrink-0 space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-lime-700 dark:text-lime-400">
              {t("postsLibrary.featured.badge", "Featured templates")}
            </span>
            <h3 className="text-xl font-bold text-foreground">{t("postsLibrary.featured.pickTitle", "Our top picks")}</h3>
            <p className="text-xs text-muted-foreground">{t("postsLibrary.featured.subtitle", "Helpful starting points to plan your next post.")}</p>
          </div>
          <div className="flex-1 flex gap-3 overflow-x-auto pb-1">
            {featuredPicks.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onOpen={(tpl) => setPreviewTemplate(withCategoryNames(tpl))}
                onDuplicate={(tpl) => setDuplicateTemplate(tpl)}
              />
            ))}
          </div>
        </div>
      )}

      {visibleCategories.map((category) => {
        const templates = (category.templates || []).filter(matchesQuery);
        if (templates.length === 0) return null;
        return (
          <div key={category.id} className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">{category.name}</h3>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onOpen={(tpl) => setPreviewTemplate(withCategoryNames(tpl))}
                  onDuplicate={(tpl) => setDuplicateTemplate(tpl)}
                />
              ))}
            </div>
          </div>
        );
      })}

      <TemplatePreviewModal
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onUseTemplate={useTemplateInComposer}
        onDuplicate={(tpl) => { setPreviewTemplate(null); setDuplicateTemplate(tpl); }}
      />
      <DuplicateTemplateModal
        template={duplicateTemplate}
        onClose={() => setDuplicateTemplate(null)}
        onSaved={() => onDuplicated?.()}
      />
    </div>
  );
}
