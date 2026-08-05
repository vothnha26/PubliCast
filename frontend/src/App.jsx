import { useEffect, useState } from "react";
import { Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import { SidebarWorkspace } from "./layout/SidebarWorkspace";
import { SidebarAdmin } from "./layout/SidebarAdmin";
import { Topbar } from "./layout/Topbar";
import { HelpChatWidget } from "./components/app/HelpChatWidget";
import { PostCreatorPage } from "./pages/workspace/PostCreator";
import { ConnectionsOverlay } from "./components/shared/ConnectionsOverlay";
import { GlobalConfirmDialog } from "./components/shared/GlobalConfirmDialog";
import { SplashScreen } from "./components/shared/SplashScreen";
import { useAuthStore } from "./store/useAuthStore";
import ProtectedRoute from "./components/ProtectedRoute";
import { FeatureGate } from "./components/shared/FeatureGate";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PRODUCT_IDS } from "./constants/products";
import { CACHE_CONFIG } from "./constants/cache-config.constants";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_CONFIG.DEFAULT_STALE_TIME_MS,
      gcTime: CACHE_CONFIG.DEFAULT_GC_TIME_MS,
      refetchOnWindowFocus: false,
      retry: CACHE_CONFIG.DEFAULT_RETRY_COUNT
    }
  }
});
export { queryClient };

// Auth Pages
import { LoginPage } from "./pages/auth/Login";
import { ForgotPasswordPage } from "./pages/auth/ForgotPassword";
import { ResetPasswordPage } from "./pages/auth/ResetPassword";
import { InviteFlow } from "./pages/auth/InviteFlow";

// Workspace Pages
import { DashboardPage } from "./pages/workspace/Dashboard";
import { PlatformDashboardPage } from "./pages/workspace/PlatformDashboard";
import { ChannelDetailPage } from "./pages/workspace/ChannelDetail";
import { MediaLibraryPage } from "./pages/workspace/MediaLibrary";
import { SettingsPage } from "./pages/workspace/Settings";
import { PricingPage } from "./pages/workspace/Pricing";
import { AIAssistant } from "./pages/workspace/AIAssistant";
import { HashtagManager } from "./pages/workspace/HashtagManager";
import { Explore } from "./pages/workspace/Explore";
import { HelpCenterPage } from "./pages/workspace/HelpCenter";
import { HelpArticleDetailPage } from "./pages/workspace/HelpArticleDetail";
import { ErrorPages } from "./pages/workspace/ErrorPages";
import { NotificationsPage } from "./pages/workspace/Notifications";
import { PlannerLayout } from "./pages/workspace/planner/PlannerLayout";
import { WeeklyCalendarView } from "./pages/workspace/planner/WeeklyCalendarView";
import { ListView } from "./pages/workspace/planner/ListView";
import { HistoryView } from "./pages/workspace/planner/HistoryView";
import { PostsLibraryView } from "./pages/workspace/planner/PostsLibraryView";
import { AutoListsView } from "./pages/workspace/planner/AutoListsView";
import { AutoListEdit } from "./pages/workspace/planner/AutoListEdit";

// Manage Pages
import { InboxPage } from "./pages/manage/Inbox";
import { TeamManagementPage } from "./pages/manage/TeamManagement";
import { MyTasksPage } from "./pages/manage/MyTasks";
import { CreateWorkplacePage } from "./pages/manage/CreateWorkplace";
import { BrandSettingsPage } from "./pages/manage/BrandSettings";
import { StaffChatPage } from "./pages/manage/StaffChat";
import { CompetitorsPage } from "./pages/manage/Competitors";
import { ReportsPage } from "./pages/manage/Reports";
import { SmartLinksPage } from "./pages/manage/SmartLinks";
import { PublicSmartLinksPage } from "./pages/manage/PublicSmartLinksPage";
import { ConnectPlatformsPage } from "./pages/manage/Placeholder";

// Admin Pages
import { AdminPricing } from "./pages/admin/AdminPricing";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminProducts } from "./pages/admin/AdminProducts";
import { AdminTemplates } from "./pages/admin/AdminTemplates";
import { AdminFeeds } from "./pages/admin/AdminFeeds";
import { AdminHelpArticles } from "./pages/admin/AdminHelpArticles";
import { AuditLog } from "./pages/admin/AuditLog";
import { RevenueDashboard } from "./pages/admin/RevenueDashboard";
import { AdminPlatformLock } from "./pages/admin/AdminPlatformLock";

// Landing
import { LandingPage } from "./pages/landing/LandingPage";

import UpsellModal from "./components/billing/UpsellModal";

const CLIENT_ROLES = ["OWNER", "MANAGER", "USER", "EDITOR", "VIEWER", "ANALYST", "CONTENT_MANAGER", "CONTENT_CREATOR", "CLIENT"];
const NO_LAYOUT_PATHS = ["/", "/login", "/signup", "/register", "/register/verify-otp", "/reset-password", "/start", "/forgot-password", "/connect", "/invite", "/manage/workplace/new"];

export default function App() {
  const { isAuthenticated, loading, logout, user } = useAuthStore();
  const location = useLocation();
  const currentPath = location.pathname;
  const navigate = useNavigate();
  // Keeps the splash mounted through its own fade-out animation even after
  // `loading` (checkAuth in flight) has already flipped to false.
  const [showSplash, setShowSplash] = useState(true);

  const getRedirectPath = () => {
    if (!user) return "/dashboard";
    const role = user.role?.toUpperCase();
    if (role === 'ADMIN') return "/admin/revenue";
    if (role === 'STAFF') return "/staff/chats";
    return "/dashboard";
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPath]);

  // Auto-logout when both access token and refresh token have expired
  useEffect(() => {
    const handleSessionExpired = () => {
      logout();
      const publicPaths = ["/", "/login", "/signup", "/register", "/register/verify-otp", "/reset-password", "/forgot-password", "/invite"];
      if (!publicPaths.includes(window.location.pathname) && !window.location.pathname.startsWith("/help")) {
        navigate('/login', { replace: true });
      }
    };
    window.addEventListener('SESSION_EXPIRED', handleSessionExpired);
    return () => window.removeEventListener('SESSION_EXPIRED', handleSessionExpired);
  }, [logout, navigate]);

  if (showSplash) {
    return (
      <SplashScreen ready={!loading} onDone={() => setShowSplash(false)} />
    );
  }

  const isNoLayout = NO_LAYOUT_PATHS.includes(currentPath) || currentPath.startsWith("/s/") || currentPath.startsWith("/overlay/") || currentPath.startsWith("/help");
  const isSuperadmin = currentPath.startsWith("/admin");
  const isStaff = currentPath.startsWith("/staff");

  return (
    <QueryClientProvider client={queryClient}>
      <div className="w-full h-screen flex flex-col overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {/* Topbar ALWAYS on top across full width (except landing/login/admin/staff) */}
        {!isNoLayout && !isSuperadmin && !isStaff && <Topbar />}

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar below Topbar */}
          {!isNoLayout && !isStaff && (
            <>
              {isSuperadmin ? <SidebarAdmin /> : <SidebarWorkspace />}
            </>
          )}

          <div className="flex-1 flex flex-col overflow-hidden bg-[#F8F8F7]">
            {/* Green accent line between Topbar and Content (Metricool style) */}
            {!isNoLayout && !isSuperadmin && <div style={{ height: 2, background: "#D9F99D", width: "100%" }} />}
            
            <div className={`flex-1 ${isNoLayout ? "overflow-auto" : "flex flex-col min-h-0 overflow-hidden"}`}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={isAuthenticated ? <Navigate to={getRedirectPath()} /> : <LoginPage initialScreen="login" />} />
                <Route path="/signup" element={isAuthenticated ? <Navigate to={getRedirectPath()} /> : <LoginPage initialScreen="signup" />} />
                <Route path="/register" element={isAuthenticated ? <Navigate to={getRedirectPath()} /> : <LoginPage initialScreen="signup" />} />
                <Route path="/register/verify-otp" element={<LoginPage initialScreen="verify-otp" />} />
                <Route path="/verify-otp" element={<Navigate to="/register/verify-otp" replace />} />
                {/* Onboarding is now /manage/workplace/new, reached via a redirect
                    from the Dashboard itself. Redirect any stale bookmarks/links
                    to /start instead of a bare 404. */}
                <Route path="/start" element={<Navigate to="/dashboard" replace />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                
                {/* Protected Workspace Routes */}
                <Route path="/dashboard" element={<ProtectedRoute allowedRoles={CLIENT_ROLES}><DashboardPage /></ProtectedRoute>} />
                <Route path="/dashboard/:platform" element={<ProtectedRoute allowedRoles={CLIENT_ROLES}><PlatformDashboardPage /></ProtectedRoute>} />
                <Route path="/channels/:socialAccountId/:tab" element={<ProtectedRoute allowedRoles={CLIENT_ROLES}><ChannelDetailPage /></ProtectedRoute>} />

                <Route path="/scheduler" element={<Navigate to="/dashboard" replace />} />
                <Route path="/live" element={<Navigate to="/dashboard" replace />} />
                <Route path="/live/setup" element={<Navigate to="/dashboard" replace />} />
                <Route path="/analytics" element={<Navigate to="/media-library" replace />} />
                <Route path="/planner" element={<ProtectedRoute allowedRoles={CLIENT_ROLES}><PlannerLayout /></ProtectedRoute>}>
                  <Route index element={<Navigate to="calendar" replace />} />
                  <Route path="calendar" element={<WeeklyCalendarView />} />
                  <Route path="list" element={<ListView />} />
                  <Route path="library" element={<PostsLibraryView />} />
                  <Route path="autolists" element={<AutoListsView />} />
                  <Route path="autolist/:id" element={<AutoListEdit />} />
                  <Route path="history" element={<HistoryView />} />
                </Route>
                <Route path="/media-library" element={<ProtectedRoute allowedRoles={CLIENT_ROLES}><MediaLibraryPage /></ProtectedRoute>} />
                <Route path="/smartlinks" element={<ProtectedRoute allowedRoles={CLIENT_ROLES}><FeatureGate productId={PRODUCT_IDS.CUSTOM_LINKS}><SmartLinksPage /></FeatureGate></ProtectedRoute>} />
                <Route path="/ai" element={<ProtectedRoute allowedRoles={CLIENT_ROLES}><FeatureGate productId={PRODUCT_IDS.AI_CONTENT_ENGINE}><AIAssistant /></FeatureGate></ProtectedRoute>} />
                <Route path="/hashtags" element={<ProtectedRoute allowedRoles={CLIENT_ROLES}><HashtagManager /></ProtectedRoute>} />
                <Route path="/explore" element={<ProtectedRoute allowedRoles={CLIENT_ROLES}><Explore /></ProtectedRoute>} />
                {/* Public docs — anyone can read published Help Center articles
                    without logging in, same as any other help center. Only
                    the "Ask AI" action inside these pages requires auth. */}
                <Route path="/help" element={<HelpCenterPage />} />
                <Route path="/help/:slug" element={<HelpArticleDetailPage />} />
                <Route path="/errors" element={<ProtectedRoute allowedRoles={CLIENT_ROLES}><ErrorPages /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute allowedRoles={CLIENT_ROLES}><NotificationsPage /></ProtectedRoute>} />
                
                {/* Protected Manage Routes */}
                <Route path="/manage/inbox" element={<ProtectedRoute allowedRoles={CLIENT_ROLES}><FeatureGate productId={PRODUCT_IDS.UNIFIED_INBOX}><InboxPage /></FeatureGate></ProtectedRoute>} />
                <Route path="/manage/team" element={<ProtectedRoute allowedRoles={CLIENT_ROLES}><TeamManagementPage /></ProtectedRoute>} />
                <Route path="/manage/workplace/new" element={<ProtectedRoute allowedRoles={CLIENT_ROLES}><CreateWorkplacePage /></ProtectedRoute>} />
                <Route path="/manage/reports" element={<ProtectedRoute allowedRoles={CLIENT_ROLES}><ReportsPage /></ProtectedRoute>} />
                <Route path="/manage/tasks" element={<ProtectedRoute allowedRoles={CLIENT_ROLES}><MyTasksPage /></ProtectedRoute>} />
                <Route path="/manage/competitors" element={<ProtectedRoute allowedRoles={CLIENT_ROLES}><CompetitorsPage /></ProtectedRoute>} />
                <Route path="/manage/connections" element={<ProtectedRoute allowedRoles={CLIENT_ROLES}><BrandSettingsPage /></ProtectedRoute>} />
                
                {/* Protected Admin Routes */}
                <Route path="/admin/pricing" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminPricing /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminUsers /></ProtectedRoute>} />
                <Route path="/admin/products" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminProducts /></ProtectedRoute>} />
                <Route path="/admin/templates" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminTemplates /></ProtectedRoute>} />
                <Route path="/admin/feeds" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminFeeds /></ProtectedRoute>} />
                <Route path="/admin/help-articles" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminHelpArticles /></ProtectedRoute>} />
                <Route path="/admin/audit" element={<ProtectedRoute allowedRoles={['ADMIN']}><AuditLog /></ProtectedRoute>} />
                <Route path="/admin/revenue" element={<ProtectedRoute allowedRoles={['ADMIN']}><RevenueDashboard /></ProtectedRoute>} />
                <Route path="/admin/platform-lock" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminPlatformLock /></ProtectedRoute>} />
   
                {/* Protected Staff Routes */}
                <Route path="/staff/chats" element={<ProtectedRoute allowedRoles={['STAFF']}><StaffChatPage /></ProtectedRoute>} />
   
                {/* Protected Common App Routes */}
                <Route path="/settings" element={<ProtectedRoute allowedRoles={CLIENT_ROLES}><SettingsPage /></ProtectedRoute>} />
                <Route path="/pricing" element={<ProtectedRoute allowedRoles={CLIENT_ROLES}><PricingPage /></ProtectedRoute>} />
                <Route path="/history" element={<Navigate to="/dashboard" replace />} />
                <Route path="/connect" element={<ProtectedRoute allowedRoles={CLIENT_ROLES}><ConnectPlatformsPage /></ProtectedRoute>} />
                <Route path="/invite" element={<InviteFlow />} />
                <Route path="/s/:slug" element={<PublicSmartLinksPage />} />
                
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </div>
        </div>

        {/* Global Overlays */}
        <PostCreatorPage />
        <ConnectionsOverlay />
        <GlobalConfirmDialog />
        <UpsellModal />
        {!isNoLayout && !isSuperadmin && !isStaff && <HelpChatWidget />}
      </div>
    </QueryClientProvider>
  );
}
