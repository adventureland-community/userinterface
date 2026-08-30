/**
 * Bag sort rules — Settings → Bag pane (WoW / AdiBags-style priority list).
 */

import { e, getReact } from "../../../host/react";
import {
  addBagSortRule,
  applyBagSortPreset,
  BAG_SORT_KEY_CATALOG,
  BAG_SORT_PRESET_LABELS,
  getBagSortPrefs,
  moveBagSortRule,
  patchBagSortPrefs,
  removeBagSortRule,
  updateBagSortRule,
  type BagSortKey,
  type BagSortPresetId,
  type BagSortRule,
  describeBagSortRules,
} from "../../../lib/bagSortPrefs";
import { settingsCheckboxRow, settingsSection } from "./settingsPaneChrome";

export type BagSettingsPaneProps = {
  query?: string;
};

function matchesText(hay: string, query: string): boolean {
  return hay.toLowerCase().includes(query);
}

export function countBagSettingsMatches(query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) {
    return 2 + BAG_SORT_KEY_CATALOG.length;
  }
  let n = 0;
  if (matchesText("pack empty slots last sort bag inventory preset", q)) n++;
  for (const p of Object.values(BAG_SORT_PRESET_LABELS)) {
    if (matchesText(p, q)) n++;
  }
  for (let i = 0; i < BAG_SORT_KEY_CATALOG.length; i++) {
    const d = BAG_SORT_KEY_CATALOG[i];
    if (matchesText(`${d.label} ${d.key} ${d.help} sort`, q)) n++;
  }
  return n;
}

function presetSelect(
  value: BagSortPresetId,
  onChange: (p: BagSortPresetId) => void,
): any {
  const keys = Object.keys(BAG_SORT_PRESET_LABELS) as BagSortPresetId[];
  return e(
    "div",
    { className: "ecu-settings-row" },
    e(
      "div",
      { className: "ecu-settings-row-copy" },
      e("span", { className: "ecu-settings-row-label" }, "Preset"),
      e(
        "span",
        { className: "ecu-settings-help" },
        "Load a common rule chain (AdiBags-style). Pick Custom to edit freely.",
      ),
    ),
    e(
      "select",
      {
        value,
        onChange: (ev: { target: { value: string } }) =>
          onChange(ev.target.value as BagSortPresetId),
        style: {
          fontSize: "12px",
          background: "#1a1a1a",
          color: "#ddd",
          border: "1px solid #555",
          maxWidth: "220px",
        },
      },
      ...keys.map((k) =>
        e("option", { key: k, value: k }, BAG_SORT_PRESET_LABELS[k]),
      ),
    ),
  );
}

function ruleRow(
  rule: BagSortRule,
  index: number,
  total: number,
  onPatch: (patch: Partial<BagSortRule>) => void,
  onMove: (delta: -1 | 1) => void,
  onRemove: () => void,
): any {
  const def = BAG_SORT_KEY_CATALOG.find((d) => d.key === rule.key);
  return e(
    "div",
    {
      key: rule.id,
      className: "ecu-settings-row ecu-settings-row--bag-rule",
      style: { alignItems: "flex-start" },
    },
    e(
      "div",
      { className: "ecu-settings-row-copy", style: { flex: 1 } },
      e(
        "span",
        { className: "ecu-settings-row-label" },
        `${index + 1}. `,
        def?.label ?? rule.key,
      ),
      def?.help
        ? e("span", { className: "ecu-settings-help" }, def.help)
        : null,
    ),
    e(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          alignItems: "flex-end",
          flexShrink: 0,
        },
      },
      e(
        "div",
        { style: { display: "flex", gap: "4px", alignItems: "center" } },
        e(
          "button",
          {
            type: "button",
            disabled: index <= 0,
            title: "Higher priority",
            onClick: () => onMove(-1),
            style: { fontSize: "11px", padding: "2px 6px" },
          },
          "↑",
        ),
        e(
          "button",
          {
            type: "button",
            disabled: index >= total - 1,
            title: "Lower priority",
            onClick: () => onMove(1),
            style: { fontSize: "11px", padding: "2px 6px" },
          },
          "↓",
        ),
        e("input", {
          type: "checkbox",
          checked: rule.enabled,
          title: "Include rule",
          onChange: (ev: { target: { checked: boolean } }) =>
            onPatch({ enabled: ev.target.checked }),
        }),
      ),
      e(
        "div",
        { style: { display: "flex", gap: "4px", alignItems: "center" } },
        e(
          "select",
          {
            value: rule.key,
            disabled: !rule.enabled,
            onChange: (ev: { target: { value: string } }) =>
              onPatch({ key: ev.target.value as BagSortKey }),
            style: {
              fontSize: "11px",
              background: "#1a1a1a",
              color: "#ddd",
              border: "1px solid #555",
              maxWidth: "120px",
            },
          },
          ...BAG_SORT_KEY_CATALOG.map((d) =>
            e("option", { key: d.key, value: d.key }, d.label),
          ),
        ),
        e(
          "select",
          {
            value: rule.dir,
            disabled: !rule.enabled,
            onChange: (ev: { target: { value: string } }) =>
              onPatch({
                dir: ev.target.value === "desc" ? "desc" : "asc",
              }),
            style: {
              fontSize: "11px",
              background: "#1a1a1a",
              color: "#ddd",
              border: "1px solid #555",
            },
          },
          e("option", { value: "asc" }, "↑ asc"),
          e("option", { value: "desc" }, "↓ desc"),
        ),
        total > 1
          ? e(
              "button",
              {
                type: "button",
                title: "Remove rule",
                onClick: onRemove,
                style: { fontSize: "11px", padding: "2px 6px" },
              },
              "×",
            )
          : null,
      ),
    ),
  );
}

export function BagSettingsPane(props: BagSettingsPaneProps): any {
  const React = getReact();
  const [, bump] = React.useState(0);
  const query = String(props.query || "")
    .trim()
    .toLowerCase();
  const prefs = getBagSortPrefs();

  const refresh = () => bump((n) => n + 1);

  const kids: any[] = [
    e(
      "p",
      { className: "ecu-settings-lead" },
      "Sort priority list for the bag Sort button — like AdiBags / Bagnon: top rules break ties first. Use presets, then tweak or reorder.",
    ),
  ];

  if (!query || matchesText("preset sort bag", query)) {
    kids.push(
      settingsSection("Presets"),
      presetSelect(prefs.preset, (preset) => {
        if (preset === "custom") {
          patchBagSortPrefs({ preset: "custom" });
        } else {
          applyBagSortPreset(preset);
        }
        refresh();
      }),
      e(
        "p",
        { className: "ecu-settings-help", style: { margin: "4px 0 8px" } },
        `Active chain: ${describeBagSortRules(prefs)}`,
      ),
    );
  }

  if (!query || matchesText("empty pack slots sort bag", query)) {
    kids.push(
      settingsSection("Layout"),
      settingsCheckboxRow(
        "bag-sort-empty-last",
        "Pack empty slots last",
        prefs.emptyLast,
        (next) => {
          patchBagSortPrefs({ emptyLast: next, preset: "custom" });
          refresh();
        },
        {
          help: "Compact items to the front of the bag after sorting.",
        },
      ),
    );
  }

  const ruleRows: any[] = [];
  for (let i = 0; i < prefs.rules.length; i++) {
    const rule = prefs.rules[i];
    const def = BAG_SORT_KEY_CATALOG.find((d) => d.key === rule.key);
    if (
      query &&
      !matchesText(
        `${def?.label ?? ""} ${rule.key} ${def?.help ?? ""} sort rule priority`,
        query,
      )
    ) {
      continue;
    }
    ruleRows.push(
      ruleRow(
        rule,
        i,
        prefs.rules.length,
        (patch) => {
          patchBagSortPrefs({
            preset: "custom",
            rules: updateBagSortRule(prefs.rules, rule.id, patch),
          });
          refresh();
        },
        (delta) => {
          patchBagSortPrefs({
            preset: "custom",
            rules: moveBagSortRule(prefs.rules, rule.id, delta),
          });
          refresh();
        },
        () => {
          patchBagSortPrefs({
            preset: "custom",
            rules: removeBagSortRule(prefs.rules, rule.id),
          });
          refresh();
        },
      ),
    );
  }

  if (!query || matchesText("sort rule priority add", query)) {
    kids.push(settingsSection("Sort rules (priority order)"), ...ruleRows);
    kids.push(
      e(
        "div",
        { style: { marginTop: "6px" } },
        e(
          "select",
          {
            defaultValue: "",
            onChange: (ev: { target: HTMLSelectElement }) => {
              const key = ev.target.value as BagSortKey;
              if (!key) return;
              patchBagSortPrefs({
                preset: "custom",
                rules: addBagSortRule(prefs.rules, key),
              });
              ev.target.value = "";
              refresh();
            },
            style: {
              fontSize: "12px",
              background: "#1a1a1a",
              color: "#ddd",
              border: "1px solid #555",
            },
          },
          e("option", { value: "" }, "+ Add sort rule…"),
          ...BAG_SORT_KEY_CATALOG.map((d) =>
            e("option", { key: d.key, value: d.key }, d.label),
          ),
        ),
      ),
    );
  }

  if (ruleRows.length === 0 && query) {
    kids.push(
      e(
        "p",
        { className: "ecu-settings-help" },
        "No bag sort settings match this search.",
      ),
    );
  }

  return e("div", null, ...kids);
}
