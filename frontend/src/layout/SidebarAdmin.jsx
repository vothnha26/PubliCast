import { Link, useLocation } from "react-router-dom";
import { DollarSign, Shield, Settings2, Users, LayoutGrid, ChevronLeft, Crown, Layers, Server, Activity, Lock, Sparkles, BookOpen, Compass } from "lucide-react";

export function SidebarAdmin() {
  const location = useLocation();
  const currentPath = location.pathname;

  const items = [
    { icon: <Activity size={18} />, label: "Revenue Dashboard", path: "/admin/revenue" },
    { icon: <Users size={18} />, label: "User Management", path: "/admin/users" },
    { icon: <Layers size={18} />, label: "Product Matrix", path: "/admin/products" },
    { icon: <Sparkles size={18} />, label: "Featured Templates", path: "/admin/templates" },
    { icon: <Compass size={18} />, label: "Explore Feeds", path: "/admin/feeds" },
    { icon: <BookOpen size={18} />, label: "Help Articles", path: "/admin/help-articles" },
    { icon: <Settings2 size={18} />, label: "Plan Configuration", path: "/admin/pricing" },
    { icon: <Lock size={18} />, label: "Platform Lock", path: "/admin/platform-lock" },
    { icon: <Shield size={18} />, label: "System Audit Log", path: "/admin/audit" },
  ];

  return (
    <aside
      style={{ width: 260, background: "#0A0A0A", borderRight: "1px solid #1E1E1E" }}
      className="flex flex-col h-screen shrink-0 overflow-y-auto sticky top-0 z-50"
    >
      {/* Admin Header (Replaces Topbar) */}
      <div className="px-6 pt-8 pb-6 border-b border-[#1E1E1E]">
        <div className="flex items-center gap-3 mb-2">
           <div className="w-10 h-10 rounded-xl bg-[#DC2626] flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.3)]">
              <Crown size={22} color="#FFF" />
           </div>
           <div>
              <h2 className="text-sm font-black text-white tracking-widest uppercase">Superadmin</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                 <span className="text-[9px] font-bold text-gray-500 uppercase">System Online</span>
              </div>
           </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-8 flex flex-col gap-1.5">
        {items.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <Link 
              key={item.label} 
              to={item.path} 
              className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl no-underline transition-all group"
              style={{ 
                background: isActive ? "linear-gradient(90deg, #DC2626 0%, #991B1B 100%)" : "transparent",
                color: isActive ? "#FFF" : "#666",
                boxShadow: isActive ? "0 4px 12px rgba(220,38,38,0.2)" : "none"
              }}
            >
              <span className={`${isActive ? "text-white" : "group-hover:text-gray-300"} transition-colors`}>{item.icon}</span>
              <span className={`text-sm font-bold ${isActive ? "text-white" : "group-hover:text-gray-300"}`}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Exit Admin */}
      <div className="px-4 py-6 border-t border-[#1E1E1E]">
        <Link to="/dashboard" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all no-underline text-xs font-bold uppercase tracking-widest">
          <ChevronLeft size={16} /> Exit Terminal
        </Link>
        <div className="mt-4 text-center">
           <div className="text-[9px] text-gray-700 font-mono tracking-tighter">VERSION 1.0.42-STABLE / BUILD 2026-05-17</div>
        </div>
      </div>
    </aside>
  );
}
