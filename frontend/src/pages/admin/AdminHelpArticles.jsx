import { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, Edit3, Trash2, X, Upload, Archive } from "lucide-react";
import { toast } from "sonner";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { useConfirm } from "@/hooks/useConfirm";
import helpCenterService from "../../services/helpCenter.service";

function slugify(title) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function ArticleModal({ isOpen, onClose, onSave, article = null }) {
  const [title, setTitle] = useState(article?.title || "");
  const [slug, setSlug] = useState(article?.slug || "");
  const [category, setCategory] = useState(article?.category || "");
  const [tagsInput, setTagsInput] = useState((article?.tags || []).join(", "));
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!article);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Viết nội dung bài hướng dẫn..." }),
      Link.configure({ openOnClick: false })
    ],
    content: article?.contentJson || ""
  });

  if (!isOpen) return null;

  const handleTitleChange = (value) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSave = async () => {
    if (!title.trim() || !slug.trim() || !category.trim()) {
      toast.error("Vui lòng điền đầy đủ tiêu đề, slug và category");
      return;
    }
    setSaving(true);
    try {
      const contentJson = editor.getJSON();
      const contentHtml = editor.getHTML();
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      await onSave({ title, slug, category, tags, contentJson, contentHtml });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" style={{ padding: 24 }}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-border" style={{ padding: 24 }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">{article ? "Sửa bài viết" : "Bài viết mới"}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Tiêu đề</label>
            <input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground"
              placeholder="Cách kết nối Facebook Page"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Slug</label>
              <input
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground"
                placeholder="ket-noi-facebook-page"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Category</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground"
                placeholder="Kết nối tài khoản"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Tags (phân tách bởi dấu phẩy)</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground"
              placeholder="facebook, kết nối, oauth"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Nội dung</label>
            <div className="rounded-lg border border-border bg-background" style={{ minHeight: 240, padding: 12 }}>
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted">
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminHelpArticles() {
  const confirm = useConfirm();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await helpCenterService.adminListArticles();
      setArticles(data || []);
    } catch (error) {
      toast.error(error.message || "Không thể tải danh sách bài viết");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (payload) => {
    try {
      if (editingArticle) {
        await helpCenterService.adminUpdateArticle(editingArticle.id, payload);
        toast.success("Đã cập nhật bài viết");
      } else {
        await helpCenterService.adminCreateArticle(payload);
        toast.success("Đã tạo bài viết");
      }
      setIsModalOpen(false);
      setEditingArticle(null);
      fetchData();
    } catch (error) {
      toast.error(error.message || "Không thể lưu bài viết");
    }
  };

  const handlePublish = async (article) => {
    try {
      await helpCenterService.adminPublishArticle(article.id);
      toast.success("Đã publish bài viết, đang tạo embedding...");
      fetchData();
    } catch (error) {
      toast.error(error.message || "Không thể publish bài viết");
    }
  };

  const handleUnpublish = async (article) => {
    try {
      await helpCenterService.adminUnpublishArticle(article.id);
      toast.success("Đã gỡ publish bài viết");
      fetchData();
    } catch (error) {
      toast.error(error.message || "Không thể gỡ publish bài viết");
    }
  };

  const handleDelete = async (article) => {
    const isConfirmed = await confirm({
      title: "Xóa bài viết?",
      description: `Bài viết "${article.title}" sẽ bị xóa vĩnh viễn cùng toàn bộ embedding liên quan.`,
      confirmText: "Xóa",
      cancelText: "Hủy",
      variant: "destructive"
    });
    if (!isConfirmed) return;
    try {
      await helpCenterService.adminDeleteArticle(article.id);
      toast.success("Đã xóa bài viết");
      fetchData();
    } catch (error) {
      toast.error(error.message || "Không thể xóa bài viết");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background" style={{ padding: "40px 60px" }}>
      <div className="flex items-start justify-between mb-10">
        <div className="flex gap-5">
          <div className="w-14 h-14 rounded-2xl bg-card flex items-center justify-center shadow-sm border border-border">
            <BookOpen size={28} className="text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Help Articles</h1>
            <p className="text-muted-foreground mt-1">Quản lý bài viết hướng dẫn cho Help Center (RAG-powered instant answers).</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingArticle(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
        >
          <Plus size={16} /> Bài viết mới
        </button>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Đang tải...</div>
      ) : articles.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">Chưa có bài viết nào.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {articles.map((article) => (
            <div
              key={article.id}
              className="flex items-center justify-between p-4 rounded-xl border border-border bg-card"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground text-sm">{article.title}</span>
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                    style={{
                      background: article.status === "PUBLISHED" ? "rgba(34,197,94,0.15)" : "rgba(156,163,175,0.15)",
                      color: article.status === "PUBLISHED" ? "#22C55E" : "#9CA3AF"
                    }}
                  >
                    {article.status}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">/{article.slug} · {article.category}</div>
              </div>
              <div className="flex items-center gap-2">
                {article.status === "PUBLISHED" ? (
                  <button
                    onClick={() => handleUnpublish(article)}
                    title="Unpublish"
                    className="p-2 rounded-lg text-muted-foreground hover:bg-muted"
                  >
                    <Archive size={14} />
                  </button>
                ) : (
                  <button
                    onClick={() => handlePublish(article)}
                    title="Publish"
                    className="p-2 rounded-lg text-muted-foreground hover:bg-muted"
                  >
                    <Upload size={14} />
                  </button>
                )}
                <button
                  onClick={() => { setEditingArticle(article); setIsModalOpen(true); }}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-muted"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(article)}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <ArticleModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingArticle(null); }}
          onSave={handleSave}
          article={editingArticle}
        />
      )}
    </div>
  );
}
