import { Link, useLocation } from "react-router-dom";
import {
  TrendingUp, Hash, Settings,
  FileText, ClipboardCheck,
  Sun, Moon
} from "lucide-react";
import { useBrand } from "../context/BrandContext";
import { ChannelsList } from "./ChannelsList";
import { useState, useEffect } from "react";
import billingService from "../services/billing.service";
import { useTheme } from "../context/ThemeContext";
import { THEME_MODES } from "../constants/theme";
import { useTranslation } from "react-i18next";

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
      style={{ width: 220, background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)", overflowX: "hidden" }}
      className="flex flex-col h-full shrink-0 transition-colors duration-200"
    >
      {isManageMode ? (
        <div className="flex-1 py-6 px-3 overflow-y-auto scrollbar-none">
          {/* Section Label */}
          <div className="px-3 mb-4 flex items-center justify-between">
            <span style={{ fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "1px" }}>
              {t("sidebar.management")}
            </span>
          </div>

          <nav className="flex flex-col gap-1">
            {MANAGE_ITEMS.map((item) => {
              const isActive = item.path && currentPath === item.path.split('?')[0];
              const itemLabel = item.nameKey ? t(item.nameKey) : item.name;

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all no-underline group hover:bg-[var(--sidebar-accent)]"
                  style={{
                    backgroundColor: isActive ? "var(--sidebar-accent)" : "transparent",
                  }}
                >
                  <div
                    className={`shrink-0 transition-colors ${isActive ? "" : "text-gray-400 group-hover:text-[var(--sidebar-foreground)]"}`}
                    style={{ color: isActive ? "var(--sidebar-foreground)" : undefined }}
                  >
                    {item.icon}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "var(--sidebar-foreground)" : "var(--muted-foreground)"
                    }}
                    className="transition-colors group-hover:text-[var(--sidebar-foreground)]"
                  >
                    {itemLabel}
                  </span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--sidebar-foreground)]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : (
        <>
          {/* Channels region — scrolls independently */}
          <div className="flex-1 min-h-0 py-6 px-3 overflow-y-auto scrollbar-none">
            <ChannelsList />
          </div>

          {/* Tools region — separate scroll container, never shares Channels' scrollbar */}
          <div className="shrink-0 max-h-[35vh] overflow-y-auto scrollbar-none px-3 pb-4 border-t border-[var(--sidebar-border)]">
            <div className="space-y-1 pt-4">
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
          </div>
        </>
      )}

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
