import * as React from "react";
import { useState, useEffect } from "react";
import {
  Search, Filter, MoreHorizontal, Plus,
  Trash2, CheckCircle, Clock, AlertCircle,
  ExternalLink, Eye, ChevronDown, Youtube, PlayCircle, Loader2, Facebook, Gem, RefreshCw,
  Users, UserCheck, Edit2, X as XIcon
} from "lucide-react";
import { usePostCreator } from "../../../context/PostCreatorContext";
import { PlatformIcon } from "@/components/shared/PlatformIcon";
import { useFilters } from "../../../hooks/useFilters";
import { useDebounce } from "../../../hooks/useDebounce";
import postService from "../../../services/post.service";
import { useBrand } from "../../../context/BrandContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { useConfirm } from "@/hooks/useConfirm";
import { useBrandPermission } from "../../../hooks/useBrandPermission";
import { AccessGuard } from "../../../components/shared/AccessGuard";
import { buildMediaUrl } from "@/utils/url";
import { PostMediaThumbnail } from "@/components/shared/PostMediaThumbnail";
import { useTranslation } from "react-i18next";
import { getPlatformPostUrl } from "../../../utils/postUrlHelper";

const STATUS_STYLE = {
  published: "bg-green-50 text-green-700 border-green-100",
  scheduled: "bg-blue-50 text-blue-700 border-blue-100",
  draft: "bg-muted text-muted-foreground border-border",
  rejected: "bg-red-50 text-red-700 border-red-100",
  pending_approval: "bg-amber-50 text-amber-700 border-amber-100",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
  failed: "bg-rose-100 text-rose-800 border-rose-200"
};

const getPostLink = (platform, platformPostId) => {
  if (!platformPostId) return null;
  return getPlatformPostUrl({ targetPlatforms: [platform], platformPostId });
};

export function ListView() {
  const { t } = useTranslation("planner");
  const confirm = useConfirm();
  const { hasPermission } = useBrandPermission();
  const hasCreatePermission = hasPermission("CREATE_POSTS");

  const [selected, setSelected] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { activeBrand } = useBrand();
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [repostingIds, setRepostingIds] = useState([]);
  const [reviewerPanel, setReviewerPanel] = useState({ open: false, post: null, availableReviewers: [], selectedIds: [], policy: 'AT_LEAST_ONE', saving: false });

  const openPostAnalytics = (post) => {
    const url = getPlatformPostUrl(post);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      openPostCreator({ post });
    }
  };

  const { openPostCreator, isOpen } = usePostCreator();
  const { filters, updateFilters, clearFilters, searchParamsString } = useFilters({
    search: "",
    status: "All",
    platform: "All Platforms",
    page: "1",
    limit: "10"
  });

  const [searchTerm, setSearchTerm] = useState(filters.search || "");
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Sync search
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      updateFilters({ search: debouncedSearch, page: "1" });
    }
  }, [debouncedSearch]);

  // Fetch posts
  const fetchPosts = async () => {
    if (!activeBrand) return;
    setLoading(true);
    try {
      const res = await postService.getPosts(activeBrand.id, filters);
      setPosts(res?.posts || res || []);
      setMeta(res?.meta || { total: 0, page: 1, totalPages: 1 });
    } catch (e) {
      toast.error(t("listView.toasts.loadFail"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [activeBrand, searchParamsString, isOpen]);

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (!activeBrand || selected.length === 0) return;

    const selectedPosts = posts.filter(p => selected.includes(p.id));
    const hasPublished = selectedPosts.some(p => p.status?.toLowerCase() === "published");

    let deleteFromSocials = false;
    let proceed = false;

    if (hasPublished) {
      const wantDeleteSocial = await confirm({
        title: "Xóa bài viết?",
        description: "Một số bài viết đã được đăng. Bạn có muốn xóa bài viết này trên các nền tảng mạng xã hội liên kết không?",
        confirmText: "Xóa trên tất cả nền tảng",
        secondaryText: "Chỉ xóa trên hệ thống",
        cancelText: "Hủy",
        variant: "destructive"
      });
      if (wantDeleteSocial === true) {
        deleteFromSocials = true;
        proceed = true;
      } else if (wantDeleteSocial === false) {
        deleteFromSocials = false;
        proceed = true;
      }
    } else {
      const isConfirmed = await confirm({
        title: "Xóa bài viết?",
        description: `Bạn có chắc chắn muốn xóa ${selected.length} bài viết?`,
        confirmText: "Xóa",
        cancelText: "Hủy",
        variant: "destructive"
      });
      if (isConfirmed) {
        proceed = true;
      }
    }

    if (!proceed) return;

    try {
      await postService.deletePosts(activeBrand.id, selected, deleteFromSocials);
      toast.success(t("listView.toasts.bulkDeleteSuccess"));
      setSelected([]);
      fetchPosts();
    } catch (e) {
      toast.error(e.message || t("listView.toasts.bulkDeleteFail"));
    }
  };

  const handleBulkApprove = async () => {
    if (!activeBrand || selected.length === 0) return;
    const isConfirmed = await confirm({
      title: "Phê duyệt bài viết?",
      description: `Bạn có chắc chắn muốn phê duyệt ${selected.length} bài viết đã chọn?`,
      confirmText: "Phê duyệt",
      cancelText: "Hủy",
      variant: "default"
    });
    if (!isConfirmed) return;

    try {
      await postService.approvePosts(activeBrand.id, selected);
      toast.success(t("listView.toasts.bulkApproveSuccess"));
      setSelected([]);
      fetchPosts();
    } catch (e) {
      toast.error(e.message || t("listView.toasts.bulkApproveFail"));
    }
  };

  const handleDeletePost = async (id) => {
    if (!activeBrand) return;

    const postToDelete = posts.find(p => p.id === id);
    const isPublished = postToDelete?.status?.toLowerCase() === "published";

    let deleteFromSocials = false;
    let proceed = false;

    if (isPublished) {
      const wantDeleteSocial = await confirm({
        title: "Xóa bài viết?",
        description: "Bài viết này đã được đăng. Bạn có muốn xóa bài viết trên các nền tảng mạng xã hội liên kết không?",
        confirmText: "Xóa trên tất cả nền tảng",
        secondaryText: "Chỉ xóa trên hệ thống",
        cancelText: "Hủy",
        variant: "destructive"
      });
      if (wantDeleteSocial === true) {
        deleteFromSocials = true;
        proceed = true;
      } else if (wantDeleteSocial === false) {
        deleteFromSocials = false;
        proceed = true;
      }
    } else {
      const isConfirmed = await confirm({
        title: "Xóa bài viết?",
        description: "Bạn có chắc chắn muốn xóa bài viết này?",
        confirmText: "Xóa",
        cancelText: "Hủy",
        variant: "destructive"
      });
      if (isConfirmed) {
        proceed = true;
      }
    }

    if (!proceed) return;

    try {
      await postService.deletePosts(activeBrand.id, [id], deleteFromSocials);
      toast.success(t("listView.toasts.deleteSuccess"));
      fetchPosts();
    } catch (e) {
      toast.error(e.message || t("listView.toasts.deleteFail"));
    } finally {
      setActiveMenuId(null);
    }
  };

  const handleRepost = async (post) => {
    if (!activeBrand) return;
    const postId = post.id;
    setRepostingIds(prev => [...prev, postId]);
    const toastId = toast.loading(t("listView.toasts.repostingLoading"));
    try {
      // Previously this just flipped status to "published" via the generic
      // update endpoint — no platform was actually (re)published to, so the
      // UI reported success while nothing was sent (#86). retry-failed
      // enqueues a real publish job; gateways that already have a
      // platformPostId for a given platform short-circuit instead of
      // re-publishing, so retrying every target platform here is safe.
      await postService.retryFailedPlatforms(postId, activeBrand.id, post.platforms || []);
      toast.success(t("listView.toasts.repostSuccess"), { id: toastId });
      fetchPosts();
    } catch (err) {
      console.error(err);
      toast.error(err.message || t("listView.toasts.repostFail"), { id: toastId });
    } finally {
      setRepostingIds(prev => prev.filter(id => id !== postId));
    }
  };

  const openReviewerPanel = async (post) => {
    if (!activeBrand || !post.approvalInfo) return;
    try {
      const available = await postService.getReviewers(activeBrand.id);
      const currentIds = (post.approvalInfo.reviewers || []).map(r => r.id).filter(Boolean);
      setReviewerPanel({
        open: true,
        post,
        availableReviewers: available || [],
        selectedIds: currentIds,
        policy: post.approvalInfo.approvalPolicy || 'AT_LEAST_ONE',
        saving: false
      });
    } catch {
      toast.error(t("listView.toasts.loadReviewersFail"));
    }
  };

  const handleSaveReviewers = async () => {
    const { post, selectedIds, policy } = reviewerPanel;
    if (!post?.approvalInfo?.workflowId) return;
    setReviewerPanel(p => ({ ...p, saving: true }));
    try {
      await postService.reassignReviewer(activeBrand.id, post.approvalInfo.workflowId, selectedIds, policy);
      toast.success(t("listView.toasts.saveReviewersSuccess"));
      setReviewerPanel(p => ({ ...p, open: false }));
      fetchPosts();
    } catch (err) {
      toast.error(err.message || t("listView.toasts.saveReviewersFail"));
      setReviewerPanel(p => ({ ...p, saving: false }));
    }
  };

  const handleSaveToLibrary = async (post) => {
    if (!activeBrand) return;
    const toastId = toast.loading(t("listView.toasts.savingTemplate"));
    try {
      const templateData = {
        brandId: activeBrand.id,
        title: post.title ? `${post.title} (Template)` : "Untitled Template",
        caption: post.caption,
        type: post.type || "IMAGE",
        targetPlatforms: post.platforms || [],
        mediaUrls: post.mediaUrls || [],
        mediaThumbnailUrls: post.thumbnail ? [post.thumbnail] : [],
        isLibrary: true,
        status: "DRAFT",
        options: post.options || {}
      };
      await postService.createPost(templateData);
      toast.success(t("listView.toasts.saveTemplateSuccess"), { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(err.message || t("listView.toasts.saveTemplateFail"), { id: toastId });
    } finally {
      setActiveMenuId(null);
    }
  };

  return (
    <>
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
      {/* Search & Actions Bar */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative flex-1 group">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-all" />
               <input 
                 type="text" 
                 placeholder={t("listView.searchPlaceholder")} 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-card border border-border rounded-xl py-2 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#D9F99D]/50 transition-all"
               />
            </div>
            <div className="relative group">
               <button className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-foreground hover:bg-card hover:shadow-sm transition-all cursor-pointer">
                  <Filter size={18} />
               </button>
               <div className="absolute top-full left-0 mt-2 w-48 bg-card rounded-2xl shadow-xl border border-border py-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">{t("listView.filterStatus")}</div>
                  {["All", "Draft", "Pending_Approval", "Approved", "Scheduled", "Published", "Rejected", "Failed"].map(s => (
                    <button 
                      key={s} 
                      onClick={() => updateFilters({ status: s, page: "1" })}
                      className={`w-full text-left px-4 py-2 text-xs hover:bg-muted transition-all cursor-pointer ${filters.status === s ? 'font-bold text-foreground bg-muted' : 'text-muted-foreground'}`}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
               </div>
            </div>
         </div>

          <div className="flex items-center gap-3">
             {selected.length > 0 && (
                <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-300">
                   <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mr-2">{t("listView.selected", { count: selected.length })}</span>
                   <AccessGuard feature="APPROVE_POSTS">
                      <button 
                        onClick={handleBulkApprove}
                        className="px-4 py-2 bg-card border border-border rounded-xl text-[11px] font-bold text-green-600 dark:text-green-400 hover:bg-muted transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <CheckCircle size={14} /> {t("listView.approveBtn")}
                      </button>
                    </AccessGuard>
                   <AccessGuard feature="DELETE_POSTS">
                      <button 
                        onClick={handleBulkDelete}
                        className="px-4 py-2 bg-card border border-border rounded-xl text-[11px] font-bold text-red-600 hover:bg-muted transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Trash2 size={14} /> {t("listView.deleteBtn")}
                      </button>
                    </AccessGuard>
                </div>
             )}
             <div className="w-px h-6 bg-border mx-2" />
             <AccessGuard feature="CREATE_POSTS">
               <button 
                 onClick={openPostCreator}
                 className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold bg-[#0A0A0A] dark:bg-lime-400 text-white dark:text-black hover:scale-105 active:scale-95 cursor-pointer transition-all shadow-lg"
               >
                  <Plus size={16} /> {t("listView.createPostBtn")}
               </button>
             </AccessGuard>
          </div>
      </div>

      {/* Table Container */}
      <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
         {loading ? (
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-muted/50 border-b border-border">
                     <th className="px-6 py-4 w-10">
                        <input 
                          key="loading-checkbox"
                          type="checkbox" 
                          className="rounded border-border text-primary cursor-pointer" 
                          disabled
                          checked={false}
                          readOnly
                        />
                     </th>
                     <th className="px-4 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">{t("listView.colPostDetails")}</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">{t("listView.colPlatform")}</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">{t("listView.colScheduledFor")}</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">{t("listView.colStatus")}</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">{t("listView.colAuthor")}</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">{t("listView.colReviewers")}</th>
                     <th className="px-6 py-4 text-right"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border">
                  {[1, 2, 3].map((n) => (
                     <tr key={n} className="animate-pulse">
                        <td className="px-6 py-5"><div className="w-4 h-4 bg-muted rounded" /></td>
                        <td className="px-4 py-5">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-muted rounded-xl shrink-0" />
                              <div className="flex flex-col gap-2">
                                 <div className="w-28 h-3 bg-muted rounded" />
                                 <div className="w-20 h-2 bg-muted rounded" />
                              </div>
                           </div>
                        </td>
                        <td className="px-4 py-5"><div className="w-16 h-5 bg-muted rounded-lg" /></td>
                        <td className="px-4 py-5">
                           <div className="flex flex-col gap-2">
                              <div className="w-16 h-3 bg-muted rounded" />
                              <div className="w-12 h-2.5 bg-muted rounded" />
                           </div>
                        </td>
                        <td className="px-4 py-5"><div className="w-16 h-4 bg-muted rounded-full" /></td>
                        <td className="px-4 py-5">
                           <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-muted" />
                              <div className="w-12 h-3 bg-muted rounded" />
                           </div>
                        </td>
                        <td className="px-4 py-5"><div className="w-8 h-8 rounded-full bg-muted" /></td>
                        <td className="px-6 py-5 text-right"><div className="w-8 h-8 bg-muted rounded-lg inline-block" /></td>
                     </tr>
                  ))}
               </tbody>
            </table>
         ) : posts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
               <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center text-muted-foreground mb-4">
                  <PlayCircle size={32} />
               </div>
               <h3 className="text-sm font-bold text-foreground">{t("listView.noPosts")}</h3>
               <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">{t("listView.noPostsDesc")}</p>
               <button 
                 onClick={clearFilters}
                 className="mt-6 px-4 py-2 text-xs font-bold text-foreground border border-border rounded-xl hover:bg-muted transition-all cursor-pointer"
               >
                 {t("listView.clearFilters")}
               </button>
            </div>
         ) : (
            <>
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-muted/50 border-b border-border">
                     <th className="px-6 py-4 w-10">
                        <input 
                          key="active-checkbox"
                          type="checkbox" 
                          className="rounded border-border text-primary focus:ring-primary cursor-pointer" 
                          checked={selected.length === posts.length && posts.length > 0}
                          onChange={(e) => setSelected(e.target.checked ? posts.map(p => p.id) : [])}
                        />
                     </th>
                     <th className="px-4 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">{t("listView.colPostDetails")}</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">{t("listView.colPlatform")}</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">{t("listView.colScheduledFor")}</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">{t("listView.colStatus")}</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">{t("listView.colAuthor")}</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">{t("listView.colReviewers")}</th>
                     <th className="px-6 py-4 text-right"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border">
                  {posts.map((post) => (
                    <tr 
                      key={post.id} 
                      className={`hover:bg-muted/50 transition-colors group ${selected.includes(post.id) ? "bg-primary/10" : ""}`}
                    >
                       <td className="px-6 py-5">
                          <input 
                            type="checkbox" 
                            checked={selected.includes(post.id)}
                            onChange={() => toggleSelect(post.id)}
                            className="rounded border-border text-primary focus:ring-primary cursor-pointer" 
                          />
                       </td>
                       <td className="px-4 py-5 cursor-pointer" onClick={() => {
                         if (post.status?.toLowerCase() === 'published') {
                           openPostAnalytics(post);
                         } else {
                           openPostCreator({ post });
                         }
                       }}>
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-border relative group-hover:border-foreground/30 transition-all shadow-sm">
                                <PostMediaThumbnail 
                                  thumbnail={post.thumbnail}
                                  mediaUrls={post.mediaUrls}
                                  className="w-full h-full"
                                />
                                {post.mediaUrls && post.mediaUrls.length > 1 && (
                                  <span className="absolute bottom-1 right-1 bg-black/85 text-[8px] font-black text-white px-1 py-0.5 rounded flex items-center justify-center gap-0.5 z-10 shadow-sm border border-white/10">
                                    +{post.mediaUrls.length - 1}
                                  </span>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all z-10">
                                   <Eye size={16} className="text-white" />
                                </div>
                             </div>
                             <div className="flex flex-col min-w-0">
                                <span className="text-[13px] font-bold text-foreground truncate max-w-[250px]">
                                  {post.title || post.caption || "Không có tiêu đề"}
                                </span>
                                {post.title && post.caption && (
                                  <span className="text-[11px] text-muted-foreground truncate max-w-[250px]">{post.caption}</span>
                                )}
                             </div>
                          </div>
                       </td>
                       <td className="px-4 py-5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                             {post.platforms.map(plt => {
                                const postUrl = post.status === 'published' ? getPostLink(plt, post.platformPostId) : null;
                                return (
                                  <div key={plt} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-lg border border-border shadow-sm">
                                     <PlatformIcon platform={plt} size={12} />
                                     <span className="text-[9px] font-black uppercase tracking-tighter text-foreground">{plt}</span>
                                     {postUrl && (
                                       <a 
                                         href={postUrl} 
                                         target="_blank" 
                                         rel="noopener noreferrer"
                                         title="View original post"
                                         className="text-muted-foreground hover:text-blue-500 transition-colors ml-0.5"
                                         onClick={(e) => e.stopPropagation()}
                                       >
                                         <ExternalLink size={10} />
                                       </a>
                                     )}
                                  </div>
                                );
                              })}
                          </div>
                       </td>
                       <td className="px-4 py-5">
                          <div className="flex flex-col">
                             <span className="text-[12px] font-bold text-foreground">
                               {post.scheduledAt ? format(new Date(post.scheduledAt), "MMM d, yyyy") : "—"}
                             </span>
                             <span className="text-[10px] text-muted-foreground uppercase font-medium">
                               {post.scheduledAt ? format(new Date(post.scheduledAt), "hh:mm a") : "—"}
                             </span>
                          </div>
                       </td>
                       <td className="px-4 py-5">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border shadow-sm ${STATUS_STYLE[post.status] || "bg-muted text-muted-foreground border-border"}`}>
                             {post.status.replace('_', ' ')}
                          </span>
                       </td>
                       <td className="px-4 py-5">
                          <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-muted border border-border shadow-sm flex items-center justify-center text-[10px] font-bold text-muted-foreground overflow-hidden">
                                {post.creatorAvatar ? <img src={post.creatorAvatar} className="w-full h-full object-cover" /> : (post.creator || "?").charAt(0)}
                             </div>
                             <span className="text-[11px] font-medium text-foreground">{post.creator || "—"}</span>
                          </div>
                       </td>
                       <td className="px-4 py-5">
                          {post.approvalInfo?.reviewers?.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <div className="flex -space-x-1.5">
                                {post.approvalInfo.reviewers.slice(0, 3).map(r => (
                                  <div key={r.id} title={r.name} className={`w-6 h-6 rounded-full border-2 border-card flex items-center justify-center text-[9px] font-bold overflow-hidden shadow-sm ${
                                    r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                    r.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                    'bg-amber-100 text-amber-700'
                                  }`}>
                                    {r.avatarUrl ? <img src={r.avatarUrl} className="w-full h-full object-cover" /> : (r.name || '?').charAt(0)}
                                  </div>
                                ))}
                                {post.approvalInfo.reviewers.length > 3 && (
                                  <div className="w-6 h-6 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                                    +{post.approvalInfo.reviewers.length - 3}
                                  </div>
                                )}
                              </div>
                              {post.status === 'pending_approval' && (
                                <button
                                  onClick={e => { e.stopPropagation(); openReviewerPanel(post); }}
                                  className="ml-1 p-1 rounded-md text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-all opacity-0 group-hover:opacity-100"
                                  title="Sửa người duyệt"
                                >
                                  <Edit2 size={11} />
                                </button>
                              )}
                            </div>
                          ) : (
                            post.status === 'pending_approval' ? (
                              <button
                                onClick={e => { e.stopPropagation(); openReviewerPanel(post); }}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
                              >
                                <UserCheck size={10} /> {t("listView.assignBtn")}
                              </button>
                            ) : <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                       </td>
                       <td className="px-6 py-5 text-right relative">
                          <div className="flex items-center justify-end gap-1">
                            {post.status?.toLowerCase() === "failed" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRepost(post);
                                }}
                                disabled={repostingIds.includes(post.id)}
                                className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-500/10 disabled:bg-muted disabled:text-muted-foreground rounded-lg transition-all border border-transparent hover:border-indigo-500/20 cursor-pointer flex items-center justify-center shrink-0"
                                title="Đăng lại bài viết ngay"
                              >
                                {repostingIds.includes(post.id) ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <RefreshCw size={14} />
                                )}
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveToLibrary(post);
                              }}
                              className="p-2 text-teal-500 hover:text-teal-700 hover:bg-teal-500/10 rounded-lg transition-all border border-transparent hover:border-teal-500/20 cursor-pointer flex items-center justify-center shrink-0"
                              title="Lưu thành Template"
                            >
                              <Gem size={14} />
                            </button>
                            <AccessGuard feature="DELETE_POSTS">
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleDeletePost(post.id);
                               }}
                               className="p-2 text-red-400 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/20 cursor-pointer"
                               title="Delete Post"
                             >
                               <Trash2 size={14} />
                             </button>
                           </AccessGuard>
                           
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               setActiveMenuId(activeMenuId === post.id ? null : post.id);
                             }}
                             data-testid={`post-action-menu-${post.id}`}
                             className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all shadow-none hover:shadow-sm border border-transparent hover:border-border cursor-pointer"
                           >
                              <MoreHorizontal size={16} />
                           </button>
                         </div>

                          {activeMenuId === post.id && (
                             <>
                               <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />
                               <div className="absolute right-6 top-12 w-44 bg-card rounded-2xl shadow-xl border border-border py-1.5 z-50 animate-in fade-in slide-in-from-top-1 text-left overflow-hidden">
                                   {post.status?.toLowerCase() === "failed" && (
                                     <button 
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         handleRepost(post);
                                         setActiveMenuId(null);
                                       }}
                                       disabled={repostingIds.includes(post.id)}
                                       className="w-full px-4 py-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-muted transition-all flex items-center gap-2 cursor-pointer border-b border-border"
                                     >
                                        <span>🔄</span> {repostingIds.includes(post.id) ? t("listView.reposting") : t("listView.repostNow")}
                                     </button>
                                   )}
                                   {post.status?.toLowerCase() === "published" && (
                                     <button 
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         openPostAnalytics(post);
                                         setActiveMenuId(null);
                                       }}
                                       className="w-full px-4 py-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-muted transition-all flex items-center gap-2 cursor-pointer border-b border-border text-left"
                                     >
                                        <span>📊</span> {t("listView.detailStats")}
                                     </button>
                                   )}
                                   <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (post.status?.toLowerCase() === "published") {
                                          openPostAnalytics(post);
                                        } else {
                                          openPostCreator({ post });
                                        }
                                        setActiveMenuId(null);
                                      }}
                                      className="w-full px-4 py-2 text-[11px] font-bold text-foreground hover:bg-muted transition-all flex items-center gap-2 cursor-pointer"
                                    >
                                       <span>{post.status?.toLowerCase() === "published" ? "👁️" : "✏️"}</span>
                                       {post.status?.toLowerCase() === "published"
                                         ? t("listView.viewPost")
                                         : (hasCreatePermission ? t("listView.editPost") : t("listView.viewPost"))}
                                    </button>
                                   {hasCreatePermission && (
                                     <button 
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         openPostCreator({ 
                                           template: post, 
                                           defaultScheduledAt: post.scheduledAt ? new Date(post.scheduledAt) : null 
                                         });
                                         setActiveMenuId(null);
                                       }}
                                       data-testid="post-duplicate-btn"
                                       className="w-full px-4 py-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-muted transition-all flex items-center gap-2 cursor-pointer border-t border-border text-left"
                                     >
                                        <span>🔂</span> {t("listView.duplicatePost")}
                                     </button>
                                   )}
                                   <button 
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       handleSaveToLibrary(post);
                                       setActiveMenuId(null);
                                     }}
                                     className="w-full px-4 py-2 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:bg-muted transition-all flex items-center gap-2 cursor-pointer border-t border-border"
                                   >
                                      <span>💎</span> {t("listView.saveTemplate")}
                                   </button>
                                   <AccessGuard feature="DELETE_POSTS">
                                     <button 
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         handleDeletePost(post.id);
                                         setActiveMenuId(null);
                                       }}
                                       className="w-full px-4 py-2 text-[11px] font-bold text-red-600 hover:bg-muted transition-all flex items-center gap-2 cursor-pointer border-t border-border"
                                     >
                                        <span>🗑️</span> {t("listView.deletePost")}
                                     </button>
                                   </AccessGuard>
                                </div>
                             </>
                           )}
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
            
            {/* Footer Pagination */}
            <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-between">
               <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                 {t("listView.showingResults", { count: posts.length, total: meta.total })}
               </span>
               <div className="flex gap-2">
                  <button 
                    disabled={parseInt(filters.page) <= 1}
                    onClick={() => updateFilters({ page: (parseInt(filters.page) - 1).toString() })}
                    className="px-4 py-1.5 bg-card border border-border rounded-lg text-[11px] font-bold text-foreground hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                  >
                    {t("listView.prevBtn")}
                  </button>
                  <button 
                    disabled={parseInt(filters.page) >= meta.totalPages}
                    onClick={() => updateFilters({ page: (parseInt(filters.page) + 1).toString() })}
                    className="px-4 py-1.5 bg-card border border-border rounded-lg text-[11px] font-bold text-foreground hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                  >
                    {t("listView.nextBtn")}
                  </button>
               </div>
            </div>
            </>
         )}
      </div>
    </div>

    {/* Reviewer Edit Panel */}
    {reviewerPanel.open && (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setReviewerPanel(p => ({ ...p, open: false }))} />
        <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><UserCheck size={16} className="text-amber-500" /> {t("listView.reviewerPanel.title")}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[280px]">{reviewerPanel.post?.title}</p>
            </div>
            <button onClick={() => setReviewerPanel(p => ({ ...p, open: false }))} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><XIcon size={16} /></button>
          </div>

          <div className="mb-4">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{t("listView.reviewerPanel.policyLabel")}</label>
            <div className="flex gap-2">
              {[{ v: 'AT_LEAST_ONE', label: t("listView.reviewerPanel.policyAtLeastOne") }, { v: 'ALL', label: t("listView.reviewerPanel.policyAll") }].map(opt => (
                <button key={opt.v} onClick={() => setReviewerPanel(p => ({ ...p, policy: opt.v }))}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all ${
                    reviewerPanel.policy === opt.v ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400' : 'bg-muted border-border text-muted-foreground hover:border-foreground/20'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{t("listView.reviewerPanel.selectLabel")}</label>
            <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
              {reviewerPanel.availableReviewers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">{t("listView.reviewerPanel.noReviewers")}</p>
              ) : reviewerPanel.availableReviewers.map(r => {
                const selected = reviewerPanel.selectedIds.includes(r.id);
                return (
                  <button key={r.id}
                    onClick={() => setReviewerPanel(p => ({
                      ...p,
                      selectedIds: selected ? p.selectedIds.filter(id => id !== r.id) : [...p.selectedIds, r.id]
                    }))}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                      selected ? 'bg-amber-500/10 border-amber-500/40' : 'bg-card border-border hover:border-foreground/20 hover:bg-muted'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground overflow-hidden shrink-0">
                      {r.avatarUrl ? <img src={r.avatarUrl} className="w-full h-full object-cover" /> : (r.name || '?').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground truncate">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{r.email} · {r.role}</p>
                    </div>
                    {selected && <UserCheck size={14} className="text-amber-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setReviewerPanel(p => ({ ...p, open: false }))} className="flex-1 py-2.5 rounded-xl border border-border text-[12px] font-bold text-foreground hover:bg-muted transition-all">{t("listView.reviewerPanel.cancelBtn")}</button>
            <button
              onClick={handleSaveReviewers}
              disabled={reviewerPanel.saving || reviewerPanel.selectedIds.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-[12px] font-bold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {reviewerPanel.saving ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
              {t("listView.reviewerPanel.saveBtn")}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
