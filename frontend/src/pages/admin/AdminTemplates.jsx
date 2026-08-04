import { useState, useEffect } from "react";
import { Plus, X, Edit3, Trash2, Sparkles, FolderPlus, Loader2 } from "lucide-react";
import adminService from "../../services/admin.service";
import { toast } from "sonner";
import { TEMPLATE_FORMAT, TEMPLATE_FORMAT_LABELS, TEMPLATE_GOAL, TEMPLATE_GOAL_LABELS } from "../../constants/templateAttributes";

function CategoryModal({ isOpen, onClose, onSave, category }) {
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(category?.name || "");
    setSortOrder(category?.sortOrder ?? 0);
  }, [isOpen, category]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), sortOrder: Number(sortOrder) || 0 });
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
        <div className="flex justify-between items-center px-8 py-6 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">{category ? "Edit Category" : "New Category"}</h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-all text-muted-foreground hover:text-black" disabled={saving}>
            <X size={20} />
          </button>
        </div>
        <div className="p-8 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tip, Case Study, Story..."
              className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sort Order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm font-semibold"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full py-3 bg-[#0A0A0A] text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplateModal({ isOpen, onClose, onSave, template, templateCategoryIds, categories, defaultCategoryId }) {
  const [categoryIds, setCategoryIds] = useState([]);
  const [emoji, setEmoji] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [format, setFormat] = useState("");
  const [goal, setGoal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCategoryIds(templateCategoryIds?.length ? templateCategoryIds : (defaultCategoryId ? [defaultCategoryId] : []));
    setEmoji(template?.emoji || "");
    setTitle(template?.title || "");
    setDescription(template?.description || "");
    setBody(template?.body || "");
    setFormat(template?.format || "");
    setGoal(template?.goal || "");
  }, [isOpen, template, templateCategoryIds, defaultCategoryId]);

  if (!isOpen) return null;

  const toggleCategory = (id) => {
    setCategoryIds((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim() || categoryIds.length === 0) return;
    setSaving(true);
    try {
      await onSave({ categoryIds, emoji: emoji.trim(), title: title.trim(), description: description.trim(), body: body.trim(), format: format || null, goal: goal || null });
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-8 py-6 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">{template ? "Edit Template" : "New Template"}</h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-all text-muted-foreground hover:text-black" disabled={saving}>
            <X size={20} />
          </button>
        </div>
        <div className="p-8 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Categories {categoryIds.length > 0 && `(${categoryIds.length})`}
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const isSelected = categoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                        : "bg-card text-muted-foreground border-border hover:border-foreground"
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-4">
            <div className="space-y-1.5 w-24 shrink-0">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Emoji</label>
              <input
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="🛠️"
                className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm font-semibold text-center"
              />
            </div>
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="The strategy that flopped — and what we learned"
                className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm font-semibold"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="You thought it would be a hit. It wasn't. Share what didn't work..."
              className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm font-medium resize-none"
            />
            <p className="text-[10px] text-muted-foreground">Short prompt shown on the template card.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Body (optional)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder={"Trend: Recent research or platform data shows {{trend or finding}}.\n\nInsight: This backs up what I've seen in {{your work, client projects, or behavior patterns}}."}
              className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm font-medium resize-none"
            />
            <p className="text-[10px] text-muted-foreground">Full starter content inserted into the composer when a user picks this template. Falls back to the description above if left empty.</p>
          </div>
          <div className="flex gap-4">
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Format (optional)</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm font-semibold bg-card"
              >
                <option value="">—</option>
                {Object.values(TEMPLATE_FORMAT).map((value) => (
                  <option key={value} value={value}>{TEMPLATE_FORMAT_LABELS[value]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Goal (optional)</label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm font-semibold bg-card"
              >
                <option value="">—</option>
                {Object.values(TEMPLATE_GOAL).map((value) => (
                  <option key={value} value={value}>{TEMPLATE_GOAL_LABELS[value]}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !description.trim() || categoryIds.length === 0}
            className="w-full py-3 bg-[#0A0A0A] text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminTemplates() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryModal, setCategoryModal] = useState({ open: false, category: null });
  const [templateModal, setTemplateModal] = useState({ open: false, template: null, templateCategoryIds: [], defaultCategoryId: null });

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await adminService.getTemplates();
      setCategories(res?.data || res || []);
    } catch (err) {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const getTemplateCategoryIds = (templateId) =>
    categories.filter((cat) => (cat.templates || []).some((tpl) => tpl.id === templateId)).map((cat) => cat.id);

  const handleSaveCategory = async (payload) => {
    if (categoryModal.category) {
      await adminService.updateTemplateCategory(categoryModal.category.id, payload);
    } else {
      await adminService.createTemplateCategory(payload);
    }
    await fetchTemplates();
  };

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`Delete category "${category.name}"? All templates inside it will also be deleted.`)) return;
    try {
      await adminService.deleteTemplateCategory(category.id);
      toast.success("Category deleted");
      await fetchTemplates();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Failed to delete category");
    }
  };

  const handleSaveTemplate = async (payload) => {
    if (templateModal.template) {
      await adminService.updateTemplate(templateModal.template.id, payload);
    } else {
      await adminService.createTemplate(payload);
    }
    await fetchTemplates();
  };

  const handleDeleteTemplate = async (template) => {
    if (!window.confirm(`Delete template "${template.title}"?`)) return;
    try {
      await adminService.deleteTemplate(template.id);
      toast.success("Template deleted");
      await fetchTemplates();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Failed to delete template");
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-lime-100 flex items-center justify-center">
            <Sparkles size={20} className="text-lime-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Featured Templates</h1>
            <p className="text-sm text-muted-foreground">Content idea library shown in every brand&apos;s Post Library</p>
          </div>
        </div>
        <button
          onClick={() => setCategoryModal({ open: true, category: null })}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-card border border-border hover:bg-muted transition-all"
        >
          <FolderPlus size={16} /> New Category
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center">
          <p className="text-muted-foreground text-sm">No categories yet. Create one to start adding templates.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
                <h3 className="text-sm font-bold text-foreground">{category.name}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTemplateModal({ open: true, template: null, defaultCategoryId: category.id })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#0A0A0A] text-white hover:scale-105 transition-all"
                  >
                    <Plus size={12} /> Add Template
                  </button>
                  <button
                    onClick={() => setCategoryModal({ open: true, category })}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {(category.templates || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No templates in this category yet</p>
                ) : (
                  category.templates.map((template) => (
                    <div key={template.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted transition-all group">
                      <div className="text-xl shrink-0">{template.emoji || "📝"}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-bold text-foreground">{template.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                        {getTemplateCategoryIds(template.id).length > 1 && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Also in: {categories.filter((c) => c.id !== category.id && getTemplateCategoryIds(template.id).includes(c.id)).map((c) => c.name).join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                        <button
                          onClick={() => setTemplateModal({ open: true, template, templateCategoryIds: getTemplateCategoryIds(template.id), defaultCategoryId: category.id })}
                          className="p-1.5 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground transition-all"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CategoryModal
        isOpen={categoryModal.open}
        onClose={() => setCategoryModal({ open: false, category: null })}
        onSave={handleSaveCategory}
        category={categoryModal.category}
      />
      <TemplateModal
        isOpen={templateModal.open}
        onClose={() => setTemplateModal({ open: false, template: null, templateCategoryIds: [], defaultCategoryId: null })}
        onSave={handleSaveTemplate}
        template={templateModal.template}
        templateCategoryIds={templateModal.templateCategoryIds}
        categories={categories}
        defaultCategoryId={templateModal.defaultCategoryId}
      />
    </div>
  );
}
