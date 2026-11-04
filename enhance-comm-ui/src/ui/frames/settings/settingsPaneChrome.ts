/** Shared Settings pane chrome — section headers and checkbox rows. */

import { e } from "../../../host/react";

/** Stable DOM id for a settings section (left-nav jump targets). */
export function settingsSectionId(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return "ecu-sec-" + (slug || "section");
}

export type SettingsSubsection = {
  id: string;
  label: string;
  /** When false, omit from the left-nav fold-out. */
  visible?: () => boolean;
};

export function settingsSection(label: string, id?: string): any {
  const secId = id || settingsSectionId(label);
  return e(
    "div",
    {
      id: secId,
      className: "ecu-settings-sec",
      "data-ecu-settings-sec": secId,
    },
    label,
  );
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
