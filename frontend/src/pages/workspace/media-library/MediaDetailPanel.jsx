import React from "react";
import { X, Calendar, FileText, Maximize2, Trash2, ExternalLink } from "lucide-react";
import { usePostCreator } from "../../../context/PostCreatorContext";
import { useConfirm } from "@/hooks/useConfirm";
import { useBrandPermission } from "../../../hooks/useBrandPermission";
import { useTranslation } from "react-i18next";

export function MediaDetailPanel({ detail, setDetail, onDelete, onRename }) {
  const { t } = useTranslation("medialibrary");
  const { openPostCreator } = usePostCreator();
  const confirm = useConfirm();
  const { hasPermission } = useBrandPermission();
  const hasCreatePermission = hasPermission('CREATE_POSTS');
  const hasDeletePermission = hasPermission('DELETE_POSTS');

  const [fileName, setFileName] = React.useState(detail?.name || "");

  React.useEffect(() => {
    setFileName(detail?.name || "");
  }, [detail]);

  const handleRename = () => {
    if (fileName && fileName.trim() !== "" && fileName !== detail?.name) {
      onRename(detail.id, fileName.trim());
    }
  };

  if (!detail) return null;

  return (
    <div
      className="flex flex-col bg-white border-l border-gray-100 shadow-2xl animate-in slide-in-from-right duration-300"
      style={{ flex: "0 0 320px" }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-bottom border-gray-55">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">{t("detailPanel.title")}</h3>
        <button
          onClick={() => setDetail(null)}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          <X size={16} className="text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
        {/* Preview Area */}
        <div className="aspect-square rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center relative group">
          {detail.type === 'video' ? (
            <video 
              src={detail.url} 
              controls 
              autoPlay
              loop
              muted
              className="w-full h-full object-contain bg-black"
            />
          ) : detail.thumbnail ? (
            <img src={detail.url} alt="" className="w-full h-full object-contain" />
          ) : (
            <span className="text-6xl">{detail.emoji}</span>
          )}
          <a 
            href={detail.url} 
            target="_blank" 
            rel="noreferrer"
            className="absolute bottom-3 right-3 p-2 bg-white/90 backdrop-blur shadow-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"
          >
             <Maximize2 size={14} className="text-gray-600" />
          </a>
        </div>

        {/* Info List */}
        <div className="space-y-4">
           <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <input 
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRename();
                  }
                }}
                onBlur={handleRename}
                className="w-full bg-transparent border-none text-xs font-bold text-gray-800 focus:ring-0 outline-none"
              />
           </div>
           <span className="text-[9px] text-gray-400 block px-1 -mt-2">
             {t("detailPanel.hintRename", { defaultValue: "Press Enter or click outside to save" })}
           </span>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                 <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">{t("detailPanel.type")}</span>
                 <div className="text-xs font-bold text-gray-700 capitalize">{detail.type}</div>
              </div>
              <div className="space-y-1">
                 <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">{t("detailPanel.size")}</span>
                 <div className="text-xs font-bold text-gray-700">{detail.size}</div>
              </div>
              <div className="space-y-1">
                 <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">{t("detailPanel.dimensions")}</span>
                 <div className="text-xs font-bold text-gray-700">{detail.dim || '—'}</div>
              </div>
              <div className="space-y-1">
                 <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">{t("detailPanel.uploaded", { defaultValue: "Uploaded" })}</span>
                 <div className="text-xs font-bold text-gray-700">{detail.date}</div>
              </div>
           </div>
        </div>

        <div className="pt-4 border-t border-gray-50 space-y-2">
            {hasCreatePermission && (
              <button
                className="w-full py-3 bg-[#0A0A0A] hover:bg-black text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-black/5 transition-all active:scale-[0.98] cursor-pointer"
                onClick={() => {
                  openPostCreator({
                    defaultVideoUrl: detail.url,
                    defaultVideoPath: detail.url
                  });
                  setDetail(null);
                }}
              >
                {t("detailPanel.useInPost", { defaultValue: "Use in Post" })}
              </button>
            )}
            {hasDeletePermission && (
              <button
                className="w-full py-3 bg-white hover:bg-red-50 text-red-500 text-[11px] font-black uppercase tracking-widest rounded-xl border border-red-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
                onClick={async () => {
                  const isConfirmed = await confirm({
                    title: t("detailPanel.deleteConfirm", { defaultValue: "Delete File?" }),
                    description: t("detailPanel.deleteConfirmDesc", { defaultValue: "Are you sure you want to delete this file?" }),
                    confirmText: t("detailPanel.confirm", { defaultValue: "Delete" }),
                    cancelText: t("detailPanel.cancel", { defaultValue: "Cancel" }),
                    variant: "destructive"
                  });
                  if (isConfirmed) {
                    onDelete(detail.id);
                  }
                }}
              >
                <Trash2 size={13} />
                {t("detailPanel.delete")}
              </button>
            )}
        </div>
      </div>
    </div>
  );
}

