import * as React from "react";
import { useState } from "react";
import { X, Smile, Folder } from "lucide-react";
import { EmojiPickerPopover } from "../popovers/EmojiPickerPopover";

export function FirstCommentModal({ value, onAccept, onCancel }) {
  const [commentText, setCommentText] = useState(value || '');
  const [showEmoji, setShowEmoji] = useState(false);

  const insertCommentEmoji = (emoji) => {
    setCommentText(prev => prev + emoji);
    setShowEmoji(false);
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card rounded-3xl shadow-2xl border border-border max-w-[500px] w-full p-6 relative animate-in zoom-in-95 duration-300 text-left">
        {/* Close Button */}
        <button 
          type="button"
          onClick={onCancel}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#18181B] hover:bg-black text-white flex items-center justify-center transition-all shadow-md group cursor-pointer z-50"
        >
          <X size={16} className="group-hover:rotate-90 transition-transform duration-300 text-yellow-300" />
        </button>

        {/* Header */}
        <div className="space-y-1 mb-5">
          <h2 className="text-base font-extrabold text-foreground">Add first comment</h2>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Add the first comment to your post.</p>
        </div>

        {/* Textarea Box */}
        <div className="border border-border rounded-2xl overflow-hidden focus-within:border-black transition-all bg-card relative">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="w-full p-4 text-xs font-semibold leading-relaxed outline-none min-h-[140px] resize-none text-foreground"
            placeholder="Write the first comment that will be published on your post..."
          />
          
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-50 bg-card">
            <div className="flex items-center gap-3 relative">
              <button 
                type="button"
                onClick={() => setShowEmoji(!showEmoji)} 
                className="text-muted-foreground hover:text-black transition-colors cursor-pointer"
              >
                <Smile size={16} />
              </button>
              <button type="button" className="text-muted-foreground hover:text-black transition-colors cursor-pointer">
                <Folder size={16} />
              </button>
              
              {showEmoji && (
                <div className="absolute bottom-full left-0 mb-2">
                  <EmojiPickerPopover onSelectEmoji={insertCommentEmoji} onClose={() => setShowEmoji(false)} />
                </div>
              )}
            </div>
            <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
              {commentText.length}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button 
            type="button"
            onClick={onCancel}
            className="px-5 py-2 border border-border hover:bg-muted rounded-xl text-xs font-bold text-muted-foreground transition-colors uppercase tracking-widest cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={() => onAccept(commentText)}
            className="px-5 py-2 bg-[#18181B] hover:bg-black text-[#FACC15] hover:text-yellow-400 rounded-xl text-xs font-black transition-colors uppercase tracking-widest cursor-pointer"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
