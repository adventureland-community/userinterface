/**
 * Details-like Report dialog — top-N preview, copy, reverse order.
 */

import { getReact, e } from "../../host/react";
import { getSettings, patchSettings } from "../../lib/settings";
import { formatMeterReportLines } from "../../meters/meterCatalog";
import type { RankedRow } from "../../meters/meterTypes";
import { injectMeterChromeCss } from "./meterChromeCss";

export type MeterReportDialogProps = {
  title: string;
  segmentLabel: string;
  rows: RankedRow[];
  onClose: () => void;
};

function pushRecentReport(label: string, text: string): void {
  const prev = getSettings().meterRecentReports || [];
  const next = [{ id: `rr-${Date.now().toString(36)}`, label, text }].concat(
    prev,
  );
  patchSettings({ meterRecentReports: next.slice(0, 10) });
}

export function MeterReportDialog(props: MeterReportDialogProps): any {
  const React = getReact();
  const [topN, setTopN] = React.useState(10);
  const [reverse, setReverse] = React.useState(false);
  injectMeterChromeCss();

  let sliced = props.rows.slice(0, topN);
  if (reverse) sliced = sliced.slice().reverse();
  const text = formatMeterReportLines(
    props.title,
    sliced.map((r: RankedRow) => ({
      name: r.name,
      value: r.value,
      rate: r.rate == null ? undefined : r.rate,
      pct: r.pct,
    })),
    props.segmentLabel,
  );

  const copy = () => {
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text);
    }
    pushRecentReport(props.title, text);
  };

  const recent = getSettings().meterRecentReports || [];
  const availableRows = props.rows.length;
  const previewLabel = `${Math.min(topN, availableRows)} of ${availableRows}`;

  return e(
    "div",
    {
      className: "ecu-meter-report-dialog",
      onMouseDown: (ev: any) => ev.stopPropagation(),
    },
    e(
      "div",
      { className: "ecu-meter-report-dialog-hd" },
      e("div", { className: "ecu-meter-report-dialog-kicker" }, "Report"),
      e("div", { className: "ecu-meter-report-dialog-title" }, props.title),
      e(
        "div",
        { className: "ecu-meter-report-dialog-sub" },
        props.segmentLabel,
      ),
    ),
    e(
      "div",
      { className: "ecu-meter-report-dialog-row" },
      e("span", { className: "ecu-meter-report-dialog-label" }, "Lines"),
      ...[5, 10, 15, 20, 30].map((n) =>
        e(
          "button",
          {
            key: String(n),
            type: "button",
            className: "ecu-meter-report-chip" + (topN === n ? " active" : ""),
            onClick: () => setTopN(n),
          },
          String(n),
        ),
      ),
      e(
        "label",
        { className: "ecu-meter-report-reverse" },
        e("input", {
          type: "checkbox",
          checked: reverse,
          onChange: (ev: any) => setReverse(ev.target.checked),
        }),
        " Reverse",
      ),
      e("span", { className: "ecu-meter-report-dialog-count" }, previewLabel),
    ),
    e("div", { className: "ecu-meter-report-dialog-label" }, "Preview"),
    e("pre", { className: "ecu-meter-report-preview" }, text),
    e(
      "div",
      { className: "ecu-meter-report-dialog-actions" },
      e(
        "button",
        { type: "button", className: "ecu-meter-report-btn", onClick: copy },
        "Copy",
      ),
      e(
        "button",
        {
          type: "button",
          className: "ecu-meter-report-btn",
          onClick: props.onClose,
        },
        "Close",
      ),
    ),
    recent.length
      ? e(
          "div",
          { className: "ecu-meter-report-recent" },
          e("div", { className: "ecu-meter-report-dialog-label" }, "Recent"),
          ...recent
            .slice(0, 5)
            .map((r: { id: string; label: string; text: string }) =>
              e(
                "button",
                {
                  key: r.id,
                  type: "button",
                  className: "ecu-meter-cooltip-item",
                  onClick: () => {
                    if (navigator.clipboard?.writeText) {
                      void navigator.clipboard.writeText(r.text);
                    }
                  },
                },
                r.label,
              ),
            ),
        )
      : null,
  );
}
