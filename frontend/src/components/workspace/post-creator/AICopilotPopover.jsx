import React, { useState, useEffect } from "react";
import { Sparkles, X, ChevronRight, Check, Copy, RefreshCw, MessageSquare, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import apiService from "../../../services/api";
import { useBrand } from "../../../context/BrandContext";

export function AICopilotPopover({ caption, onUpdateCaption, activePlatform, onClose }) {
  const { activeBrand } = useBrand();
  
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("PROFESSIONAL");
  const [language, setLanguage] = useState("vi");
  const [format, setFormat] = useState("Caption");
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState("");
  const [suggestedHashtags, setSuggestedHashtags] = useState([]);
  const [copied, setCopied] = useState(false);
  
  // Credits status
  const [creditsLimit, setCreditsLimit] = useState(1000);
  const [creditsUsed, setCreditsUsed] = useState(0);

  // Load current settings on mount
  useEffect(() => {
    if (activeBrand?.id) {
      loadSettings();
    }
  }, [activeBrand?.id]);

  const loadSettings = async () => {
    try {
      const res = await apiService.get(`/ai/settings?brandId=${activeBrand.id}`);
      setCreditsLimit(res.data.creditsLimit || 1000);
      setCreditsUsed(res.data.creditsUsed || 0);
      if (res.data.defaultTone) setTone(res.data.defaultTone);
      if (res.data.defaultLanguage) setLanguage(res.data.defaultLanguage);
    } catch (err) {
      console.error("Failed to load AI settings:", err);
    }
  };

  const handleGenerate = async (mode = "generate") => {
    if (!activeBrand?.id) {
      toast.error("Vui lòng chọn một thương hiệu trước.");
      return;
    }

    let finalPrompt = prompt;
    if (mode === "rewrite") {
      if (!caption.trim()) {
        toast.error("Vui lòng nhập văn bản hiện tại trước khi yêu cầu viết lại.");
        return;
      }
      finalPrompt = `Viết lại bài viết sau đây để tối ưu hóa tương tác, giữ nguyên ý chính:\n\n"${caption}"`;
    } else if (mode === "hashtag") {
      if (!caption.trim()) {
        toast.error("Vui lòng nhập văn bản hiện tại trước khi yêu cầu gợi ý hashtag.");
        return;
      }
      finalPrompt = `Gợi ý bộ hashtag phù hợp nhất cho bài viết sau:\n\n"${caption}"`;
    } else if (!prompt.trim()) {
      toast.error("Vui lòng nhập ý tưởng hoặc yêu cầu của bạn.");
      return;
    }

    setIsLoading(true);
    setResult("");
    setSuggestedHashtags([]);

    try {
      const res = await apiService.post(`/ai/generate?brandId=${activeBrand.id}`, {
        prompt: finalPrompt,
        tone: tone,
        platform: activePlatform.toLowerCase(),
        language: language,
        genre: format
      }, {
        timeout: 60000
      });

      // If we only generated hashtags, append them
      if (mode === "hashtag") {
        const tags = res.data.suggestedHashtags || [];
        setSuggestedHashtags(tags);
        setResult(tags.join(" "));
      } else {
        // Platform specific adjustment or general caption
        const adjustedText = res.data.platformSpecificAdjustments?.[activePlatform.toLowerCase()] || res.data.caption;
        setResult(adjustedText);
        setSuggestedHashtags(res.data.suggestedHashtags || []);
      }

      setCreditsUsed(res.data.creditsUsed || 0);
      setCreditsLimit(res.data.creditsLimit || 1000);
      toast.success("Tạo nội dung AI thành công!");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Không thể tạo nội dung từ AI.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyReplace = () => {
    if (!result) return;
    const finalContent = suggestedHashtags.length > 0 && !result.includes(suggestedHashtags[0])
      ? `${result}\n\n${suggestedHashtags.join(" ")}`
      : result;
    onUpdateCaption(finalContent);
    toast.success("Đã thay thế văn bản soạn thảo!");
  };

  const handleApplyAppend = () => {
    if (!result) return;
    const finalContent = suggestedHashtags.length > 0 && !result.includes(suggestedHashtags[0])
      ? `${result}\n\n${suggestedHashtags.join(" ")}`
      : result;
    const newCaption = caption.trim() 
      ? `${caption}\n\n${finalContent}`
      : finalContent;
    onUpdateCaption(newCaption);
    toast.success("Đã chèn thêm vào cuối văn bản soạn thảo!");
  };

  const handleCopy = () => {
    if (!result) return;
    const finalContent = suggestedHashtags.length > 0 && !result.includes(suggestedHashtags[0])
      ? `${result}\n\n${suggestedHashtags.join(" ")}`
      : result;
    navigator.clipboard.writeText(finalContent);
    setCopied(true);
    toast.success("Đã sao chép vào clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const remainingCredits = Math.max(0, creditsLimit - creditsUsed);

  return (
    <div className="absolute bottom-16 left-6 z-50 w-[420px] bg-white rounded-[24px] border border-gray-200/90 shadow-2xl p-5 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900">AI Copilot Assistant</h3>
            <p className="text-[10px] text-gray-500 font-medium">Tối ưu hóa bài viết cho {activePlatform}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Input / Command Area */}
      <div className="flex flex-col gap-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Nhập ý tưởng viết bài hoặc yêu cầu cho AI (Ví dụ: Viết bài chia sẻ mẹo học tốt)..."
          className="w-full h-20 p-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
        />
        
        {/* Advanced Settings */}
        <div className="grid grid-cols-3 gap-2">
          {/* Tone */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Giọng điệu</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full p-2 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-700 focus:outline-none focus:border-purple-500"
            >
              <option value="PROFESSIONAL">💼 Chuyên nghiệp</option>
              <option value="CASUAL">✨ Thân thiện</option>
              <option value="FUNNY">😂 Hài hước</option>
              <option value="INSPIRATIONAL">🌟 Truyền cảm hứng</option>
              <option value="URGENT">🚨 Khẩn cấp</option>
              <option value="EDUCATIONAL">💡 Học thuật</option>
            </select>
          </div>

          {/* Format */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Định dạng</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full p-2 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-700 focus:outline-none focus:border-purple-500"
            >
              <option value="Caption">📝 Caption ngắn</option>
              <option value="Article">📰 Bài viết dài</option>
              <option value="Story">⚡ Kịch bản ngắn</option>
              <option value="Hook">🎯 Tiêu đề gây chú ý</option>
            </select>
          </div>

          {/* Language */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Ngôn ngữ</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full p-2 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-700 focus:outline-none focus:border-purple-500"
            >
              <option value="vi">🇻🇳 Tiếng Việt</option>
              <option value="en">🇺🇸 Tiếng Anh</option>
            </select>
          </div>
        </div>
      </div>

      {/* Action triggers */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-50">
        <button
          onClick={() => handleGenerate("generate")}
          disabled={isLoading}
          className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-purple-100 disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
          Viết bài mới
        </button>
        <button
          onClick={() => handleGenerate("rewrite")}
          disabled={isLoading || !caption.trim()}
          className="py-2 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-[10px] font-bold transition-all flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
        >
          <RefreshCw size={12} />
          Viết lại
        </button>
        <button
          onClick={() => handleGenerate("hashtag")}
          disabled={isLoading || !caption.trim()}
          className="py-2 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-[10px] font-bold transition-all flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
        >
          # Hashtags
        </button>
      </div>

      {/* Result Display */}
      {(result || isLoading) && (
        <div className="flex flex-col gap-2.5 bg-gray-50 rounded-xl p-3 border border-gray-150 relative">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kết quả gợi ý từ AI:</div>
          
          {isLoading ? (
            <div className="h-20 flex flex-col items-center justify-center gap-2">
              <RefreshCw size={20} className="text-purple-600 animate-spin" />
              <span className="text-[10px] font-semibold text-gray-500 animate-pulse">Đang suy nghĩ...</span>
            </div>
          ) : (
            <>
              <div className="text-xs font-semibold text-gray-800 whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed pr-8">
                {result}
                {suggestedHashtags.length > 0 && !result.includes(suggestedHashtags[0]) && (
                  <div className="mt-2 text-purple-600 font-bold">
                    {suggestedHashtags.join(" ")}
                  </div>
                )}
              </div>

              {/* Copy floating button */}
              <button 
                onClick={handleCopy}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-800 transition-colors shadow-sm cursor-pointer"
                title="Sao chép"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              </button>

              {/* Action Apply options */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200/50 mt-1">
                <button
                  onClick={handleApplyReplace}
                  className="flex-1 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white font-bold text-[9px] transition-colors cursor-pointer"
                >
                  Thay thế văn bản soạn thảo
                </button>
                <button
                  onClick={handleApplyAppend}
                  className="flex-1 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold text-[9px] transition-colors cursor-pointer"
                >
                  Chèn thêm vào cuối
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Credit balance footer */}
      <div className="flex items-center justify-between text-[9px] text-gray-400 font-bold pt-1">
        <span className="flex items-center gap-1">
          <AlertCircle size={10} />
          Mỗi lượt tạo tiêu tốn 1 Credit
        </span>
        <span>Hạn mức: {remainingCredits} / {creditsLimit} Credits còn lại</span>
      </div>
    </div>
  );
}
