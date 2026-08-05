import { useState, useEffect, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Compass, Plus, X, Trash2, Loader2, ExternalLink, Rss, PenSquare, MoreHorizontal, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import feedService from "../../services/feed.service";
import { useBrand } from "../../context/BrandContext";
import { usePostCreator } from "../../context/PostCreatorContext";
import { useConfirm } from "@/hooks/useConfirm";

function AddFeedModal({ isOpen, onClose, onSave }) {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setUrl("");
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!url.trim()) return;
    setSaving(true);
    try {
      await onSave({ url: url.trim() });
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
          <h3 className="text-lg font-bold text-foreground">Add Feed</h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-all text-muted-foreground hover:text-foreground" disabled={saving}>
            <X size={20} />
          </button>
        </div>
        <div className="p-8 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            RSS URLs are links to automatically get updates from a blog or news site. The link is usually made up of the website&apos;s domain name, followed by &quot;/feed&quot; or &quot;/rss&quot;.
          </p>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">RSS URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              autoFocus
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

// Curated (system) feeds are visible to every brand automatically — there's
// no per-brand subscribe step. This modal is a browse-by-category catalog
// (mirrors Buffer's "Explore Curated Feeds" grid) that jumps the brand to
// that feed's tab rather than "adding" anything, since it's already there.
// Fetched from its own endpoint (getCuratedFeeds) rather than derived from
// the brand-scoped feed list — that response is identical for every brand
// and cached at the CDN edge, so this modal doesn't wait on brand-specific data.
function ExploreCuratedModal({ isOpen, onClose, onSelectFeed }) {
  const [systemFeeds, setSystemFeeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  const categories = useMemo(() => {
    const set = new Set(systemFeeds.map((f) => f.category).filter(Boolean));
    return Array.from(set);
  }, [systemFeeds]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    feedService.getCuratedFeeds()
      .then((res) => {
        const feeds = res?.feedSources || [];
        setSystemFeeds(feeds);
        setActiveCategory(new Set(feeds.map((f) => f.category).filter(Boolean)).values().next().value || null);
      })
      .catch(() => toast.error("Failed to load curated feeds"))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const visibleFeeds = activeCategory ? systemFeeds.filter((f) => f.category === activeCategory) : systemFeeds;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center px-8 py-6 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">Explore Curated Feeds</h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-all text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>
        {categories.length > 0 && (
          <div className="flex items-center gap-2 px-8 pt-4 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  activeCategory === cat
                    ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                    : "bg-background text-muted-foreground border-border hover:border-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
        <div className="p-8 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : visibleFeeds.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No curated feeds in this category yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleFeeds.map((feed) => (
                <button
                  key={feed.id}
                  onClick={() => onSelectFeed(feed)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background hover:border-foreground transition-all text-left cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Compass size={14} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-foreground truncate">{feed.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{feed.url}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "";
  }
}

function EntryCard({ entry, onCreatePost }) {
  return (
    <div className="flex gap-4 p-4 rounded-2xl border border-border bg-card hover:border-foreground/30 transition-all group">
      {entry.imageUrl ? (
        <img src={entry.imageUrl} alt="" className="w-28 h-20 rounded-xl object-cover shrink-0 bg-muted" />
      ) : (
        <div className="w-28 h-20 rounded-xl bg-muted shrink-0 flex items-center justify-center">
          <Rss size={18} className="text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <h3 className="text-sm font-bold text-foreground line-clamp-2">{entry.title}</h3>
        <p className="text-[11px] text-muted-foreground mt-1">{entry.feedSource?.name}</p>
        {entry.summary && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{entry.summary}</p>}
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-[11px] text-muted-foreground">{timeAgo(entry.publishedAt)}</span>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <a
              href={entry.link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              title="Open original"
            >
              <ExternalLink size={13} />
            </a>
            <button
              onClick={() => onCreatePost(entry)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-border hover:bg-muted transition-all text-foreground"
            >
              <PenSquare size={13} /> Create Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Explore() {
  const { activeBrand } = useBrand();
  const confirm = useConfirm();
  const { openPostCreator } = usePostCreator();

  const [feedSources, setFeedSources] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [exploreModalOpen, setExploreModalOpen] = useState(false);
  const [activeFeedId, setActiveFeedId] = useState("all");
  const [feedMenuOpenId, setFeedMenuOpenId] = useState(null);

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

  const activeFeed = feedSources.find((s) => s.id === activeFeedId) || null;
  const visibleEntries = activeFeedId === "all" ? entries : entries.filter((e) => e.feedSource?.id === activeFeedId);
  const lastRefreshedAt = feedSources.length > 0
    ? feedSources.reduce((latest, s) => (!latest || new Date(s.updatedAt) > new Date(latest) ? s.updatedAt : latest), null)
    : null;

  const handleAddFeed = async ({ url }) => {
    await feedService.createFeedSource({ brandId: activeBrand.id, url });
    toast.success("Feed added");
    await loadData();
  };

  const handleSelectCuratedFeed = (feed) => {
    setActiveFeedId(feed.id);
    setExploreModalOpen(false);
  };

  const handleDeleteFeed = async (feedSource) => {
    const ok = await confirm({
      title: "Remove feed?",
      description: `Remove "${feedSource.name}" from your feeds?`
    });
    if (!ok) return;
    try {
      await feedService.deleteFeedSource(feedSource.id, activeBrand.id);
      if (activeFeedId === feedSource.id) setActiveFeedId("all");
      toast.success("Feed removed");
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Failed to remove feed");
    }
  };

  const handleCreatePost = (entry) => {
    openPostCreator({
      template: {
        title: entry.title,
        caption: entry.summary ? `${entry.title}\n\n${entry.summary}\n\n${entry.link}` : `${entry.title}\n\n${entry.link}`
      }
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-lime-100 flex items-center justify-center">
            <Compass size={20} className="text-lime-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Explore</h1>
            <p className="text-sm text-muted-foreground">Content ideas from your feeds and curated sources</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {feedSources.length > 0 && (
            <button
              onClick={() => setExploreModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-border hover:bg-muted transition-all text-foreground"
            >
              <Compass size={15} /> Explore Curated Feeds
            </button>
          )}
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0A0A0A] text-white hover:opacity-90 transition-all"
          >
            <Plus size={15} /> New Feed
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : feedSources.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-lime-100 flex items-center justify-center mx-auto">
            <Compass size={24} className="text-lime-700" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Add your First Feed</h3>
            <p className="text-sm text-muted-foreground mt-1">Subscribe to your favorite blogs, websites, or creators to get the latest content ideas.</p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0A0A0A] text-white hover:opacity-90 transition-all"
            >
              <Plus size={15} /> New Feed
            </button>
            <button
              onClick={() => setExploreModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-border hover:bg-muted transition-all text-foreground"
            >
              <Compass size={15} /> Explore Curated Feeds
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Per-feed pill tabs, mirroring Buffer's "All Feeds" + one pill per subscribed feed */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveFeedId("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                activeFeedId === "all" ? "bg-[#0A0A0A] text-white border-[#0A0A0A]" : "bg-card text-muted-foreground border-border hover:border-foreground"
              }`}
            >
              All Feeds
            </button>
            {feedSources.map((source) => (
              <div key={source.id} className="relative">
                <button
                  onClick={() => setActiveFeedId(source.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    activeFeedId === source.id ? "bg-[#0A0A0A] text-white border-[#0A0A0A]" : "bg-card text-muted-foreground border-border hover:border-foreground"
                  }`}
                >
                  {source.isSystem ? <Compass size={12} /> : <Rss size={12} />}
                  {source.name}
                </button>
              </div>
            ))}
          </div>

          {/* Active feed header */}
          <div className="flex items-center justify-between pb-1">
            <div>
              <h2 className="text-sm font-bold text-foreground">{activeFeed?.name || "All Feeds"}</h2>
              {lastRefreshedAt && (
                <p className="text-[11px] text-muted-foreground">Last refreshed {timeAgo(lastRefreshedAt)}</p>
              )}
            </div>
            {activeFeed && !activeFeed.isSystem && (
              <div className="relative">
                <button
                  onClick={() => setFeedMenuOpenId((v) => (v === activeFeed.id ? null : activeFeed.id))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-all"
                >
                  <MoreHorizontal size={16} />
                </button>
                {feedMenuOpenId === activeFeed.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setFeedMenuOpenId(null)} />
                    <div className="absolute right-0 top-full mt-1 z-50 w-36 rounded-xl border shadow-lg py-1 bg-card border-border">
                      <button
                        onClick={() => { setFeedMenuOpenId(null); handleDeleteFeed(activeFeed); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium cursor-pointer border-none bg-transparent text-left text-red-600 hover:bg-muted transition-colors"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {visibleEntries.length === 0 ? (
            <div className="bg-card border border-border rounded-3xl p-12 text-center">
              <RefreshCw size={20} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No entries yet — feeds refresh automatically every 30 minutes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {visibleEntries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} onCreatePost={handleCreatePost} />
              ))}
            </div>
          )}
        </>
      )}

      <AddFeedModal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} onSave={handleAddFeed} />
      <ExploreCuratedModal
        isOpen={exploreModalOpen}
        onClose={() => setExploreModalOpen(false)}
        onSelectFeed={handleSelectCuratedFeed}
      />
    </div>
  );
}
