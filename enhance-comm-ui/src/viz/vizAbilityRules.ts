/**
 * Per-ability in-game overlay appearance (name + ring color).
 * Keys are G skill / monster ability ids (anger, warpstomp, …).
 */

import { getG } from "../host/al";
import {
  listAbilityPreviewCasters,
} from "../instance/abilityTimelineDummy";
import { colorFromAbilityKey } from "./abilityPhase";
import { notifyVizSettingsChanged, type VizSettings } from "./vizSettings";

export const VIZ_ABILITY_RULES_KEY = "ecu-viz-ability-rules";

export type VizAbilityRule = {
  /** When set, overrides global entity.abilityName for this ability. */
  showName?: boolean;
  /** 0xRRGGBB ring + label color; omit for auto hash color. */
  color?: number;
};

export type ConfigurableAbility = {
  id: string;
  name: string;
};

export function skillDisplayName(id: string): string {
  try {
    const g = getG()?.skills?.[id]?.name;
    if (typeof g === "string" && g) return g;
  } catch {
    /* no window.G in node tests */
  }
  return id.replace(/_/g, " ");
}

export function parseHexColor(raw: string): number | undefined {
  const s = raw.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return undefined;
  return parseInt(s, 16);
}

export function formatHexColor(color: number): string {
  return `#${(color & 0xffffff).toString(16).padStart(6, "0")}`;
}

export function getVizAbilityRules(): Record<string, VizAbilityRule> {
  try {
    const raw =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(VIZ_ABILITY_RULES_KEY)
        : null;
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, VizAbilityRule> = {};
    const keys = Object.keys(parsed);
    for (let i = 0; i < keys.length; i++) {
      const id = keys[i];
      const row = parsed[id];
      if (!row || typeof row !== "object") continue;
      const rule: VizAbilityRule = {};
      if (typeof row.showName === "boolean") rule.showName = row.showName;
      if (typeof row.color === "number" && Number.isFinite(row.color)) {
        rule.color = row.color & 0xffffff;
      }
      if (rule.showName !== undefined || rule.color !== undefined) {
        out[id] = rule;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function patchVizAbilityRule(
  abilityId: string,
  partial: Partial<VizAbilityRule> | null,
): Record<string, VizAbilityRule> {
  const next = { ...getVizAbilityRules() };
  if (partial == null) {
    delete next[abilityId];
  } else {
    const prev = next[abilityId] || {};
    const merged = { ...prev, ...partial };
    const clean: VizAbilityRule = {};
    if (typeof merged.showName === "boolean") clean.showName = merged.showName;
    if (typeof merged.color === "number" && Number.isFinite(merged.color)) {
      clean.color = merged.color & 0xffffff;
    }
    if (clean.showName === undefined && clean.color === undefined) {
      delete next[abilityId];
    } else {
      next[abilityId] = clean;
    }
  }
  try {
    localStorage.setItem(VIZ_ABILITY_RULES_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  notifyVizSettingsChanged();
  return next;
}

export function resetVizAbilityRules(): void {
  try {
    localStorage.removeItem(VIZ_ABILITY_RULES_KEY);
  } catch {
    /* ignore */
  }
  notifyVizSettingsChanged();
}

/** Unique trackable abilities from the curated Settings preview roster. */
export function listConfigurableAbilities(): ConfigurableAbility[] {
  const casters = listAbilityPreviewCasters();
  const seen = new Set<string>();
  const out: ConfigurableAbility[] = [];
  for (let i = 0; i < casters.length; i++) {
    const abs = casters[i].abilities;
    for (let j = 0; j < abs.length; j++) {
      const ab = abs[j];
      if (seen.has(ab.id)) continue;
      seen.add(ab.id);
      out.push({ id: ab.id, name: ab.name || skillDisplayName(ab.id) });
    }
  }
  out.sort((a, b) => {
    const cmp = a.name.localeCompare(b.name);
    if (cmp !== 0) return cmp;
    return a.id < b.id ? -1 : 1;
  });
  return out;
}

export function resolveAbilityColor(
  abilityId: string,
  rules?: Record<string, VizAbilityRule>,
): number {
  const map = rules || getVizAbilityRules();
  const override = map[abilityId]?.color;
  if (typeof override === "number" && Number.isFinite(override)) {
    return override & 0xffffff;
  }
  return colorFromAbilityKey(abilityId);
}

export function resolveAbilityShowName(
  abilityId: string,
  settings: VizSettings,
  rules?: Record<string, VizAbilityRule>,
): boolean {
  const map = rules || getVizAbilityRules();
  const override = map[abilityId]?.showName;
  if (typeof override === "boolean") return override;
  return settings["entity.abilityName"] === true;
}

export function resolveAbilityAppearance(
  abilityId: string,
  settings: VizSettings,
  rules?: Record<string, VizAbilityRule>,
): { color: number; showName: boolean } {
  return {
    color: resolveAbilityColor(abilityId, rules),
    showName: resolveAbilityShowName(abilityId, settings, rules),
  };
}
