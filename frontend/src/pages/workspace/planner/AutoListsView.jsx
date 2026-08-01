import * as React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2 } from "lucide-react";
import autoListService from "../../../services/auto-list.service";
import { useBrand } from "../../../context/BrandContext";
import { toast } from "sonner";

import { useConfirm } from "@/hooks/useConfirm";
import { useTranslation } from "react-i18next";
 
// Import Refactored Subcomponents
import { AutoListCard } from "./components/autolist/AutoListCard";
import { AutoListEmptyState } from "./components/autolist/AutoListEmptyState";
import { AutoListHelpCard } from "./components/autolist/AutoListHelpCard";

export function AutoListsView() {
  const { t } = useTranslation("planner");
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const { activeBrand } = useBrand();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const fetchLists = async () => {
    if (!activeBrand) return;
    setLoading(true);
    try {
      const listsData = await autoListService.getAutoLists(activeBrand.id);
      setLists(listsData || []);
    } catch (e) {
      toast.error(t("autolists.toasts.loadFail"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, [activeBrand]);

  const handleToggle = async (id) => {
    try {
      await autoListService.toggleStatus(id);
      toast.success(t("autolists.toasts.toggleSuccess"));
      fetchLists();
    } catch (e) {
      toast.error(t("autolists.toasts.toggleFail"));
    }
  };

  const handleRefreshQueue = async (id) => {
    try {
      // In a real application, you'd trigger a recalculation endpoint
      // We will refresh the list details here to reflect updates
      toast.success(t("autolists.toasts.refreshSuccess"));
      fetchLists();
    } catch (e) {
      toast.error(t("autolists.toasts.refreshFail"));
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: t("autolists.confirm.deleteTitle"),
      description: t("autolists.confirm.deleteDesc"),
      confirmText: t("autolists.confirm.deleteConfirm"),
      cancelText: t("autolists.confirm.deleteCancel"),
      variant: "destructive"
    });
    if (!isConfirmed) return;
    try {
      await autoListService.deleteAutoList(id);
      toast.success(t("autolists.toasts.deleteSuccess"));
      fetchLists();
    } catch (e) {
      toast.error(t("autolists.toasts.deleteFail"));
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto animate-in fade-in duration-300">
      {/* View Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1 text-left">
          <h2 className="text-xl font-bold text-foreground tracking-tight">{t("autolists.title")}</h2>
          <p className="text-xs text-muted-foreground font-medium">{t("autolists.subtitle")}</p>
        </div>
        <button 
          onClick={() => navigate("/planner/autolist/new")}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0A0A0A] dark:bg-lime-400 text-white dark:text-black rounded-xl text-[12px] font-bold hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
        >
          <Plus size={16} /> {t("autolists.createBtn")}
        </button>
      </div>

      {/* Main List Container */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 animate-pulse">
           {[1, 2].map((n) => (
             <div key={n} className="bg-card border border-border rounded-3xl p-6 shadow-sm h-32 space-y-4">
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-muted" />
                      <div className="space-y-2">
                         <div className="w-24 h-4 bg-muted rounded" />
                         <div className="w-32 h-2.5 bg-muted rounded" />
                      </div>
                   </div>
                   <div className="w-12 h-6 bg-muted rounded-full" />
                </div>
                <div className="flex gap-4">
                   <div className="w-20 h-4 bg-muted rounded" />
                   <div className="w-24 h-4 bg-muted rounded" />
                </div>
             </div>
           ))}
        </div>
      ) : lists.length === 0 ? (
        <AutoListEmptyState onCreateClick={() => navigate("/planner/autolist/new")} />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {lists.map((list) => (
            <AutoListCard 
              key={list.id} 
              list={list} 
              onToggle={handleToggle}
              onRefresh={handleRefreshQueue}
              onDelete={handleDelete}
              onNavigate={(id) => navigate(`/planner/autolist/${id}`)}
            />
          ))}
        </div>
      )}

      {/* Helper Card */}
      <AutoListHelpCard />
    </div>
  );
}
