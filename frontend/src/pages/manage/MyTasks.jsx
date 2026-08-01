import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Diamond, ClipboardCheck, Loader2, Calendar, Check, X, Search, ExternalLink, Smartphone, Monitor } from "lucide-react";
import { useBrand } from "../../context/BrandContext";
import { useAuth } from "../../context/AuthContext";
import { usePostCreator } from "../../context/PostCreatorContext";
import workflowService from "../../services/workflow.service";
import { toast } from "sonner";
import { PlatformRegistry } from "./PlatformStrategies";

export function MyTasksPage() {
  const { brands, activeBrand, selectBrand } = useBrand();
  const { user } = useAuth();
  const { openPostCreator } = usePostCreator();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "open";

  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Advanced filters state
  const [selectedBrandId, setSelectedBrandId] = useState("all");
  const [selectedPlatform, setSelectedPlatform] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Post preview modal state
  const [previewWorkflow, setPreviewWorkflow] = useState(null);

  const setActiveTab = (tabName) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("tab", tabName);
      return next;
    });
  };

  const fetchWorkflows = async () => {
    if (!selectedBrandId) return;
    setLoading(true);
    try {
      const response = await workflowService.getWorkflows(selectedBrandId);
      setWorkflows(response || []);
    } catch (error) {
      toast.error(error.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [selectedBrandId]);

  // Synchronize initial brand
  useEffect(() => {
    if (activeBrand?.id && selectedBrandId === "all") {
      // Keep "all" or sync to active
    } else if (activeBrand?.id && !selectedBrandId) {
      setSelectedBrandId(activeBrand.id);
    }
  }, [activeBrand]);

  const handleReview = async (workflowId, action, comment = "") => {
    try {
      // Find the workflow to get its brandId
      const targetWf = workflows.find(w => w.id === workflowId);
      if (!targetWf) return;
      
      await workflowService.reviewWorkflow(targetWf.brandId, workflowId, {
        action,
        comment: comment || undefined
      });
      toast.success(action === 'APPROVED' ? "Đã duyệt bài đăng thành công!" : "Đã từ chối bài đăng.");
      fetchWorkflows();
      if (previewWorkflow?.id === workflowId) {
        setPreviewWorkflow(null);
      }
    } catch (error) {
      toast.error(error.message || "Không thể xử lý phản hồi");
    }
  };

  const formatWorkflowDate = (dateString, timezone = "Asia/Ho_Chi_Minh") => {
    if (!dateString) return { dateStr: "Chưa lên lịch", timeStr: "", timezone: "" };
    const date = new Date(dateString);
    try {
      const dateStr = date.toLocaleDateString("en-US", {
        timeZone: timezone,
        month: "2-digit",
        day: "2-digit",
        year: "numeric"
      });
      const timeStr = date.toLocaleTimeString("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
      return { dateStr, timeStr, timezone };
    } catch (e) {
      const dateStr = date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric"
      });
      const timeStr = date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
      return { dateStr, timeStr, timezone: "Local" };
    }
  };

  // Helper function to check if the current user can approve a workflow
  const canApproveWorkflow = (w) => {
    // If user has already reviewed (i.e. status is not PENDING in w.reviewers), they cannot review again.
    const reviewerDecision = w.reviewers?.find(r => r.reviewerId === user?.id);
    if (reviewerDecision && reviewerDecision.status !== 'PENDING') {
      return false;
    }

    const wfBrand = brands.find(b => b.id === w.brandId);
    if (!wfBrand) return false;

    // Check if user is owner or admin in this brand
    const isOwnerOrAdmin = wfBrand.userRole === 'OWNER' || wfBrand.userRole === 'ADMIN';
    if (isOwnerOrAdmin) return true;

    // Check custom permissions
    const hasApprovePerm = wfBrand.userPermissions?.find(p => p.key === 'APPROVE_POSTS')?.isAllowed === true;
    if (hasApprovePerm) return true;

    return false;
  };

  // Filter lists based on tab
  const getTabFilteredWorkflows = () => {
    return workflows.filter(w => {
      // Apply Search filter
      const matchesSearch = !searchQuery || 
        w.post?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.post?.caption?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Apply Platform filter
      const postPlatforms = w.post?.targetPlatforms ? w.post.targetPlatforms.split(',').map(p => p.trim()) : (w.post?.platforms || []);
      const matchesPlatform = selectedPlatform === "All" || postPlatforms.some(p => p.toLowerCase() === selectedPlatform.toLowerCase());

      if (!matchesSearch || !matchesPlatform) return false;

      switch (activeTab) {
        case "open": {
          const isReviewerPending = w.status === 'PENDING' && canApproveWorkflow(w);
          const isRequesterRevision = w.status === 'REVISION_NEEDED' && w.requesterId === user?.id;
          return isReviewerPending || isRequesterRevision;
        }
        case "pending":
          return w.status === 'PENDING' && w.requesterId === user?.id;
        case "rejected":
          return w.status === 'REJECTED';
        case "approved":
          return w.status === 'APPROVED';
        default:
          return false;
      }
    });
  };

  const currentList = getTabFilteredWorkflows();

  // Get counts for badges
  const openCount = workflows.filter(w => (w.status === 'PENDING' && canApproveWorkflow(w)) || (w.status === 'REVISION_NEEDED' && w.requesterId === user?.id)).length;
  const pendingCount = workflows.filter(w => w.status === 'PENDING' && w.requesterId === user?.id).length;
  const rejectedCount = workflows.filter(w => w.status === 'REJECTED').length;
  const approvedCount = workflows.filter(w => w.status === 'APPROVED').length;

  const TABS = [
    { id: "open", label: "Open", count: openCount },
    { id: "pending", label: "Pending of approval", count: pendingCount },
    { id: "rejected", label: "Rejected", count: rejectedCount },
    { id: "approved", label: "Approved", count: approvedCount },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F8F7] p-8 text-left font-sans">
      {/* Title */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">My tasks</h1>
          <p className="text-xs text-gray-500 mt-1">Review and coordinate posts waiting for feedback or approval</p>
        </div>
      </div>

      {/* Upgrade Banner */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 flex items-center justify-between mb-8 shadow-sm">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 rounded-full bg-[#E8F5E9] flex items-center justify-center shrink-0">
            <Diamond size={24} className="text-[#2E7D32]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0A0A0A]">Do you need a higher plan?</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Upgrade your plan to send posts to your team for review.{" "}
              <button onClick={() => navigate("/pricing")} className="text-gray-600 underline font-medium cursor-pointer">More info</button>
            </p>
          </div>
        </div>
        <button 
          onClick={() => navigate("/pricing")}
          className="px-5 py-2.5 bg-[#0A0A0A] text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          Upgrade your plan
        </button>
      </div>

      {/* Tabs Layout */}
      <div className="flex gap-8 border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="pb-3 text-sm font-semibold transition-all relative flex items-center gap-1.5 cursor-pointer"
            style={{ 
              color: activeTab === tab.id ? "#0A0A0A" : "#9CA3AF",
            }}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md ${activeTab === tab.id ? 'bg-[#0A0A0A] text-white' : 'bg-gray-100 text-gray-400'}`}>
              {tab.count}
            </span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0A0A0A]" />
            )}
          </button>
        ))}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Search Bar */}
        <div className="flex-1 min-w-[280px] relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search post"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-black transition-all"
          />
        </div>

        {/* Social network dropdown */}
        <div className="w-48 relative">
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-black transition-all appearance-none cursor-pointer"
          >
            <option value="All">Social network</option>
            {PlatformRegistry.getAllStrategies().map(strat => (
              <option key={strat.id} value={strat.id}>{strat.name}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
        </div>

        {/* Brand dropdown */}
        <div className="w-56 relative">
          <select
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-black transition-all appearance-none cursor-pointer"
          >
            <option value="all">Any brand</option>
            {brands.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
        </div>
      </div>

      {/* Task Table */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 flex items-center justify-center shadow-sm border border-gray-100">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      ) : currentList.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 flex flex-col items-center justify-center shadow-sm border border-gray-100 text-center">
          <div className="w-20 h-20 bg-[#F9FAFB] rounded-full flex items-center justify-center mb-6">
            <ClipboardCheck size={36} className="text-gray-400" />
          </div>
          <h3 className="text-base font-bold text-gray-800">No tasks found</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-[280px]">No workflows or tasks match the active filters or tab.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-[#FAFAFA]">
                <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Post</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Networks</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Brand</th>
                <th className="px-6 py-4 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentList.map((w) => {
                const post = w.post;
                const brand = w.brand || brands.find(b => b.id === w.brandId);
                const postPlatforms = post?.targetPlatforms ? post.targetPlatforms.split(',').map(p => p.trim()) : (post?.platforms || []);
                const { dateStr, timeStr, timezone } = formatWorkflowDate(post?.scheduledAt || post?.createdAt, brand?.timezone);
                
                return (
                  <tr
                    key={w.id}
                    onClick={() => setPreviewWorkflow(w)}
                    className="hover:bg-gray-50/70 transition-all cursor-pointer group"
                  >
                    {/* Date Column */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-xs font-semibold text-gray-800">{dateStr}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{timeStr}</div>
                      <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-0.5">{timezone}</div>
                    </td>

                    {/* Post Content Column */}
                    <td className="px-6 py-5 max-w-[400px]">
                      <div className="flex items-center gap-3">
                        {post?.mediaUrls ? (
                          <img
                            src={post.mediaUrls.split(",")[0]}
                            alt="Post Thumbnail"
                            className="w-12 h-12 rounded-lg object-cover bg-gray-100 border border-gray-100 shrink-0 shadow-sm"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center shrink-0 shadow-sm">
                            <Calendar size={20} />
                          </div>
                        )}
                        <div className="overflow-hidden">
                          {post?.title && (
                            <h4 className="text-xs font-bold text-gray-800 truncate">{post.title}</h4>
                          )}
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed font-medium">
                            {post?.caption || "No content description."}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Networks Column */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {postPlatforms.map((plt) => (
                          <React.Fragment key={plt}>
                            {PlatformRegistry.getIcon(plt, 15)}
                          </React.Fragment>
                        ))}
                      </div>
                    </td>

                    {/* Status Column */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                        w.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        w.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        w.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {w.status === 'PENDING' ? 'Pending' : w.status === 'REJECTED' ? 'Rejected' : w.status === 'APPROVED' ? 'Approved' : 'Revision needed'}
                      </span>
                    </td>

                    {/* Brand Column */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="text-xs font-semibold text-gray-600">{brand?.name || "Workspace"}</span>
                    </td>

                    {/* Action Column */}
                    <td className="px-6 py-5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                      {w.status === 'PENDING' && canApproveWorkflow(w) && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              const reason = prompt("Lý do từ chối (tùy chọn):");
                              if (reason !== null) handleReview(w.id, "REJECTED", reason);
                            }}
                            className="px-3.5 py-1.5 border border-rose-200 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-50 cursor-pointer active:scale-95 transition-all"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleReview(w.id, "APPROVED")}
                            className="px-3.5 py-1.5 bg-[#10B981] text-white rounded-lg text-xs font-bold hover:bg-emerald-600 cursor-pointer active:scale-95 transition-all shadow-sm"
                          >
                            Approve
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Post Preview Modal */}
      {previewWorkflow && (
        <PostPreviewModal
          workflow={previewWorkflow}
          brands={brands}
          onClose={() => setPreviewWorkflow(null)}
          onApprove={() => handleReview(previewWorkflow.id, "APPROVED")}
          onReject={() => {
            const reason = prompt("Lý do từ chối (tùy chọn):");
            if (reason !== null) handleReview(previewWorkflow.id, "REJECTED", reason);
          }}
          onEdit={() => {
            const targetBrand = brands.find(b => b.id === previewWorkflow.brandId);
            if (targetBrand) {
              selectBrand(targetBrand.id);
            }
            setPreviewWorkflow(null);
            openPostCreator({ post: previewWorkflow.post });
          }}
          canApprove={canApproveWorkflow(previewWorkflow)}
        />
      )}
    </div>
  );
}

// ── Interactive Post Preview Modal Component ──────────────────────────────
function PostPreviewModal({ workflow, brands, onClose, onApprove, onReject, onEdit, canApprove }) {
  const post = workflow.post;
  const brand = brands.find(b => b.id === workflow.brandId);
  const platforms = post?.targetPlatforms ? post.targetPlatforms.split(',').map(p => p.trim()) : (post?.platforms || []);
  
  const [activePlatform, setActivePlatform] = useState(platforms[0] || "facebook");
  const [device, setDevice] = useState("desktop"); // "mobile" | "desktop"

  const postImage = post?.mediaUrls?.split(",")[0];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Modal Card */}
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden relative border border-gray-100 max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-gray-50 border border-gray-100 hover:bg-gray-100 rounded-full p-2 text-gray-500 cursor-pointer transition-all z-10"
        >
          <X size={16} />
        </button>

        {/* Top: Platforms Tabs Selector */}
        <div className="border-b border-gray-100 px-6 py-4 flex justify-center items-center gap-2 bg-gray-50/50">
          {platforms.map(plt => (
            <button
              key={plt}
              onClick={() => setActivePlatform(plt)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                activePlatform.toLowerCase() === plt.toLowerCase()
                  ? 'bg-[#0A0A0A] text-white'
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {PlatformRegistry.getIcon(plt, 14)}
              {plt}
            </button>
          ))}
        </div>

        {/* Middle: Preview Display Zone */}
        <div className="flex-1 bg-gray-100/60 py-10 px-4 overflow-y-auto flex flex-col items-center justify-center min-h-[350px]">
          
          {/* Main Mockup Box */}
          <div 
            className={`w-full transition-all duration-300 ease-in-out ${
              device === 'mobile' ? 'max-w-[360px]' : 'max-w-[620px]'
            }`}
          >
            {PlatformRegistry.getPreview(activePlatform, post, brand, postImage, post?.scheduledAt ? new Date(post.scheduledAt).toLocaleString("en-US", { month: "short", day: "numeric" }) : "Just now")}
          </div>

          {/* Device Toggle selector */}
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm mt-6 gap-1">
            <button
              onClick={() => setDevice("mobile")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                device === 'mobile' ? 'bg-[#0A0A0A] text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Smartphone size={12} /> Mobile
            </button>
            <button
              onClick={() => setDevice("desktop")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                device === 'desktop' ? 'bg-[#0A0A0A] text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Monitor size={12} /> Desktop
            </button>
          </div>
        </div>

        {/* Reviewers Status */}
        {workflow.reviewers && workflow.reviewers.length > 0 && (
          <div className="px-8 py-4 border-t border-gray-100 bg-[#FAFAFA] flex flex-col gap-2">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
              <span>Trạng thái phê duyệt</span>
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full normal-case text-[9px]">
                {workflow.approvalPolicy === 'ALL' ? 'Tất cả đồng thuận (ALL)' : 'Tối thiểu một người (ANY)'}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 mt-1">
              {workflow.reviewers.map(r => (
                <div key={r.id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm text-xs">
                  {r.reviewer?.avatarUrl ? (
                    <img src={r.reviewer.avatarUrl} alt={r.reviewer.name} className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center font-bold text-[10px] text-gray-500">
                      {r.reviewer?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-gray-700">{r.reviewer?.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    r.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                    r.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                    r.status === 'REVISION_NEEDED' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                    'bg-gray-50 text-gray-500 border border-gray-100'
                  }`}>
                    {r.status === 'APPROVED' ? 'Đã duyệt' :
                     r.status === 'REJECTED' ? 'Từ chối' :
                     r.status === 'REVISION_NEEDED' ? 'Yêu cầu sửa' :
                     'Chờ duyệt'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notice text */}
        <div className="px-8 py-3 border-t border-gray-100 bg-[#FAFAFA] text-center">
          <p className="text-[10px] text-gray-400 font-medium leading-relaxed max-w-xl mx-auto">
            Please note that these previews are an approximation of how your post would look like when published. We aim to be as accurate as possible but take into account that final result may look different.
          </p>
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-white">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-black border border-gray-200 hover:border-gray-300 rounded-xl px-4 py-2.5 transition-all cursor-pointer"
          >
            View configuration <ExternalLink size={12} />
          </button>
          
          <div className="flex gap-2">
            {workflow.status === 'PENDING' && canApprove ? (
              <>
                <button
                  onClick={onReject}
                  className="px-5 py-2.5 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Reject
                </button>
                <button
                  onClick={onApprove}
                  className="px-6 py-2.5 bg-[#10B981] hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Approve
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Platform preview render helper has been moved to PlatformStrategies registry.

