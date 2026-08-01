import * as React from "react";
import { Youtube, Send, Loader2, Smile, Paperclip } from "lucide-react";
import { useTranslation } from "react-i18next";

export const ReplyComposer = ({ replyText, setReplyText, onReply, isReplying }) => {
  const { t } = useTranslation(["manage", "common"]);
  const handleSubmit = (e) => {
    e.preventDefault();
    onReply();
  };

  return (
    <div className="p-6 bg-card border-t border-border">
      <div className="bg-card border border-border rounded-2xl overflow-hidden focus-within:border-ring transition-all shadow-sm">
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder={t("inbox.replyPlaceholder")}
          rows={3}
          className="w-full p-4 text-[13px] bg-transparent text-foreground placeholder:text-muted-foreground border-none focus:ring-0 resize-none min-h-[100px]"
        />
        <div className="px-4 py-3 bg-muted/50 flex items-center justify-between border-t border-border">
          <div className="flex gap-3 text-muted-foreground">
            <button className="hover:text-foreground"><Smile size={18} /></button>
            <button className="hover:text-foreground"><Paperclip size={18} /></button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-muted-foreground">{replyText.length} / 10000</span>
              <div className="w-4 h-4 rounded bg-[#FF0000] flex items-center justify-center">
                <Youtube className="text-white fill-white" size={8} />
              </div>
            </div>
            <button 
              onClick={handleSubmit}
              disabled={isReplying || !replyText}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-xl text-[12px] font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-20 cursor-pointer"
            >
              {isReplying ? <Loader2 size={16} className="animate-spin" /> : t("inbox.sendCtrlEnter")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
