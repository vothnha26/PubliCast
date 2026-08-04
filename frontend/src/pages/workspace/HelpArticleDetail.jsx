import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import helpCenterService from "../../services/helpCenter.service";

export function HelpArticleDetailPage() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setNotFound(false);
    helpCenterService.getArticleBySlug(slug)
      .then((res) => setArticle(res))
      .catch((err) => {
        if (err.status === 404) {
          setNotFound(true);
        } else {
          console.error("Failed to load help article:", err);
        }
      })
      .finally(() => setIsLoading(false));
  }, [slug]);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px" }}>
      <Link
        to="/help"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: "var(--muted-foreground)",
          textDecoration: "none",
          marginBottom: 24
        }}
      >
        <ArrowLeft size={14} />
        Quay lại Trung tâm hỗ trợ
      </Link>

      {isLoading && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--muted-foreground)", fontSize: 13 }}>
          Đang tải bài viết...
        </div>
      )}

      {notFound && !isLoading && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--muted-foreground)", fontSize: 13 }}>
          Không tìm thấy bài viết này.
        </div>
      )}

      {article && !isLoading && (
        <>
          <span
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--muted-foreground)",
              textTransform: "uppercase",
              background: "var(--muted)",
              padding: "4px 10px",
              borderRadius: 999,
              marginBottom: 12
            }}
          >
            {article.category}
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: "var(--foreground)", marginBottom: 24, lineHeight: 1.3 }}>
            {article.title}
          </h1>
          <div
            style={{ fontSize: 14, color: "var(--foreground)", lineHeight: 1.7 }}
            className="help-article-content"
            dangerouslySetInnerHTML={{ __html: article.contentHtml }}
          />
        </>
      )}
    </div>
  );
}
