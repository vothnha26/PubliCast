import * as React from "react";
import { Outlet, NavLink } from "react-router-dom";
import { Clock, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

export function PlannerLayout() {
  const { t } = useTranslation("planner");

  const tabs = [
    { id: "calendar", label: t("tabs.calendar", { defaultValue: "Calendar" }), path: "calendar" },
    { id: "list", label: t("tabs.list", { defaultValue: "List" }), path: "list" },
    { id: "library", label: t("tabs.library", { defaultValue: "Posts library" }), path: "library", premium: true },
    { id: "autolists", label: t("tabs.autolists", { defaultValue: "Autolists" }), path: "autolists" },
    { id: "history", label: t("tabs.history", { defaultValue: "Deleted posts" }), path: "history" },
  ];

  const defaultSystemTz = React.useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Bangkok";
    } catch (_) {
      return "Asia/Bangkok";
    }
  }, []);

  const [selectedTimezone, setSelectedTimezone] = React.useState(() => {
    return localStorage.getItem("publicast_planner_tz") || defaultSystemTz;
  });

  const [isTzOpen, setIsTzOpen] = React.useState(false);
  const tzRef = React.useRef(null);

  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (tzRef.current && !tzRef.current.contains(event.target)) {
        setIsTzOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectTz = (tz) => {
    setSelectedTimezone(tz);
    localStorage.setItem("publicast_planner_tz", tz);
    setIsTzOpen(false);
  };

  const TIMEZONES = [
    { value: defaultSystemTz, label: `${defaultSystemTz} (System Default)` },
    { value: "Asia/Bangkok", label: "Asia/Bangkok (GMT+7)" },
    { value: "Asia/Ho_Chi_Minh", label: "Asia/Ho_Chi_Minh (GMT+7)" },
    { value: "Asia/Singapore", label: "Asia/Singapore (GMT+8)" },
    { value: "Asia/Tokyo", label: "Asia/Tokyo (GMT+9)" },
    { value: "Europe/London", label: "Europe/London (GMT+0)" },
    { value: "Europe/Paris", label: "Europe/Paris (GMT+1)" },
    { value: "America/New_York", label: "America/New_York (GMT-5)" },
    { value: "America/Los_Angeles", label: "America/Los_Angeles (GMT-8)" },
    { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  ];

  // Deduplicate timezone choices
  const uniqueTimezones = React.useMemo(() => {
    const seen = new Set();
    return TIMEZONES.filter(item => {
      if (seen.has(item.value)) return false;
      seen.add(item.value);
      return true;
    });
  }, [defaultSystemTz]);

  const formattedTime = React.useMemo(() => {
    try {
      return time.toLocaleTimeString("en-US", {
        timeZone: selectedTimezone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (_) {
      return time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    }
  }, [time, selectedTimezone]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F8F8F7] dark:bg-zinc-950">
      {/* Top Tabs Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 px-6 flex items-center justify-between" style={{ height: 48 }}>
        <div className="flex gap-8 h-full">
          {tabs.map((tab) => (
            <NavLink
              key={tab.id}
              to={tab.path}
              className={({ isActive }) => 
                `h-full flex items-center text-[13px] font-medium transition-all relative px-1 ${
                  isActive ? "text-[#0A0A0A] dark:text-white" : "text-gray-400 dark:text-zinc-400 hover:text-gray-600 dark:hover:text-zinc-200"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-1.5 font-bold">
                    {tab.label}
                    {tab.premium && <div className="w-3.5 h-3.5 bg-[#D9F99D] rounded-full flex items-center justify-center text-[8px] text-black">💎</div>}
                  </div>
                  {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white" />}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Timezone Selector Dropdown */}
        <div className="relative" ref={tzRef}>
          <button
            onClick={() => setIsTzOpen(!isTzOpen)}
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-zinc-700 cursor-pointer"
            title="Đổi múi giờ xem lịch / Change Timezone"
          >
            <Clock size={14} className="text-gray-400 dark:text-zinc-500" />
            <span className="text-[11px] font-bold tracking-tight">{formattedTime} - {selectedTimezone}</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${isTzOpen ? "rotate-180" : ""}`} />
          </button>

          {isTzOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-800 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider border-b border-gray-100 dark:border-zinc-800">
                Chọn múi giờ / Select Timezone
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {uniqueTimezones.map((tz) => {
                  const isSelected = selectedTimezone === tz.value;
                  return (
                    <button
                      key={tz.value}
                      onClick={() => handleSelectTz(tz.value)}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${
                        isSelected ? "font-bold text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/30" : "text-gray-700 dark:text-zinc-300"
                      }`}
                    >
                      <span className="truncate">{tz.label}</span>
                      {isSelected && <span className="text-purple-600 dark:text-purple-400 text-xs font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}

