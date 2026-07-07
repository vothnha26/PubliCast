import * as React from "react";
import { Outlet, NavLink } from "react-router-dom";
import { Clock, ChevronDown } from "lucide-react";

export function PlannerLayout() {
  const tabs = [
    { id: "calendar", label: "Calendar", path: "calendar" },
    { id: "list", label: "List", path: "list" },
    { id: "library", label: "Posts library", path: "library", premium: true },
    { id: "autolists", label: "Autolists", path: "autolists" },
    { id: "history", label: "Deleted posts", path: "history" },
  ];

  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000); // Update every second for better responsiveness or 60000 for every minute. Let's do 1000.
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F8F8F7]">
      {/* Top Tabs Header */}
      <div className="bg-white border-b border-gray-100 px-6 flex items-center justify-between" style={{ height: 48 }}>
        <div className="flex gap-8 h-full">
          {tabs.map((tab) => (
            <NavLink
              key={tab.id}
              to={tab.path}
              className={({ isActive }) => 
                `h-full flex items-center text-[13px] font-medium transition-all relative px-1 ${
                  isActive ? "text-[#0A0A0A]" : "text-gray-400 hover:text-gray-600"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-1.5 font-bold">
                    {tab.label}
                    {tab.premium && <div className="w-3.5 h-3.5 bg-[#D9F99D] rounded-full flex items-center justify-center text-[8px] text-black">💎</div>}
                  </div>
                  {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2 text-gray-400">
           <Clock size={14} />
           <span className="text-[11px] font-bold text-gray-500 tracking-tight">{formattedTime} - {timezone}</span>
           <ChevronDown size={14} className="cursor-pointer" />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}

