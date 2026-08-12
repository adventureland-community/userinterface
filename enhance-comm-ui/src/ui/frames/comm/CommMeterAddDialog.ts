/**
 * Add-meter preset picker dialog.
 */

import { e } from "../../../host/react";
import { catalogPresets } from "../../../meters/meterCatalog";

export type CommMeterAddDialogProps = {
  onClose: () => void;
  onAddPreset: (presetId: string) => void;
};

export function CommMeterAddDialog(props: CommMeterAddDialogProps): any {
  const shellStyle = {
    position: "absolute",
    left: "50%",
    top: "20%",
    transform: "translateX(-50%)",
    zIndex: 90,
    pointerEvents: "auto",
    background: "rgba(16,16,16,0.97)",
    border: "1px solid #886",
    padding: "10px",
    maxWidth: "420px",
    maxHeight: "60vh",
    overflow: "auto",
    color: "#ddd",
    fontSize: "13px",
  } as const;

  const presetBtn = (
    p: { id: string; label: string },
    tone: "meter" | "al",
  ) =>
    e(
      "button",
      {
        key: p.id,
        type: "button",
        "data-ecu-tour": "preset-" + p.id,
        onClick: () => {
          props.onAddPreset(p.id);
          props.onClose();
        },
        style: {
          cursor: "pointer",
          padding: "6px 10px",
          border: tone === "al" ? "1px solid #445566" : "1px solid #555",
          background: tone === "al" ? "#1a222a" : "#222",
          color: tone === "al" ? "#cde" : "#eee",
        },
      },
      p.label,
    );

  return e(
    "div",
    { style: shellStyle },
    e(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "8px",
          color: "#ffe08a",
        },
      },
      "Add meter panel",
      e(
        "button",
        {
          type: "button",
          onClick: props.onClose,
          style: {
            cursor: "pointer",
            border: "1px solid #555",
            background: "#222",
            color: "#ddd",
          },
        },
        "×",
      ),
    ),
    e(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "10px" } },
      e(
        "div",
        { style: { color: "#9ab", fontSize: "12px" } },
        "Displays — Damage / Healing / Taken… (‹ › cycles these). View changes Bars / Pie / Graph.",
      ),
      e(
        "div",
        { style: { display: "flex", flexWrap: "wrap", gap: "6px" } },
        ...catalogPresets("meter").map((p) => presetBtn(p, "meter")),
      ),
      e(
        "div",
        { style: { color: "#9ab", fontSize: "12px", marginTop: "4px" } },
        "Adventure Land — PDPS / Hit DPS / coop (not in Display cycle)",
      ),
      e(
        "div",
        { style: { display: "flex", flexWrap: "wrap", gap: "6px" } },
        ...catalogPresets("al").map((p) => presetBtn(p, "al")),
      ),
    ),
  );
}
