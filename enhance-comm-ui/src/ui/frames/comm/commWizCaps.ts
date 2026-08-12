/**
 * Shared capability grid for intro / What's New modals.
 */

import { e } from "../../../host/react";

export type CommWizCap = { label: string; detail: string };

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
