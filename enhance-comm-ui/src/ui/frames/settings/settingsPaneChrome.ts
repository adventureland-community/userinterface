/** Shared Settings pane chrome — section headers and checkbox rows. */

import { e } from "../../../host/react";

export function settingsSection(label: string): any {
  return e("div", { className: "ecu-settings-sec" }, label);
}

export function settingsCheckboxRow(
  key: string,
  label: string,
  checked: boolean,
  onChange: (next: boolean) => void,
  extras?: { help?: string; tag?: string },
): any {
  return e(
    "div",
    { key, className: "ecu-settings-row" },
    e(
      "div",
      { className: "ecu-settings-row-copy" },
      e(
        "span",
        { className: "ecu-settings-row-label" },
        label,
        extras?.tag
          ? e(
              "span",
              {
                className: "ecu-settings-tag",
                "data-tag": extras.tag,
              },
              extras.tag,
            )
          : null,
      ),
      extras?.help
        ? e("span", { className: "ecu-settings-help" }, extras.help)
        : null,
    ),
    e("input", {
      type: "checkbox",
      checked,
      onChange: (ev: { target: { checked: boolean } }) =>
        onChange(ev.target.checked),
    }),
  );
}
