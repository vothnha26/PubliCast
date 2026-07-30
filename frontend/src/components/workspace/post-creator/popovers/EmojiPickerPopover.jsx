import * as React from "react";
import { useState } from "react";
import { Search } from "lucide-react";

const EMOJI_CATEGORIES = [
  { id: 'recent', label: '🕐', title: 'Frequently Used', emojis: ['👍', '😁', '😘', '😍', '😆', '😜', '😅', '😂', '😱', '😔', '😒', '😭', '😎', '❤️', '💩'] },
  { id: 'smileys', label: '😀', title: 'Smileys & Emoticon', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴'] },
  { id: 'people', label: '👤', title: 'People', emojis: ['👶', '👧', '🧒', '👦', '👩', '🧑', '👨', '👵', '🧓', '👴', '👮', '🕵️', '💂', '👷', '🤴', '👸', '👳', '👲', '🧕', '🤵', '👰', '🤰', '🤱', '👼', '🎅', '🤶', '🦸', '🦹', '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟'] },
  { id: 'animals', label: '🐶', title: 'Animals & Nature', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦢', '🦉', '🦚', '🦜', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋'] },
  { id: 'food', label: '🍎', title: 'Food & Drink', emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🥔', '🍠', '🥐', '🍞', '🥖', '🥨', '🥯', '🥞', '🧀', '🍖'] },
];

export function EmojiPickerPopover({ onSelectEmoji, onClose }) {
  const [activeCategory, setActiveCategory] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = EMOJI_CATEGORIES.map(cat => {
    if (!searchQuery) return cat;
    const filteredEmojis = cat.emojis.filter(e => e.includes(searchQuery) || cat.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return { ...cat, emojis: filteredEmojis };
  }).filter(cat => cat.emojis.length > 0);

  return (
    <div className="absolute bottom-full left-0 mb-2 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 z-50 animate-in fade-in slide-in-from-bottom-2 text-left">
      {/* Category Tabs */}
      <div className="flex justify-between border-b border-gray-100 pb-2 mb-3">
        {EMOJI_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`text-sm p-1 rounded-lg transition-all cursor-pointer ${activeCategory === cat.id ? 'bg-purple-50 scale-110' : 'hover:bg-gray-50'}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative mb-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search"
          className="w-full pl-8 pr-3 py-1.5 bg-gray-50 rounded-xl text-xs outline-none focus:bg-gray-100 border border-transparent focus:border-gray-200 transition-all font-medium text-gray-700"
        />
        <Search size={12} className="absolute left-3 top-2.5 text-gray-400" />
      </div>

      {/* Emojis list */}
      <div className="h-48 overflow-y-auto pr-1 space-y-4 scrollbar-thin">
        {filteredCategories.map(cat => {
          if (searchQuery || activeCategory === cat.id) {
            return (
              <div key={cat.id} className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{cat.title}</h4>
                <div className="grid grid-cols-7 gap-1">
                  {cat.emojis.map((emoji, eIdx) => (
                    <button
                      key={eIdx}
                      type="button"
                      onClick={() => onSelectEmoji(emoji)}
                      className="text-lg hover:bg-gray-100 p-1 rounded-xl active:scale-90 transition-transform duration-700 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-50 pt-3 mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏢</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pick an emoji</span>
        </div>
        <div className="w-2 h-2 rounded-full bg-yellow-400" />
      </div>
    </div>
  );
}
