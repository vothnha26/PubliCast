import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import helpCenterService from "../../services/helpCenter.service";
import { HelpCenterHeader } from "./help/HelpCenterHeader";

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
    <div className="min-h-screen bg-background">
      <HelpCenterHeader />

      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link
          to="/help"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Quay lại Trung tâm hỗ trợ
        </Link>

        {isLoading && (
          <div className="text-center py-16 text-sm text-muted-foreground">Đang tải bài viết...</div>
        )}

        {notFound && !isLoading && (
          <div className="text-center py-16 text-sm text-muted-foreground">Không tìm thấy bài viết này.</div>
        )}

        {article && !isLoading && (
          <>
            <span className="inline-block text-[11px] font-bold text-muted-foreground uppercase tracking-wide bg-muted px-2.5 py-1 rounded-full mb-3">
              {article.category}
            </span>
            <h1 className="text-2xl font-bold text-foreground leading-snug mb-6">{article.title}</h1>
            <div
              className="help-article-content text-sm text-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: article.contentHtml }}
            />
          </>
        )}
      </div>
    </div>
  );
}
