import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LayoutTemplate, Search, Loader2, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { usePostCreatorFormContext } from "../../../context/PostCreatorFormContext";
import templateService from "../../../services/template.service";
import postService from "../../../services/post.service";

const PAGE_SIZE = 12;

/**
 * Right-panel Templates tab. Two sources, matching Buffer's own
 * Discover/Personal split:
 * - Discover: featured/system templates (templateService.getFeaturedTemplates,
 *   same source as FeaturedTemplatesTab.jsx on the planner page) — shared
 *   across all brands, not brand-authored. Paginated here via page/limit
 *   (flat, deduplicated list) for infinite scroll.
 * - Personal: this brand's own saved post templates. Uses its own paginated
 *   fetch (postService.getPosts with page/limit) rather than the shared
 *   handleOpenTemplatePicker from usePostCreatorForm, since that helper
 *   fetches everything in one shot with no pagination knobs.
 *
 * Search is filtered client-side over whatever pages have been loaded so
 * far for both tabs — featured templates rarely change and are curated in
 * small numbers, and personal template libraries are per-brand and small,
 * so a server-side search round-trip isn't warranted yet. If either list
 * grows large enough that "search only searches what's scrolled into view"
 * becomes a real problem, move filtering to a `search` query param on both
 * endpoints (post.repository already supports search via PostSearchFilter).
 */
export function TemplatesSidebar() {
  const { t } = useTranslation(["planner", "common"]);
  const {
    activeBrand,
    loadTemplate,
    setCaption,
    setTitle,
  } = usePostCreatorFormContext();

  const [activeTab, setActiveTab] = useState("discover");
  const [searchQuery, setSearchQuery] = useState("");

  // Discover tab state
  const [discoverTemplates, setDiscoverTemplates] = useState([]);
  const [discoverPage, setDiscoverPage] = useState(1);
  const [discoverHasMore, setDiscoverHasMore] = useState(true);
  const [loadingDiscover, setLoadingDiscover] = useState(false);
  const [loadingMoreDiscover, setLoadingMoreDiscover] = useState(false);
  const hasFetchedDiscoverRef = useRef(false);
  const seenDiscoverIdsRef = useRef(new Set());

  // Personal tab state
  const [personalTemplates, setPersonalTemplates] = useState([]);
  const [personalPage, setPersonalPage] = useState(1);
  const [personalHasMore, setPersonalHasMore] = useState(true);
  const [loadingPersonal, setLoadingPersonal] = useState(false);
  const [loadingMorePersonal, setLoadingMorePersonal] = useState(false);
  const hasFetchedPersonalRef = useRef(false);

  const sentinelRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const fetchDiscoverPage = useCallback((page, { append }) => {
    const setLoading = append ? setLoadingMoreDiscover : setLoadingDiscover;
    setLoading(true);
    templateService.getFeaturedTemplates({ page, limit: PAGE_SIZE })
      .then((res) => {
        // apiV2's response interceptor unwraps a {data, meta} envelope
        // specially when `data` is itself an array: it returns the array
        // directly (with .meta/.posts attached as extra properties)
        // instead of {data, meta} — same shape postService.getPosts callers
        // elsewhere already handle (see ListView.jsx's fetchPosts).
        const items = Array.isArray(res) ? res : (res?.data || []);
        const deduped = [];
        items.forEach((tpl) => {
          if (!seenDiscoverIdsRef.current.has(tpl.id)) {
            seenDiscoverIdsRef.current.add(tpl.id);
            deduped.push(tpl);
          }
        });
        setDiscoverTemplates((prev) => (append ? [...prev, ...deduped] : deduped));
        setDiscoverHasMore(Boolean(res?.meta?.hasMore));
        setDiscoverPage(page);
      })
      .catch(() => toast.error(t("planner:postCreator.templatesPicker.loadFail")))
      .finally(() => setLoading(false));
  }, [t]);

  const fetchPersonalPage = useCallback((page, { append }) => {
    if (!activeBrand?.id) return;
    const setLoading = append ? setLoadingMorePersonal : setLoadingPersonal;
    setLoading(true);
    postService.getPosts(activeBrand.id, { isLibrary: true, page, limit: PAGE_SIZE })
      .then((res) => {
        const items = Array.isArray(res) ? res : (res?.posts || res?.data || []);
        setPersonalTemplates((prev) => (append ? [...prev, ...items] : items));
        setPersonalHasMore(Boolean(res?.meta?.hasMore));
        setPersonalPage(page);
      })
      .catch(() => toast.error(t("planner:postCreator.templatesPicker.loadPersonalFail")))
      .finally(() => setLoading(false));
  }, [activeBrand?.id, t]);

  // Initial fetch per tab, once activated
  useEffect(() => {
    if (activeTab === "discover" && !hasFetchedDiscoverRef.current) {
      hasFetchedDiscoverRef.current = true;
      seenDiscoverIdsRef.current = new Set();
      fetchDiscoverPage(1, { append: false });
    }
    if (activeTab === "personal" && !hasFetchedPersonalRef.current && activeBrand?.id) {
      hasFetchedPersonalRef.current = true;
      fetchPersonalPage(1, { append: false });
    }
  }, [activeTab, activeBrand?.id, fetchDiscoverPage, fetchPersonalPage]);

  const handleUseDiscoverTemplate = (tpl) => {
    setCaption(tpl.body || tpl.description || "");
    if (tpl.title) setTitle(tpl.title);
    toast.success(t("planner:postCreator.templatesPicker.applied"));
  };

  const filteredDiscover = discoverTemplates.filter((tpl) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return tpl.title?.toLowerCase().includes(q) || tpl.description?.toLowerCase().includes(q);
  });

  const filteredPersonal = personalTemplates.filter((tpl) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return tpl.title?.toLowerCase().includes(q) || tpl.caption?.toLowerCase().includes(q);
  });

  const isLoading = activeTab === "discover" ? loadingDiscover : loadingPersonal;
  const isLoadingMore = activeTab === "discover" ? loadingMoreDiscover : loadingMorePersonal;
  const hasMore = activeTab === "discover" ? discoverHasMore : personalHasMore;
  const list = activeTab === "discover" ? filteredDiscover : filteredPersonal;

  // Infinite scroll: observe a sentinel at the bottom of the list and load
  // the next page when it comes into view. Skipped while a search query is
  // active — filtering happens over already-loaded pages, so scrolling the
  // filtered (possibly short) list shouldn't trigger more network fetches.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollContainerRef.current;
    if (!sentinel || !root) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (searchQuery.trim()) return;
        if (isLoading || isLoadingMore || !hasMore) return;

        if (activeTab === "discover") {
          fetchDiscoverPage(discoverPage + 1, { append: true });
        } else {
          fetchPersonalPage(personalPage + 1, { append: true });
        }
      },
      { root, rootMargin: "80px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    activeTab,
    searchQuery,
    isLoading,
    isLoadingMore,
    hasMore,
    discoverPage,
    personalPage,
    fetchDiscoverPage,
    fetchPersonalPage,
  ]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery("");
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-transparent w-full">
      <div className="flex-1 min-h-0 flex flex-col gap-4 p-6 overflow-hidden">
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <LayoutTemplate size={16} className="text-composer-accent" />
            <h2 className="text-lg font-bold text-foreground font-sans">
              {t("planner:postCreator.header.tabs.templates")}
            </h2>
          </div>
          <button
            type="button"
            title={t("planner:postCreator.templatesPicker.createNew")}
            className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Discover / Personal — underline tabs */}
        <div className="flex items-center gap-5 border-b border-border shrink-0">
          {["discover", "personal"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              className={`pb-2.5 text-sm font-bold transition-all cursor-pointer font-sans border-b-2 -mb-px ${
                activeTab === tab
                  ? "text-foreground border-composer-accent"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {t(`planner:postCreator.templatesPicker.tabs.${tab}`)}
            </button>
          ))}
        </div>

        <div className="relative shrink-0">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("planner:postCreator.templatesPicker.searchPlaceholder")}
            className="w-full pl-9 pr-3 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder-muted-foreground outline-none focus:border-composer-accent transition-all font-sans shadow-sm"
          />
        </div>

        <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="animate-spin" size={22} />
              <span className="text-[11px] font-bold uppercase tracking-wider font-sans">
                {t("planner:postCreator.templatesPicker.loading")}
              </span>
            </div>
          ) : list.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground space-y-2 px-2">
              <FileText size={24} className="text-muted-foreground/50 mb-1" />
              <p className="text-[11px] font-bold uppercase tracking-wider font-sans">
                {t("planner:postCreator.templatesPicker.noTemplates")}
              </p>
              <p className="text-[11px] text-muted-foreground font-medium font-sans">
                {activeTab === "discover"
                  ? t("planner:postCreator.templatesPicker.noDiscoverDesc")
                  : t("planner:postCreator.templatesPicker.noTemplatesDesc")}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeTab === "discover"
                  ? filteredDiscover.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleUseDiscoverTemplate(tpl)}
                        className="group relative w-full text-left p-4 rounded-xl border border-border bg-card hover:border-composer-accent hover:shadow-md transition-all overflow-hidden cursor-pointer font-sans"
                      >
                        <div className="flex gap-3 items-start">
                          <div className="w-10 h-10 rounded-lg shrink-0 bg-muted flex items-center justify-center overflow-hidden border border-border/60 text-lg">
                            {tpl.emoji || "📝"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-semibold text-foreground truncate">{tpl.title}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                              {tpl.description || t("planner:postCreator.templatesPicker.noCaption")}
                            </p>
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-slate-900/95 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            {t("planner:postCreator.templatesPicker.useTemplate")}
                          </span>
                        </div>
                      </button>
                    ))
                  : filteredPersonal.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => loadTemplate(tpl)}
                        className="group relative w-full text-left p-4 rounded-xl border border-border bg-card hover:border-composer-accent hover:shadow-md transition-all overflow-hidden cursor-pointer font-sans"
                      >
                        <div className="flex gap-3 items-start">
                          <div className="w-10 h-10 rounded-lg shrink-0 bg-muted flex items-center justify-center overflow-hidden border border-border/60">
                            {tpl.thumbnail ? (
                              <img src={tpl.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <FileText size={16} className="text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-semibold text-foreground truncate">{tpl.title}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                              {tpl.caption || t("planner:postCreator.templatesPicker.noCaption")}
                            </p>
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-slate-900/95 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            {t("planner:postCreator.templatesPicker.useTemplate")}
                          </span>
                        </div>
                      </button>
                    ))}
              </div>

              {/* Infinite scroll sentinel + inline loading indicator, only
                  relevant while browsing unfiltered (server-paginated) results */}
              {!searchQuery.trim() && (
                <div ref={sentinelRef} className="h-1">
                  {isLoadingMore && (
                    <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground">
                      <Loader2 className="animate-spin" size={14} />
                      <span className="text-[11px] font-bold uppercase tracking-wider font-sans">
                        {t("planner:postCreator.templatesPicker.loadingMore")}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
