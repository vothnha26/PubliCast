import React from "react";
import { MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

export function MediaListTable({ filteredMedia, setDetail, selected, toggleSelect, clearFilters }) {
  const { t } = useTranslation("medialibrary");

  if (filteredMedia.length === 0) {
    return (
      <div style={{ background: "#FFF", border: "0.5px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "40px 12px", textAlign: "center" }}>
          <div className="flex flex-col items-center justify-center gap-2">
            <span style={{ fontSize: 13, fontWeight: 500, color: "#6B7280" }}>{t("grid.noFiles")}</span>
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>{t("grid.noFilesDesc")}</span>
            <button
              onClick={clearFilters}
              className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all"
              style={{ border: "0.5px solid #E5E7EB", background: "#FFF", color: "#0A0A0A" }}
            >
              {t("clearFilters")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#FFF", border: "0.5px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#FAFAFA", borderBottom: "0.5px solid #E5E7EB" }}>
            {[
              "",
              t("table.colPreview", { defaultValue: "Preview" }),
              t("table.colName"),
              t("table.colType"),
              t("table.colSize"),
              t("table.colDate"),
              t("table.colUsedIn", { defaultValue: "Used in" }),
              ""
            ].map((h, i) => (
              <th
                key={i}
                style={{
                  padding: "8px 12px",
                  fontSize: 10,
                  fontWeight: 500,
                  color: "#9CA3AF",
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                  textAlign: "left"
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredMedia.map((item) => (
            <tr
              key={item.id}
              style={{ borderBottom: "0.5px solid #F0F0EF", cursor: "pointer" }}
              onClick={() => setDetail(item)}
            >
              <td style={{ padding: "8px 12px" }}>
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  style={{ accentColor: "#0A0A0A" }}
                  onClick={(e) => e.stopPropagation()}
                />
              </td>
              <td style={{ padding: "8px 12px" }}>
                <div
                  style={{
                    width: 48,
                    height: 36,
                    borderRadius: 4,
                    background: "#F3F4F6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    overflow: "hidden"
                  }}
                >
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    item.emoji
                  )}
                </div>
              </td>
              <td style={{ padding: "8px 12px", fontSize: 12, color: "#0A0A0A" }}>{item.name}</td>
              <td style={{ padding: "8px 12px", fontSize: 11, color: "#6B7280", textTransform: "capitalize" }}>
                {item.type}
              </td>
              <td style={{ padding: "8px 12px", fontSize: 11, color: "#6B7280" }}>{item.size}</td>
              <td style={{ padding: "8px 12px", fontSize: 11, color: "#6B7280" }}>{item.date}</td>
              <td style={{ padding: "8px 12px" }}>
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: item.used ? "#16A34A" : "#9CA3AF"
                  }}
                />
              </td>
              <td style={{ padding: "8px 12px" }}>
                <button
                  style={{ color: "#9CA3AF", cursor: "pointer", background: "none", border: "none" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
