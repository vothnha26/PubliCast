import { useState, useEffect, useMemo } from "react";
import { Compass, Plus, X, Trash2, Loader2, ExternalLink, Rss } from "lucide-react";
import { toast } from "sonner";
import feedService from "../../services/feed.service";
import { useBrand } from "../../context/BrandContext";
import { useConfirm } from "@/hooks/useConfirm";

function AddFeedModal({ isOpen, onClose, onSave }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setUrl("");
    setCategory("");
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!url.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), url: url.trim(), category: category.trim() });
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Failed to add feed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
        <div className="flex justify-between items-center px-8 py-6 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">Add RSS Feed</h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-all text-muted-foreground hover:text-foreground" disabled={saving}>
            <X size={20} />
          </button>
        </div>
        <div className="p-8 space-y-4">
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
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My favorite blog"
              className="w-full px-4 py-3 rounded-xl border border-border focus:border-foreground outline-none text-sm font-semibold bg-background text-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Category (optional)</label>
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
            disabled={saving || !url.trim()}
            className="w-full py-3 bg-[#0A0A0A] text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />} Add Feed
          </button>
        </div>
      </div>
    </div>
  );
}

export function Explore() {
  const { activeBrand } = useBrand();
  const confirm = useConfirm();

  const [feedSources, setFeedSources] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  const loadData = async () => {
    if (!activeBrand?.id) return;
    setLoading(true);
    try {
      const [sourcesRes, entriesRes] = await Promise.all([
        feedService.getFeedSources(activeBrand.id),
        feedService.getFeedEntries(activeBrand.id, 60)
      ]);
      setFeedSources(sourcesRes?.feedSources || []);
      setEntries(entriesRes?.entries || []);
    } catch (err) {
      toast.error("Failed to load Explore feeds");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBrand?.id]);

  const categories = useMemo(() => {
    const set = new Set(feedSources.map((s) => s.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [feedSources]);

  const filteredEntries = useMemo(() => {
    if (activeCategory === "All") return entries;
    return entries.filter((e) => e.feedSource?.category === activeCategory);
  }, [entries, activeCategory]);

  const handleAddFeed = async ({ name, url, category }) => {
    await feedService.createFeedSource({ brandId: activeBrand.id, name, url, category });
    toast.success("Feed added");
    await loadData();
  };

  const handleDeleteFeed = async (feedSource) => {
    const ok = await confirm({
      title: "Remove feed?",
      description: `Remove "${feedSource.name}" from your feeds?`
    });
    if (!ok) return;
    try {
      await feedService.deleteFeedSource(feedSource.id, activeBrand.id);
      toast.success("Feed removed");
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Failed to remove feed");
    }
  };

  const customFeeds = feedSources.filter((s) => !s.isSystem);
  const systemFeeds = feedSources.filter((s) => s.isSystem);

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-lime-100 flex items-center justify-center">
            <Compass size={20} className="text-lime-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Explore</h1>
            <p className="text-sm text-muted-foreground">Content ideas from your own feeds and curated sources</p>
          </div>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-card border border-border hover:bg-muted transition-all"
        >
          <Plus size={16} /> Add Feed
        </button>
      </div>

      {/* Feed sources chips */}
      {feedSources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {customFeeds.map((source) => (
            <div key={source.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-semibold text-foreground">
              <Rss size={12} className="text-muted-foreground" />
              {source.name}
              <button onClick={() => handleDeleteFeed(source)} className="text-muted-foreground hover:text-red-600 transition-colors">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {systemFeeds.map((source) => (
            <div key={source.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
              <Compass size={12} />
              {source.name}
            </div>
          ))}
        </div>
      )}

      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                activeCategory === cat
                  ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                  : "bg-card text-muted-foreground border-border hover:border-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : feedSources.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center">
          <p className="text-muted-foreground text-sm">No feeds yet. Add an RSS feed to start getting content ideas.</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center">
          <p className="text-muted-foreground text-sm">No entries yet — your feeds refresh automatically every 30 minutes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntries.map((entry) => (
            <a
              key={entry.id}
              href={entry.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-2 no-underline hover:border-foreground transition-all group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{entry.feedSource?.name}</span>
                <ExternalLink size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              <h3 className="text-sm font-bold text-foreground line-clamp-2">{entry.title}</h3>
              {entry.summary && <p className="text-xs text-muted-foreground line-clamp-3">{entry.summary}</p>}
              {entry.publishedAt && (
                <p className="text-[10px] text-muted-foreground mt-auto pt-2">
                  {new Date(entry.publishedAt).toLocaleDateString()}
                </p>
              )}
            </a>
          ))}
        </div>
      )}

      <AddFeedModal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} onSave={handleAddFeed} />
    </div>
  );
}
