import * as React from "react";
import { Check } from "lucide-react";
import { ChannelAvatar } from "../../../../../components/workspace/post-creator/ChannelAvatar";

/**
 * One row per connected SocialAccount (channel), not deduped by platform —
 * a brand with 2 YouTube channels shows 2 independently-selectable rows,
 * each with its own avatar/name, matching how ChannelsList/ChannelPickerDropdown
 * already render channels elsewhere in the app.
 */
export function AutoListPlatformsCard({ connectedAccounts, selectedAccountIds, onToggleAccount }) {
  return (
    <div className="space-y-4 bg-card/80 backdrop-blur-md border border-border rounded-3xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-foreground tracking-tight">Target Channels</h3>
      <div className="flex flex-col gap-2.5">
        {connectedAccounts.length === 0 ? (
          <p className="text-xs text-muted-foreground font-semibold italic">No connected channels found. Please connect accounts first.</p>
        ) : (
          connectedAccounts.map((account) => {
            const isSelected = selectedAccountIds.includes(account.id);
            const name = account.displayName || account.username || account.accountName || account.platform;
            return (
              <button
                key={account.id}
                type="button"
                onClick={() => onToggleAccount(account.id)}
                className={`flex items-center justify-between px-5 py-3 border rounded-2xl transition-all duration-300 group cursor-pointer ${
                  isSelected
                    ? 'border-foreground bg-muted/50 shadow-sm'
                    : 'border-border bg-card hover:border-foreground/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="group-hover:scale-110 transition-transform duration-300">
                    <ChannelAvatar account={account} platform={account.platform} size={28} badgeSize={14} shape="circle" />
                  </div>
                  <span className={`text-xs font-bold truncate max-w-[160px] ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {name}
                  </span>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-foreground flex items-center justify-center text-background scale-90">
                    <Check size={10} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
