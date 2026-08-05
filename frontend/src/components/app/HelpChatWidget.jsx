import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, FileText, Search, History, ArrowLeft, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import helpCenterService from "../../services/helpCenter.service";

const SUGGESTED_QUESTIONS = [
  "Làm sao để kết nối Facebook với PubliCast?",
  "Cách lên lịch bài viết như thế nào?",
  "AI Assistant dùng để làm gì?",
  "Làm sao để mời thành viên vào team?"
];

const nowLabel = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function ChatBubbles({ messages, isAsking, messagesEndRef }) {
  return (
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
  );
}

export function HelpChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState("home"); // 'home' | 'session' | 'history'
  const [sessions, setSessions] = useState([]); // [{id, title, createdAt, messages: [{role,text,sources,time}]}]
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [input, setInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const messagesEndRef = useRef(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  const appendMessage = (sessionId, message) => {
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, messages: [...s.messages, message] } : s)));
  };

  const askInSession = async (sessionId, question) => {
    appendMessage(sessionId, { role: "user", text: question, time: nowLabel() });
    setIsAsking(true);
    try {
      const result = await helpCenterService.askQuestion(question);
      appendMessage(sessionId, { role: "agent", text: result.answer, sources: result.sources, time: nowLabel() });
    } catch (err) {
      appendMessage(sessionId, { role: "agent", text: "Xin lỗi, mình chưa thể trả lời câu hỏi này.", time: nowLabel() });
      toast.error(err.message || "Không thể lấy câu trả lời");
    } finally {
      setIsAsking(false);
    }
  };

  const handleAskFromHome = async (question) => {
    const id = Date.now().toString();
    setSessions((prev) => [...prev, { id, title: question, createdAt: new Date(), messages: [] }]);
    setActiveSessionId(id);
    setView("session");
    setInput("");
    await askInSession(id, question);
  };

  const handleAskInSession = async () => {
    const question = input.trim();
    if (!question || isAsking || !activeSessionId) return;
    setInput("");
    await askInSession(activeSessionId, question);
  };

  const handleHomeSubmit = () => {
    const question = input.trim();
    if (!question || isAsking) return;
    handleAskFromHome(question);
  };

  const handleOpenHistorySession = (sessionId) => {
    setActiveSessionId(sessionId);
    setView("session");
  };

  const handleBack = () => setView("home");

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end font-sans">
      {isOpen && (
        <div className="mb-4 w-[320px] h-[440px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-[#2D1D35] p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              {view !== "home" && (
                <button onClick={handleBack} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                  <ArrowLeft size={18} />
                </button>
              )}
              <div className="w-9 h-9 rounded-full bg-pink-500 flex items-center justify-center border-2 border-white/20 shrink-0">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="text-sm font-bold">Trợ lý Help Center</div>
                <div className="text-[10px] text-white/60">Trả lời tức thì từ AI</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {view !== "history" && (
                <button onClick={() => setView("history")} title="Lịch sử" className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                  <History size={18} />
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* View: Home */}
          {view === "home" && (
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
              <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5 mb-4">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleHomeSubmit()}
                  placeholder="Hỏi bất cứ điều gì về PubliCast..."
                  className="flex-1 outline-none text-sm bg-transparent"
                />
                <button
                  onClick={handleHomeSubmit}
                  disabled={!input.trim()}
                  className="p-1.5 bg-[#2D1D35] text-white rounded-lg disabled:opacity-40 transition-all"
                >
                  <Send size={14} />
                </button>
              </div>

              <div className="text-[11px] font-semibold text-gray-400 uppercase mb-2">Câu hỏi gợi ý</div>
              <div className="flex flex-col gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleAskFromHome(q)}
                    className="text-left text-sm text-gray-700 bg-white border border-gray-100 rounded-xl px-3 py-2.5 hover:border-pink-300 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* View: Session */}
          {view === "session" && activeSession && (
            <>
              <ChatBubbles messages={activeSession.messages} isAsking={isAsking} messagesEndRef={messagesEndRef} />
              <div className="px-3 pt-2 bg-white border-t border-gray-100">
                <button
                  onClick={() => toast.info("Tính năng gửi câu hỏi cho nhân viên đang được phát triển")}
                  className="w-full flex items-center justify-center gap-2 text-xs text-gray-500 py-1.5 hover:text-pink-500 transition-colors"
                >
                  <MessageSquare size={13} />
                  Gửi câu hỏi cho nhân viên hỗ trợ
                </button>
              </div>
              <div className="p-3 bg-white border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAskInSession()}
                    placeholder="Hỏi tiếp..."
                    className="flex-1 pl-4 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 focus:border-pink-500 focus:bg-white outline-none text-sm transition-all"
                  />
                  <button
                    onClick={handleAskInSession}
                    disabled={isAsking || !input.trim()}
                    className="p-2.5 bg-[#2D1D35] text-white rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-50"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* View: History */}
          {view === "history" && (
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
              {sessions.length === 0 ? (
                <div className="text-center text-sm text-gray-400 mt-8">Chưa có phiên hỏi-đáp nào.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {sessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleOpenHistorySession(s.id)}
                      className="text-left bg-white border border-gray-100 rounded-xl px-3 py-2.5 hover:border-pink-300 transition-colors"
                    >
                      <div className="text-sm text-gray-700 truncate">{s.title}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{s.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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
