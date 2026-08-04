import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Send, Sparkles, ChevronRight, FileText } from "lucide-react";
import { toast } from "sonner";
import helpCenterService from "../../services/helpCenter.service";

export function HelpCenterPage() {
  const [articles, setArticles] = useState([]);
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    helpCenterService.listArticles()
      .then((res) => setArticles(res || []))
      .catch((err) => console.error("Failed to load help articles:", err));
  }, []);

  const categories = [...new Set(articles.map((a) => a.category))];

  const handleAsk = async (e) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isAsking) return;

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
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>
          Trung tâm hỗ trợ
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          Đặt câu hỏi hoặc tìm bài viết hướng dẫn sử dụng PubliCast
        </p>
      </div>

      <form onSubmit={handleAsk} style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "10px 14px"
          }}
        >
          <Sparkles size={16} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Hỏi bất cứ điều gì về PubliCast..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 13,
              color: "var(--foreground)"
            }}
          />
          <button
            type="submit"
            disabled={isAsking || !question.trim()}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "none",
              background: isAsking || !question.trim() ? "var(--muted)" : "var(--primary)",
              color: "var(--primary-foreground)",
              cursor: isAsking || !question.trim() ? "default" : "pointer",
              flexShrink: 0
            }}
          >
            <Send size={14} />
          </button>
        </div>
      </form>

      {messages.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                background: msg.role === "user" ? "var(--muted)" : "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 16,
                marginLeft: msg.role === "user" ? 40 : 0,
                marginRight: msg.role === "agent" ? 40 : 0
              }}
            >
              <p style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {msg.text}
              </p>
              {msg.sources?.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase" }}>
                    Nguồn tham khảo
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                    {msg.sources.map((source) => (
                      <div key={source.articleId} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted-foreground)" }}>
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
            <div style={{ textAlign: "center", padding: 12, color: "var(--muted-foreground)", fontSize: 13 }}>
              Đang tìm câu trả lời...
            </div>
          )}
        </div>
      )}

      {categories.length > 0 && (
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 12 }}>
            Bài viết hướng dẫn
          </h3>
          {categories.map((category) => (
            <div key={category} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>
                {category}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {articles.filter((a) => a.category === category).map((article) => (
                  <Link
                    key={article.id}
                    to={`/help/${article.slug}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      textDecoration: "none"
                    }}
                  >
                    <span style={{ fontSize: 13, color: "var(--foreground)" }}>{article.title}</span>
                    <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {categories.length === 0 && !isAsking && (
        <div style={{ textAlign: "center", padding: 24, color: "var(--muted-foreground)", fontSize: 13 }}>
          <Search size={20} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
          Chưa có bài viết hướng dẫn nào.
        </div>
      )}
    </div>
  );
}
