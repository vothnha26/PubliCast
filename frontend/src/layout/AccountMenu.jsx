import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, CreditCard, HelpCircle, LogOut, Sparkles, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useBrand } from "../context/BrandContext";
import { useConnections } from "../context/ConnectionsContext";
import billingService from "../services/billing.service";

export function AccountMenu() {
  const { t } = useTranslation("topbar");
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { activeBrand } = useBrand();
  const { openConnections } = useConnections();
  const [open, setOpen] = useState(false);
  const [planName, setPlanName] = useState("FREE");
  const ref = useRef(null);

  useEffect(() => {
    if (!activeBrand) return;
    billingService.getCurrentSubscription(activeBrand.id)
      .then((res) => setPlanName(res?.planName || "FREE"))
      .catch(() => setPlanName("FREE"));
  }, [activeBrand]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const initial = (user?.email || "?").charAt(0).toUpperCase();

  const items = [
    { icon: <Settings size={16} />, label: t("accountMenu.settings"), onClick: () => navigate("/settings") },
    { icon: <Sparkles size={16} />, label: t("accountMenu.channels"), onClick: () => openConnections() },
    { icon: <CreditCard size={16} />, label: t("accountMenu.billing"), onClick: () => navigate("/pricing") },
    { icon: <HelpCircle size={16} />, label: t("accountMenu.helpSupport"), onClick: () => navigate("/help") },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 p-1 rounded-lg hover:bg-[var(--muted)] transition-colors cursor-pointer"
      >
        <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
          {initial}
        </div>
        <ChevronDown size={14} className="text-[var(--muted-foreground)] hidden md:block" />
      </button>

      {open && (
        <div
          className="absolute top-11 right-0 bg-[var(--card)] text-[var(--foreground)] rounded-xl shadow-xl p-2 z-50 w-[240px]"
          style={{ border: "1px solid var(--sidebar-border)" }}
        >
          <div className="px-3 py-2">
            <div className="text-xs text-[var(--muted-foreground)] truncate">{user?.email}</div>
            <div className="text-sm font-bold truncate mt-0.5">{activeBrand?.name || t("brand.select")}</div>
            <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
              {t("accountMenu.planLabel", { name: planName })}
            </div>
          </div>

          <button
            onClick={() => { navigate("/pricing"); setOpen(false); }}
            className="w-full flex items-center justify-center gap-2 my-2 px-3 py-2 rounded-lg font-bold text-white"
            style={{ background: "linear-gradient(90deg, #F97316, #EAB308)", fontSize: 12 }}
          >
            <Sparkles size={13} />
            {t("accountMenu.upgradePlan")}
          </button>

          <div className="h-px bg-[var(--sidebar-border)] my-1" />

          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => { item.onClick(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm hover:bg-[var(--muted)] transition-colors"
            >
              <span className="text-[var(--muted-foreground)]">{item.icon}</span>
              {item.label}
            </button>
          ))}

          <div className="h-px bg-[var(--sidebar-border)] my-1" />

          <button
            onClick={async () => { await logout(); navigate("/login"); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={16} />
            {t("accountMenu.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
