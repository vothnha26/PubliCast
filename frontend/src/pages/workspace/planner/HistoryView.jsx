import * as React from "react";
import { useState, useEffect } from "react";
import { 
  Trash2, RefreshCw, Search, Filter, 
  MoreHorizontal, Eye, Loader2
} from "lucide-react";
import { PlatformIcon } from "@/components/shared/PlatformIcon";
import { PostMediaThumbnail } from "@/components/shared/PostMediaThumbnail";
import postService from "../../../services/post.service";
import { useBrand } from "../../../context/BrandContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { useConfirm } from "@/hooks/useConfirm";
import { useTranslation } from "react-i18next";
import { useDebounce } from "../../../hooks/useDebounce";
import { useLatestRequestId } from "../../../hooks/useLatestRequestId";

export function HistoryView() {
  const { t } = useTranslation("planner");
  const confirm = useConfirm();
  const [posts, setPosts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const { activeBrand } = useBrand();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const historyRequest = useLatestRequestId();

  const fetchDeletedPosts = async () => {
    if (!activeBrand) return;
    const requestId = historyRequest.start();
    setLoading(true);
    try {
      const res = await postService.getPosts(activeBrand.id, {
        isDeleted: true,
        search: debouncedSearch
      });
      if (!historyRequest.isLatest(requestId)) return;
      setPosts(res?.posts || res || []);
      setSelected([]);
    } catch (e) {
      if (historyRequest.isLatest(requestId)) toast.error(t("historyView.toasts.loadFail"));
    } finally {
      if (historyRequest.isLatest(requestId)) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBrand, debouncedSearch]);

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleRestore = async (id) => {
    try {
      await postService.restorePosts(activeBrand.id, [id]);
      toast.success(t("historyView.toasts.restoreSuccess"));
      fetchDeletedPosts();
    } catch (e) {
      toast.error(t("historyView.toasts.restoreFail"));
    }
  };

  const handleBulkRestore = async () => {
    if (!activeBrand || selected.length === 0) return;
    try {
      await postService.restorePosts(activeBrand.id, selected);
      toast.success(t("historyView.toasts.bulkRestoreSuccess"));
      setSelected([]);
      fetchDeletedPosts();
    } catch (e) {
      toast.error(t("historyView.toasts.bulkRestoreFail"));
    }
  };

  const handleEmptyTrash = async () => {
    const isConfirmed = await confirm({
      title: t("historyView.confirm.emptyTrashTitle"),
      description: t("historyView.confirm.emptyTrashDesc"),
      confirmText: t("historyView.confirm.emptyTrashConfirm"),
      cancelText: t("historyView.confirm.emptyTrashCancel"),
      variant: "destructive"
    });
    if (!isConfirmed) return;
    try {
      await postService.emptyTrash(activeBrand.id);
      toast.success(t("historyView.toasts.emptyTrashSuccess"));
      fetchDeletedPosts();
    } catch (e) {
      toast.error(t("historyView.toasts.emptyTrashFail"));
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
         <h2 className="text-xl font-bold text-[#0A0A0A]">{t("historyView.title")}</h2>
         <div className="flex items-center gap-4 flex-1 max-w-md ml-8">
            <div className="relative flex-1 group">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
               <input 
                 type="text" 
                 placeholder={t("historyView.searchPlaceholder")} 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all" 
               />
            </div>
         </div>
         <div className="flex items-center gap-3">
            {selected.length > 0 && (
               <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-300">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-2">{selected.length} {t("historyView.selected", { count: selected.length }).replace(selected.length.toString() + ' ', '')}</span>
                  <button 
                    onClick={handleBulkRestore}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-green-600 hover:bg-green-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <RefreshCw size={14} /> {t("historyView.restoreSelected")}
                  </button>
               </div>
            )}
            <div className="w-px h-6 bg-gray-200 mx-2" />
            <button 
              onClick={handleEmptyTrash}
              className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-widest transition-colors cursor-pointer"
            >
              {t("historyView.emptyTrash")}
            </button>
         </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
         {loading ? (
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-gray-50/30 border-b border-gray-100">
                     <th className="px-6 py-4 w-10">
                        <input 
                          key="loading-checkbox"
                          type="checkbox" 
                          className="rounded border-gray-300 text-black cursor-pointer" 
                          disabled
                          checked={false}
                          readOnly
                        />
                     </th>
                     <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">{t("historyView.colPost")}</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">{t("historyView.colPlatform")}</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">{t("historyView.colDeletedAt")}</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">{t("historyView.colAuthor")}</th>
                     <th className="px-6 py-4 text-right"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {[1, 2, 3].map((n) => (
                     <tr key={n} className="animate-pulse">
                        <td className="px-6 py-5">
                           <input 
                             type="checkbox" 
                             className="rounded border-gray-300 text-black cursor-pointer" 
                             disabled 
                           />
                        </td>
                        <td className="px-4 py-5">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gray-100 rounded-xl shrink-0" />
                              <div className="w-36 h-3 bg-gray-100 rounded" />
                           </div>
                        </td>
                        <td className="px-4 py-5"><div className="w-16 h-5 bg-gray-100 rounded-lg" /></td>
                        <td className="px-4 py-5"><div className="w-24 h-3 bg-gray-100 rounded" /></td>
                        <td className="px-4 py-5"><div className="w-16 h-3 bg-gray-50 rounded" /></td>
                        <td className="px-6 py-5 text-right"><div className="w-16 h-6 bg-gray-100 rounded-lg inline-block" /></td>
                     </tr>
                  ))}
               </tbody>
            </table>
         ) : posts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
               <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 mb-4">
                  <Trash2 size={32} />
               </div>
               <h3 className="text-sm font-bold text-gray-900">{t("historyView.trashEmpty")}</h3>
               <p className="text-xs text-gray-400 mt-1 max-w-[250px]">{t("historyView.trashEmptyDesc")}</p>
            </div>
         ) : (
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-gray-50/30 border-b border-gray-100">
                     <th className="px-6 py-4 w-10">
                        <input 
                          key="active-checkbox"
                          type="checkbox" 
                          className="rounded border-gray-300 text-black focus:ring-black cursor-pointer" 
                          checked={selected.length === posts.length && posts.length > 0}
                          onChange={(e) => setSelected(e.target.checked ? posts.map(p => p.id) : [])}
                        />
                     </th>
                     <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">{t("historyView.colPost")}</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">{t("historyView.colPlatform")}</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">{t("historyView.colDeletedAt")}</th>
                     <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">{t("historyView.colAuthor")}</th>
                     <th className="px-6 py-4 text-right"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {posts.map((post) => (
                    <tr key={post.id} className={`hover:bg-gray-50/50 transition-colors group ${selected.includes(post.id) ? "bg-[#D9F99D]/10" : ""}`}>
                       <td className="px-6 py-5">
                          <input 
                            type="checkbox" 
                            checked={selected.includes(post.id)}
                            onChange={() => toggleSelect(post.id)}
                            className="rounded border-gray-300 text-black focus:ring-black cursor-pointer" 
                          />
                       </td>
                       <td className="px-4 py-5">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-gray-100 grayscale opacity-50 relative shadow-sm">
                                <PostMediaThumbnail 
                                  thumbnail={post.thumbnail}
                                  mediaUrls={post.mediaUrls}
                                  className="w-full h-full"
                                />
                             </div>
                             <div className="flex flex-col min-w-0">
                                <span className="text-[13px] font-bold text-gray-400 line-through truncate max-w-[250px]">{post.title}</span>
                             </div>
                          </div>
                       </td>
                       <td className="px-4 py-5">
                          <div className="flex items-center gap-1.5 opacity-40">
                             {post.platforms.map(plt => (
                               <div key={plt} className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 shadow-sm">
                                  <PlatformIcon platform={plt} size={12} />
                                  <span className="text-[9px] font-black uppercase tracking-tighter text-gray-600">{plt}</span>
                                </div>
                             ))}
                          </div>
                       </td>
                       <td className="px-4 py-5 text-[12px] text-gray-400">
                         {post.deletedAt ? format(new Date(post.deletedAt), "MMM d, yyyy HH:mm") : "N/A"}
                       </td>
                       <td className="px-4 py-5">
                          <div className="flex items-center gap-2 opacity-50">
                             <span className="text-[11px] font-medium text-gray-600">{post.creator}</span>
                          </div>
                       </td>
                       <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={() => handleRestore(post.id)}
                                className="px-4 py-1.5 bg-white border border-gray-200 rounded-xl text-[10px] font-bold text-gray-700 hover:bg-black hover:text-white hover:border-black transition-all cursor-pointer shadow-sm"
                             >
                              {t("historyView.restoreBtn")}
                             </button>
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         )}
      </div>
    </div>
  );
}
