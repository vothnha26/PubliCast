import * as React from "react";
import { useState, useEffect } from "react";
import { 
  Search, Filter, Plus, Diamond, 
  Grid3X3, List as ListIcon, MoreHorizontal,
  Youtube, PlayCircle, Instagram, Image as ImageIcon, Loader2, Eye, Facebook, Edit
} from "lucide-react";
import { usePostCreator } from "../../../context/PostCreatorContext";
import postService from "../../../services/post.service";
import { useBrand } from "../../../context/BrandContext";
import { toast } from "sonner";
import { useBrandPermission } from "../../../hooks/useBrandPermission";
import { AccessGuard } from "../../../components/shared/AccessGuard";
import { buildMediaUrl } from "../../../utils/url";
import { PlatformIcon } from "@/components/shared/PlatformIcon";
import { useTranslation } from "react-i18next";

export function PostsLibraryView() {
  const { t } = useTranslation("planner");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { activeBrand } = useBrand();
  const [searchTerm, setSearchTerm] = useState("");
  const { hasPermission } = useBrandPermission();
  const hasCreatePermission = hasPermission('CREATE_POSTS');

  const { openPostCreator, isOpen } = usePostCreator();

  const fetchLibrary = async () => {
    if (!activeBrand) return;
    setLoading(true);
    try {
      const res = await postService.getPosts(activeBrand.id, { 
        isLibrary: true,
        search: searchTerm
      });
      setPosts(res || []);
    } catch (e) {
      toast.error(t("postsLibrary.toasts.loadFail"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, [activeBrand, searchTerm, isOpen]);

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-foreground">{t("postsLibrary.title")}</h2>
            <div className="px-3 py-1 bg-[#D9F99D] rounded-full flex items-center gap-1.5 shadow-sm border border-[#BEF264]">
               <Diamond size={12} className="text-black" />
               <span className="text-[10px] font-bold text-black uppercase tracking-wider">{t("postsLibrary.badge")}</span>
            </div>
         </div>
         <div className="flex items-center gap-4">
            <div className="relative group w-64">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
               <input 
                 type="text" 
                 placeholder={t("postsLibrary.searchPlaceholder")} 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-card border border-border rounded-xl py-2 pl-9 pr-4 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#D9F99D]/50 transition-all"
               />
            </div>
            <AccessGuard feature="CREATE_POSTS">
              <button 
                onClick={() => openPostCreator({ isLibrary: true })}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold bg-[#0A0A0A] dark:bg-lime-400 text-white dark:text-black hover:scale-105 active:scale-95 cursor-pointer transition-all shadow-lg"
              >
                  <Plus size={16} /> {t("postsLibrary.addTemplateBtn")}
              </button>
            </AccessGuard>
         </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
           {[1, 2, 3, 4].map((n) => (
             <div key={n} className="bg-card border border-border rounded-[24px] overflow-hidden shadow-sm h-[290px] space-y-4 flex flex-col">
                <div className="aspect-square bg-muted flex items-center justify-center relative" />
                <div className="p-5 space-y-3 bg-card flex-1">
                   <div className="w-24 h-4 bg-muted rounded" />
                   <div className="flex justify-between items-center">
                      <div className="w-16 h-3 bg-muted rounded" />
                      <div className="w-12 h-3.5 bg-muted rounded-lg" />
                   </div>
                </div>
             </div>
           ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-8 bg-card border border-border rounded-3xl p-12 text-center relative overflow-hidden shadow-xs transition-colors">
           <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-lime-100/40 dark:from-lime-900/10 via-emerald-50/20 dark:via-transparent to-transparent rounded-full -mr-20 -mt-20 blur-2xl pointer-events-none" />
           <div className="relative z-10 space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 bg-lime-100/60 dark:bg-lime-900/30 border border-lime-300/50 dark:border-lime-700/50 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xs">
                <Diamond size={32} className="text-lime-700 dark:text-lime-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground tracking-tight">{t("postsLibrary.emptyTitle")}</h3>
              <p className="text-muted-foreground text-sm font-medium leading-relaxed">{t("postsLibrary.emptyDesc")}</p>
              <AccessGuard feature="CREATE_POSTS">
                 <button 
                   onClick={() => openPostCreator({ isLibrary: true })}
                   className="mt-4 inline-flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-black dark:bg-lime-400 text-white dark:text-black hover:bg-gray-800 dark:hover:bg-lime-300 active:scale-95 cursor-pointer transition-all shadow-md"
                 >
                    <Plus size={16} /> {t("postsLibrary.createFirstBtn")}
                 </button>
               </AccessGuard>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
           {posts.map((item) => (
             <div 
               key={item.id} 
               onClick={() => openPostCreator({ template: item })}
               className="bg-card border border-border rounded-[24px] overflow-hidden shadow-sm hover:shadow-xl hover:border-foreground transition-all group cursor-pointer active:scale-[0.98]"
             >
                <div className="aspect-square bg-muted flex items-center justify-center relative overflow-hidden">
                   {item.thumbnail ? (
                      <img src={item.thumbnail.startsWith('http') ? item.thumbnail : buildMediaUrl(item.thumbnail)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                   ) : (
                      <div className="text-4xl opacity-20 group-hover:scale-110 transition-transform duration-500">📝</div>
                   )}
                   
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2.5 transition-all">
                      <AccessGuard feature="CREATE_POSTS">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            openPostCreator({ template: item });
                          }}
                          className="px-4 py-2 bg-[#D9F99D] hover:bg-[#bef264] text-foreground rounded-xl text-xs font-black uppercase tracking-wider transition-all transform hover:scale-105 shadow-md flex items-center gap-1.5 cursor-pointer"
                        >
                           <Plus size={14} /> {t("postsLibrary.useTemplate")}
                        </button>
                      </AccessGuard>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openPostCreator({ post: item });
                        }}
                        className="px-4 py-2 bg-card hover:bg-muted text-foreground rounded-xl text-xs font-bold uppercase tracking-wider transition-all transform hover:scale-105 shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        {hasCreatePermission ? (
                          <>
                             <Edit size={14} /> {t("postsLibrary.editTemplate")}
                           </>
                         ) : (
                           <>
                             <Eye size={14} /> {t("postsLibrary.viewTemplate")}
                           </>
                        )}
                      </button>
                   </div>

                   <div className="absolute top-4 right-4 flex gap-1">
                      {item.platforms.map(plt => (
                         <div key={plt} className="w-8 h-8 rounded-full bg-card/80 backdrop-blur-md flex items-center justify-center shadow-sm border border-border">
                            <PlatformIcon platform={plt} size={14} />
                         </div>
                      ))}
                   </div>
                </div>
                <div className="p-5 space-y-3 bg-card">
                   <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[13px] font-bold text-foreground line-clamp-1 uppercase tracking-tight">{item.title}</h3>
                      <button className="text-muted-foreground hover:text-foreground transition-colors"><MoreHorizontal size={14} /></button>
                   </div>
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{item.type}</span>
                      <span className="text-[9px] font-black text-[#065F46] bg-[#D1FAE5] px-2 py-0.5 rounded-lg uppercase tracking-tighter">{t("postsLibrary.templateBadge")}</span>
                   </div>
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
