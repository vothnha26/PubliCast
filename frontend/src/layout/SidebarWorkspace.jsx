import { Link, useLocation } from "react-router-dom";
import {
  Youtube, Instagram, Facebook,
  TrendingUp, List, Hash, Settings, Search,
  PlayCircle, FileText, Megaphone, Plus, ClipboardCheck,
  Sun, Moon
} from "lucide-react";
import { useConnections } from "../context/ConnectionsContext";
import { useBrand } from "../context/BrandContext";
import { PlatformIcon } from "../components/shared/PlatformIcon";
import { useState, useEffect } from "react";
import billingService from "../services/billing.service";
import { useTheme } from "../context/ThemeContext";
import { THEME_MODES } from "../constants/theme";
import { useTranslation } from "react-i18next";

const PLATFORMS = [
  { name: "Summary", nameKey: "sidebar.summary", icon: <List size={18} />, path: "/dashboard", color: "#6B7280" },
  { name: "YouTube", icon: <Youtube size={18} />, path: "/dashboard/youtube", color: "#FF0000", brand: "T" },
  { name: "Facebook", icon: <Facebook size={18} />, path: "/dashboard/facebook", color: "#1877F2", brand: "T" },
  { name: "Instagram", icon: <Instagram size={18} />, path: "/dashboard/instagram", color: "#E1306C", brand: "T" },
  { name: "TikTok", icon: <PlayCircle size={18} />, path: "/dashboard/tiktok", color: "#000000", brand: "T" },
  { name: "Threads", icon: <PlatformIcon platform="Threads" size={18} variant="flat" />, path: "/dashboard/threads", color: "#000000", brand: "T" },
  { name: "Bluesky", icon: <PlatformIcon platform="Bluesky" size={18} variant="flat" />, path: "/dashboard/bluesky", color: "#0085FF", brand: "T" },
  { name: "More connection", nameKey: "sidebar.moreConnection", icon: <Plus size={18} />, isAction: true, color: "#3B82F6" },
];

const MANAGE_ITEMS = [
  { name: "Brand settings", nameKey: "menu.brandSettings", icon: <Settings size={18} />, path: "/manage/connections?tab=brand-settings" },
  { name: "Approval Tasks", nameKey: "sidebar.approvalTasks", icon: <ClipboardCheck size={18} />, path: "/manage/tasks" },
  { name: "Hashtag Tracker", nameKey: "sidebar.hashtagTracker", icon: <Hash size={18} />, path: "/hashtags" },
  { name: "Reporting", nameKey: "sidebar.reporting", icon: <FileText size={18} />, path: "/manage/reports" },
  { name: "Competitors", nameKey: "sidebar.competitors", icon: <TrendingUp size={18} />, path: "/manage/competitors" },
];

export function SidebarWorkspace() {
  const { t } = useTranslation("topbar");
  const location = useLocation();
  const currentPath = location.pathname;
  const { openConnections } = useConnections();
  const { activeBrand } = useBrand();
  const { theme, setTheme } = useTheme();
  
  const [planInfo, setPlanInfo] = useState(null);

  useEffect(() => {
    if (!activeBrand) return;
    billingService.getCurrentSubscription(activeBrand.id)
      .then(res => {
        setPlanInfo(res);
      })
      .catch(err => {
        console.error("Failed to fetch current plan info in sidebar:", err);
      });
  }, [activeBrand]);

  const isManageMode = currentPath.startsWith("/manage") || currentPath.startsWith("/hashtags") || currentPath.startsWith("/settings");

  const planName = planInfo?.planName || "FREE";
  const isPremium = planName.toUpperCase() !== "FREE";
  const nextBillDate = planInfo?.periodEnd 
    ? new Date(planInfo.periodEnd).toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' })
    : t("sidebar.unlimited");

  return (
    <aside
      style={{ width: 220, background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}
      className="flex flex-col h-full shrink-0 transition-colors duration-200"
    >
      <div className="flex-1 py-6 px-3 overflow-y-auto scrollbar-none">
        {/* Section Label */}
        <div className="px-3 mb-4 flex items-center justify-between">
           <span style={{ fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "1px" }}>
              {isManageMode ? t("sidebar.management") : t("sidebar.analytics")}
           </span>
        </div>

        <nav className="flex flex-col gap-1">
          {(isManageMode ? MANAGE_ITEMS : PLATFORMS).map((item) => {
            const isActive = item.path && currentPath === item.path.split('?')[0];
            const itemLabel = item.nameKey ? t(item.nameKey) : item.name;
            
            const content = (
              <>
                <div 
                  className={`shrink-0 transition-colors ${isActive ? "" : "text-gray-400 group-hover:text-[var(--sidebar-foreground)]"}`}
                  style={{ color: (isActive || item.isAction) ? (item.color || "var(--sidebar-foreground)") : undefined }}
                >
                  {item.icon}
                </div>
                <span 
                  style={{ 
                    fontSize: 13, 
                    fontWeight: (isActive || item.isAction) ? 600 : 400,
                    color: (isActive || item.isAction) ? (item.isAction ? item.color : "var(--sidebar-foreground)") : "var(--muted-foreground)"
                  }}
                  className="transition-colors group-hover:text-[var(--sidebar-foreground)]"
                >
                  {itemLabel}
                </span>
                {isActive && !item.isAction && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--sidebar-foreground)]" />
                )}
              </>
            );

            if (item.isAction) {
              return (
                <button
                  key={item.name}
                  onClick={openConnections}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all no-underline group hover:bg-[var(--sidebar-accent)]"
                  style={{ background: "transparent", border: "none", cursor: "pointer" }}
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.path}
                className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all no-underline group hover:bg-[var(--sidebar-accent)]"
                style={{
                  backgroundColor: isActive ? "var(--sidebar-accent)" : "transparent",
                }}
              >
                {content}
              </Link>
            );
          })}
        </nav>

        {!isManageMode && (
          <div className="mt-8 space-y-1">
            <div className="px-3 mb-4">
              <span style={{ fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "1px" }}>
                {t("sidebar.tools")}
              </span>
            </div>
            <Link
              to="/planner"
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all no-underline hover:bg-[var(--sidebar-accent)]"
              style={{
                backgroundColor: currentPath.startsWith("/planner") ? "var(--sidebar-accent)" : "transparent",
                color: currentPath.startsWith("/planner") ? "var(--sidebar-foreground)" : "var(--muted-foreground)"
              }}
            >
              <FileText size={18} style={{ color: currentPath.startsWith("/planner") ? "var(--sidebar-foreground)" : undefined }} />
              <span style={{ fontSize: 13, fontWeight: currentPath.startsWith("/planner") ? 600 : 400 }}>{t("sidebar.contentPlanner")}</span>
              {currentPath.startsWith("/planner") && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--sidebar-foreground)]" />
              )}
            </Link>
            <Link
              to="/manage/tasks"
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all no-underline hover:bg-[var(--sidebar-accent)]"
              style={{
                backgroundColor: currentPath.startsWith("/manage/tasks") ? "var(--sidebar-accent)" : "transparent",
                color: currentPath.startsWith("/manage/tasks") ? "var(--sidebar-foreground)" : "var(--muted-foreground)"
              }}
            >
              <ClipboardCheck size={18} style={{ color: currentPath.startsWith("/manage/tasks") ? "var(--sidebar-foreground)" : undefined }} />
              <span style={{ fontSize: 13, fontWeight: currentPath.startsWith("/manage/tasks") ? 600 : 400 }}>{t("sidebar.approvalRequests")}</span>
              {currentPath.startsWith("/manage/tasks") && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--sidebar-foreground)]" />
              )}
            </Link>
          </div>
        )}
      </div>

      {/* Footer Info & Theme Switcher */}
      <div className="p-4 border-t border-[var(--sidebar-border)] text-left bg-[var(--sidebar)] transition-colors duration-200 flex flex-col gap-4">
         <div className="bg-[var(--sidebar-accent)] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
               <div className={`w-2 h-2 rounded-full ${isPremium ? "bg-green-500" : "bg-gray-400"}`} />
               <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">
                 {t("sidebar.planLabel", { name: planName })}
               </span>
            </div>
            <div className="text-[10px] text-[var(--muted-foreground)] opacity-85 font-medium">
              {isPremium 
                ? t("sidebar.nextBilling", { date: nextBillDate }) 
                : t("sidebar.noLimit")
              }
            </div>
         </div>

         {/* Theme Switcher — Light / Dark only */}
         <div className="flex items-center justify-between p-1 bg-[var(--muted)] rounded-lg transition-all duration-200">
           {[
             { mode: THEME_MODES.LIGHT, icon: <Sun size={14} />, label: "Light" },
             { mode: THEME_MODES.DARK, icon: <Moon size={14} />, label: "Dark" },
           ].map(({ mode, icon, label }) => {
             const isSelected = theme === mode;
             return (
               <button
                 key={mode}
                 onClick={() => setTheme(mode)}
                 className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all border-none cursor-pointer group/btn select-none ${
                   isSelected
                     ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm font-semibold"
                     : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-transparent"
                 }`}
                 title={`${label} Mode`}
                 style={{ fontSize: 11 }}
               >
                 <span className="transition-transform duration-200 group-hover/btn:scale-110">
                   {icon}
                 </span>
                 <span>{label}</span>
               </button>
             );
           })}
         </div>
      </div>
    </aside>
  );
}
