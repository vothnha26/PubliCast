import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

/**
 * Confirm-before-exit dialog for NetworkCustomizeScreen's top-right "X" —
 * replaces window.confirm (native browser popup) with a styled modal
 * matching the rest of the composer's overlay/modal look.
 */
export function ConfirmExitModal({ isOpen, onConfirm, onCancel }) {
  const { t } = useTranslation(["planner", "common"]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-card rounded-3xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200 p-6 text-center font-sans">
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
          <AlertTriangle size={22} />
        </div>
        <h3 className="text-base font-bold text-foreground mb-1.5">
          {t("planner:postCreator.networkCustomize.confirmExitTitle", "Discard changes?")}
        </h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {t("planner:postCreator.networkCustomize.confirmExit", "You have unsaved changes. Are you sure you want to exit?")}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-foreground bg-muted hover:bg-muted/70 transition-all cursor-pointer"
          >
            {t("common:cancel", "Cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-all cursor-pointer shadow-sm hover:shadow-md"
          >
            {t("planner:postCreator.networkCustomize.confirmExitAction", "Exit anyway")}
          </button>
        </div>
      </div>
    </div>
  );
}
