import React, { useState } from "react";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  CheckCircle2, 
  Eye,
  FileText,
  Plus,
  Loader2
} from "lucide-react";

/**
 * ExportOptionsModal
 * Component hiển thị Modal trực quan hóa báo cáo A4 và các tùy chọn xuất báo cáo.
 */
export function ExportOptionsModal({
  isOpen,
  onClose,
  previewPage,
  setPreviewPage,
  enabledPages = [],
  renderA4Page,
  onPrintPDF
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-50 w-full max-w-4xl h-[90vh] rounded-3xl border border-gray-200 dark:border-slate-800 shadow-[0_25px_60px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden m-4">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-6 py-4 border-b border-gray-150 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-slate-850 text-blue-600">
              <Eye size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">
                Trực Quan Hóa Báo Cáo A4 (Live Viewport)
              </h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold">
                Xem trước chất lượng cao định dạng trang A4 trước khi in ấn
              </p>
            </div>
          </div>

          {/* Pagination controls & Close button */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-850 p-1 rounded-xl border border-gray-100 dark:border-slate-800">
              <button 
                type="button"
                disabled={previewPage === 1}
                onClick={() => setPreviewPage(Math.max(1, previewPage - 1))}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-all cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-[11px] font-bold font-mono text-gray-700 dark:text-gray-300 px-3 min-w-[50px] text-center">
                {previewPage} / {enabledPages.length}
              </span>
              <button 
                type="button"
                disabled={previewPage === enabledPages.length}
                onClick={() => setPreviewPage(Math.min(enabledPages.length, previewPage + 1))}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-all cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-50 dark:bg-slate-850 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 text-gray-500 transition-all cursor-pointer border border-gray-100 dark:border-slate-800"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start dark:bg-slate-950">
          <div className="bg-white dark:bg-slate-900 shadow-[0_10px_45px_rgba(0,0,0,0.15)] rounded-2xl border border-gray-200/80 dark:border-slate-800 overflow-hidden relative w-[210mm] min-h-[297mm]">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600" />
            {renderA4Page(enabledPages[previewPage - 1], previewPage, enabledPages.length)}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-white dark:bg-slate-900 px-6 py-3.5 border-t border-gray-150 dark:border-slate-800 flex items-center justify-between text-xs text-gray-400">
          <span className="font-semibold text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            Trình hiển thị tự động cập nhật thời gian thực
          </span>
          <button 
            onClick={() => {
              onPrintPDF();
              onClose();
            }}
            className="bg-black hover:bg-gray-800 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1 cursor-pointer"
          >
            <Download size={13} />
            TẢI XUỐNG PDF
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * AutomationSchedulingPanel
 * Panel cấu hình lịch trình gửi email tự động hàng tháng
 */
export function AutomationSchedulingPanel({
  receiveEmail,
  setReceiveEmail,
  emailsList = [],
  setEmailsList,
  emailText,
  setEmailText,
  brandMembers = [],
  membersLoading,
  dayOfMonth = 1,
  setDayOfMonth,
  format = "PDF",
  setFormat,
  platforms = ["Facebook", "YouTube"],
  setPlatforms,
  onSendTestReport,
  onSaveSchedule
}) {
  const [newEmailInput, setNewEmailInput] = useState("");
  const [isMembersDropdownOpen, setIsMembersDropdownOpen] = useState(false);

  const handleAddEmail = () => {
    if (newEmailInput && !emailsList.includes(newEmailInput)) {
      setEmailsList([...emailsList, newEmailInput]);
      setNewEmailInput("");
    }
  };

  const handleRemoveEmail = (email) => {
    setEmailsList(emailsList.filter(e => e !== email));
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
      <h4 className="font-bold text-gray-800 dark:text-white text-sm border-b border-gray-100 dark:border-slate-800 pb-3">
        Automation & Scheduling
      </h4>
      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input 
            type="checkbox" 
            checked={receiveEmail}
            onChange={(e) => setReceiveEmail(e.target.checked)}
            className="w-4.5 h-4.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
            Tự động gửi báo cáo qua Email
          </span>
        </label>

        {receiveEmail && (
          <div className="space-y-3 pt-1 animate-in fade-in duration-200">
            {/* Lựa chọn ngày gửi & định dạng báo cáo */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase mb-1">
                  Ngày gửi hàng tháng
                </label>
                <select
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value === "last" ? "last" : parseInt(e.target.value))}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-gray-400 dark:text-gray-200 cursor-pointer"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>Ngày {day}</option>
                  ))}
                  <option value="last">Ngày cuối tháng</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase mb-1">
                  Định dạng đính kèm
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-gray-400 dark:text-gray-200 cursor-pointer"
                >
                  <option value="PDF">PDF Report</option>
                  <option value="Excel">Excel Sheet</option>
                </select>
              </div>
            </div>

            {/* Lựa chọn nền tảng muốn báo cáo */}
            <div>
              <label className="block text-[10px] font-bold text-gray-450 uppercase mb-1.5">
                Nền tảng muốn báo cáo
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["Facebook", "YouTube", "Instagram", "TikTok", "Telegram"].map((plat) => {
                  const isChecked = platforms.includes(plat);
                  return (
                    <label key={plat} className="flex items-center gap-1.5 cursor-pointer select-none bg-gray-50 dark:bg-slate-950 hover:bg-gray-100 dark:hover:bg-slate-850 border border-gray-200 dark:border-slate-850 rounded-lg p-1.5 transition-all">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPlatforms([...platforms, plat]);
                          } else {
                            setPlatforms(platforms.filter((p) => p !== plat));
                          }
                        }}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">{plat}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            {/* Member selector */}
            <div className="space-y-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase mb-1">
                  Chọn từ thành viên của Brand
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsMembersDropdownOpen(!isMembersDropdownOpen)}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs font-semibold text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-800 transition-all outline-none"
                  >
                    <span className="text-gray-600 dark:text-gray-400">
                      {membersLoading ? "Đang tải thành viên..." : "Bấm để chọn thành viên..."}
                    </span>
                    <ChevronRight size={14} className="text-gray-400 transform rotate-90" />
                  </button>

                  {isMembersDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsMembersDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto p-1.5 space-y-1">
                        {brandMembers.length === 0 ? (
                          <p className="text-[10px] text-gray-400 text-center py-2 uppercase font-bold tracking-wider">
                            Không có thành viên nào
                          </p>
                        ) : (
                          brandMembers.map(member => {
                            const isAdded = emailsList.includes(member.email);
                            return (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => {
                                  if (!isAdded) {
                                    setEmailsList([...emailsList, member.email]);
                                  }
                                  setIsMembersDropdownOpen(false);
                                }}
                                className="w-full text-left px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-850 rounded-lg flex items-center justify-between transition-all group"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-lg bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold overflow-hidden">
                                    {member.avatar ? (
                                      <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      (member.name || member.email).charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <div className="text-[11px] font-bold text-gray-800 dark:text-gray-200">{member.name}</div>
                                    <div className="text-[9px] text-gray-450">{member.email}</div>
                                  </div>
                                </div>
                                {isAdded ? (
                                  <span className="text-[9px] bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400 font-bold px-1.5 py-0.5 rounded-md">
                                    Đã thêm
                                  </span>
                                ) : (
                                  <Plus size={12} className="text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Add custom email */}
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase mb-1">
                  Hoặc nhập Email khác
                </label>
                <div className="flex gap-2">
                  <input 
                    type="email"
                    placeholder="example@mail.com"
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    className="flex-1 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-gray-400 dark:text-gray-200"
                  />
                  <button 
                    type="button"
                    onClick={handleAddEmail}
                    className="bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs font-bold px-3 rounded-xl transition-all cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Email pills */}
            <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
              {emailsList.map(email => (
                <span key={email} className="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-blue-100 dark:border-blue-900/50">
                  {email}
                  <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => handleRemoveEmail(email)} />
                </span>
              ))}
            </div>

            {/* Email Message Text */}
            <div>
              <label className="block text-[10px] font-bold text-gray-450 uppercase mb-1">
                Nội dung tin nhắn
              </label>
              <textarea 
                rows={3}
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-gray-400 resize-none dark:text-gray-200"
                placeholder="Hi, here is your monthly analytics report..."
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onSendTestReport}
                className="flex-1 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 text-center"
              >
                Gửi thử nghiệm
              </button>
              <button
                type="button"
                onClick={onSaveSchedule}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 text-center shadow-sm"
              >
                Lưu lịch trình
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * PdfHistoryPanel
 * Panel hiển thị danh sách lịch sử báo cáo PDF/Excel đã được tạo.
 */
export function PdfHistoryPanel({
  reports = [],
  onDownload
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
      <h4 className="font-bold text-gray-800 dark:text-white text-sm border-b border-gray-100 dark:border-slate-800 pb-3">
        Generated PDF History
      </h4>
      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
        {reports.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Chưa có bản ghi báo cáo nào được tạo.</p>
        ) : (
          reports.map(rep => {
            const isPdf = rep.format === 'PDF';
            const fileUrl = rep.fileUrl || rep.pdfUrl; // Fallback
            const isXlsx = fileUrl && fileUrl.endsWith('.xlsx');
            const formatLabel = isPdf ? "PDF" : (isXlsx ? "EXCEL" : "CSV");

            return (
              <div key={rep.id} className="flex justify-between items-center bg-gray-50 dark:bg-slate-950 p-2.5 rounded-xl border border-gray-150 dark:border-slate-850">
                <div className="flex items-center gap-2 truncate">
                  <FileText size={16} className={isPdf ? "text-red-500" : "text-emerald-600"} />
                  <div className="truncate">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate max-w-[130px]">
                      {rep.title || "Báo cáo phân tích"}
                    </p>
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 font-semibold">
                      {new Date(rep.createdAt).toLocaleDateString()} • <span className="uppercase">{formatLabel}</span>
                    </p>
                  </div>
                </div>
                {isPdf ? (
                  <button
                    onClick={() => {
                      const downloadFileName = rep.title
                        ? (rep.title.toLowerCase().endsWith('.pdf') ? rep.title : `${rep.title}.pdf`)
                        : "report.pdf";
                      onDownload(rep.id, downloadFileName);
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-[10px] font-bold cursor-pointer"
                  >
                    VIEW
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const downloadFileName = rep.title
                        ? (isXlsx && !rep.title.toLowerCase().endsWith('.xlsx') ? `${rep.title}.xlsx` : rep.title)
                        : (isXlsx ? "report.xlsx" : "report.csv");
                      onDownload(rep.id, downloadFileName);
                    }}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline text-[10px] font-bold cursor-pointer"
                  >
                    DOWNLOAD
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
