import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, X, Sparkles, Settings, RefreshCw, Layers, Check, Copy, Bookmark, BookOpen, UserCheck, ChevronRight, History, Clock, PanelRightClose, PanelRightOpen, SlidersHorizontal, Coins, MessageSquare, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { toast } from "sonner";
import aiService from "../../services/ai.service";
import { useBrand } from "../../context/BrandContext";
import { usePostCreator } from "../../context/PostCreatorContext";
import { useSearchParams } from "react-router-dom";

const quickPrompts = [
  { emoji: "✨", text: "Viết caption giới thiệu sản phẩm mới ra mắt thu hút khách hàng trẻ" },
  { emoji: "🔁", text: "Chuyển thể kịch bản video ngắn thành bài viết Facebook chuyên nghiệp" },
  { emoji: "#", text: "Gợi ý bộ hashtag thịnh hành cho thương hiệu công nghệ & giáo dục" },
  { emoji: "🎯", text: "Tạo 5 tiêu đề (hook) gây tò mò cho video đăng trên TikTok" },
  { emoji: "💡", text: "Viết bài chia sẻ kiến thức bổ ích theo dạng cẩm nang học tập" },
  { emoji: "🌐", text: "Dịch bài viết này sang phong cách trẻ trung năng động hơn" },
];

/**
 * Custom component for each AI message bubble.
 * Encapsulates local state for active platform tabs and quick actions.
 */
function AiMessageBubble({ msg, activeBrand, autoLists, openPostCreator }) {
  const availablePlatforms = Object.keys(msg.adjustments || {});
  const displayPlatforms = availablePlatforms.length > 0 
    ? availablePlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1))
    : ["Instagram", "Facebook", "TikTok"];

  const [activeTab, setActiveTab] = useState(
    displayPlatforms[0]?.toLowerCase() || "instagram"
  );
  const [isQuickPosting, setIsQuickPosting] = useState(false);
  const [selectedAutoListId, setSelectedAutoListId] = useState("");
  const [copied, setCopied] = useState(false);

  const getCaptionForPlatform = (platform) => {
    return msg.adjustments?.[platform.toLowerCase()] || msg.content;
  };

  const currentCaption = getCaptionForPlatform(activeTab);
  const currentHashtags = msg.hashtags || [];

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Đã sao chép nội dung vào bộ nhớ tạm!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertIntoPost = () => {
    const platformsToUse = availablePlatforms.length > 0
      ? availablePlatforms.map(p => p.toUpperCase())
      : [activeTab.toUpperCase()];

    openPostCreator({
      template: {
        caption: `${currentCaption}\n\n${currentHashtags.join(" ")}`,
        platforms: platformsToUse
      }
    });
    toast.success("Đã nạp nội dung vào màn hình soạn thảo!");
  };

  const handleQuickPostAction = async (status, isLibrary = false, toAutoList = false) => {
    if (!activeBrand?.id) return;
    setIsQuickPosting(true);
    try {
      const platformsToUse = availablePlatforms.length > 0
        ? availablePlatforms.map(p => p.toUpperCase())
        : [activeTab.toUpperCase()];

      const payload = {
        caption: currentCaption,
        hashtags: currentHashtags,
        targetPlatforms: platformsToUse,
        autoListId: toAutoList ? selectedAutoListId : undefined,
        status: status,
        isLibrary: isLibrary
      };

      await aiService.quickPost(activeBrand.id, payload);
      
      if (isLibrary) {
        toast.success("Đã lưu bài viết vào Thư viện mẫu thành công!");
      } else if (toAutoList) {
        toast.success("Đã lưu và thêm vào hàng đợi AutoList thành công!");
      } else if (status === "PENDING_APPROVAL") {
        toast.success("Đã gửi bài viết yêu cầu phê duyệt!");
      } else {
        toast.success("Đã lưu nháp bài đăng thành công!");
      }
    } catch (err) {
      toast.error(err.message || "Không thể thực hiện hành động này");
    } finally {
      setIsQuickPosting(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-[90%] bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 text-xs font-medium text-gray-800">
      {/* Platform Switcher */}
      <div className="flex flex-wrap gap-1 mb-3 border-b border-gray-100 pb-2">
        {displayPlatforms.map((p) => (
          <button 
            key={p} 
            onClick={() => setActiveTab(p.toLowerCase())} 
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              activeTab === p.toLowerCase() 
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200/50 shadow-sm" 
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Main Text Content */}
      <div className="relative min-h-[60px] bg-gray-50/50 rounded-xl p-3 border border-gray-100 group">
        <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap pr-7">
          {currentCaption}
        </div>
        <button
          onClick={() => handleCopyText(currentCaption)}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-gray-800 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
          title="Sao chép"
        >
          {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
        </button>
      </div>

      {/* Hashtag List */}
      {currentHashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {currentHashtags.map((tag) => (
            <span key={tag} className="text-[10px] font-bold text-indigo-600 bg-indigo-50/40 px-2 py-0.5 rounded-md border border-indigo-100/30">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action Buttons Panel */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col gap-2.5">
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleInsertIntoPost}
            className="px-3.5 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white font-bold text-[10px] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-gray-200"
          >
            <Sparkles size={11} /> Đưa vào Post Creator
          </button>
          <button 
            onClick={() => {
              const platformsToUse = availablePlatforms.length > 0
                ? availablePlatforms.map(p => p.toUpperCase())
                : [activeTab.toUpperCase()];

              const defaultDate = new Date(Date.now() + 3600000); // Default schedule: 1 hour from now
              openPostCreator({
                template: {
                  caption: `${currentCaption}\n\n${currentHashtags.join(" ")}`,
                  platforms: platformsToUse
                },
                defaultScheduledAt: defaultDate
              });
              toast.success("Đã mở Post Creator và sẵn sàng lên lịch đăng!");
            }}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-100"
          >
            <Calendar size={11} /> Lên lịch bài đăng
          </button>
          <button 
            onClick={() => handleQuickPostAction("DRAFT", false)}
            disabled={isQuickPosting}
            className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 text-gray-600 font-bold text-[10px] transition-all cursor-pointer"
          >
            Lưu Nháp
          </button>
          <button 
            onClick={() => handleQuickPostAction("PENDING_APPROVAL", false)}
            disabled={isQuickPosting}
            className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 text-gray-600 font-bold text-[10px] transition-all cursor-pointer"
          >
            Gửi duyệt
          </button>
          <button 
            onClick={() => handleQuickPostAction("DRAFT", true)}
            disabled={isQuickPosting}
            className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 text-gray-600 font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer"
          >
            <Bookmark size={11} /> Lưu Thư viện mẫu
          </button>
        </div>

        {/* AutoLists Selector */}
        {autoLists.length > 0 && (
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 w-full md:max-w-md">
            <Layers size={12} className="text-gray-400 shrink-0" />
            <select 
              value={selectedAutoListId}
              onChange={(e) => setSelectedAutoListId(e.target.value)}
              className="bg-transparent text-[10px] text-gray-600 font-bold border-none outline-none flex-1"
            >
              <option value="">Thêm vào hàng đợi AutoList...</option>
              {autoLists.map((q) => (
                <option key={q.id} value={q.id}>{q.name}</option>
              ))}
            </select>
            <button 
              onClick={() => handleQuickPostAction("SCHEDULED", false, true)}
              disabled={!selectedAutoListId || isQuickPosting}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-[9px] transition-all shrink-0 cursor-pointer shadow-sm shadow-indigo-100"
            >
              Thêm vào hàng đợi
            </button>
          </div>
        )}
      </div>

      <div className="text-[9px] text-gray-400 mt-2 font-medium">
        Bài viết hiển thị: {currentCaption.length} ký tự
      </div>
    </div>
  );
}

export function AIAssistant() {
  const { activeBrand } = useBrand();
  const { openPostCreator } = usePostCreator();

  // Get platforms that support text and are connected (exclude YOUTUBE)
  const connectedTextPlatforms = activeBrand?.socialAccounts
    ?.filter(sa => sa.isConnected && sa.platform !== "YOUTUBE")
    ?.map(sa => sa.platform.toLowerCase()) || [];

  const availableTextPlatforms = connectedTextPlatforms.length > 0
    ? Array.from(new Set(connectedTextPlatforms))
    : ["facebook", "instagram", "tiktok"];

/**
 * Custom sub-component for rendering each History Card Item.
 * Supports viewing original prompt, expanding/collapsing AI response, copying answer, and loading conversation into Chat.
 */
function HistoryCardItem({ item, toneLabels, supportedFormats, setInput, setTone, setLanguage, setSituation, setSelectedFormat, setGenre, setSelectedPlatforms, setCurrentTab, setMessages }) {
  const [showResponse, setShowResponse] = useState(true);
  const [copiedResponse, setCopiedResponse] = useState(false);

  let meta = {};
  try {
    meta = JSON.parse(item.details || "{}");
  } catch (e) {
    meta = { prompt: item.details || "" };
  }

  const hasResponse = Boolean(meta.response);

  const handleReusePrompt = () => {
    try {
      setInput(meta.prompt || "");
      if (meta.tone) setTone(meta.tone);
      if (meta.language) setLanguage(meta.language);
      if (meta.situation) setSituation(meta.situation);
      if (meta.genre) {
        const genreStr = String(meta.genre);
        const formatMatch = supportedFormats.find(f => genreStr.startsWith(f.value));
        if (formatMatch) {
          setSelectedFormat(formatMatch.value);
          const cleanGenre = genreStr.replace(formatMatch.value, "").replace(/[()]/g, "").trim();
          setGenre(cleanGenre);
        } else {
          setGenre(genreStr);
        }
      }
      if (meta.platform) {
        if (Array.isArray(meta.platform)) {
          setSelectedPlatforms(meta.platform);
        } else if (typeof meta.platform === "string") {
          setSelectedPlatforms(meta.platform.split(","));
        }
      }

      // Load full conversation turn into Chat if response exists
      if (hasResponse) {
        setMessages([
          {
            role: "user",
            content: meta.prompt,
            timestamp: new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
          {
            role: "ai",
            content: meta.response,
            hashtags: meta.hashtags || [],
            adjustments: meta.adjustments || {},
            timestamp: new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        toast.success("Đã nạp toàn bộ cuộc hội thoại & câu trả lời AI vào khung Chat!");
      } else {
        toast.success("Đã nạp Prompt & cấu hình vào khung Chat!");
      }
      setCurrentTab("chat");
    } catch (err) {
      console.error("Error reusing prompt:", err);
      toast.error("Không thể sử dụng lại prompt này: " + err.message);
    }
  };

  const handleCopyResponse = () => {
    if (!meta.response) return;
    let fullText = meta.response;
    if (meta.hashtags && meta.hashtags.length > 0) {
      fullText += "\n\n" + meta.hashtags.map(h => h.startsWith("#") ? h : `#${h}`).join(" ");
    }
    navigator.clipboard.writeText(fullText);
    setCopiedResponse(true);
    toast.success("Đã sao chép câu trả lời AI!");
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  return (
    <div 
      key={item.id} 
      className="p-5 rounded-2xl border border-gray-200/80 bg-white shadow-sm flex flex-col gap-3.5 hover:border-indigo-100 hover:shadow-indigo-50/10 hover:shadow-lg transition-all"
    >
      {/* Header metadata */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] flex items-center justify-center border border-indigo-100">
            {item.user?.name ? item.user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-700">{item.user?.name || "Người dùng"}</div>
            <div className="text-[9px] text-gray-400 font-medium">{item.user?.email || ""}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold bg-gray-50 border border-gray-150 px-2 py-0.5 rounded-md">
          <Clock size={10} />
          {new Date(item.createdAt).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {/* Content Prompt box */}
      <div className="bg-indigo-50/40 rounded-xl p-3.5 border border-indigo-100/80 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
            <MessageSquare size={12} className="text-indigo-600" /> Câu hỏi / Prompt yêu cầu:
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(meta.prompt || "");
              toast.success("Đã sao chép Prompt!");
            }}
            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
            title="Sao chép toàn bộ Prompt"
          >
            <Copy size={11} /> Sao chép Prompt
          </button>
        </div>
        <div className="text-xs font-semibold text-gray-900 leading-relaxed whitespace-pre-wrap select-text bg-white p-3 rounded-lg border border-gray-150 shadow-2xs">
          {meta.prompt || "(Không có nội dung)"}
        </div>
      </div>

      {/* AI Response Box (if available) */}
      {hasResponse && (
        <div className="bg-emerald-50/40 rounded-xl p-3.5 border border-emerald-100/80 flex flex-col gap-2 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={12} className="text-emerald-600 animate-pulse" /> Câu trả lời từ Trợ lý AI:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyResponse}
                className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                {copiedResponse ? <Check size={11} /> : <Copy size={11} />} {copiedResponse ? "Đã sao chép" : "Sao chép câu trả lời"}
              </button>
              <button
                onClick={() => setShowResponse(!showResponse)}
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
                title={showResponse ? "Thu gọn câu trả lời" : "Mở rộng câu trả lời"}
              >
                {showResponse ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {showResponse && (
            <div className="flex flex-col gap-2.5 bg-white p-3.5 rounded-lg border border-gray-150 shadow-2xs text-xs">
              <div className="text-gray-800 font-medium leading-relaxed whitespace-pre-wrap select-text">
                {meta.response}
              </div>

              {meta.hashtags && meta.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100">
                  {meta.hashtags.map((tag, idx) => (
                    <span key={idx} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/60">
                      {tag.startsWith("#") ? tag : `#${tag}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Attribute Pills */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {meta.platform && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100/50">
            Nền tảng: {meta.platform.toUpperCase()}
          </span>
        )}
        {meta.tone && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100/50">
            Văn phong: {toneLabels[meta.tone] || meta.tone}
          </span>
        )}
        {meta.genre && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100/50">
            Dạng: {meta.genre}
          </span>
        )}
        {meta.situation && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100/50">
            Bối cảnh: {meta.situation}
          </span>
        )}
        {meta.language && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100/50">
            Ngôn ngữ: {meta.language === "vi" ? "Tiếng Việt 🇻🇳" : "Tiếng Anh 🇬🇧"}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center border-t border-gray-100 pt-3 mt-1">
        <span className="text-[10px] text-gray-400 font-medium">
          {hasResponse ? "✅ Đã lưu đầy đủ câu trả lời AI" : "ℹ️ Nhật ký prompt trước đây"}
        </span>
        <button
          onClick={handleReusePrompt}
          className="px-3.5 py-1.5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-[10px] rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
        >
          <Sparkles size={11} className="text-amber-400" />
          {hasResponse ? "Xem & Nạp lại vào Chat" : "Sử dụng lại Prompt"}
        </button>
      </div>
    </div>
  );
}

  // Tab View State: "chat" or "settings" Managed via URL Query Parameter
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "chat";

  const setCurrentTab = (newTab) => {
    setSearchParams(
      (prev) => {
        prev.set("tab", newTab);
        return prev;
      },
      { replace: true }
    );
  };

  // Chat & API States
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [tone, setTone] = useState("PROFESSIONAL");
  const [showToneMenu, setShowToneMenu] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // UI Layout & Toolbar States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Selected Options for Generation (Supports multi-select platforms)
  const [selectedPlatforms, setSelectedPlatforms] = useState(availableTextPlatforms);
  const [selectedFormat, setSelectedFormat] = useState("Caption");

  // Dynamic Config & Labels fetched from Backend
  const [supportedTones, setSupportedTones] = useState([]);
  const [toneLabels, setToneLabels] = useState({});
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [supportedFormats, setSupportedFormats] = useState([
    { value: "Caption", label: "Caption ngắn", emoji: "📝", description: "Caption ngắn gọn kèm hashtag thu hút" },
    { value: "Article", label: "Bài viết dài", emoji: "📰", description: "Bài viết chia sẻ kiến thức chi tiết" },
    { value: "Story", label: "Kịch bản Story/Reels", emoji: "⚡", description: "Nội dung ngắn, kịch tính cho Reels/Story" },
    { value: "Hook", label: "Tiêu đề giật tít", emoji: "🎯", description: "Các câu tiêu đề gây tò mò, thu hút click" }
  ]);

  // Dynamic Prompt Customization
  const [language, setLanguage] = useState("vi");
  const [genre, setGenre] = useState("");
  const [situation, setSituation] = useState("");

  // Settings States
  const [brandVoiceContext, setBrandVoiceContext] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [targetPlatforms, setTargetPlatforms] = useState("");
  const [defaultTone, setDefaultTone] = useState("PROFESSIONAL");
  const [defaultLanguage, setDefaultLanguage] = useState("vi");

  // Credits States
  const [creditsLimit, setCreditsLimit] = useState(1000);
  const [creditsUsed, setCreditsUsed] = useState(0);

  // AutoLists & Action States
  const [autoLists, setAutoLists] = useState([]);
  const [isSavingVoice, setIsSavingVoice] = useState(false);

  // History States
  const [historyItems, setHistoryItems] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadHistory = async (page = 1) => {
    if (!activeBrand?.id) return;
    setIsLoadingHistory(true);
    try {
      const res = await aiService.getHistory(activeBrand.id, page, 10);
      setHistoryItems(res.items || []);
      setHistoryTotal(res.total || 0);
      setHistoryPage(res.page || 1);
      setHistoryTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error("Failed to load AI history:", err);
      toast.error("Không thể tải lịch sử sáng tạo AI.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Multimodal State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Platform Multi-Select Dropdown State & Ref
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const platformDropdownRef = useRef(null);

  // Close platform dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (platformDropdownRef.current && !platformDropdownRef.current.contains(event.target)) {
        setShowPlatformDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load configuration metadata on mount
  useEffect(() => {
    loadConfig();
  }, []);

  // Load brand specific settings & AutoLists when active brand changes
  useEffect(() => {
    if (activeBrand?.id) {
      loadSettings();
      loadAutoLists();
    }
  }, [activeBrand?.id]);

  // Sync selectedPlatforms with availableTextPlatforms when activeBrand changes
  useEffect(() => {
    if (availableTextPlatforms.length > 0) {
      setSelectedPlatforms(availableTextPlatforms);
    }
  }, [activeBrand?.id]);

  // Load history when active brand, currentTab or historyPage changes
  useEffect(() => {
    if (activeBrand?.id && currentTab === "history") {
      loadHistory(historyPage);
    }
  }, [activeBrand?.id, currentTab, historyPage]);

  // Reset history page when active brand changes
  useEffect(() => {
    setHistoryPage(1);
  }, [activeBrand?.id]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const loadConfig = async () => {
    try {
      const config = await aiService.getConfig();
      setSupportedTones(config.supportedTones || []);
      setSupportedLanguages(config.supportedLanguages || []);
      if (config.supportedFormats && config.supportedFormats.length > 0) {
        setSupportedFormats(config.supportedFormats);
      }
      
      // Map configuration payload into local UI labels format
      const labels = {};
      (config.supportedTones || []).forEach(t => {
        labels[t.value] = `${t.label} ${t.emoji}`;
      });
      setToneLabels(labels);
    } catch (err) {
      console.error("Failed to load AI configuration:", err);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await aiService.getSettings(activeBrand.id);
      setBrandVoiceContext(data.brandVoiceContext || "");
      setTargetAudience(data.targetAudience || "");
      setTargetPlatforms(data.targetPlatforms || "");
      setDefaultTone(data.defaultTone || "PROFESSIONAL");
      setDefaultLanguage(data.defaultLanguage || "vi");
      setLanguage(data.defaultLanguage || "vi");
      setCreditsLimit(data.creditsLimit || 1000);
      setCreditsUsed(data.creditsUsed || 0);

      // Initialize active tone to default settings
      setTone(data.defaultTone || "PROFESSIONAL");

      // Initialize active platforms list from target platforms settings, filtering by available text platforms
      if (data.targetPlatforms) {
        const plats = data.targetPlatforms
          .split(/[,,;]/)
          .map(p => p.trim().toLowerCase())
          .filter(Boolean);
        const filtered = plats.filter(p => availableTextPlatforms.includes(p));
        if (filtered.length > 0) {
          setSelectedPlatforms(filtered);
        } else {
          setSelectedPlatforms([availableTextPlatforms[0]]);
        }
      }
    } catch (err) {
      console.error("Failed to load AI settings:", err);
      toast.error("Không thể tải cấu hình AI của thương hiệu");
    }
  };

  const loadAutoLists = async () => {
    try {
      const res = await aiService.getAutoLists(activeBrand.id);
      setAutoLists(res || []);
    } catch (err) {
      console.error("Failed to load auto-lists:", err);
    }
  };

  const handleSaveVoice = async () => {
    if (!activeBrand?.id) return;
    setIsSavingVoice(true);
    try {
      await aiService.updateSettings(activeBrand.id, {
        brandVoiceContext,
        targetAudience,
        targetPlatforms,
        defaultTone: tone,
        defaultLanguage
      });
      toast.success("Đã lưu cấu hình giọng điệu thương hiệu thành công!");
    } catch (err) {
      toast.error("Không thể lưu cấu hình thương hiệu");
    } finally {
      setIsSavingVoice(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP)");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sendMessage = async () => {
    if (!input.trim() && !imagePreview) return;
    if (!activeBrand?.id) {
      toast.error("Vui lòng chọn một thương hiệu trước.");
      return;
    }

    const currentPrompt = input;
    const currentImage = imagePreview;

    // Add user message locally
    const userMsg = {
      role: "user",
      content: currentPrompt,
      image: currentImage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    handleRemoveImage();
    setIsTyping(true);

    try {
      // Combine selected format with custom style input for context
      const styleToUse = selectedFormat + (genre ? ` (${genre})` : "");

      // Send comma-separated list of selected platforms
      const platformsString = selectedPlatforms.join(",");

      const res = await aiService.generateContent(activeBrand.id, {
        prompt: currentPrompt,
        tone: tone,
        platform: platformsString,
        image: currentImage || undefined,
        language,
        genre: styleToUse,
        situation
      });

      const aiMsg = {
        role: "ai",
        content: res.caption,
        hashtags: res.suggestedHashtags || [],
        adjustments: res.platformSpecificAdjustments || {},
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
      setCreditsUsed(res.creditsUsed);
      setCreditsLimit(res.creditsLimit);
      loadHistory(1);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Gặp lỗi trong quá trình tạo nội dung AI.");
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: `❌ Lỗi: ${err.message || "Không thể kết nối đến máy chủ AI."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!activeBrand) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] bg-gray-50">
        <Sparkles size={48} className="text-gray-300 animate-pulse mb-4" />
        <p className="text-gray-500 font-medium text-sm">Vui lòng chọn một Thương hiệu để sử dụng Trợ lý AI</p>
      </div>
    );
  }

  const remainingCredits = Math.max(0, creditsLimit - creditsUsed);

  return (
    <div className="h-full w-full max-h-full overflow-hidden p-4 sm:p-5 bg-[#FAFAFA] flex flex-col min-h-0" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Sparkles size={20} className="text-indigo-600 animate-pulse" />
            Trợ lý Sáng tạo Nội dung AI
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Tối ưu bài viết đa nền tảng, thiết lập Brand Voice thông minh.</p>
        </div>
        
        <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1.5 border border-gray-200/50">
          <button 
            onClick={() => setCurrentTab("chat")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentTab === "chat" 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Trò chuyện & Sáng tạo
          </button>
          <button 
            onClick={() => setCurrentTab("history")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentTab === "history" 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Lịch sử sáng tạo
          </button>
          <button 
            onClick={() => setCurrentTab("settings")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentTab === "settings" 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Cài đặt Brand Voice
          </button>

          {/* Sub-header Language Switcher Pill */}
          <div className="h-4 w-px bg-gray-300/60 mx-0.5" />
          <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-[11px] text-gray-800 font-extrabold border-none outline-none cursor-pointer"
            >
              <option value="vi">🇻🇳 VI</option>
              <option value="en">🇬🇧 EN</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Tab Render Workspace */}
      {currentTab === "chat" && (
        <div className="flex gap-5 flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col h-full bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden min-w-0">
            {/* Active AI Agent Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0">
                  <Sparkles size={14} />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900 flex items-center gap-2">
                    PubliCast Content Engine
                    <span className="text-[9px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-md border border-indigo-100/60 hidden sm:inline-block">
                      Tone chính: {toneLabels[defaultTone] || defaultTone}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    Mô hình: Gemini 2.5 Flash / GPT-4o Mini
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isSidebarCollapsed && (
                  <button 
                    onClick={() => setIsSidebarCollapsed(false)}
                    className="p-1.5 px-2.5 rounded-lg border border-indigo-100 bg-indigo-50/60 hover:bg-indigo-100/70 text-indigo-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Mở rộng Bảng điều khiển Sidebar"
                  >
                    <PanelRightOpen size={14} className="text-indigo-600" />
                    <span className="hidden sm:inline text-[10px] font-bold">Hiện Sidebar</span>
                  </button>
                )}

                <button 
                  onClick={() => setMessages([])}
                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-[10px] font-bold text-gray-600 transition-colors cursor-pointer"
                >
                  Làm sạch chat
                </button>
                
                {/* Temporary Tone Override Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setShowToneMenu(!showToneMenu)}
                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Ghi đè sắc thái nhanh cho prompt này"
                  >
                    <span className="text-[10px] font-bold text-gray-400">⚡ Sắc thái:</span>
                    <span>{toneLabels[tone] || tone}</span>
                    <span className="text-[9px] text-gray-400">▼</span>
                  </button>
                  {showToneMenu && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-30 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="px-3 py-1 text-[9px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-1">
                        Sắc thái bài này (Override)
                      </div>
                      {supportedTones.map((t) => (
                        <button 
                          key={t.value} 
                          onClick={() => { setTone(t.value); setShowToneMenu(false); }} 
                          className="block w-full text-left px-3.5 py-2 hover:bg-indigo-50/60 text-xs text-gray-700 font-semibold transition-colors cursor-pointer"
                        >
                          {t.label} {t.emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sidebar Toggle Button */}
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                    isSidebarCollapsed 
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm" 
                      : "border-gray-200 hover:bg-gray-100 text-gray-500"
                  }`}
                  title={isSidebarCollapsed ? "Mở rộng Sidebar thông số" : "Thu gọn Sidebar để mở rộng ô Chat"}
                >
                  {isSidebarCollapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
                </button>
              </div>
            </div>

            {/* Messages Log with extra right padding for scrollbar */}
            <div className="flex-1 overflow-y-auto p-4 pr-3 space-y-4 bg-gradient-to-b from-transparent to-gray-50/20">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
                    <Sparkles size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-800">Trợ lý Content sẵn sàng phục vụ</h3>
                  <p className="text-xs text-gray-500 max-w-sm mt-1 mb-6">Bạn có thể đính kèm hình ảnh để phân tích, chọn văn phong và ngôn ngữ riêng. Hãy dùng gợi ý nhanh bên dưới để tạo bài viết ngay lập tức.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg w-full">
                    {quickPrompts.map((p) => (
                      <button
                        key={p.text}
                        onClick={() => setInput(p.text)}
                        className="text-left p-3 rounded-xl border border-gray-100 bg-white hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-50/25 transition-all text-xs font-semibold text-gray-700 flex items-start gap-2.5 cursor-pointer"
                      >
                        <span className="text-sm leading-none">{p.emoji}</span>
                        <span>{p.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "user" ? (
                      <div className="flex flex-col max-w-[80%] items-end">
                        <div className="rounded-2xl px-4 py-2.5 text-xs bg-gray-900 text-white font-semibold leading-relaxed shadow-sm whitespace-pre-wrap">
                          {msg.image && (
                            <div className="mb-2.5 max-w-xs rounded-lg overflow-hidden border border-gray-800/10">
                              <img src={msg.image} alt="Tệp đính kèm" className="w-full h-auto object-cover max-h-40" />
                            </div>
                          )}
                          {msg.content}
                        </div>
                        <span className="text-[9px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
                      </div>
                    ) : (
                      <AiMessageBubble 
                        msg={msg} 
                        activeBrand={activeBrand} 
                        autoLists={autoLists} 
                        openPostCreator={openPostCreator} 
                      />
                    )}
                  </div>
                ))
              )}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl border border-gray-200 bg-white shadow-sm flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '200ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '400ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Image Preview inside input Area */}
            {imagePreview && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
                  <img src={imagePreview} alt="Xem trước" className="w-full h-full object-cover" />
                  <button 
                    onClick={handleRemoveImage}
                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black transition-colors"
                  >
                    <X size={9} />
                  </button>
                </div>
                <span className="text-[10px] text-gray-500 font-medium">Đã đính kèm ảnh phân tích visual</span>
              </div>
            )}

            {/* Chat Input Area with Compact Integrated Control Toolbar */}
            <div className="p-3 border-t border-gray-100 bg-white flex flex-col gap-2.5">
              {/* Single Integrated Toolbar Row */}
              <div className="flex items-center justify-between gap-2 px-1 w-full overflow-hidden">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none py-0.5 max-w-full shrink-0 flex-nowrap">
                  {/* Multi-Select Platforms Pill Dropdown */}
                  <div className="relative" ref={platformDropdownRef}>
                    <button
                      onClick={() => setShowPlatformDropdown(!showPlatformDropdown)}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <span className="text-[10px] font-bold text-gray-400">🌐 Nền tảng:</span>
                      <span className="max-w-[140px] truncate text-[10px] font-extrabold text-indigo-700">
                        {selectedPlatforms.length === 0
                          ? "Chọn nền tảng..."
                          : selectedPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}
                      </span>
                      <span className="text-[9px] text-gray-400">▼</span>
                    </button>

                    {showPlatformDropdown && (
                      <div className="absolute left-0 bottom-full mb-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-30 animate-in fade-in slide-in-from-bottom-1 duration-150">
                        <div className="px-3 py-1 text-[9px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-1">
                          Chọn nền tảng đăng
                        </div>
                        {availableTextPlatforms.map((plat) => {
                          const isSelected = selectedPlatforms.includes(plat);
                          return (
                            <label
                              key={plat}
                              className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 text-[11px] text-gray-700 font-bold cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedPlatforms((prev) => {
                                    if (isSelected) {
                                      if (prev.length <= 1) return prev;
                                      return prev.filter((p) => p !== plat);
                                    } else {
                                      return [...prev, plat];
                                    }
                                  });
                                }}
                                className="w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                              />
                              <span>{plat.charAt(0).toUpperCase() + plat.slice(1)}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Formats Selector Pills */}
                  <div className="flex items-center gap-1 bg-gray-50/80 p-0.5 rounded-lg border border-gray-200/60">
                    {supportedFormats.map((fmt) => (
                      <button
                        key={fmt.value}
                        onClick={() => setSelectedFormat(fmt.value)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                          selectedFormat === fmt.value
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-200/50"
                        }`}
                        title={fmt.description}
                      >
                        {fmt.emoji} {fmt.label}
                      </button>
                    ))}
                  </div>

                  {/* Language Switcher Pill */}
                  <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200 text-xs">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="bg-transparent text-[10px] text-gray-700 font-bold border-none outline-none cursor-pointer"
                    >
                      <option value="vi">🇻🇳 Tiếng Việt</option>
                      <option value="en">🇬🇧 English</option>
                    </select>
                  </div>
                </div>

                {/* Advanced Filter Toggle (Genre & Situation) */}
                <button
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap ${
                    showAdvancedOptions || genre || situation
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-700"
                  }`}
                  title="Thêm bối cảnh & văn phong phụ"
                >
                  <SlidersHorizontal size={11} />
                  <span>{genre || situation ? "Đang lọc thêm" : "Bối cảnh & Sắc thái phụ"}</span>
                </button>
              </div>

              {/* Expandable Advanced Options Bar */}
              {showAdvancedOptions && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2 bg-indigo-50/40 rounded-xl border border-indigo-100 animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-indigo-100">
                    <span className="text-[9px] font-bold text-gray-400 whitespace-nowrap">Văn phong thêm:</span>
                    <input
                      type="text"
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      placeholder="Kể chuyện, Thơ, Thuyết phục..."
                      className="bg-transparent text-[10px] text-gray-700 font-bold border-none outline-none w-full placeholder-gray-400"
                    />
                    {genre && (
                      <button onClick={() => setGenre("")} className="text-gray-400 hover:text-gray-600">
                        <X size={10} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-indigo-100">
                    <span className="text-[9px] font-bold text-gray-400 whitespace-nowrap">Bối cảnh:</span>
                    <input
                      type="text"
                      value={situation}
                      onChange={(e) => setSituation(e.target.value)}
                      placeholder="Black Friday, Ra mắt sản phẩm..."
                      className="bg-transparent text-[10px] text-gray-700 font-bold border-none outline-none w-full placeholder-gray-400"
                    />
                    {situation && (
                      <button onClick={() => setSituation("")} className="text-gray-400 hover:text-gray-600">
                        <X size={10} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Chat Input Text Box */}
              <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-2xl p-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl hover:bg-gray-200/60 text-gray-500 transition-colors cursor-pointer"
                  title="Đính kèm ảnh phân tích visual"
                >
                  <Paperclip size={16} />
                </button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { 
                    if (e.key === "Enter" && !e.shiftKey) { 
                      e.preventDefault(); 
                      sendMessage(); 
                    } 
                  }}
                  placeholder="Hỏi trợ lý viết bài đăng mạng xã hội, sửa caption hoặc dịch bài viết..."
                  className="flex-1 bg-transparent resize-none border-none outline-none py-1.5 text-xs text-gray-800 placeholder-gray-400 font-semibold"
                  rows={1}
                  style={{ maxHeight: 120, minHeight: 24 }}
                />
                <button
                  onClick={sendMessage}
                  disabled={(!input.trim() && !imagePreview) || isTyping}
                  className="w-8 h-8 rounded-xl bg-gray-950 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 flex items-center justify-center text-white shadow-sm transition-all cursor-pointer shrink-0"
                >
                  <Send size={11} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Status Sidebar (Collapsible) */}
          {!isSidebarCollapsed && (
            <div className="w-72 flex flex-col gap-4 overflow-y-auto pr-3 shrink-0 animate-in fade-in slide-in-from-right-3 duration-300 transition-all">
              {/* Unified AI & Brand Voice Status Card */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex flex-col gap-3.5">
                {/* Header with Title and Collapse Button */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <Sparkles size={14} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-900">Bảng điều khiển AI</h3>
                      <p className="text-[10px] text-gray-400">Thông số & Brand Voice</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsSidebarCollapsed(true)} 
                    className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Thu gọn Sidebar"
                  >
                    <PanelRightClose size={14} />
                  </button>
                </div>

                {/* Section 1: Usage Credits Tracker */}
                <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Coins size={13} className="text-amber-500" /> Hạn mức Credits
                    </span>
                    <span className="text-indigo-600 font-extrabold">{creditsUsed} / {creditsLimit}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-200/80 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, (creditsUsed / creditsLimit) * 100)}%` }} 
                    />
                  </div>
                  <span className="text-[9px] text-gray-400 font-medium">Tự động làm mới khi gia hạn gói cước.</span>
                </div>

                {/* Section 2: Brand Voice Overview */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cấu hình Brand Voice</span>
                  
                  <div className="grid grid-cols-1 gap-1.5 text-xs">
                    <div className="flex justify-between items-center bg-gray-50/50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                      <span className="text-[10px] text-gray-500 font-medium">Khách hàng:</span>
                      <span className="text-[11px] font-bold text-gray-800 truncate max-w-[130px]">{targetAudience || "(Mặc định)"}</span>
                    </div>

                    <div className="flex justify-between items-center bg-gray-50/50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                      <span className="text-[10px] text-gray-500 font-medium">Nền tảng:</span>
                      <span className="text-[11px] font-bold text-gray-800 truncate max-w-[130px]">{targetPlatforms || "(Đa nền tảng)"}</span>
                    </div>

                    <div className="flex justify-between items-center bg-gray-50/50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                      <span className="text-[10px] text-gray-500 font-medium">Giọng điệu chính:</span>
                      <span className="text-[11px] font-extrabold text-indigo-700">{toneLabels[defaultTone] || defaultTone}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setCurrentTab("settings")}
                  className="w-full py-2 rounded-xl bg-indigo-50/60 border border-indigo-100 text-indigo-700 font-bold text-[10px] hover:bg-indigo-100/70 transition-all flex items-center justify-center gap-1 cursor-pointer mt-0.5"
                >
                  Cài đặt Brand Voice <ChevronRight size={11} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {currentTab === "history" && (
        <div className="flex-1 bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 overflow-y-auto max-w-4xl mx-auto w-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <History size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Lịch sử yêu cầu sáng tạo</h2>
                <p className="text-xs text-gray-500 mt-0.5">Xem lại và sử dụng lại các Prompt bạn đã yêu cầu Trợ lý AI thực hiện trước đây.</p>
              </div>
            </div>
            <button
              onClick={() => loadHistory(1)}
              className="p-2 text-gray-400 hover:text-gray-700 transition-colors bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center cursor-pointer"
              title="Làm mới lịch sử"
            >
              <RefreshCw size={14} className={isLoadingHistory ? "animate-spin text-indigo-600" : ""} />
            </button>
          </div>

          {/* History List */}
          {isLoadingHistory ? (
            <div className="flex-1 flex flex-col gap-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/40 animate-pulse flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/6" />
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="flex gap-2">
                    <div className="h-5 bg-gray-200 rounded w-12" />
                    <div className="h-5 bg-gray-200 rounded w-12" />
                  </div>
                </div>
              ))}
            </div>
          ) : historyItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                <History size={22} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-700">Không tìm thấy lịch sử sáng tạo</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Thương hiệu này chưa thực hiện yêu cầu tạo nội dung nào bằng AI.</p>
              </div>
              <button
                onClick={() => setCurrentTab("chat")}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all cursor-pointer"
              >
                Trải nghiệm AI ngay
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-4">
              <div className="flex flex-col gap-4">
                {historyItems.map((item) => (
                  <HistoryCardItem
                    key={item.id}
                    item={item}
                    toneLabels={toneLabels}
                    supportedFormats={supportedFormats}
                    setInput={setInput}
                    setTone={setTone}
                    setLanguage={setLanguage}
                    setSituation={setSituation}
                    setSelectedFormat={setSelectedFormat}
                    setGenre={setGenre}
                    setSelectedPlatforms={setSelectedPlatforms}
                    setCurrentTab={setCurrentTab}
                    setMessages={setMessages}
                  />
                ))}
              </div>

              {/* Pagination UI */}
              {historyTotalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
                  <span className="text-[10px] text-gray-500 font-bold">
                    Hiển thị trang {historyPage} / {historyTotalPages} ({historyTotal} kết quả)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                      disabled={historyPage === 1 || isLoadingHistory}
                      className="px-3 py-1.5 text-[10px] font-bold border border-gray-250 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 transition-colors cursor-pointer"
                    >
                      Trang trước
                    </button>
                    <button
                      onClick={() => setHistoryPage((prev) => Math.min(historyTotalPages, prev + 1))}
                      disabled={historyPage === historyTotalPages || isLoadingHistory}
                      className="px-3 py-1.5 text-[10px] font-bold border border-gray-250 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 transition-colors cursor-pointer"
                    >
                      Trang sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {currentTab === "settings" && (
        /* Tab 2: Brand Voice Settings */
        <div className="flex-1 bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 overflow-y-auto max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Thiết lập cấu hình Trợ lý AI</h2>
              <p className="text-xs text-gray-500 mt-0.5">Dạy AI về thông tin dự án, tệp khách hàng và định dạng ngôn ngữ mặc định.</p>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                Ngữ cảnh Thương hiệu (Brand Context)
                <span className="text-red-500">*</span>
              </label>
              <textarea
                value={brandVoiceContext}
                onChange={(e) => setBrandVoiceContext(e.target.value)}
                placeholder="Ví dụ: PubliCast là một giải pháp SaaS giúp tự động hóa quản lý mạng xã hội, tối ưu hóa các chiến dịch SEO và Marketing đa nền tảng..."
                className="w-full resize-none rounded-xl px-4 py-3 text-xs border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none text-gray-700 font-medium placeholder-gray-400"
                style={{ height: 110 }}
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Khách hàng mục tiêu (Target Audience)</label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Ví dụ: Marketers, chủ doanh nghiệp SME, Gen Z..."
                  className="w-full rounded-xl px-4 py-2.5 text-xs border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none text-gray-700 font-medium placeholder-gray-400"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Nền tảng truyền thông mục tiêu</label>
                <input
                  type="text"
                  value={targetPlatforms}
                  onChange={(e) => setTargetPlatforms(e.target.value)}
                  placeholder="Ví dụ: Facebook, Instagram, TikTok..."
                  className="w-full rounded-xl px-4 py-2.5 text-xs border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none text-gray-700 font-medium placeholder-gray-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5 border-t border-gray-100 pt-5 mt-2">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ngôn ngữ phản hồi mặc định</label>
                <select 
                  value={defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-xs border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none text-gray-700 font-bold bg-white"
                >
                  <option value="vi">Tiếng Việt (vi)</option>
                  <option value="en">English (en)</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Giọng điệu mặc định (Default Tone)</label>
                <select 
                  value={defaultTone}
                  onChange={(e) => setDefaultTone(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-xs border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none text-gray-700 font-bold bg-white"
                >
                  {supportedTones.map((t) => (
                    <option key={t.value} value={t.value}>{t.label} {t.emoji}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 border-t border-gray-100 pt-5">
              <button 
                onClick={() => setCurrentTab("chat")}
                className="px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold text-xs transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleSaveVoice}
                disabled={isSavingVoice}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-xs shadow-md shadow-indigo-100 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingVoice && <RefreshCw size={12} className="animate-spin" />}
                Lưu cấu hình thương hiệu
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce { 
          0%, 100% { transform: translateY(0); } 
          50% { transform: translateY(-4px); } 
        }
      `}</style>
    </div>
  );
}
