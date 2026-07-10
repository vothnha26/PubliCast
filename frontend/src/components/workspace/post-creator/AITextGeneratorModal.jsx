import React, { useState, useEffect, useRef } from "react";
import { X, Sparkles, Send, ThumbsUp, ThumbsDown, Globe, Plus, Hash, ArrowRightLeft, Smile, CheckCircle, RefreshCw, MessageSquare, AlertCircle, HelpCircle, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import apiService from "../../../services/api";
import SelectionModal from "./SelectionModal";
import { useBrand } from "../../../context/BrandContext";

export default function AITextGeneratorModal({ isOpen, onClose, initialText, onUseText, activePlatform }) {
  const { activeBrand } = useBrand();
  
  // Credits State
  const [creditsLimit, setCreditsLimit] = useState(5);
  const [creditsUsed, setCreditsUsed] = useState(0);

  // Initial Form State
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("PROFESSIONAL");
  const [language, setLanguage] = useState("vi");
  const [targetPlatforms, setTargetPlatforms] = useState(
    activePlatform ? [activePlatform.toLowerCase()] : ["facebook"]
  );
  const [previewPlatform, setPreviewPlatform] = useState(
    activePlatform?.toLowerCase() || "facebook"
  );

  // Chat Messages State
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "bot",
      text: "Xin chào! Tôi là trợ lý viết bài AI của bạn. Hãy điền các thông tin ở bảng bên phải để tôi có thể tạo bài viết tốt nhất cho bạn nhé! ✨"
    }
  ]);

  // Generation & Refinement States
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState(null); // { caption, suggestedHashtags, platformSpecificAdjustments }
  const [activeRefineAction, setActiveRefineAction] = useState(null); // 'translate' | 'change_tone' | 'optimize' | 'adjust' | null
  
  // Options for submenus
  const [refineLang, setRefineLang] = useState("en");
  const [refineTone, setRefineTone] = useState("CASUAL");
  const [refinePlatform, setRefinePlatform] = useState("instagram");
  const [refineCustomInstructions, setRefineCustomInstructions] = useState("");

  // Modal open states
  const [showToneModal, setShowToneModal] = useState(false);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [showRefineToneModal, setShowRefineToneModal] = useState(false);
  const [showRefinePlatformModal, setShowRefinePlatformModal] = useState(false);

  const chatEndRef = useRef(null);

  // Constant options
  const TONE_OPTIONS = [
    { value: "PROFESSIONAL", label: "Professional", emoji: "💼" },
    { value: "CASUAL",       label: "Casual",       emoji: "🌟" },
    { value: "FUNNY",        label: "Funny",        emoji: "😂" },
    { value: "INSPIRATIONAL",label: "Inspirational",emoji: "✨" },
    { value: "URGENT",       label: "Urgent",       emoji: "🚨" },
    { value: "EDUCATIONAL",  label: "Educational",  emoji: "💡" },
  ];

  const PLATFORM_OPTIONS = [
    { value: "facebook",  label: "Facebook",  emoji: "📘" },
    { value: "instagram", label: "Instagram", emoji: "📷" },
    { value: "linkedin",  label: "LinkedIn",  emoji: "💼" },
    { value: "tiktok",    label: "TikTok",    emoji: "🎵" },
  ];

  // Load AI Settings (credits)
  useEffect(() => {
    if (isOpen && activeBrand?.id) {
      loadCredits();
    }
  }, [isOpen, activeBrand?.id]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadCredits = async () => {
    try {
      const res = await apiService.get(`/ai/settings?brandId=${activeBrand.id}`);
      setCreditsLimit(res.data.creditsLimit || 1000);
      setCreditsUsed(res.data.creditsUsed || 0);
    } catch (err) {
      console.error("Failed to load AI credits:", err);
    }
  };

  const handleGenerateInit = async (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error("Vui lòng nhập chủ đề bài viết.");
      return;
    }
    if (!activeBrand?.id) {
      toast.error("Vui lòng chọn thương hiệu.");
      return;
    }

    setIsLoading(true);
    const userPrompt = `Hãy tạo một bài viết về "${topic}" bằng ${
      language === "vi" ? "Tiếng Việt" : "Tiếng Anh"
    }, với giọng điệu ${getToneLabel(tone)} và được tối ưu hóa cho các nền tảng: ${targetPlatforms.join(", ")}.`;
    
    // Add user message to chat
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "user",
        text: userPrompt
      }
    ]);

    try {
      const res = await apiService.post(`/ai/generate?brandId=${activeBrand.id}`, {
        prompt: topic,
        tone,
        platform: targetPlatforms.join(","),
        language,
        genre: "Caption"
      });

      setCurrentResult({
        caption: res.data.caption,
        suggestedHashtags: res.data.suggestedHashtags || [],
        platformSpecificAdjustments: res.data.platformSpecificAdjustments || {}
      });

      // Update Credits
      setCreditsUsed(res.data.creditsUsed || 0);
      setCreditsLimit(res.data.creditsLimit || 1000);

      // Add bot message
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: "Tôi đã tạo xong bài viết theo yêu cầu của bạn! Bạn có thể xem thử ở khung điện thoại ở giữa và tinh chỉnh thêm bằng các công cụ bên phải nhé. 👇"
        }
      ]);
      toast.success("Tạo nội dung AI thành công!");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Lỗi tạo bài viết từ AI.");
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: `Đã có lỗi xảy ra: ${err.message || "Không thể kết nối với dịch vụ AI."}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = async (action, optionData = {}) => {
    if (!currentResult) return;
    if (!activeBrand?.id) {
      toast.error("Vui lòng chọn thương hiệu.");
      return;
    }

    setIsLoading(true);
    // Get text to refine based on active platform select
    const currentText = currentResult.platformSpecificAdjustments?.[previewPlatform] || currentResult.caption;

    // Add user chat message
    let actionLabel = getActionLabel(action, optionData);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "user",
        text: `Hãy thực hiện tinh chỉnh: ${actionLabel}`
      }
    ]);

    try {
      const res = await apiService.post(`/ai/refine?brandId=${activeBrand.id}`, {
        text: currentText,
        action,
        option: optionData
      });

      setCurrentResult({
        caption: res.data.caption,
        suggestedHashtags: res.data.suggestedHashtags || [],
        platformSpecificAdjustments: res.data.platformSpecificAdjustments || {}
      });

      // Update Credits
      setCreditsUsed(res.data.creditsUsed || 0);
      setCreditsLimit(res.data.creditsLimit || 1000);

      // Reset active refine sub-mode
      setActiveRefineAction(null);

      // Add bot message
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: "Bài đăng đã được tinh chỉnh thành công theo yêu cầu của bạn! 🚀"
        }
      ]);
      toast.success("Tinh chỉnh bài viết thành công!");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Lỗi tinh chỉnh bài viết từ AI.");
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: `Đã xảy ra lỗi khi tinh chỉnh: ${err.message || "Không thể thực hiện yêu cầu này."}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseText = () => {
    if (!currentResult) return;
    const textToUse = currentResult.platformSpecificAdjustments?.[previewPlatform] || currentResult.caption;
    const hashtags = currentResult.suggestedHashtags.length > 0
      ? `\n\n${currentResult.suggestedHashtags.map(t => t.startsWith('#') ? t : `#${t}`).join(" ")}`
      : "";
    onUseText(textToUse + hashtags);
    toast.success("Đã áp dụng văn bản vào bài viết!");
    onClose();
  };

  const handleRestart = () => {
    setCurrentResult(null);
    setTopic("");
    setActiveRefineAction(null);
    setTargetPlatforms(activePlatform ? [activePlatform.toLowerCase()] : ["facebook"]);
    setPreviewPlatform(activePlatform?.toLowerCase() || "facebook");
    setMessages([
      {
        id: "welcome",
        sender: "bot",
        text: "Hãy điền các thông tin ở bảng bên phải để tôi có thể tạo bài viết mới cho bạn nhé! ✨"
      }
    ]);
  };

  // Helper Labels mapping
  const getToneLabel = (t) => {
    const toneMap = {
      PROFESSIONAL: "Chuyên nghiệp 💼",
      CASUAL: "Thân thiện 🌟",
      FUNNY: "Hài hước 😂",
      INSPIRATIONAL: "Truyền cảm hứng ✨",
      URGENT: "Khẩn cấp 🚨",
      EDUCATIONAL: "Giáo dục 💡"
    };
    return toneMap[t] || t;
  };

  const getActionLabel = (act, opt) => {
    switch (act) {
      case "translate":
        return `Dịch bài viết sang ${opt.targetLanguage === "en" ? "Tiếng Anh" : "Tiếng Việt"}`;
      case "add_cta":
        return "Thêm lời kêu gọi hành động (CTA)";
      case "add_hashtags":
        return "Bổ sung thêm bộ hashtag liên quan";
      case "lengthen":
        return "Kéo dài và chi tiết hóa văn bản";
      case "shorten":
        return "Thu gọn văn bản súc tích hơn";
      case "change_tone":
        return `Đổi phong cách bài đăng thành "${getToneLabel(opt.targetTone)}"`;
      case "add_emojis":
        return "Thêm biểu tượng cảm xúc sinh động (emojis)";
      case "correct":
        return "Sửa lỗi chính tả, dấu câu & ngữ pháp";
      case "optimize":
        return `Tối ưu hóa nội dung dành riêng cho ${opt.targetPlatform}`;
      case "structure":
        return "Đổi cấu trúc trình bày (gạch đầu dòng)";
      case "adjust":
        return `Điều chỉnh theo chỉ dẫn: "${opt.customInstructions}"`;
      default:
        return act;
    }
  };

  const remainingCredits = Math.max(0, creditsLimit - creditsUsed);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {/* Modal Container */}
      <div className="relative flex flex-col w-full max-w-[1200px] h-[90vh] bg-white rounded-[24px] shadow-2xl overflow-hidden font-sans border border-gray-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Sparkles size={18} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Text generator with AI</h2>
              <p className="text-[10px] text-gray-500 font-medium">Trợ lý sáng tạo nội dung đa nền tảng thông minh</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full border border-gray-200 text-[10px] text-gray-500 font-black tracking-wide">
              <AlertCircle size={12} className="text-gray-400" />
              <span>Available AI credits: <strong className="text-gray-900 font-black">{remainingCredits} of {creditsLimit}</strong>.</span>
              <HelpCircle size={10} className="text-gray-400 cursor-pointer" title="Hạn mức credits của thương hiệu" />
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Body (3 Columns) */}
        <div className="flex flex-1 overflow-hidden bg-gray-50/50">
          
          {/* Column 1: Chat Assistant (Left) */}
          <div className="w-1/3 flex flex-col border-r border-gray-100 bg-white">
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/30 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <MessageSquare size={12} />
              Trò chuyện với trợ lý AI
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex gap-3 max-w-[85%] ${
                    msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] ${
                    msg.sender === "user" 
                      ? "bg-purple-100 text-purple-700" 
                      : "bg-gray-900 text-white"
                  }`}>
                    {msg.sender === "user" ? "NH" : "🤖"}
                  </div>
                  <div className={`p-3 rounded-[20px] text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-purple-600 text-white rounded-tr-none shadow-sm"
                      : "bg-gray-100 text-gray-800 rounded-tl-none shadow-sm"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0 text-[10px]">
                    🤖
                  </div>
                  <div className="p-3 bg-gray-100 text-gray-800 rounded-[20px] rounded-tl-none shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Column 2: Mobile Phone Preview (Middle) */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 border-r border-gray-100">
            {currentResult ? (
              <div className="flex flex-col items-center gap-4 w-full max-w-[340px]">
                
                {/* Platform Switcher Tabs */}
                {targetPlatforms.length > 1 && (
                  <div className="flex bg-gray-100 p-1 rounded-xl w-full gap-1 shadow-inner">
                    {targetPlatforms.map((plat) => {
                      const opt = PLATFORM_OPTIONS.find(o => o.value === plat);
                      const isSelected = previewPlatform === plat;
                      return (
                        <button
                          key={plat}
                          onClick={() => setPreviewPlatform(plat)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            isSelected
                              ? "bg-white text-purple-700 shadow-sm"
                              : "text-gray-500 hover:text-gray-800"
                          }`}
                        >
                          <span>{opt?.emoji}</span>
                          <span className="capitalize">{opt?.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Mockup Phone */}
                <div className="w-full aspect-[9/18] bg-gray-950 rounded-[48px] p-3 shadow-2xl border-4 border-gray-800 flex flex-col relative overflow-hidden ring-1 ring-white/10">
                  {/* Speaker & Camera Notch */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-gray-900 rounded-full z-20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-gray-800 rounded-full mr-2" />
                    <div className="w-12 h-1 bg-gray-800 rounded-full" />
                  </div>
                  
                  {/* Phone Screen Area */}
                  <div className="flex-1 bg-gray-900 rounded-[38px] p-4 pt-8 flex flex-col overflow-hidden text-white font-sans text-xs">
                    {/* App Header (Fake social app) */}
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                      <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center font-bold text-[9px]">
                        {previewPlatform.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-[10px]">PubliCast Preview</div>
                        <div className="text-[8px] text-gray-400 capitalize">{previewPlatform} Post</div>
                      </div>
                    </div>
 
                    {/* Content Preview */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                      <p className="whitespace-pre-wrap text-gray-200 leading-relaxed">
                        {currentResult.platformSpecificAdjustments?.[previewPlatform] || currentResult.caption}
                      </p>
                      {currentResult.suggestedHashtags.length > 0 && (
                        <p className="text-purple-400 font-bold leading-relaxed">
                          {currentResult.suggestedHashtags.map(t => t.startsWith('#') ? t : `#${t}`).join(" ")}
                        </p>
                      )}
                    </div>
 
                    {/* Action Inside Screen */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-gray-400 text-[10px]">
                      <div className="flex items-center gap-3">
                        <span className="hover:text-white cursor-pointer">❤️ Like</span>
                        <span className="hover:text-white cursor-pointer">💬 Comment</span>
                      </div>
                      <span className="text-[8px]">Mockup Screen</span>
                    </div>
                  </div>
                </div>
 
                {/* Rank and Use Button */}
                <div className="flex items-center justify-between w-full bg-white rounded-2xl p-3 border border-gray-150 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-bold">Rank answer:</span>
                    <button className="p-1 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors">
                      <ThumbsUp size={14} />
                    </button>
                    <button className="p-1 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors">
                      <ThumbsDown size={14} />
                    </button>
                  </div>
                  <button
                    onClick={handleUseText}
                    className="px-4 py-2 bg-black hover:bg-gray-800 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md shadow-gray-200 cursor-pointer animate-pulse"
                  >
                    Use {previewPlatform} text
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center max-w-[280px] text-gray-400">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 mb-4 animate-pulse">
                  <Sparkles size={32} />
                </div>
                <h3 className="text-xs font-bold text-gray-700 mb-1">Chưa có bản xem trước</h3>
                <p className="text-[10px] text-gray-500">Hãy điền chủ đề và thiết lập bên phải rồi bấm nút Generate để tạo nội dung.</p>
              </div>
            )}
          </div>

          {/* Column 3: Configurations & Refine Panel (Right) */}
          <div className="w-1/3 overflow-y-auto bg-white flex flex-col">
            
            {!currentResult ? (
              /* --- Phase 1: Setup Form --- */
              <form onSubmit={handleGenerateInit} className="p-5 flex flex-col gap-5 flex-1">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">
                  Cài đặt sinh nội dung
                </div>
                
                {/* Topic Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-wider">
                    Write the topic of the text to generate
                  </label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ví dụ: WorldCup2026, các bài học thú vị về phát triển cá nhân..."
                    className="w-full h-32 p-3 rounded-2xl border border-gray-200 text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Tone Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-wider">
                    Choose a tone
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowToneModal(true)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-white hover:border-purple-400 hover:bg-purple-50/30 transition-all cursor-pointer group"
                  >
                    <span className="flex items-center gap-2 text-xs font-bold text-gray-700">
                      <span className="text-base">{TONE_OPTIONS.find(o => o.value === tone)?.emoji}</span>
                      {TONE_OPTIONS.find(o => o.value === tone)?.label}
                    </span>
                    <ChevronDown size={14} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
                  </button>
                </div>

                {/* Language Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-wider">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 focus:outline-none focus:border-purple-500 bg-white"
                  >
                    <option value="vi">Vietnamese (Tiếng Việt)</option>
                    <option value="en">English (Tiếng Anh)</option>
                  </select>
                </div>

                {/* Platform select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-wider">
                    Optimize for Social media
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPlatformModal(true)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-white hover:border-purple-400 hover:bg-purple-50/30 transition-all cursor-pointer group"
                  >
                    <span className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-gray-700">
                      {targetPlatforms.map((plat) => {
                        const opt = PLATFORM_OPTIONS.find(o => o.value === plat);
                        return (
                          <span key={plat} className="inline-flex items-center gap-0.5 bg-gray-100 px-2 py-0.5 rounded-md text-[10px]">
                            <span>{opt?.emoji}</span>
                            <span className="capitalize">{opt?.label}</span>
                          </span>
                        );
                      })}
                      {targetPlatforms.length === 0 && (
                        <span className="text-red-500 font-medium">Chưa chọn platform</span>
                      )}
                    </span>
                    <ChevronDown size={14} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
                  </button>
                </div>

                {/* Generate Trigger */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-black text-[11px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-100 cursor-pointer mt-4"
                >
                  {isLoading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  Generate Text
                </button>
              </form>
            ) : (
              /* --- Phase 2: Refinement Controls --- */
              <div className="p-5 flex flex-col gap-4 flex-1">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">
                  Công cụ tinh chỉnh AI
                </div>

                {/* List of 11 Refinement Tools */}
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[60vh] pr-1">
                  
                  {/* Action 1: Translate */}
                  <div className="border border-gray-150 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setActiveRefineAction(activeRefineAction === "translate" ? null : "translate")}
                      className="w-full p-3 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">🌐 Translate</span>
                      <span className="text-[10px] text-gray-400 font-medium">➔</span>
                    </button>
                    {activeRefineAction === "translate" && (
                      <div className="p-3 bg-gray-50 border-t border-gray-100 flex flex-col gap-2">
                        <select
                          value={refineLang}
                          onChange={(e) => setRefineLang(e.target.value)}
                          className="w-full p-2 rounded-lg border border-gray-200 text-xs font-medium bg-white"
                        >
                          <option value="en">English (Tiếng Anh)</option>
                          <option value="vi">Vietnamese (Tiếng Việt)</option>
                        </select>
                        <button
                          onClick={() => handleRefine("translate", { targetLanguage: refineLang })}
                          disabled={isLoading}
                          className="py-1.5 bg-black text-white text-[9px] font-black uppercase tracking-wider rounded-lg cursor-pointer hover:bg-gray-800 disabled:opacity-50"
                        >
                          Dịch ngay
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Action 2: Add CTA */}
                  <button
                    onClick={() => handleRefine("add_cta")}
                    disabled={isLoading}
                    className="w-full p-3 text-left text-xs font-bold text-gray-700 border border-gray-150 rounded-xl hover:bg-gray-50 flex items-center justify-between disabled:opacity-50"
                  >
                    <span>📣 Add CTA</span>
                  </button>

                  {/* Action 3: Add hashtags */}
                  <button
                    onClick={() => handleRefine("add_hashtags")}
                    disabled={isLoading}
                    className="w-full p-3 text-left text-xs font-bold text-gray-700 border border-gray-150 rounded-xl hover:bg-gray-50 flex items-center justify-between disabled:opacity-50"
                  >
                    <span># Add hashtags</span>
                  </button>

                  {/* Action 4: Lengthen text */}
                  <button
                    onClick={() => handleRefine("lengthen")}
                    disabled={isLoading}
                    className="w-full p-3 text-left text-xs font-bold text-gray-700 border border-gray-150 rounded-xl hover:bg-gray-50 flex items-center justify-between disabled:opacity-50"
                  >
                    <span>📄 Lengthen text</span>
                  </button>

                  {/* Action 5: Shorten text */}
                  <button
                    onClick={() => handleRefine("shorten")}
                    disabled={isLoading}
                    className="w-full p-3 text-left text-xs font-bold text-gray-700 border border-gray-150 rounded-xl hover:bg-gray-50 flex items-center justify-between disabled:opacity-50"
                  >
                    <span>➖ Shorten text</span>
                  </button>

                  {/* Action 6: Change tone */}
                  <button
                    onClick={() => setShowRefineToneModal(true)}
                    disabled={isLoading}
                    className="w-full p-3 text-left text-xs font-bold text-gray-700 border border-gray-150 rounded-xl hover:bg-gray-50 flex items-center justify-between disabled:opacity-50 cursor-pointer group"
                  >
                    <span className="flex items-center gap-2">
                      <span>🎭</span> Change tone
                      <span className="text-[10px] font-medium text-purple-500">
                        ({TONE_OPTIONS.find(o => o.value === refineTone)?.emoji} {TONE_OPTIONS.find(o => o.value === refineTone)?.label})
                      </span>
                    </span>
                    <ChevronDown size={13} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
                  </button>

                  {/* Action 7: Add emojis */}
                  <button
                    onClick={() => handleRefine("add_emojis")}
                    disabled={isLoading}
                    className="w-full p-3 text-left text-xs font-bold text-gray-700 border border-gray-150 rounded-xl hover:bg-gray-50 flex items-center justify-between disabled:opacity-50"
                  >
                    <span>😊 Add emojis</span>
                  </button>

                  {/* Action 8: Correct text */}
                  <button
                    onClick={() => handleRefine("correct")}
                    disabled={isLoading}
                    className="w-full p-3 text-left text-xs font-bold text-gray-700 border border-gray-150 rounded-xl hover:bg-gray-50 flex items-center justify-between disabled:opacity-50"
                  >
                    <span>✍️ Correct text</span>
                  </button>

                  {/* Action 9: Optimize for social media */}
                  <button
                    onClick={() => setShowRefinePlatformModal(true)}
                    disabled={isLoading}
                    className="w-full p-3 text-left text-xs font-bold text-gray-700 border border-gray-150 rounded-xl hover:bg-gray-50 flex items-center justify-between disabled:opacity-50 cursor-pointer group"
                  >
                    <span className="flex items-center gap-2">
                      <span>🔄</span> Optimize for social media
                      <span className="text-[10px] font-medium text-purple-500 capitalize">
                        ({PLATFORM_OPTIONS.find(o => o.value === refinePlatform)?.emoji} {PLATFORM_OPTIONS.find(o => o.value === refinePlatform)?.label})
                      </span>
                    </span>
                    <ChevronDown size={13} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
                  </button>

                  {/* Action 10: Change structure */}
                  <button
                    onClick={() => handleRefine("structure")}
                    disabled={isLoading}
                    className="w-full p-3 text-left text-xs font-bold text-gray-700 border border-gray-150 rounded-xl hover:bg-gray-50 flex items-center justify-between disabled:opacity-50"
                  >
                    <span>📊 Change structure</span>
                  </button>

                  {/* Action 11: Adjust instructions (Premium) */}
                  <div className="border border-gray-150 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setActiveRefineAction(activeRefineAction === "adjust" ? null : "adjust")}
                      className="w-full p-3 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1.5">
                        ➕ Adjust instructions
                        <span className="text-[9px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-black tracking-wide">💎</span>
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">➔</span>
                    </button>
                    {activeRefineAction === "adjust" && (
                      <div className="p-3 bg-gray-50 border-t border-gray-100 flex flex-col gap-2">
                        <textarea
                          value={refineCustomInstructions}
                          onChange={(e) => setRefineCustomInstructions(e.target.value)}
                          placeholder="Nhập yêu cầu điều chỉnh đặc biệt cho AI (Ví dụ: Thêm dòng mở đầu hấp dẫn, viết lại dưới dạng bài thơ...)"
                          className="w-full h-20 p-2 rounded-lg border border-gray-200 text-xs font-medium bg-white resize-none"
                        />
                        <button
                          onClick={() => handleRefine("adjust", { customInstructions: refineCustomInstructions })}
                          disabled={isLoading || !refineCustomInstructions.trim()}
                          className="py-1.5 bg-black text-white text-[9px] font-black uppercase tracking-wider rounded-lg cursor-pointer hover:bg-gray-800 disabled:opacity-50"
                        >
                          Áp dụng chỉ dẫn
                        </button>
                      </div>
                    )}
                  </div>

                </div>

                {/* Restart Button */}
                <button
                  onClick={handleRestart}
                  disabled={isLoading}
                  className="w-full mt-auto py-2.5 border border-red-200 hover:bg-red-50 text-red-600 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={12} />
                  Restart
                </button>
              </div>
            )}
            
          </div>

        </div>

      </div>

      {/* ── Selection Modals ── */}
      <SelectionModal
        isOpen={showToneModal}
        onClose={() => setShowToneModal(false)}
        title="Choose a tone"
        options={TONE_OPTIONS}
        value={tone}
        onChange={setTone}
      />
      <SelectionModal
        isOpen={showPlatformModal}
        onClose={() => setShowPlatformModal(false)}
        title="Optimize for Social media"
        options={PLATFORM_OPTIONS}
        value={targetPlatforms}
        onChange={(vals) => {
          setTargetPlatforms(vals);
          if (vals.length > 0 && !vals.includes(previewPlatform)) {
            setPreviewPlatform(vals[0]);
          }
        }}
        isMulti={true}
      />
      <SelectionModal
        isOpen={showRefineToneModal}
        onClose={() => setShowRefineToneModal(false)}
        title="Change tone"
        options={TONE_OPTIONS}
        value={refineTone}
        onChange={(val) => {
          setRefineTone(val);
          handleRefine("change_tone", { targetTone: val });
        }}
      />
      <SelectionModal
        isOpen={showRefinePlatformModal}
        onClose={() => setShowRefinePlatformModal(false)}
        title="Optimize for Social media"
        options={PLATFORM_OPTIONS}
        value={refinePlatform}
        onChange={(val) => {
          setRefinePlatform(val);
          setPreviewPlatform(val);
          
          // Thêm platform mới vào list targetPlatforms nếu chưa có
          if (!targetPlatforms.includes(val)) {
            setTargetPlatforms([...targetPlatforms, val]);
          }
          
          handleRefine("optimize", { targetPlatform: val });
        }}
      />
    </div>
  );
}
