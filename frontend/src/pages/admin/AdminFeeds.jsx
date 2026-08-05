import { useState, useEffect } from "react";
import { Plus, X, Edit3, Trash2, Compass, Loader2 } from "lucide-react";
import adminService from "../../services/admin.service";
import { toast } from "sonner";

function FeedModal({ isOpen, onClose, onSave, feed }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(feed?.name || "");
    setUrl(feed?.url || "");
    setCategory(feed?.category || "");
  }, [isOpen, feed]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim() || !url.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), url: url.trim(), category: category.trim() });
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Failed to save feed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
        <div className="flex justify-between items-center px-8 py-6 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">{feed ? "Edit Feed" : "New Feed"}</h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-all text-muted-foreground hover:text-foreground" disabled={saving}>
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
              placeholder="e.g. Marketing Weekly"
              className="w-full px-4 py-3 rounded-xl border border-border focus:border-foreground outline-none text-sm font-semibold bg-background text-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Feed URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/rss.xml"
              className="w-full px-4 py-3 rounded-xl border border-border focus:border-foreground outline-none text-sm font-semibold bg-background text-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Marketing, Tech, News..."
              className="w-full px-4 py-3 rounded-xl border border-border focus:border-foreground outline-none text-sm font-semibold bg-background text-foreground"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !url.trim()}
            className="w-full py-3 bg-[#0A0A0A] text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminFeeds() {
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, feed: null });

  const fetchFeeds = async () => {
    setLoading(true);
    try {
      const res = await adminService.getSystemFeeds();
      setFeeds(res?.feedSources || []);
    } catch (err) {
      toast.error("Failed to load feeds");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeds();
  }, []);

  const handleSave = async (payload) => {
    if (modal.feed) {
      await adminService.updateSystemFeed(modal.feed.id, payload);
    } else {
      await adminService.createSystemFeed(payload);
    }
    await fetchFeeds();
  };

  const handleDelete = async (feed) => {
    if (!window.confirm(`Delete feed "${feed.name}"?`)) return;
    try {
      await adminService.deleteSystemFeed(feed.id);
      toast.success("Feed deleted");
      await fetchFeeds();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Failed to delete feed");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-lime-100 flex items-center justify-center">
            <Compass size={20} className="text-lime-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Explore Feeds</h1>
            <p className="text-sm text-muted-foreground">Curated RSS feeds shown to every brand&apos;s Explore page</p>
          </div>
        </div>
        <button
          onClick={() => setModal({ open: true, feed: null })}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-card border border-border hover:bg-muted transition-all"
        >
          <Plus size={16} /> New Feed
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : feeds.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center">
          <p className="text-muted-foreground text-sm">No system feeds yet. Add one to seed every brand&apos;s Explore page.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {feeds.map((feed) => (
            <div key={feed.id} className="flex items-start gap-3 p-4 border-b border-border last:border-b-0 hover:bg-muted transition-all group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-[13px] font-bold text-foreground">{feed.name}</h4>
                  {feed.category && (
                    <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-muted-foreground uppercase">{feed.category}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{feed.url}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                <button
                  onClick={() => setModal({ open: true, feed })}
                  className="p-1.5 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground transition-all"
                >
                  <Edit3 size={13} />
                </button>
                <button
                  onClick={() => handleDelete(feed)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <FeedModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, feed: null })}
        onSave={handleSave}
        feed={modal.feed}
      />
    </div>
  );
}
