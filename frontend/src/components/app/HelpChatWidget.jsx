import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, FileText } from "lucide-react";
import { toast } from "sonner";
import helpCenterService from "../../services/helpCenter.service";

const GREETING = {
  role: "agent",
  text: "Chào bạn! Mình có thể giúp gì về PubliCast? Hỏi mình bất cứ điều gì nhé.",
  time: ""
};

export function HelpChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const nowLabel = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const handleSend = async () => {
    const question = input.trim();
    if (!question || isAsking) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: question, time: nowLabel() }]);
    setIsAsking(true);
    try {
      const result = await helpCenterService.askQuestion(question);
      setMessages((prev) => [...prev, { role: "agent", text: result.answer, sources: result.sources, time: nowLabel() }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "agent", text: "Xin lỗi, mình chưa thể trả lời câu hỏi này.", time: nowLabel() }]);
      toast.error(err.message || "Không thể lấy câu trả lời");
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end font-sans">
      {isOpen && (
        <div className="mb-4 w-[320px] h-[440px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-[#2D1D35] p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-pink-500 flex items-center justify-center border-2 border-white/20">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="text-sm font-bold">Trợ lý Help Center</div>
                <div className="text-[10px] text-white/60">Trả lời tức thì từ AI</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Conversation */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] space-y-1 flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`p-3 rounded-2xl text-sm ${msg.role === "user" ? "bg-[#2D1D35] text-white rounded-tr-none shadow-sm" : "bg-white text-gray-700 shadow-sm border border-gray-100 rounded-tl-none"}`}>
                    <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
                    {msg.sources?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100 flex flex-col gap-1">
                        {msg.sources.map((source) => (
                          <div key={source.articleId} className="flex items-center gap-1.5 text-[11px] text-gray-400">
                            <FileText size={11} />
                            {source.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.time && <div className="text-[9px] text-gray-400 px-1">{msg.time}</div>}
                </div>
              </div>
            ))}
            {isAsking && (
              <div className="flex justify-start">
                <div className="bg-white px-3 py-2 rounded-2xl border border-gray-100 flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[11px] text-gray-500 font-medium">Đang tìm câu trả lời...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Hỏi bất cứ điều gì về PubliCast..."
                className="flex-1 pl-4 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 focus:border-pink-500 focus:bg-white outline-none text-sm transition-all"
              />
              <button
                onClick={handleSend}
                disabled={isAsking || !input.trim()}
                className="p-2.5 bg-[#2D1D35] text-white rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95"
        style={{ background: "linear-gradient(135deg, #FF69B4 0%, #FF1493 100%)", color: "#FFF" }}
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
        {!isOpen && <span className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />}
      </button>
    </div>
  );
}
