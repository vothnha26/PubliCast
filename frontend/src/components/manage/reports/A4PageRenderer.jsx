import React from "react";
import { A4PageWrapper } from "./A4PageWrapper";
import { SummaryOverviewWidget } from "./SummaryOverviewWidget";
import { FacebookOverviewWidget } from "./FacebookOverviewWidget";
import { InstagramOverviewWidget } from "./InstagramOverviewWidget";
import { YoutubeOverviewWidget } from "./YoutubeOverviewWidget";
import { TiktokOverviewWidget } from "./TiktokOverviewWidget";
import { TelegramOverviewWidget } from "./TelegramOverviewWidget";

export function A4PageRenderer({
  pageType,
  pageIndex,
  totalPages,
  previewData = null,
  previewLoading = false,
  period = "30 ngày qua",
  selectedColor = "#5C90A8",
  logoUrl = "",
  coverBackgroundUrl = "",
  bodyBackgroundUrl = "",
  reportTitle = "Social Media Insights",
  brandName = "My Brand"
}) {
  const color = selectedColor || "#5C90A8";

  // 1. Render Trang bìa (Cover)
  if (pageType === "cover") {
    return (
      <A4PageWrapper
        isCover={true}
        pageType="cover"
        pageIndex={pageIndex}
        totalPages={totalPages}
        logoUrl={logoUrl}
        brandName={brandName}
        period={period}
        selectedColor={color}
      >
        <div 
          className={`w-full h-full relative flex flex-col justify-between overflow-hidden p-6 transition-all rounded-xl ${
            coverBackgroundUrl ? "bg-white" : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white"
          }`}
          style={coverBackgroundUrl ? {
            backgroundImage: `url(${coverBackgroundUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          } : {}}
        >
          {!coverBackgroundUrl && (
            <>
              <div className="absolute top-[-30px] right-[-30px] w-36 h-36 rounded-full blur-3xl opacity-20" style={{ backgroundColor: color }} />
              <div className="absolute bottom-[-45px] left-[-45px] w-44 h-44 rounded-full blur-3xl opacity-15" style={{ backgroundColor: color }} />
            </>
          )}

          <div className={`flex justify-between items-start border-b pb-3 z-10 ${
            coverBackgroundUrl ? "border-gray-150 text-gray-700" : "border-white/10 text-white"
          }`}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-6.5 max-w-[120px] object-contain rounded" />
            ) : (
              <div className="h-6.5 px-2 bg-white/10 rounded flex items-center justify-center font-bold text-[8px] text-white/80">
                {brandName.substring(0, 10)}
              </div>
            )}
            <span className="text-[7.5px] font-mono opacity-65 tracking-wider font-bold">KỲ PHÂN TÍCH: {period}</span>
          </div>

          <div className="my-auto z-10 space-y-3">
            <h1 
              className={`text-xl font-black tracking-tight leading-tight uppercase ${
                coverBackgroundUrl ? "text-gray-800" : "text-white"
              }`}
            >
              {reportTitle || "BÁO CÁO PHÂN TÍCH ĐA KÊNH"}
            </h1>
            <div className="flex flex-col text-[8.5px] opacity-70 space-y-0.5 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                Platform: PubliCast Analytics Suite
              </span>
              <span>Thương hiệu: {brandName}</span>
              <span>Định dạng: White-Label Interactive PDF</span>
            </div>
          </div>

          <div className={`text-center text-[7.5px] font-mono border-t pt-2.5 z-10 ${
            coverBackgroundUrl ? "border-gray-150 text-gray-450" : "border-white/10 text-white/40"
          }`}>
            Được kiến tạo tự động bởi PubliCast Engine © 2026
          </div>
        </div>
      </A4PageWrapper>
    );
  }

  // 2. Render các trang nội dung
  const getPageContent = () => {
    const data = previewData || {};
    const channels = data.channels || [];

    switch (pageType) {
      case "summary":
        return (
          <SummaryOverviewWidget
            overview={data.overview}
            channels={channels}
            color={color}
            period={period}
            previewLoading={previewLoading}
            previewData={previewData}
          />
        );
      case "facebook": {
        const fbChannel = channels.find(c => c.platform === "FACEBOOK");
        return (
          <FacebookOverviewWidget
            channel={fbChannel}
            posts={data.topPosts || []}
            color={color}
            previewLoading={previewLoading}
            previewData={previewData}
          />
        );
      }
      case "instagram": {
        const igChannel = channels.find(c => c.platform === "INSTAGRAM");
        return (
          <InstagramOverviewWidget
            channel={igChannel}
            posts={data.topPosts || []}
            color={color}
            previewLoading={previewLoading}
            previewData={previewData}
          />
        );
      }
      case "youtube": {
        const ytChannel = channels.find(c => c.platform === "YOUTUBE");
        return (
          <YoutubeOverviewWidget
            channel={ytChannel}
            posts={data.topPosts || []}
            color={color}
            previewLoading={previewLoading}
            previewData={previewData}
          />
        );
      }
      case "tiktok": {
        const ttChannel = channels.find(c => c.platform === "TIKTOK");
        return (
          <TiktokOverviewWidget
            channel={ttChannel}
            posts={data.topPosts || []}
            color={color}
            previewLoading={previewLoading}
            previewData={previewData}
          />
        );
      }
      case "telegram": {
        const tgChannel = channels.find(c => c.platform === "TELEGRAM");
        return (
          <TelegramOverviewWidget
            channel={tgChannel}
            posts={data.topPosts || []}
            color={color}
            previewLoading={previewLoading}
            previewData={previewData}
          />
        );
      }
      default:
        return (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
            Chưa hỗ trợ render trang: {pageType}
          </div>
        );
    }
  };

  return (
    <A4PageWrapper
      pageType={pageType.toUpperCase()}
      pageIndex={pageIndex}
      totalPages={totalPages}
      logoUrl={logoUrl}
      brandName={brandName}
      period={period}
      bodyBackgroundUrl={bodyBackgroundUrl}
      selectedColor={color}
    >
      {getPageContent()}
    </A4PageWrapper>
  );
}
