import React, { useState, useEffect, useRef } from "react";
import { Sparkles, X, Check, Copy, RefreshCw, MessageSquare, Info, ChevronDown, ThumbsUp, ThumbsDown, ChevronRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import aiService from "../../../../services/ai.service";
import { useBrand } from "../../../../context/BrandContext";
import { PlatformIcon } from "../../../shared/PlatformIcon";

const PLATFORM_OPTIONS = [
  { id: "facebook", name: "Facebook" },
  { id: "instagram", name: "Instagram" },
  { id: "threads", name: "Threads" },
  { id: "bluesky", name: "Bluesky" },
  { id: "tiktok", name: "TikTok" },
  { id: "youtube", name: "YouTube" },
  { id: "any", name: "Any Social media" },
];

const TONE_OPTIONS = [
  { id: "AFFECTIONATE", name: "Affectionate", emoji: "😘" },
  { id: "CREATIVE", name: "Creative", emoji: "🎨" },
  { id: "DESCRIPTIVE", name: "Descriptive", emoji: "📖" },
  { id: "DRAMATIC", name: "Dramatic", emoji: "😱" },
  { id: "EDUCATIONAL", name: "Educational", emoji: "✏️" },
  { id: "EMPHATIC", name: "Emphatic", emoji: "🤗" },
  { id: "FORMAL", name: "Formal", emoji: "🥸" },
  { id: "HUMOROUS", name: "Humorous", emoji: "😁" },
  { id: "INFORMAL", name: "Informal", emoji: "😜" },
  { id: "IRONIC", name: "Ironic", emoji: "😏" },
  { id: "MELANCHOLIC", name: "Melancholic", emoji: "🥲" },
  { id: "POSITIVE", name: "Positive", emoji: "😊" },
  { id: "SCIENTIFIC", name: "Scientific", emoji: "🧪" },
];

export function AICopilotPopover({ caption, onUpdateCaption, activePlatform, onClose }) {
  const { activeBrand } = useBrand();
  
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("CREATIVE");
  const [language, setLanguage] = useState("vi");
  const [format, setFormat] = useState("Caption");
  const [targetPlatform, setTargetPlatform] = useState(activePlatform?.toLowerCase() || "any");
  
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [showToneModal, setShowToneModal] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [creditsLimit, setCreditsLimit] = useState(10);
  const [creditsUsed, setCreditsUsed] = useState(0);

  // Chat History thread
  const [chatHistory, setChatHistory] = useState([
    {
      id: "welcome",
      role: "ai",
      title: "Hello! I'm your AI assistant.",
      subtitle: "Fill in the fields and I'll generate a text for you to customize as your own. Let's get started!",
      content: null
    }
  ]);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isLoading]);

  // Load current settings & session history on mount
  useEffect(() => {
    if (activeBrand?.id) {
      loadSettings();
      const savedSession = sessionStorage.getItem(`ai_copilot_history_${activeBrand.id}`);
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setChatHistory(parsed);
          }
        } catch (e) {
          console.error("Failed to parse saved AI session", e);
        }
      }
    }
  }, [activeBrand?.id]);

  // Persist session history on update
  useEffect(() => {
    if (activeBrand?.id && chatHistory.length > 0) {
      sessionStorage.setItem(`ai_copilot_history_${activeBrand.id}`, JSON.stringify(chatHistory));
    }
  }, [chatHistory, activeBrand?.id]);

  const loadSettings = async () => {
    try {
      const res = await aiService.getSettings(activeBrand.id);
      const data = res || {};
      setCreditsLimit(data.creditsLimit ? Math.min(data.creditsLimit, 10) : 10);
      setCreditsUsed(data.creditsUsed || 0);
      if (data.defaultTone) setTone(data.defaultTone);
      if (data.defaultLanguage) setLanguage(data.defaultLanguage);
    } catch (err) {
      console.error("Failed to load AI settings:", err);
    }
  };

  const getLatestResult = () => {
    const aiMsgs = chatHistory.filter(m => m.role === "ai" && m.content);
    return aiMsgs.length > 0 ? aiMsgs[aiMsgs.length - 1].content : "";
  };

  const handleGenerate = async (mode = "generate", overrideTone = null, overridePlatform = null) => {
    if (!activeBrand?.id) {
      toast.error("Vui lòng chọn một thương hiệu trước.");
      return;
    }

    const effectiveTone = overrideTone || tone;
    const effectivePlatform = overridePlatform || targetPlatform;
    const toneObjToUse = TONE_OPTIONS.find(t => t.id === effectiveTone) || TONE_OPTIONS[1];
    const platformObjToUse = PLATFORM_OPTIONS.find(p => p.id === effectivePlatform);

    const currentResult = getLatestResult();
    let finalPrompt = prompt;
    let userMessageText = "";

    if (mode === "rewrite") {
      if (!caption.trim()) {
        toast.error("Vui lòng nhập văn bản hiện tại trước khi yêu cầu viết lại.");
        return;
      }
      finalPrompt = `Viết lại bài viết sau đây để tối ưu hóa tương tác, giữ nguyên ý chính:\n\n"${caption}"`;
      userMessageText = `Rewrite current caption in ${language === "vi" ? "Vietnamese" : "English"}`;
    } else if (mode === "shorten") {
      if (!currentResult.trim()) return;
      finalPrompt = `Dựa trên bài viết hiện tại sau đây:\n\n"${currentResult}"\n\nHãy rút ngắn lại thành một phiên bản ngắn gọn, súc tích hơn.`;
      userMessageText = "Can you make this text shorter?";
    } else if (mode === "expand") {
      if (!currentResult.trim()) return;
      finalPrompt = `Dựa trên bài viết hiện tại sau đây:\n\n"${currentResult}"\n\nHãy viết mở rộng bài viết này, bổ sung chi tiết và lập luận hấp dẫn hơn.`;
      userMessageText = "Can you make this text longer?";
    } else if (mode === "add_emoji") {
      if (!currentResult.trim()) return;
      finalPrompt = `Dựa trên bài viết hiện tại sau đây:\n\n"${currentResult}"\n\nHãy bổ sung các biểu tượng cảm xúc (emoji) sinh động, phù hợp vào bài viết mà giữ nguyên câu từ gốc.`;
      userMessageText = "Can you add emojis to this text?";
    } else if (mode === "hook") {
      if (!currentResult.trim()) return;
      finalPrompt = `Dựa trên bài viết hiện tại sau đây:\n\n"${currentResult}"\n\nHãy tạo một câu tiêu đề/mở đầu (Hook) cực kỳ giật tít và thu hút đặt lên đầu bài viết.`;
      userMessageText = "Can you generate a catchy hook for this text?";
    } else if (mode === "correct") {
      if (!currentResult.trim()) return;
      finalPrompt = `Dựa trên bài viết hiện tại sau đây:\n\n"${currentResult}"\n\nHãy sửa toàn bộ lỗi chính tả, ngữ pháp và tinh chỉnh văn phong mượt mà.`;
      userMessageText = "Can you correct spelling and grammar in this text?";
    } else if (mode === "cta") {
      if (!currentResult.trim()) return;
      finalPrompt = `Dựa trên bài viết hiện tại sau đây:\n\n"${currentResult}"\n\nHãy bổ sung câu kêu gọi hành động (Call to Action - CTA) mạnh mẽ ở cuối bài viết.`;
      userMessageText = "Can you add a strong Call to Action (CTA)?";
    } else if (mode === "translate") {
      if (!currentResult.trim()) return;
      const targetLang = language === "vi" ? "English" : "Vietnamese";
      finalPrompt = `Dịch bài viết hiện tại sau đây sang tiếng ${targetLang} một cách tự nhiên:\n\n"${currentResult}"`;
      userMessageText = `Can you translate this text into ${targetLang}?`;
    } else if (mode === "hashtag") {
      const textForHashtag = currentResult.trim() || caption.trim() || prompt.trim();
      if (!textForHashtag) {
        toast.error("Vui lòng nhập văn bản hoặc ý tưởng trước khi gợi ý hashtag.");
        return;
      }
      finalPrompt = `Gợi ý bộ hashtag phù hợp nhất dựa trên nội dung sau:\n\n"${textForHashtag}"`;
      userMessageText = "Can you suggest relevant hashtags?";
    } else {
      if (currentResult.trim()) {
        finalPrompt = `Dựa trên bài viết hiện tại sau đây:\n\n"${currentResult}"\n\nHãy điều chỉnh và viết lại bài viết này với phong cách giọng điệu ${toneObjToUse.name} và định dạng phù hợp cho ${platformObjToUse?.name || 'mạng xã hội'}.`;
        userMessageText = `Update text with ${toneObjToUse.name} tone and ${platformObjToUse?.name || 'social media'} optimization`;
      } else if (!prompt.trim()) {
        toast.error("Vui lòng nhập chủ đề hoặc ý tưởng bài viết.");
        return;
      } else {
        userMessageText = `Can you generate a text about "${prompt}", in ${language === 'vi' ? 'Vietnamese' : 'English'}, with a ${toneObjToUse.name.toLowerCase()} tone and optimized for ${platformObjToUse?.name || 'social media'}?`;
      }
    }

    // Append User Message to Thread
    const userMsgObj = {
      id: Date.now() + "_user",
      role: "user",
      text: userMessageText
    };
    setChatHistory(prev => [...prev, userMsgObj]);

    setIsLoading(true);
    const platformToUse = effectivePlatform === "any" ? (activePlatform || "facebook") : effectivePlatform;

    try {
      const res = await aiService.generateContent(activeBrand.id, {
        prompt: finalPrompt,
        tone: effectiveTone,
        platform: platformToUse.toLowerCase(),
        language: language,
        genre: format
      });

      let generatedText = "";
      let tags = res.suggestedHashtags || [];

      if (mode === "hashtag") {
        generatedText = tags.join(" ");
      } else {
        generatedText = res.platformSpecificAdjustments?.[platformToUse.toLowerCase()] || res.caption;
      }

      // Append AI Response Message to Thread
      const aiMsgObj = {
        id: Date.now() + "_ai",
        role: "ai",
        title: mode === "expand" ? "Certainly, here's a longer text:" : mode === "shorten" ? "Certainly, here's a shorter text:" : mode === "add_emoji" ? "Certainly, here's the text with emojis added:" : "Of course! Here is the text with the instructions indicated:",
        content: generatedText,
        hashtags: mode === "hashtag" ? [] : tags
      };

      setChatHistory(prev => [...prev, aiMsgObj]);
      setCreditsUsed(res.creditsUsed || 0);
      setCreditsLimit(res.creditsLimit ? Math.min(res.creditsLimit, 10) : 10);
      toast.success("Tạo/Tối ưu nội dung AI thành công!");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Không thể tạo nội dung từ AI.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseText = (text, hashtags = []) => {
    if (!text) return;
    const finalContent = hashtags.length > 0 && !text.includes(hashtags[0])
      ? `${text}\n\n${hashtags.join(" ")}`
      : text;
    onUpdateCaption(finalContent);
    toast.success("Đã áp dụng văn bản vào bài viết!");
    onClose();
  };

  const handleRestart = () => {
    const initial = [
      {
        id: "welcome",
        role: "ai",
        title: "Hello! I'm your AI assistant.",
        subtitle: "Fill in the fields and I'll generate a text for you to customize as your own. Let's get started!",
        content: null
      }
    ];
    setChatHistory(initial);
    if (activeBrand?.id) {
      sessionStorage.removeItem(`ai_copilot_history_${activeBrand.id}`);
    }
    setPrompt("");
    toast.info("Đã bắt đầu lại cuộc hội thoại.");
  };

  const remainingCredits = Math.max(0, creditsLimit - creditsUsed);
  const currentToneObj = TONE_OPTIONS.find(t => t.id === tone) || TONE_OPTIONS[1];
  const hasGeneratedText = chatHistory.some(m => m.role === "ai" && m.content);

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
      {/* Modal Dialog Box */}
      <div className="w-full max-w-4xl bg-white rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-xs border border-purple-100/50">
              <Sparkles size={18} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-900 tracking-tight">Text generator with AI</h2>
              <p className="text-[11px] text-gray-400 font-bold">Tối ưu hóa bài viết cho {PLATFORM_OPTIONS.find(p => p.id === targetPlatform)?.name || 'mạng xã hội'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Credits Counter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200/80 rounded-xl text-xs font-bold text-gray-600">
              <span>Available AI credits:</span>
              <span className="text-purple-600 font-black">{remainingCredits} of {creditsLimit}</span>
              <Info size={14} className="text-gray-400 hover:text-gray-700 cursor-pointer ml-0.5" title="Mỗi lượt tạo tiêu tốn 1 Credit" />
            </div>

            {/* Dark Close Button */}
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#18111B] text-white flex items-center justify-center hover:bg-black transition-all cursor-pointer shadow-xs hover:scale-105"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Modal Body - 2 Columns */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* Left Column: Chat Thread Feed */}
          <div className="md:w-[56%] p-5 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/40 flex flex-col justify-between overflow-y-auto scrollbar-thin">
            
            <div className="space-y-4">
              {chatHistory.map((item) => {
                if (item.role === "user") {
                  return (
                    <div key={item.id} className="flex justify-end gap-2.5 my-3 animate-in fade-in">
                      <div className="bg-[#E8F1FC] text-gray-800 text-xs font-medium rounded-2xl rounded-tr-xs p-3.5 max-w-[85%] border border-blue-100/60 shadow-2xs leading-relaxed">
                        {item.text}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-pink-500 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs mt-1">
                        C
                      </div>
                    </div>
                  );
                }

                // AI Message Card
                return (
                  <div key={item.id} className="my-3 animate-in fade-in">
                    <div className="flex items-start gap-2.5">
                      {/* AI Avatar */}
                      <div className="w-8 h-8 rounded-xl bg-[#211624] text-purple-300 flex items-center justify-center shrink-0 shadow-xs border border-purple-900/30">
                        <Sparkles size={16} />
                      </div>

                      <div className="flex-1 bg-[#211624] text-white rounded-[22px] p-4 shadow-md border border-purple-900/30 overflow-hidden">
                        {item.title && (
                          <h3 className="text-xs font-black text-white mb-1.5">{item.title}</h3>
                        )}

                        {item.subtitle && (
                          <p className="text-xs text-gray-300 font-normal leading-relaxed">
                            {item.subtitle}
                          </p>
                        )}

                        {item.content && (
                          <div className="bg-white text-gray-900 rounded-xl p-3.5 mt-2.5 text-xs font-medium leading-relaxed max-h-[280px] overflow-y-auto scrollbar-thin shadow-xs border border-gray-100">
                            <div className="whitespace-pre-wrap">{item.content}</div>
                            {item.hashtags && item.hashtags.length > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-gray-100 text-purple-600 font-bold">
                                {item.hashtags.join(" ")}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Card Action Footer */}
                        {item.content && (
                          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-purple-900/40">
                            <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium">
                              <span>Rank this answer</span>
                              <button className="p-1 hover:text-white transition-colors cursor-pointer"><ThumbsUp size={13} /></button>
                              <button className="p-1 hover:text-white transition-colors cursor-pointer"><ThumbsDown size={13} /></button>
                            </div>
                            
                            <button
                              onClick={() => handleUseText(item.content, item.hashtags)}
                              className="px-4 py-1.5 rounded-xl bg-white hover:bg-gray-100 text-gray-900 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                            >
                              Use text
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-start gap-2.5 my-3 animate-in fade-in">
                  <div className="w-8 h-8 rounded-xl bg-[#211624] text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                    <RefreshCw size={16} className="animate-spin" />
                  </div>
                  <div className="bg-[#211624] text-gray-300 rounded-[20px] p-4 text-xs font-bold flex items-center gap-2 shadow-md">
                    <span>Đang suy nghĩ & tạo nội dung...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

          </div>

          {/* Right Column: Dynamic Form vs Refinement Action List */}
          <div className="md:w-[44%] p-6 flex flex-col justify-between bg-white overflow-y-auto scrollbar-thin gap-5">
            
            {hasGeneratedText ? (
              /* Action List Mode (Matching Screenshot 100%) */
              <div className="space-y-2 animate-in fade-in">
                
                <button
                  onClick={() => handleGenerate("translate")}
                  disabled={isLoading}
                  className="w-full p-3 px-4 rounded-xl border border-gray-200/90 hover:border-purple-300 hover:bg-purple-50/40 text-gray-800 text-xs font-bold transition-all flex items-center justify-between bg-white cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">🌐</span>
                    <span>Translate</span>
                  </div>
                  <ChevronRight size={15} className="text-gray-400" />
                </button>

                <button
                  onClick={() => handleGenerate("cta")}
                  disabled={isLoading}
                  className="w-full p-3 px-4 rounded-xl border border-gray-200/90 hover:border-purple-300 hover:bg-purple-50/40 text-gray-800 text-xs font-bold transition-all flex items-center justify-between bg-white cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">🎯</span>
                    <span>Add CTA</span>
                  </div>
                  <ChevronRight size={15} className="text-gray-400" />
                </button>

                <button
                  onClick={() => handleGenerate("hashtag")}
                  disabled={isLoading}
                  className="w-full p-3 px-4 rounded-xl border border-gray-200/90 hover:border-purple-300 hover:bg-purple-50/40 text-gray-800 text-xs font-bold transition-all flex items-center justify-between bg-white cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">#</span>
                    <span>Add hashtags</span>
                  </div>
                  <ChevronRight size={15} className="text-gray-400" />
                </button>

                <button
                  onClick={() => handleGenerate("expand")}
                  disabled={isLoading}
                  className="w-full p-3 px-4 rounded-xl border border-gray-200/90 hover:border-purple-300 hover:bg-purple-50/40 text-gray-800 text-xs font-bold transition-all flex items-center justify-between bg-white cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">☰</span>
                    <span>Lengthen text</span>
                  </div>
                  <ChevronRight size={15} className="text-gray-400" />
                </button>

                <button
                  onClick={() => handleGenerate("shorten")}
                  disabled={isLoading}
                  className="w-full p-3 px-4 rounded-xl border border-gray-200/90 hover:border-purple-300 hover:bg-purple-50/40 text-gray-800 text-xs font-bold transition-all flex items-center justify-between bg-white cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">=</span>
                    <span>Shorten text</span>
                  </div>
                  <ChevronRight size={15} className="text-gray-400" />
                </button>

                <button
                  onClick={() => setShowToneModal(true)}
                  className="w-full p-3 px-4 rounded-xl border border-gray-200/90 hover:border-purple-300 hover:bg-purple-50/40 text-gray-800 text-xs font-bold transition-all flex items-center justify-between bg-white cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">😊</span>
                    <span>Change tone</span>
                  </div>
                  <ChevronRight size={15} className="text-gray-400" />
                </button>

                <button
                  onClick={() => handleGenerate("add_emoji")}
                  disabled={isLoading}
                  className="w-full p-3 px-4 rounded-xl border border-gray-200/90 hover:border-purple-300 hover:bg-purple-50/40 text-gray-800 text-xs font-bold transition-all flex items-center justify-between bg-white cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">🎭</span>
                    <span>Add emojis</span>
                  </div>
                  <ChevronRight size={15} className="text-gray-400" />
                </button>

                <button
                  onClick={() => handleGenerate("correct")}
                  disabled={isLoading}
                  className="w-full p-3 px-4 rounded-xl border border-gray-200/90 hover:border-purple-300 hover:bg-purple-50/40 text-gray-800 text-xs font-bold transition-all flex items-center justify-between bg-white cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">🔤</span>
                    <span>Correct text</span>
                  </div>
                  <ChevronRight size={15} className="text-gray-400" />
                </button>

                <button
                  onClick={() => setShowPlatformModal(true)}
                  className="w-full p-3 px-4 rounded-xl border border-gray-200/90 hover:border-purple-300 hover:bg-purple-50/40 text-gray-800 text-xs font-bold transition-all flex items-center justify-between bg-white cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">📢</span>
                    <span>Optimize for social media</span>
                  </div>
                  <ChevronRight size={15} className="text-gray-400" />
                </button>

                <button
                  onClick={handleRestart}
                  className="w-full p-3 px-4 rounded-xl border border-gray-200/90 hover:border-purple-300 hover:bg-purple-50/40 text-gray-800 text-xs font-bold transition-all flex items-center justify-between bg-white cursor-pointer mt-2 text-red-600"
                >
                  <div className="flex items-center gap-3">
                    <RotateCcw size={16} className="text-red-500" />
                    <span>Restart</span>
                  </div>
                  <ChevronRight size={15} className="text-gray-400" />
                </button>

              </div>
            ) : (
              /* Input Form Mode */
              <div className="space-y-4">
                
                {/* Field 1: Topic Textarea */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-gray-900">
                    Write the topic of the text to generate.
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="E.g. Five benefits of having Labrador dogs at home..."
                    className="w-full h-24 p-3.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 resize-none transition-all"
                  />
                </div>

                {/* Field 2: Tone Selection Button & Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700">
                    Choose a tone
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowToneModal(true)}
                    className="w-full p-2.5 px-3.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 flex items-center justify-between bg-white hover:border-gray-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{currentToneObj.emoji}</span>
                      <span>{currentToneObj.name}</span>
                    </div>
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>
                </div>

                {/* Field 3: Language */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 focus:outline-none focus:border-purple-600 bg-white cursor-pointer"
                  >
                    <option value="vi">Vietnamese</option>
                    <option value="en">English</option>
                  </select>
                </div>

                {/* Field 4: Optimize for Social media (Click opens modal) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700">
                    Optimize for Social media
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPlatformModal(true)}
                    className="w-full p-2.5 px-3.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 flex items-center justify-between bg-white hover:border-gray-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      {targetPlatform !== "any" ? (
                        <PlatformIcon platform={PLATFORM_OPTIONS.find(p => p.id === targetPlatform)?.name || targetPlatform} size={20} />
                      ) : null}
                      <span>{PLATFORM_OPTIONS.find(p => p.id === targetPlatform)?.name || "Any Social media"}</span>
                    </div>
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>
                </div>

                {/* Field 5: Format */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700">
                    Định dạng bài viết (Format)
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 focus:outline-none focus:border-purple-600 bg-white cursor-pointer"
                  >
                    <option value="Caption">Caption ngắn</option>
                    <option value="Article">Bài viết chi tiết</option>
                    <option value="Story">Kịch bản ngắn (Reels/Shorts)</option>
                    <option value="Hook">Tiêu đề gây chú ý</option>
                  </select>
                </div>

              </div>
            )}

            {/* Bottom CTA Button */}
            {!hasGeneratedText && (
              <div className="pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleGenerate("generate")}
                  disabled={isLoading || !prompt.trim()}
                  className="w-full py-3 px-4 rounded-xl text-xs font-extrabold tracking-wide transition-all duration-200 shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: prompt.trim() && !isLoading ? '#18111B' : '#DFE2E8',
                    color: prompt.trim() && !isLoading ? '#FFFFFF' : '#888F9D'
                  }}
                >
                  {isLoading ? <RefreshCw size={14} className="animate-spin text-white" /> : <Sparkles size={14} />}
                  <span>Generate text</span>
                </button>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Tone Selection Modal */}
      {showToneModal && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-[24px] shadow-2xl p-6 relative font-sans animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <h3 className="text-base font-extrabold text-gray-900">
                Choose a tone
              </h3>
              <button
                onClick={() => setShowToneModal(false)}
                className="w-8 h-8 rounded-full bg-[#18111B] text-white flex items-center justify-center hover:bg-black transition-all cursor-pointer shadow-xs"
              >
                <X size={15} />
              </button>
            </div>

            {/* Tone List */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
              {TONE_OPTIONS.map((t) => {
                const isSelected = tone === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setTone(t.id);
                      setShowToneModal(false);
                      if (hasGeneratedText) {
                        handleGenerate("generate", t.id, null);
                      }
                    }}
                    className={`p-3 px-4 border rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/20 shadow-2xs"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{t.emoji}</span>
                      <span className="text-sm font-bold text-gray-800">
                        {t.name}
                      </span>
                    </div>

                    {/* Radio Button */}
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-indigo-600 border-2 border-indigo-600"
                          : "border-2 border-gray-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Social Media Selection Modal */}
      {showPlatformModal && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-[24px] shadow-2xl p-6 relative font-sans animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <h3 className="text-base font-extrabold text-gray-900">
                Optimize for Social media
              </h3>
              <button
                onClick={() => setShowPlatformModal(false)}
                className="w-8 h-8 rounded-full bg-[#18111B] text-white flex items-center justify-center hover:bg-black transition-all cursor-pointer shadow-xs"
              >
                <X size={15} />
              </button>
            </div>

            {/* Platform List */}
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
              {PLATFORM_OPTIONS.map((plat) => {
                const isSelected = targetPlatform === plat.id;
                return (
                  <div
                    key={plat.id}
                    onClick={() => {
                      setTargetPlatform(plat.id);
                      setShowPlatformModal(false);
                      if (hasGeneratedText) {
                        handleGenerate("generate", null, plat.id);
                      }
                    }}
                    className={`p-3.5 px-4 border rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/20 shadow-2xs"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {plat.id !== "any" ? (
                        <PlatformIcon platform={plat.name} size={28} />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 font-bold text-xs">
                          🌐
                        </div>
                      )}
                      <span className="text-sm font-bold text-gray-800">
                        {plat.name}
                      </span>
                    </div>

                    {/* Radio Button */}
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-indigo-600 border-2 border-indigo-600"
                          : "border-2 border-gray-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


