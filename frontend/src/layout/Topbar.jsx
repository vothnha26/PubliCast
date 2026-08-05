import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  BarChart2, MessageSquare, Calendar, Link2, Image, Zap, Sparkles, X,
  ChevronDown, Settings, Bell, Search, Check, Star
} from "lucide-react";
import { useBrand } from "../context/BrandContext";
import { useDebounce } from "../hooks/useDebounce";
import notificationService from "../services/notification.service";
import { apiV2 } from "../services/api";
import { openNotificationStream } from "../utils/notification-stream";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import { AccountMenu } from "./AccountMenu";

export function Topbar() {
  const { t } = useTranslation("topbar");
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [brandOpen, setBrandOpen] = useState(false);
  const { brands, activeBrand, selectBrand, deselectBrand, defaultBrandId, setDefaultBrand } = useBrand();

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const quickLinks = [
    { name: t("quickLinks.dashboardName"), description: t("quickLinks.dashboardDesc"), path: "/dashboard" },
    { name: t("quickLinks.plannerName"), description: t("quickLinks.plannerDesc"), path: "/planner" },
    { name: t("quickLinks.aiName"), description: t("quickLinks.aiDesc"), path: "/ai" },
    { name: t("quickLinks.settingsName"), description: t("quickLinks.settingsDesc"), path: "/settings" }
  ];

  const displayedItems = searchQuery.trim() === "" ? quickLinks : searchResults;

  useEffect(() => {
    if (debouncedSearch.trim() === "") {
      setSearchResults([]);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const response = await apiV2.get(`/search?q=${encodeURIComponent(debouncedSearch)}`);
        setSearchResults(response || []);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedSearch]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSearchIndex(prev => Math.min(prev + 1, displayedItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSearchIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedSearchIndex >= 0 && selectedSearchIndex < displayedItems.length) {
        const selectedItem = displayedItems[selectedSearchIndex];
        navigate(selectedItem.path);
        setIsSearchFocused(false);
        setSearchQuery("");
      }
    } else if (e.key === "Escape") {
      setIsSearchFocused(false);
    }
  };

  const currentPath = location.pathname;
  const isSuperadmin = currentPath.startsWith("/admin");

  useEffect(() => {
    if (isSuperadmin) return;

    const fetchUnreadNotifications = async () => {
      try {
        const response = await notificationService.getUnread(1);
        setUnreadNotifications(response?.meta?.total || 0);
      } catch (error) {
        setUnreadNotifications(0);
      }
    };

    fetchUnreadNotifications();

    let stream;
    try {
      stream = openNotificationStream();
      stream.addEventListener("notification.created", fetchUnreadNotifications);
      stream.addEventListener("notification.read", fetchUnreadNotifications);
      stream.addEventListener("notifications.read_all", fetchUnreadNotifications);
      stream.onerror = () => {
        console.error("Notification stream disconnected");
      };
    } catch (error) {
      console.error("Notification stream error:", error);
    }

    window.addEventListener("notifications:changed", fetchUnreadNotifications);
    return () => {
      stream?.close();
      window.removeEventListener("notifications:changed", fetchUnreadNotifications);
    };
  }, [isSuperadmin, currentPath]);

  return (
    <>
      <header
        className="flex items-center px-4 shrink-0 z-40 border-b border-[var(--sidebar-border)] transition-colors duration-200"
        style={{
          height: 56,
          background: "var(--sidebar)", 
          color: "var(--foreground)",
          gap: 16 }}
      >
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-2 no-underline shrink-0 mr-4">
          <div className="w-8 h-8 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--foreground)]"><path d="M7 11V7a5 5 0 0 1 10 0v4"/><path d="M11 11h2"/><rect width="18" height="11" x="3" y="11" rx="2"/></svg>
          </div>
        </Link>

        {/* Center-Left: Search Bar (Workspace & Manage only) */}
        {!isSuperadmin && (
          <div className="hidden md:flex relative max-w-xs flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input 
              placeholder={t("searchPlaceholder")} 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedSearchIndex(-1); // Reset selected keyboard index
              }}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              onKeyDown={handleKeyDown}
              className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-[var(--muted)] border-none text-xs text-[var(--foreground)] outline-none focus:bg-[var(--accent)] transition-all placeholder:text-[var(--muted-foreground)]"
            />
            {/* Search Dropdown */}
            {isSearchFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--card)] text-[var(--foreground)] rounded-xl shadow-2xl border border-[var(--sidebar-border)] overflow-hidden z-[100] max-h-[350px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider bg-[var(--sidebar-accent)] border-b border-[var(--sidebar-border)] flex justify-between items-center">
                  <span>{searchQuery.trim() === "" ? "Quick Links" : `Search Results (${displayedItems.length})`}</span>
                  {isLoading && <span className="text-[10px] text-purple-600 normal-case font-normal animate-pulse">Searching...</span>}
                </div>
                {displayedItems.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[var(--muted-foreground)]">
                    {isLoading ? "Searching database..." : `No results found for "${searchQuery}"`}
                  </div>
                ) : (
                  displayedItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        navigate(item.path);
                        setIsSearchFocused(false);
                        setSearchQuery("");
                      }}
                      onMouseEnter={() => setSelectedSearchIndex(index)}
                      className={`w-full flex items-center justify-between text-left px-4 py-2.5 transition-colors border-none ${
                        index === selectedSearchIndex ? "bg-purple-500/10 text-purple-700 dark:text-purple-300" : "bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]"
                      }`}
                    >
                      <div className="flex flex-col items-start min-w-0 flex-1">
                        <span className="text-xs font-semibold truncate w-full">{item.name}</span>
                        <span className="text-[10px] text-[var(--muted-foreground)] line-clamp-1 truncate w-full">{item.description}</span>
                      </div>
                      {item.type && (
                        <span className="shrink-0 ml-2 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                          {item.type}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Center: Main Tools / Superadmin Title */}
        <div className="flex-1 flex items-center justify-center gap-1">
          {isSuperadmin ? (
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 13, fontWeight: 700, color: "#EF4444", textTransform: "uppercase", letterSpacing: "1.5px" }}>
                  Superadmin Terminal
              </span>
            </div>
          ) : (
            [
              { icon: <BarChart2 size={18} />, path: "/dashboard", label: t("nav.dashboard") },
              { icon: <Image size={18} />, path: "/media-library", label: t("nav.mediaLibrary") },
              { icon: <MessageSquare size={18} />, path: "/manage/inbox", label: t("nav.inbox") },
              { icon: <Calendar size={18} />, path: "/planner", label: t("nav.planner") },
              { icon: <Link2 size={18} />, path: "/smartlinks", label: t("nav.smartlinks") },
              { icon: <Zap size={18} />, path: "/ai", label: t("nav.ai") },
            ].map((tool, i) => {
              const isActive = currentPath === tool.path;
              return (
                <button
                  key={i}
                  onClick={() => navigate(tool.path)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[var(--muted)] transition-colors relative"
                  style={{ color: "var(--foreground)", backgroundColor: isActive ? "var(--muted)" : "transparent" }}
                  title={tool.label}
                >
                  <div className="p-1 rounded-lg">{tool.icon}</div>
                  {tool.isNew && (
                    <span className="absolute -top-1 -right-1 bg-[#86EFAC] text-[#064E3B] text-[8px] font-bold px-1 rounded-full uppercase">New</span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Right: Actions & Brand */}
        <div className="flex items-center gap-3">
          {/* Global Language Switcher */}
          {!isSuperadmin && (
            <button
              onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
              className="px-2 py-1 rounded-lg bg-[var(--muted)] hover:bg-gray-200/80 dark:hover:bg-gray-800 text-[10px] font-extrabold text-[var(--foreground)] border border-[var(--sidebar-border)] transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
              title="Đổi ngôn ngữ ứng dụng / Switch App Language"
            >
              <span>{language === "vi" ? "🇻🇳 VI" : "🇬🇧 EN"}</span>
            </button>
          )}

          {/* Notification Bell (Workspace only) */}
          {!isSuperadmin && (
            <button 
              onClick={() => navigate("/notifications")}
              className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors relative text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              title={t("menu.notifications")}
            >
              <Bell size={18} />
              {unreadNotifications > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 rounded-full border-2 border-[var(--sidebar)] text-[8px] font-bold text-white flex items-center justify-center"
                >
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>
          )}

          {/* Upgrade Button (Workspace only) */}
          {!isSuperadmin && (
            <button
              onClick={() => navigate("/pricing")}
              className="hidden lg:flex items-center gap-2 px-4 py-1.5 rounded-full font-bold transition-all"
              style={{
                background: "linear-gradient(90deg, #F97316, #EAB308)",
                color: "#FFF",
                fontSize: 11 }}
            >
              <Sparkles size={13} />
              {t("upgrade")}
            </button>
          )}

          {/* Brand Switcher (Workspace & Manage only) */}
          {!isSuperadmin && (
            <div className="relative">
              <button
                onClick={() => setBrandOpen(!brandOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors cursor-pointer text-[var(--foreground)]"
              >
                <div className="w-7 h-7 rounded-lg bg-[#E1306C] flex items-center justify-center text-xs font-bold shadow-sm uppercase text-white">
                  {activeBrand ? activeBrand.name.charAt(0) : "B"}
                </div>
                <div className="hidden md:flex flex-col items-start text-left min-w-[80px]">
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{activeBrand ? activeBrand.name : t("brand.select")}</span>
                  <span style={{ fontSize: 9, color: "var(--muted-foreground)" }}>
                    {currentPath.startsWith("/manage") ? t("managerMode") : t("workMode")}
                  </span>
                </div>
                <ChevronDown size={14} className="text-[var(--muted-foreground)]" />
              </button>
              
              {brandOpen && (
                <div className="absolute top-12 right-0 bg-[var(--card)] text-[var(--foreground)] rounded-xl shadow-xl p-2 z-50 min-w-[200px]" style={{ border: "1px solid var(--sidebar-border)" }}>
                  <div className="px-3 py-2 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">{t("yourWorkplaces")}</div>
                  {brands.map(b => (
                    <div
                      key={b.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all group ${
                        activeBrand?.id === b.id ? 'bg-purple-500/10' : 'hover:bg-[var(--muted)]'
                      }`}
                    >
                      <button 
                        onClick={() => { selectBrand(b.id); setBrandOpen(false); }} 
                        className={`flex-1 text-left text-sm font-medium flex items-center gap-2 ${
                          activeBrand?.id === b.id ? 'text-purple-700 dark:text-purple-300 font-bold' : 'text-[var(--foreground)]'
                        }`}
                      >
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-[9px] font-bold text-white uppercase shrink-0">
                          {b.name.charAt(0)}
                        </div>
                        <span className="truncate max-w-[110px]">{b.name}</span>
                        {activeBrand?.id === b.id && <Check size={12} className="shrink-0" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (defaultBrandId === b.id) {
                            // Already default
                          } else {
                            setDefaultBrand(b.id);
                          }
                        }}
                        title={defaultBrandId === b.id ? t("brand.defaultActive") : t("brand.setDefault")}
                        className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <Star
                          size={13}
                          className={defaultBrandId === b.id
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-[var(--muted-foreground)] hover:text-amber-400'
                          }
                        />
                      </button>
                    </div>
                  ))}
                  {activeBrand && (
                    <button 
                      onClick={() => { deselectBrand(); setBrandOpen(false); }} 
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-sm font-medium text-red-600 flex items-center justify-between mt-1"
                    >
                      <span>{t("brand.deselect")}</span>
                      <X size={12} />
                    </button>
                  )}
                  <div className="h-px bg-[var(--sidebar-border)] my-1" />
                  <button 
                    onClick={() => { navigate("/manage/connections?tab=brand-settings"); setBrandOpen(false); }} 
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--muted)] text-sm font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1"
                  >
                    <Settings size={12} /> {t("brand.manage")}
                  </button>
                  <button 
                    onClick={() => { navigate(currentPath.startsWith("/manage") ? "/dashboard" : "/manage/team"); setBrandOpen(false); }} 
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--muted)] text-sm font-bold text-blue-600 dark:text-blue-400"
                  >
                    {currentPath.startsWith("/manage") ? t("brand.backWorkspace") : t("brand.switchToManager")}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Account Menu (Workspace & Manage only) */}
          {!isSuperadmin && <AccountMenu />}

        </div>
      </header>
    </>
  );
}
