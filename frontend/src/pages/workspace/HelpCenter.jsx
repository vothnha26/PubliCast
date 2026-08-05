import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Send, Sparkles, ChevronRight, FileText, LogIn } from "lucide-react";
import { toast } from "sonner";
import helpCenterService from "../../services/helpCenter.service";
import { useAuthStore } from "../../store/useAuthStore";
import { HelpCenterHeader } from "./help/HelpCenterHeader";

export function HelpCenterPage() {
  const { isAuthenticated } = useAuthStore();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    helpCenterService.listArticles()
      .then((res) => setArticles(res || []))
      .catch((err) => console.error("Failed to load help articles:", err))
      .finally(() => setLoading(false));
  }, []);

  const query = searchTerm.trim().toLowerCase();
  const filteredArticles = useMemo(() => {
    if (!query) return articles;
    return articles.filter((a) =>
      a.title.toLowerCase().includes(query) || a.category.toLowerCase().includes(query)
    );
  }, [articles, query]);

  const categories = [...new Set(filteredArticles.map((a) => a.category))];

  const handleAsk = async (e) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isAsking) return;

    if (!isAuthenticated) {
      toast.info("Vui lòng đăng nhập để hỏi trợ lý AI.");
      return;
    }

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setQuestion("");
    setIsAsking(true);
    try {
      const result = await helpCenterService.askQuestion(trimmed);
      setMessages((prev) => [...prev, { role: "agent", text: result.answer, sources: result.sources }]);
    } catch (err) {
      toast.error(err.message || "Không thể lấy câu trả lời, vui lòng thử lại.");
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <HelpCenterHeader />

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Trung tâm hỗ trợ</h1>
          <p className="text-sm text-muted-foreground">Đặt câu hỏi hoặc tìm bài viết hướng dẫn sử dụng PubliCast</p>
        </div>

        <form onSubmit={handleAsk} className="mb-4">
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3.5 py-2.5">
            <Sparkles size={16} className="text-muted-foreground shrink-0" />
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={isAuthenticated ? "Hỏi bất cứ điều gì về PubliCast..." : "Đăng nhập để hỏi trợ lý AI..."}
              className="flex-1 outline-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground"
            />
            {isAuthenticated ? (
              <button
                type="submit"
                disabled={isAsking || !question.trim()}
                className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center bg-[#0A0A0A] text-white disabled:opacity-40 disabled:cursor-default transition-opacity"
              >
                <Send size={14} />
              </button>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0A0A0A] text-white no-underline shrink-0"
              >
                <LogIn size={13} /> Đăng nhập
              </Link>
            )}
          </div>
        </form>

        {messages.length > 0 && (
          <div className="flex flex-col gap-3 mb-10">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`border border-border rounded-xl p-4 ${msg.role === "user" ? "bg-muted ml-10" : "bg-card mr-10"}`}
              >
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                {msg.sources?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Nguồn tham khảo</span>
                    <div className="flex flex-col gap-1 mt-2">
                      {msg.sources.map((source) => (
                        <div key={source.articleId} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <FileText size={12} />
                          {source.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isAsking && (
              <div className="text-center py-3 text-sm text-muted-foreground">Đang tìm câu trả lời...</div>
            )}
          </div>
        )}

        <div className="relative mb-6">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm bài viết hướng dẫn..."
            className="w-full bg-card border border-border rounded-xl py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/30 transition-colors"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Đang tải...</div>
        ) : categories.length > 0 ? (
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Bài viết hướng dẫn</h3>
            {categories.map((category) => (
              <div key={category} className="mb-5">
                <div className="text-xs font-bold text-foreground mb-2">{category}</div>
                <div className="flex flex-col gap-1.5">
                  {filteredArticles.filter((a) => a.category === category).map((article) => (
                    <Link
                      key={article.id}
                      to={`/help/${article.slug}`}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-card no-underline hover:border-foreground/30 transition-colors"
                    >
                      <span className="text-sm text-foreground">{article.title}</span>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Search size={20} className="mx-auto mb-2 opacity-50" />
            {query ? "Không tìm thấy bài viết phù hợp." : "Chưa có bài viết hướng dẫn nào."}
          </div>
        )}
      </div>
    </div>
  );
}
