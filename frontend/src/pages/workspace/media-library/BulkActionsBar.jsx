import React from "react";
import { X } from "lucide-react";
import { useConfirm } from "@/hooks/useConfirm";
import { useTranslation } from "react-i18next";

export function BulkActionsBar({ selected, clearSelection, onDelete }) {
  const { t } = useTranslation("medialibrary");
  const confirm = useConfirm();
  if (selected.size === 0) return null;

  return (
    <div
      className="flex items-center gap-3 px-6 py-3"
      style={{
        background: "#0A0A0A",
        borderTop: "0.5px solid #222",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40
      }}
    >
      <span style={{ fontSize: 12, color: "#FFF" }}>{t("bulkActions.selected", { count: selected.size })}</span>
      <div style={{ flex: 1 }} />
      <button
        onClick={async () => {
          const isConfirmed = await confirm({
            title: t("detailPanel.delete"),
            description: `${t("detailPanel.delete")} ${selected.size} ${t("breadcrumbFolder").toLowerCase() === 'folder' ? 'items' : 'mục'}?`,
            confirmText: t("detailPanel.delete"),
            cancelText: t("bulkActions.clearSelection"),
            variant: "destructive"
          });
          if (isConfirmed) {
            onDelete();
          }
        }}
        style={{
          padding: "6px 14px",
          borderRadius: 6,
          border: "0.5px solid #333",
          background: "transparent",
          color: "#EF4444",
          fontSize: 12,
          cursor: "pointer"
        }}
      >
        {t("detailPanel.delete")}
      </button>
      {[
        { key: "Download", label: t("bulkActions.download", { defaultValue: "Download" }) },
        { key: "Add to post", label: t("bulkActions.addToPost", { defaultValue: "Add to post" }) }
      ].map((a) => (
        <button
          key={a.key}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            border: "0.5px solid #333",
            background: "transparent",
            color: "#DDD",
            fontSize: 12,
            cursor: "pointer"
          }}
        >
          {a.label}
        </button>
      ))}
      <button onClick={clearSelection} style={{ color: "#666", cursor: "pointer", background: "none", border: "none" }} title={t("bulkActions.clearSelection")}>
        <X size={14} />
      </button>
    </div>
  );
}
