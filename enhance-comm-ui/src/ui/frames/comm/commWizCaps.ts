/**
 * Shared capability grid for first-run intro (FEATURE_OVERVIEW).
 * Accepts {label, detail} and ignores optional changelog kind/highlight.
 */

import { e } from "../../../host/react";

export type CommWizCap = {
  label: string;
  detail: string;
  kind?: string;
  highlight?: boolean;
};

export function capabilityCaps(items: CommWizCap[]): any {
  return e(
    "div",
    { className: "ecu-comm-wiz-caps" },
    ...items.map((cap, i) =>
      e(
        "div",
        { key: `cap-${i}`, className: "ecu-comm-wiz-cap" },
        e("div", { className: "ecu-comm-wiz-cap-label" }, cap.label),
        e("div", { className: "ecu-comm-wiz-cap-detail" }, cap.detail),
      ),
    ),
  );
}
