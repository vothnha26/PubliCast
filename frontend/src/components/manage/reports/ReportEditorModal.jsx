import React, { useState } from "react";
import { 
  X, ChevronLeft, ChevronRight, Edit2, Layers, Maximize2, Check, 
  Upload, Sparkles, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { PlatformIcon } from "../../shared/PlatformIcon";
import { A4PageRenderer } from "./A4PageRenderer";

const PRESET_COLORS = [
  "#5C90A8", // Slate Blue
  "#52C79F", // Mint Green
  "#C65880", // Raspberry Pink
  "#E6A735", // Honey Yellow
  "#895E8B", // Lavender Purple
  "#72C9DA", // Sky Blue
  "#B61F24", // Deep Red
  "#25927D", // Ocean Green
  "#5F5F5F"  // Dark Gray
];

export function ReportEditorModal({
  isOpen,
  onClose,
  onSave,
  templateName,
  setTemplateName,
  selectedWidgets,
  setSelectedWidgets,
  selectedColor,
  setSelectedColor,
  logoUrl,
  setLogoUrl,
  coverBackgroundUrl,
  setCoverBackgroundUrl,
  bodyBackgroundUrl,
  setBodyBackgroundUrl,
  reportTitle,
  setReportTitle,
  postsSortBy, setPostsSortBy,
  postsMaxRows, setPostsMaxRows,
  fbPostsSortBy, setFbPostsSortBy,
  fbPostsMaxRows, setFbPostsMaxRows,
  fbReelsSortBy, setFbReelsSortBy,
  fbReelsMaxRows, setFbReelsMaxRows,
  igPostsSortBy, setIgPostsSortBy,
  igPostsMaxRows, setIgPostsMaxRows,
  igReelsSortBy, setIgReelsSortBy,
  igReelsMaxRows, setIgReelsMaxRows,
  igStoriesSortBy, setIgStoriesSortBy,
  igStoriesMaxRows, setIgStoriesMaxRows,
  igCompetitorsSortBy, setIgCompetitorsSortBy,
  igCompetitorsMaxRows, setIgCompetitorsMaxRows,
  ytVideosSortBy, setYtVideosSortBy,
  ytVideosMaxRows, setYtVideosMaxRows,
  ttVideosSortBy, setTtVideosSortBy,
  ttVideosMaxRows, setTtVideosMaxRows,
  period,
  previewData,
  brandName,
  getEnabledPages
}) {
  const [editorStep, setEditorStep] = useState(1); // 1: Pages & Sections, 2: Background & Logo, 3: Colors & Preview
  const [editorTab, setEditorTab] = useState("summary"); // "summary", "facebook", "instagram"
  const [editorPreviewPage, setEditorPreviewPage] = useState(1);

  if (!isOpen) return null;

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
      toast.success("Đã tải lên Logo thương hiệu.");
    }
  };

  const handleCoverUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCoverBackgroundUrl(url);
      toast.success("Đã tải lên hình nền trang bìa.");
    }
  };

  const handleBodyUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setBodyBackgroundUrl(url);
      toast.success("Đã tải lên hình nền nội dung.");
    }
  };

  const renderSectionList = (sections, columns = "sm:grid-cols-2") => (
    <div className={`grid grid-cols-1 ${columns} gap-4`}>
      {sections.map((section) => {
        const checked = Boolean(selectedWidgets[section.key]);
        return (
          <button
            key={section.key}
            type="button"
            onClick={() => setSelectedWidgets((prev) => ({ ...prev, [section.key]: !prev[section.key] }))}
            className={`text-left rounded-xl border p-4 transition-all ${
              checked ? "border-black ring-1 ring-black bg-card shadow-sm" : "border-border bg-card hover:shadow-sm"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-extrabold text-foreground tracking-tight">{section.title}</div>
                <div className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{section.description}</div>
              </div>
              <div className={`mt-0.5 w-4.5 h-4.5 rounded-full border flex items-center justify-center ${checked ? "border-black bg-black" : "border-gray-300 bg-card"}`}>
                {checked && <div className="w-1.5 h-1.5 rounded-full bg-card" />}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  const enabledPages = getEnabledPages();

  return (
    <div className="fixed inset-0 bg-[#000]/60 z-50 flex flex-col animate-in fade-in duration-300">
      
      {/* Editor Header Bar */}
      <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-gray-300 rounded-xl px-3 py-1 bg-muted">
            <input 
              type="text" 
              value={templateName} 
              onChange={(e) => setTemplateName(e.target.value)} 
              className="font-bold text-foreground outline-none w-48 text-sm bg-transparent"
            />
            <Edit2 size={14} className="text-muted-foreground ml-1" />
          </div>
        </div>

        {/* Stepper Steps Indicators */}
        <div className="hidden md:flex items-center gap-8">
          <button 
            onClick={() => setEditorStep(1)}
            className={`flex items-center gap-2 text-sm font-semibold pb-1 border-b-2 transition-all ${
              editorStep === 1 ? "border-black text-black" : "border-transparent text-muted-foreground hover:text-muted-foreground"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs">1</span>
            Pages & Sections
          </button>
          <button 
            onClick={() => setEditorStep(2)}
            className={`flex items-center gap-2 text-sm font-semibold pb-1 border-b-2 transition-all ${
              editorStep === 2 ? "border-black text-black" : "border-transparent text-muted-foreground hover:text-muted-foreground"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs">2</span>
            Background & Logo
          </button>
          <button 
            onClick={() => setEditorStep(3)}
            className={`flex items-center gap-2 text-sm font-semibold pb-1 border-b-2 transition-all ${
              editorStep === 3 ? "border-black text-black" : "border-transparent text-muted-foreground hover:text-muted-foreground"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs">3</span>
            Colors & Preview
          </button>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setEditorStep(prev => Math.max(1, prev - 1))}
            disabled={editorStep === 1}
            className="flex items-center gap-1.5 border border-gray-300 hover:bg-muted text-foreground text-xs font-bold px-3.5 py-2 rounded-xl transition-all disabled:opacity-40"
          >
            <ChevronLeft size={14} />
            PREV
          </button>
          <button 
            onClick={() => {
              if (editorStep === 3) {
                onSave();
              } else {
                setEditorStep(prev => Math.min(3, prev + 1));
              }
            }}
            className="flex items-center gap-1.5 bg-black hover:bg-gray-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
          >
            {editorStep === 3 ? "SAVE TEMPLATE" : "NEXT"}
            {editorStep < 3 && <ChevronRight size={14} />}
          </button>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-black p-1.5 rounded-lg ml-2"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto bg-muted p-6">
        
        {/* STEP 1: Pages & Sections */}
        {editorStep === 1 && (
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
              <div className="space-y-6">
                
                {/* Horizontal network tabs */}
                <div className="flex flex-wrap items-center gap-3 bg-card p-3.5 rounded-2xl border border-border shadow-sm">
                  {[
                    { id: "summary", label: "Summary", color: "bg-black" },
                    { id: "facebook", label: "Facebook", color: "bg-blue-600", platform: "Facebook" },
                    { id: "instagram", label: "Instagram", color: "bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600", platform: "Instagram" },
                    { id: "youtube", label: "YouTube", color: "bg-red-600", platform: "YouTube" },
                    { id: "tiktok", label: "TikTok", color: "bg-slate-900", platform: "TikTok" }
                  ].map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => setEditorTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        editorTab === tab.id ? `${tab.color} text-white` : "hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {tab.platform ? <PlatformIcon platform={tab.platform} size={14} /> : <Layers size={14} />}
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                  {/* TAB: Summary */}
                  {editorTab === "summary" && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-border">
                        <span className="font-bold text-foreground text-sm">Summary Widgets (Các mẫu tổng quan)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {/* Followers */}
                        <div 
                          onClick={() => setSelectedWidgets(prev => ({ ...prev, followers: !prev.followers }))}
                          className={`relative bg-card rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                            selectedWidgets.followers ? "border-black ring-1 ring-black shadow-sm" : "border-border"
                          }`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                          <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-muted border border-border">
                            {selectedWidgets.followers && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                          </div>
                          <div className="pl-2 space-y-2">
                            <div className="text-[10px] font-extrabold text-foreground tracking-tight">Followers</div>
                            <div className="flex gap-1">
                              <span className="text-[7px] text-white px-1 py-0.5 rounded font-bold bg-[#3B82F6]">113K</span>
                              <span className="text-[7px] text-white px-1 py-0.5 rounded font-bold bg-[#EC4899]">5.2K</span>
                              <span className="text-[7px] text-white px-1 py-0.5 rounded font-bold bg-[#10B981]">28K</span>
                            </div>
                            <svg viewBox="0 0 100 35" className="w-full h-12">
                              <path d="M 0,30 Q 25,10 50,22 T 100,5" fill="none" stroke={selectedColor} strokeWidth="1.5" />
                              <path d="M 0,30 Q 25,10 50,22 T 100,5 L 100,35 L 0,35 Z" fill={selectedColor} fillOpacity="0.08" />
                            </svg>
                          </div>
                          <div className="flex justify-between items-center pl-2 pt-1 border-t border-border text-[6px] text-muted-foreground font-mono">
                            <span>publicast</span>
                            <Maximize2 size={8} />
                          </div>
                        </div>

                        {/* Post impressions */}
                        <div 
                          onClick={() => setSelectedWidgets(prev => ({ ...prev, postImpressions: !prev.postImpressions }))}
                          className={`relative bg-card rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                            selectedWidgets.postImpressions ? "border-black ring-1 ring-black shadow-sm" : "border-border"
                          }`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                          <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-muted border border-border">
                            {selectedWidgets.postImpressions && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                          </div>
                          <div className="pl-2 space-y-2">
                            <div className="text-[10px] font-extrabold text-foreground tracking-tight">Post impressions</div>
                            <div className="flex gap-1.5">
                              <span className="text-[7px] text-white px-1 py-0.5 rounded font-bold bg-[#F59E0B]">6.4M</span>
                            </div>
                            <svg viewBox="0 0 100 35" className="w-full h-12">
                              <rect x="5" y="15" width="5" height="20" rx="1" fill={selectedColor} />
                              <rect x="15" y="25" width="5" height="10" rx="1" fill="#D1D5DB" />
                              <rect x="25" y="10" width="5" height="25" rx="1" fill={selectedColor} />
                              <rect x="35" y="5" width="5" height="30" rx="1" fill={selectedColor} />
                            </svg>
                          </div>
                          <div className="flex justify-between items-center pl-2 pt-1 border-t border-border text-[6px] text-muted-foreground font-mono">
                            <span>publicast</span>
                            <Maximize2 size={8} />
                          </div>
                        </div>

                        {/* Ranking of posts */}
                        <div 
                          onClick={(e) => {
                            if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
                            setSelectedWidgets(prev => ({ ...prev, rankingOfPosts: !prev.rankingOfPosts }));
                          }}
                          className={`relative bg-card rounded-xl border hover:shadow-md transition-all cursor-pointer overflow-hidden p-3.5 aspect-[1.414/1] flex flex-col justify-between select-none ${
                            selectedWidgets.rankingOfPosts ? "border-black ring-1 ring-black shadow-sm" : "border-border"
                          }`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: selectedColor }} />
                          <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-muted border border-border">
                            {selectedWidgets.rankingOfPosts && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                          </div>
                          <div className="pl-2 space-y-2">
                            <div className="text-[10px] font-extrabold text-foreground tracking-tight">Ranking of posts</div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[6px] border-b border-border pb-0.5">
                                <span className="font-bold text-foreground truncate w-32">Bài viết viral trên FB...</span>
                                <span className="font-mono text-muted-foreground font-bold text-right">12.4K view</span>
                              </div>
                            </div>
                            <div className="space-y-1 pt-1.5 border-t border-gray-50">
                              <div className="flex justify-between items-center">
                                <span className="text-[8px] text-muted-foreground font-bold">Sort by</span>
                                <select 
                                  value={postsSortBy} 
                                  onChange={(e) => setPostsSortBy(e.target.value)}
                                  className="text-[8px] bg-card border border-border rounded px-1 py-0.5 text-foreground font-bold outline-none"
                                >
                                  <option>Impressions</option>
                                  <option>Engagement</option>
                                </select>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pl-2 pt-1 border-t border-border text-[6px] text-muted-foreground font-mono">
                            <span>publicast</span>
                            <Maximize2 size={8} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: Facebook */}
                  {editorTab === "facebook" && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-border">
                        <span className="font-bold text-foreground text-sm">Facebook Dashboard Widgets (Overview + Posts + Stories + Competitors)</span>
                      </div>
                      {renderSectionList([
                        { key: "fbGrowth", title: "Overview", description: "Followers, views, page visits, content" },
                        { key: "fbBalance", title: "Overview", description: "Follower balance and content stats" },
                        { key: "fbViews", title: "Posts", description: "Post views and interactions" },
                        { key: "fbInteractions", title: "Posts", description: "Reactions, comments, shares, clicks" },
                        { key: "fbTypesBreakdown", title: "Stories", description: "Post format mix" },
                        { key: "fbViewsBreakdown", title: "Stories", description: "Organic vs promoted views" },
                        { key: "fbRankingOfPosts", title: "Competitors", description: "Top performing posts" }
                      ])}
                    </div>
                  )}

                  {/* TAB: Instagram */}
                  {editorTab === "instagram" && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-border">
                        <span className="font-bold text-foreground text-sm">Instagram Dashboard Widgets (Community + Account + Competitors)</span>
                      </div>
                      {renderSectionList([
                        { key: "igGrowth", title: "Community", description: "Followers, following, total content" },
                        { key: "igRankingOfPosts", title: "Account", description: "Profile header and account-level posts" }
                      ])}
                    </div>
                  )}

                  {/* TAB: YouTube */}
                  {editorTab === "youtube" && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-border">
                        <span className="font-bold text-foreground text-sm">YouTube Dashboard Widgets (Community + Demographics + Published + Viewed + Competitors)</span>
                      </div>
                      {renderSectionList([
                        { key: "ytGrowth", title: "Community", description: "Subscribers, views, videos" },
                        { key: "ytRankingOfVideos", title: "Published videos", description: "Published video list from the dashboard" }
                      ])}
                    </div>
                  )}

                  {/* TAB: TikTok */}
                  {editorTab === "tiktok" && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-border">
                        <span className="font-bold text-foreground text-sm">TikTok Dashboard Widgets (Community + Posts)</span>
                      </div>
                      {renderSectionList([
                        { key: "ttGrowth", title: "Community", description: "Followers over time" },
                        { key: "ttBalance", title: "Community", description: "New vs lost followers" },
                        { key: "ttViews", title: "Posts", description: "Video views by period" },
                        { key: "ttInteractions", title: "Posts", description: "Likes, comments, shares" },
                        { key: "ttPosts", title: "Posts", description: "Top performing posts" }
                      ])}
                    </div>
                  )}

                </div>

              </div>

              {/* RIGHT: Live A4 Preview của tab đang chọn */}
              <div className="sticky top-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Live Preview</span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-lg capitalize">{editorTab}</span>
                </div>
                <div className="rounded-2xl overflow-hidden border border-border shadow-sm bg-card">
                  <A4PageRenderer
                    pageType={editorTab}
                    pageIndex={1}
                    totalPages={1}
                    previewData={previewData}
                    previewLoading={false}
                    period={period}
                    selectedColor={selectedColor}
                    logoUrl={logoUrl}
                    bodyBackgroundUrl={bodyBackgroundUrl}
                    reportTitle={reportTitle}
                    brandName={brandName}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Xem trước trang báo cáo theo widget đã chọn</p>
              </div>

            </div>
          </div>
        )}

        {/* STEP 2: Background & Logo */}
        {editorStep === 2 && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="grid grid-cols-4 gap-4">
              
              {/* Logo Card */}
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="flex justify-between items-center px-4 pt-4 pb-2">
                  <span className="text-sm font-bold text-foreground">Logo</span>
                  <span className="text-[10px] text-muted-foreground font-mono">600x86px</span>
                </div>
                <div className="px-4 pb-4">
                  <input type="file" id="logo-upload-modal" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <label
                    htmlFor="logo-upload-modal"
                    className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-gray-400 hover:bg-muted transition-all group"
                    style={{ minHeight: "120px" }}
                  >
                    {logoUrl ? (
                      <div className="relative w-full flex items-center justify-center p-3" style={{ minHeight: "120px" }}>
                        <img src={logoUrl} alt="Logo" className="max-h-16 max-w-full object-contain" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/5 rounded-xl transition-all">
                          <span className="text-[10px] font-bold text-foreground bg-card px-2 py-1 rounded-lg shadow-sm">Thay đổi</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-center px-3 py-4">
                        <Upload size={18} className="text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground leading-relaxed">Click to select or drag logo here.</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Cover Background Card */}
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="flex justify-between items-center px-4 pt-4 pb-2">
                  <span className="text-sm font-bold text-foreground">Cover background</span>
                  <span className="text-[10px] text-muted-foreground font-mono">842x595px</span>
                </div>
                <div className="px-4 pb-4">
                  <input type="file" id="cover-upload-modal" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                  <label
                    htmlFor="cover-upload-modal"
                    className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-gray-400 hover:bg-muted transition-all group overflow-hidden"
                    style={{ minHeight: "120px" }}
                  >
                    {coverBackgroundUrl ? (
                      <div className="relative w-full" style={{ minHeight: "120px" }}>
                        <img src={coverBackgroundUrl} alt="Cover" className="w-full object-cover" style={{ maxHeight: "120px" }} />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-all">
                          <span className="text-[10px] font-bold text-white bg-black/50 px-2 py-1 rounded-lg">Thay đổi</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-center px-3 py-4">
                        <Upload size={18} className="text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Click to select cover background image.</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Body Background Card */}
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="flex justify-between items-center px-4 pt-4 pb-2">
                  <span className="text-sm font-bold text-foreground">Body background</span>
                  <span className="text-[10px] text-muted-foreground font-mono">842x595px</span>
                </div>
                <div className="px-4 pb-4">
                  <input type="file" id="body-upload-modal" accept="image/*" className="hidden" onChange={handleBodyUpload} />
                  <label
                    htmlFor="body-upload-modal"
                    className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-gray-400 hover:bg-muted transition-all group overflow-hidden"
                    style={{ minHeight: "120px" }}
                  >
                    {bodyBackgroundUrl ? (
                      <div className="relative w-full" style={{ minHeight: "120px" }}>
                        <img src={bodyBackgroundUrl} alt="Body" className="w-full object-cover" style={{ maxHeight: "120px" }} />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-all">
                          <span className="text-[10px] font-bold text-white bg-black/50 px-2 py-1 rounded-lg">Thay đổi</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-center px-3 py-4">
                        <Upload size={18} className="text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Click to select body background image.</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Title Card */}
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="flex justify-between items-center px-4 pt-4 pb-2">
                  <span className="text-sm font-bold text-foreground">Title</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Max 50 characters</span>
                </div>
                <div className="px-4 pb-4 flex flex-col gap-2" style={{ minHeight: "120px" }}>
                  <input
                    type="text"
                    maxLength={50}
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    className="w-full px-3 py-2.5 bg-card border border-gray-300 rounded-xl text-sm font-semibold text-foreground focus:border-gray-500 outline-none transition-colors mt-1"
                    placeholder="Social Media Insights"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono">{reportTitle.length}/50 characters</span>
                </div>
              </div>

            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-foreground">Preview</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* 2-page preview side-by-side */}
            <div className="grid grid-cols-2 gap-4 bg-card p-4 rounded-3xl border border-border shadow-sm">
              <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
                <A4PageRenderer
                  pageType="cover"
                  pageIndex={1}
                  totalPages={2}
                  previewData={previewData}
                  previewLoading={false}
                  period={period}
                  selectedColor={selectedColor}
                  logoUrl={logoUrl}
                  coverBackgroundUrl={coverBackgroundUrl}
                  bodyBackgroundUrl={bodyBackgroundUrl}
                  reportTitle={reportTitle}
                  brandName={brandName}
                />
              </div>
              <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
                {(() => {
                  const contentPage = enabledPages.find(p => p !== "cover");
                  return contentPage ? (
                    <A4PageRenderer
                      pageType={contentPage}
                      pageIndex={2}
                      totalPages={enabledPages.length}
                      previewData={previewData}
                      previewLoading={false}
                      period={period}
                      selectedColor={selectedColor}
                      logoUrl={logoUrl}
                      bodyBackgroundUrl={bodyBackgroundUrl}
                      reportTitle={reportTitle}
                      brandName={brandName}
                    />
                  ) : (
                    <div className="w-full aspect-[1.414/1] bg-muted flex flex-col items-center justify-center gap-2 rounded-xl">
                      <Layers size={24} className="text-gray-300" />
                      <span className="text-xs text-muted-foreground">Bật widget ở Step 1 để xem trước</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Colors & Preview */}
        {editorStep === 3 && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Color Selector */}
            <div className="lg:col-span-1 bg-card rounded-2xl p-6 border border-border shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-foreground text-base mb-1">Pick your colors</h3>
                <p className="text-xs text-muted-foreground">Chọn màu sắc chủ đạo đại diện cho báo cáo</p>
              </div>

              {/* Colors Grid */}
              <div className="grid grid-cols-3 gap-4">
                {PRESET_COLORS.map((cHex) => (
                  <button
                    key={cHex}
                    onClick={() => setSelectedColor(cHex)}
                    className={`w-full aspect-square rounded-xl flex flex-col justify-end p-2 transition-all border relative ${
                      selectedColor === cHex ? "ring-2 ring-black ring-offset-2 scale-95" : "border-border"
                    }`}
                    style={{ backgroundColor: cHex }}
                  >
                    {selectedColor === cHex && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-card rounded-full flex items-center justify-center shadow">
                        <Check size={10} className="text-black" />
                      </div>
                    )}
                    <span className="text-[8px] font-bold text-white bg-black/30 backdrop-blur-[2px] rounded px-1 text-center font-mono block">
                      {cHex}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Interactive Live Preview */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Xem trước nội dung kết xuất (A4 Live Preview)</span>
                <div className="flex items-center gap-2 bg-card px-3 py-1 rounded-xl border border-border shadow-sm">
                  <button 
                    type="button"
                    disabled={editorPreviewPage === 1}
                    onClick={() => setEditorPreviewPage(prev => Math.max(1, prev - 1))}
                    className="text-muted-foreground hover:text-black disabled:opacity-30 transition-opacity"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs font-mono font-bold text-foreground">
                    {editorPreviewPage} / {enabledPages.length}
                  </span>
                  <button 
                    type="button"
                    disabled={editorPreviewPage === enabledPages.length}
                    onClick={() => setEditorPreviewPage(prev => Math.min(enabledPages.length, prev + 1))}
                    className="text-muted-foreground hover:text-black disabled:opacity-30 transition-opacity"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              <div className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden relative">
                <A4PageRenderer
                  pageType={enabledPages[editorPreviewPage - 1]}
                  pageIndex={editorPreviewPage}
                  totalPages={enabledPages.length}
                  previewData={previewData}
                  previewLoading={false}
                  period={period}
                  selectedColor={selectedColor}
                  logoUrl={logoUrl}
                  coverBackgroundUrl={coverBackgroundUrl}
                  bodyBackgroundUrl={bodyBackgroundUrl}
                  reportTitle={reportTitle}
                  brandName={brandName}
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
