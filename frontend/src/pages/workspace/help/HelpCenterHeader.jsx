import { Link } from "react-router-dom";
import { LifeBuoy, LayoutDashboard, LogIn } from "lucide-react";
import { useAuthStore } from "../../../store/useAuthStore";

// Standalone header for the public Help Center pages (/help, /help/:slug) —
// deliberately not the app's Topbar, since these pages must render for
// anonymous visitors and the Topbar depends on BrandContext (auth-only APIs).
export function HelpCenterHeader() {
  const { isAuthenticated } = useAuthStore();

  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/help" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 rounded-lg bg-lime-100 flex items-center justify-center">
            <LifeBuoy size={16} className="text-lime-700" />
          </div>
          <span className="text-sm font-bold text-foreground">PubliCast Help</span>
        </Link>
        {isAuthenticated ? (
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-border hover:bg-muted transition-colors no-underline text-foreground"
          >
            <LayoutDashboard size={13} /> Vào Dashboard
          </Link>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0A0A0A] text-white no-underline"
          >
            <LogIn size={13} /> Đăng nhập
          </Link>
        )}
      </div>
    </header>
  );
}
