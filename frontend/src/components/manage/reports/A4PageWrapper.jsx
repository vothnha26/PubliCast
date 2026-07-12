import React from "react";

export function A4PageWrapper({
  pageType,
  pageIndex,
  totalPages,
  logoUrl,
  brandName = "My Brand",
  period,
  bodyBackgroundUrl,
  selectedColor = "#5C90A8",
  children,
  isCover = false
}) {
  const color = selectedColor || "#5C90A8";

  const renderHeader = () => (
    <div className="flex justify-between items-center border-b pb-2 mb-3" style={{ borderColor: `${color}20` }}>
      <div className="flex items-center gap-2">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-5 max-w-[100px] object-contain rounded" />
        ) : (
          <div className="h-5 px-1.5 bg-gray-100 rounded flex items-center justify-center font-bold text-[7px] text-gray-500 uppercase">
            {brandName.substring(0, 3)}
          </div>
        )}
        <span className="text-[8px] font-black text-gray-700 uppercase tracking-wider">{brandName}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[7.5px] font-mono text-gray-400 font-bold uppercase tracking-widest">{pageType}</span>
        <span className="text-[7.5px] font-mono text-gray-400 font-bold">{period}</span>
      </div>
    </div>
  );

  const renderFooter = () => (
    <div className="flex justify-between items-center border-t pt-1.5 mt-auto text-[6.5px] text-gray-400 font-mono" style={{ borderColor: `${color}10` }}>
      <span>Báo cáo tự động PubliCast • White-Label Analytics</span>
      <span className="font-bold">Trang {pageIndex} / {totalPages}</span>
    </div>
  );

  return (
    <div 
      className={`w-full aspect-[1.414/1] relative flex flex-col justify-between overflow-hidden p-5 bg-white text-gray-800 border border-gray-150 rounded-xl transition-all ${
        isCover ? "p-0" : ""
      }`}
      style={!isCover && bodyBackgroundUrl ? {
        backgroundImage: `url(${bodyBackgroundUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      } : {}}
    >
      {!isCover && renderHeader()}
      <div className={`flex-1 flex flex-col overflow-hidden ${isCover ? "" : "py-1"}`}>
        {children}
      </div>
      {!isCover && renderFooter()}
    </div>
  );
}
