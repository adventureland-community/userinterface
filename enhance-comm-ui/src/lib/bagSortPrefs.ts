/**
 * Bag sort rules — persisted in CommUiSettings.bagSort.
 * WoW-style: ordered priority list, presets, add/remove/reorder rules.
 */

import { getSettings, patchSettings } from "./settings";

export type BagSortKey =
  | "category"
  | "type"
  | "grade"
  | "name"
  | "level"
  | "quantity"
  | "gearSlot"
  | "class"
  | "stackable"
  | "locked";

export type BagSortDir = "asc" | "desc";

export type BagSortPresetId =
  | "custom"
  | "default"
  | "byName"
  | "byQuality"
  | "byType"
  | "equipment";

export type BagSortRule = {
  id: string;
  key: BagSortKey;
  dir: BagSortDir;
  enabled: boolean;
};

export type BagSortPrefs = {
  /** Push empty slots to the end after sorting. */
  emptyLast: boolean;
  /** Active preset (custom keeps rules as edited). */
  preset: BagSortPresetId;
  /** Priority order — first enabled rule wins ties for the next, etc. */
  rules: BagSortRule[];
};

export type BagSortKeyDef = {
  key: BagSortKey;
  label: string;
  help: string;
  defaultDir: BagSortDir;
};

export const BAG_SORT_KEY_CATALOG: BagSortKeyDef[] = [
  {
    key: "category",
    label: "Category",
    help: "Consumables, scrolls, gear, then other types (AdiBags-style buckets).",
    defaultDir: "asc",
  },
  {
    key: "type",
    label: "Item type",
    help: "G.items type (pot, weapon, scroll, …).",
    defaultDir: "asc",
  },
  {
    key: "grade",
    label: "Grade",
    help: "G.items.g — higher is usually rarer (WoW quality-like).",
    defaultDir: "desc",
  },
  {
    key: "gearSlot",
    label: "Gear slot",
    help: "Equip slot order (helmet, chest, weapon, …).",
    defaultDir: "asc",
  },
  {
    key: "class",
    label: "Class",
    help: "Class restriction on the item definition.",
    defaultDir: "asc",
  },
  {
    key: "level",
    label: "Upgrade level",
    help: "+0…+12 on compound/upgrade gear.",
    defaultDir: "desc",
  },
  {
    key: "name",
    label: "Item name",
    help: "Internal item id (hpot0, scroll0, …).",
    defaultDir: "asc",
  },
  {
    key: "quantity",
    label: "Stack size",
    help: "Quantity in the stack.",
    defaultDir: "desc",
  },
  {
    key: "stackable",
    label: "Stackable first",
    help: "Items that stack in one slot before singles.",
    defaultDir: "asc",
  },
  {
    key: "locked",
    label: "Locked last",
    help: "Locked / sealed items after unlocked ones.",
    defaultDir: "asc",
  },
];

export const BAG_SORT_PRESET_LABELS: Record<BagSortPresetId, string> = {
  custom: "Custom",
  default: "Category + quality (default)",
  byName: "By name",
  byQuality: "By quality & level",
  byType: "By type & name",
  equipment: "Equipment layout",
};

const VALID_KEYS = new Set<string>(BAG_SORT_KEY_CATALOG.map((d) => d.key));

let nextRuleSerial = 1;

function newRuleId(key: BagSortKey): string {
  nextRuleSerial += 1;
  return `rule-${key}-${nextRuleSerial}`;
}

function defForKey(key: BagSortKey): BagSortKeyDef {
  for (let i = 0; i < BAG_SORT_KEY_CATALOG.length; i++) {
    if (BAG_SORT_KEY_CATALOG[i].key === key) return BAG_SORT_KEY_CATALOG[i];
  }
  return BAG_SORT_KEY_CATALOG[0];
}

function cloneRule(rule: BagSortRule): BagSortRule {
  return {
    id: rule.id,
    key: rule.key,
    dir: rule.dir,
    enabled: rule.enabled,
  };
}

function ruleFromPartial(raw: unknown, fallback: BagSortRule): BagSortRule {
  if (!raw || typeof raw !== "object") return cloneRule(fallback);
  const src = raw as Record<string, unknown>;
  const key = VALID_KEYS.has(String(src.key))
    ? (String(src.key) as BagSortKey)
    : fallback.key;
  const id =
    typeof src.id === "string" && src.id.trim()
      ? String(src.id).trim()
      : newRuleId(key);
  const dir: BagSortDir = src.dir === "desc" ? "desc" : "asc";
  return {
    id,
    key,
    dir,
    enabled: src.enabled !== false,
  };
}

function presetRules(preset: BagSortPresetId): BagSortRule[] {
  const mk = (key: BagSortKey, dir?: BagSortDir, enabled = true): BagSortRule => ({
    id: newRuleId(key),
    key,
    dir: dir ?? defForKey(key).defaultDir,
    enabled,
  });
  switch (preset) {
    case "byName":
      return [mk("name", "asc")];
    case "byQuality":
      return [
        mk("grade", "desc"),
        mk("level", "desc"),
        mk("name", "asc"),
      ];
    case "byType":
      return [mk("type", "asc"), mk("name", "asc")];
    case "equipment":
      return [
        mk("gearSlot", "asc"),
        mk("grade", "desc"),
        mk("level", "desc"),
        mk("name", "asc"),
      ];
    case "default":
      return [
        mk("category", "asc"),
        mk("grade", "desc"),
        mk("type", "asc"),
        mk("name", "asc"),
        mk("level", "desc"),
        mk("locked", "asc"),
      ];
    case "custom":
    default:
      return presetRules("default");
  }
}

export const DEFAULT_BAG_SORT_PREFS: BagSortPrefs = {
  emptyLast: true,
  preset: "default",
  rules: presetRules("default"),
};

function normalizePreset(raw: unknown): BagSortPresetId {
  const s = String(raw || "");
  if (s === "byName" || s === "byQuality" || s === "byType" || s === "equipment") {
    return s;
  }
  if (s === "custom") return "custom";
  return "default";
}

/** Merge saved prefs; legacy fixed-rule blobs migrate to ids + preset. */
export function normalizeBagSortPrefs(raw: unknown): BagSortPrefs {
  const src =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const preset = normalizePreset(src.preset);
  let rules: BagSortRule[] = [];
  if (Array.isArray(src.rules) && src.rules.length) {
    const fallback = presetRules("default")[0];
    for (let i = 0; i < src.rules.length; i++) {
      rules.push(ruleFromPartial(src.rules[i], fallback));
    }
  } else {
    rules = preset === "custom" ? presetRules("default") : presetRules(preset);
  }
  if (!rules.length) rules = presetRules("default");
  return {
    emptyLast: src.emptyLast !== false,
    preset,
    rules,
  };
}

export function getBagSortPrefs(): BagSortPrefs {
  return normalizeBagSortPrefs(getSettings().bagSort);
}

export function patchBagSortPrefs(partial: Partial<BagSortPrefs>): BagSortPrefs {
  const prev = getBagSortPrefs();
  const next = normalizeBagSortPrefs({
    ...prev,
    ...partial,
    rules: partial.rules ?? prev.rules,
  });
  patchSettings({ bagSort: next });
  return next;
}

export function applyBagSortPreset(preset: BagSortPresetId): BagSortPrefs {
  if (preset === "custom") {
    return patchBagSortPrefs({ preset: "custom" });
  }
  return patchBagSortPrefs({
    preset,
    rules: presetRules(preset),
  });
}

export function enabledBagSortRules(prefs: BagSortPrefs): BagSortRule[] {
  const out: BagSortRule[] = [];
  for (let i = 0; i < prefs.rules.length; i++) {
    if (prefs.rules[i].enabled) out.push(prefs.rules[i]);
  }
  return out;
}

export function moveBagSortRule(
  rules: BagSortRule[],
  id: string,
  delta: -1 | 1,
): BagSortRule[] {
  const idx = rules.findIndex((r) => r.id === id);
  if (idx < 0) return rules.slice();
  const j = idx + delta;
  if (j < 0 || j >= rules.length) return rules.slice();
  const out = rules.map(cloneRule);
  const tmp = out[idx];
  out[idx] = out[j];
  out[j] = tmp;
  return out;
}

export function addBagSortRule(
  rules: BagSortRule[],
  key: BagSortKey,
): BagSortRule[] {
  const def = defForKey(key);
  return rules.concat([
    {
      id: newRuleId(key),
      key,
      dir: def.defaultDir,
      enabled: true,
    },
  ]);
}

export function removeBagSortRule(
  rules: BagSortRule[],
  id: string,
): BagSortRule[] {
  if (rules.length <= 1) return rules.slice();
  return rules.filter((r) => r.id !== id);
}

export function updateBagSortRule(
  rules: BagSortRule[],
  id: string,
  patch: Partial<Pick<BagSortRule, "key" | "dir" | "enabled">>,
): BagSortRule[] {
  return rules.map((r) => {
    if (r.id !== id) return r;
    const key = patch.key && VALID_KEYS.has(patch.key) ? patch.key : r.key;
    return {
      ...r,
      ...patch,
      key,
      dir: patch.dir === "desc" ? "desc" : patch.dir === "asc" ? "asc" : r.dir,
    };
  });
}

/** One-line summary for tooltips / game_log. */
export function describeBagSortRules(prefs: BagSortPrefs): string {
  const enabled = enabledBagSortRules(prefs);
  if (!enabled.length) return "no rules enabled";
  const parts: string[] = [];
  for (let i = 0; i < enabled.length; i++) {
    const r = enabled[i];
    const label = defForKey(r.key).label;
    parts.push(`${label} ${r.dir === "desc" ? "↓" : "↑"}`);
  }
  return parts.join(" → ");
}
