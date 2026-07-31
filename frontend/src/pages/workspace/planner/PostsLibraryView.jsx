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
      {/* Premium Header */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-[#0A0A0A]">{t("postsLibrary.title")}</h2>
            <div className="px-3 py-1 bg-[#D9F99D] rounded-full flex items-center gap-1.5 shadow-sm border border-[#BEF264]">
               <Diamond size={12} className="text-black" />
               <span className="text-[10px] font-bold text-black uppercase tracking-wider">{t("postsLibrary.badge")}</span>
            </div>
         </div>
         <div className="flex items-center gap-4">
            <div className="relative group w-64">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
               <input 
                 type="text" 
                 placeholder={t("postsLibrary.searchPlaceholder")} 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-9 pr-4 text-[11px] focus:outline-none focus:ring-2 focus:ring-[#D9F99D]/50 transition-all"
               />
            </div>
            <AccessGuard feature="CREATE_POSTS">
              <button 
                onClick={() => openPostCreator({ isLibrary: true })}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold bg-[#0A0A0A] text-white hover:scale-105 active:scale-95 cursor-pointer transition-all shadow-lg"
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
             <div key={n} className="bg-white border border-gray-100 rounded-[24px] overflow-hidden shadow-sm h-[290px] space-y-4 flex flex-col">
                <div className="aspect-square bg-gray-50 flex items-center justify-center relative" />
                <div className="p-5 space-y-3 bg-white flex-1">
                   <div className="w-24 h-4 bg-gray-100 rounded" />
                   <div className="flex justify-between items-center">
                      <div className="w-16 h-3 bg-gray-50 rounded" />
                      <div className="w-12 h-3.5 bg-gray-100 rounded-lg" />
                   </div>
                </div>
             </div>
           ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-12 bg-[#2D1D35] rounded-[32px] p-12 text-center relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-[#D9F99D]/10 rounded-full -mr-32 -mt-32 blur-3xl" />
           <div className="relative z-10 space-y-4">
              <div className="w-20 h-20 bg-[#D9F99D]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#D9F99D]/20">
                <Diamond size={40} className="text-[#D9F99D] drop-shadow-lg" />
              </div>
              <h3 className="text-2xl font-bold text-white uppercase tracking-tight">{t("postsLibrary.emptyTitle")}</h3>
              <p className="text-gray-400 max-w-md mx-auto text-sm font-medium leading-relaxed">{t("postsLibrary.emptyDesc")}</p>
              <AccessGuard feature="CREATE_POSTS">
                 <button 
                   onClick={() => openPostCreator({ isLibrary: true })}
                   className="mt-6 px-10 py-3 rounded-2xl text-sm font-black uppercase tracking-widest bg-[#D9F99D] text-[#0A0A0A] hover:scale-105 cursor-pointer transition-all shadow-xl"
                 >
                    {t("postsLibrary.createFirstBtn")}
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
               className="bg-white border border-gray-100 rounded-[24px] overflow-hidden shadow-sm hover:shadow-xl hover:border-black transition-all group cursor-pointer active:scale-[0.98]"
             >
                <div className="aspect-square bg-gray-50 flex items-center justify-center relative overflow-hidden">
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
                          className="px-4 py-2 bg-[#D9F99D] hover:bg-[#bef264] text-[#0A0A0A] rounded-xl text-xs font-black uppercase tracking-wider transition-all transform hover:scale-105 shadow-md flex items-center gap-1.5 cursor-pointer"
                        >
                           <Plus size={14} /> {t("postsLibrary.useTemplate")}
                        </button>
                      </AccessGuard>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openPostCreator({ post: item });
                        }}
                        className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-800 rounded-xl text-xs font-bold uppercase tracking-wider transition-all transform hover:scale-105 shadow-md flex items-center gap-1.5 cursor-pointer"
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
                         <div key={plt} className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/50">
                            <PlatformIcon platform={plt} size={14} />
                         </div>
                      ))}
                   </div>
                </div>
                <div className="p-5 space-y-3 bg-white">
                   <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[13px] font-bold text-[#0A0A0A] line-clamp-1 uppercase tracking-tight">{item.title}</h3>
                      <button className="text-gray-300 hover:text-black transition-colors"><MoreHorizontal size={14} /></button>
                   </div>
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.type}</span>
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
