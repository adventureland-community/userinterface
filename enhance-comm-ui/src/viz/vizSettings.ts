/**
 * Visualization overlay settings for /comm map drawings.
 * Keys match agentic/mockups MockVizDefaults.
 */

export const VIZ_SETTINGS_KEY = "ecu-viz-settings";
export const VIZ_LINE_MTYPES_KEY = "ecu-viz-line-mtypes";

export type VizSettingKey =
  | "world.attackRange"
  | "world.abilityImminent"
  | "world.abilityGhost"
  | "world.auraRing"
  | "world.highlightAtRisk"
  | "world.targetLine" // legacy localStorage only; not exposed in settings UI
  | "world.leashBoundary"
  | "world.spawnPoints"
  | "world.quirkHitboxes"
  | "entity.hpBar"
  | "entity.aggroRing"
  | "entity.cdLabel"
  | "entity.abilityName"
  | "entity.nameplate"
  | "comm.mechanicChips"
  | "comm.spawnAlert"
  | "comm.hpThresholds"
  | "debug.entityIds"
  | "debug.gridCoords"
  | "lines.moveDest"
  | "lines.aggroTarget"
  | "lines.attackTarget"
  | "lines.filter.players"
  | "lines.filter.monsters"
  | "lines.filter.focusOnly";

export type VizSettings = Record<VizSettingKey, boolean>;

export type VizLineKind = "moveDest" | "aggroTarget" | "attackTarget";

export type VizLineRule = {
  moveDest: boolean;
  aggroTarget: boolean;
  attackTarget: boolean;
};

/** Production defaults — imminent rings on; static/debug off. */
export const DEFAULT_VIZ_SETTINGS: VizSettings = {
  "world.attackRange": false,
  "world.abilityImminent": true,
  "world.abilityGhost": false,
  "world.auraRing": false,
  "world.highlightAtRisk": true,
  "world.targetLine": false,
  "world.leashBoundary": false,
  "world.spawnPoints": false,
  "world.quirkHitboxes": false,
  // Native client already draws HP / nameplates / aggro tint — keep off.
  "entity.hpBar": false,
  "entity.aggroRing": false,
  "entity.cdLabel": false,
  "entity.abilityName": false,
  "entity.nameplate": false,
  "comm.mechanicChips": true,
  "comm.spawnAlert": true,
  "comm.hpThresholds": true,
  "debug.entityIds": false,
  "debug.gridCoords": false,
  "lines.moveDest": false,
  "lines.aggroTarget": false,
  "lines.attackTarget": false,
  // Kind filters stay in settings for saved prefs; not exposed in UI because
  // aggro/attack line types already scope to monsters vs players.
  "lines.filter.players": true,
  "lines.filter.monsters": true,
  "lines.filter.focusOnly": false,
};

export const DEFAULT_LINE_BY_KIND: Record<"monster" | "player", VizLineRule> = {
  monster: { moveDest: true, aggroTarget: true, attackTarget: false },
  player: { moveDest: true, aggroTarget: false, attackTarget: true },
};

type VizListener = () => void;
const listeners: VizListener[] = [];

function parseBoolMap(raw: string | null): Record<string, boolean> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, boolean> = {};
    const keys = Object.keys(parsed);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (typeof parsed[k] === "boolean") out[k] = parsed[k];
    }
    return out;
  } catch {
    return {};
  }
}

export function getVizSettings(): VizSettings {
  const saved = parseBoolMap(
    typeof localStorage !== "undefined"
      ? localStorage.getItem(VIZ_SETTINGS_KEY)
      : null,
  );
  return { ...DEFAULT_VIZ_SETTINGS, ...(saved as Partial<VizSettings>) };
}

export function patchVizSettings(partial: Partial<VizSettings>): VizSettings {
  const next = { ...getVizSettings(), ...partial };
  try {
    localStorage.setItem(VIZ_SETTINGS_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  notifyVizListeners();
  return next;
}

export function resetVizSettings(): VizSettings {
  try {
    localStorage.setItem(
      VIZ_SETTINGS_KEY,
      JSON.stringify(DEFAULT_VIZ_SETTINGS),
    );
  } catch {
    /* ignore */
  }
  notifyVizListeners();
  return { ...DEFAULT_VIZ_SETTINGS };
}

/** Per-mtype / entity-id overrides for debug lines. */
export function getVizLineMtypeRules(): Record<string, Partial<VizLineRule>> {
  try {
    const raw =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(VIZ_LINE_MTYPES_KEY)
        : null;
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, Partial<VizLineRule>>;
  } catch {
    return {};
  }
}

export function patchVizLineMtypeRule(
  key: string,
  partial: Partial<VizLineRule>,
): Record<string, Partial<VizLineRule>> {
  const next = { ...getVizLineMtypeRules() };
  next[key] = { ...(next[key] || {}), ...partial };
  try {
    localStorage.setItem(VIZ_LINE_MTYPES_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  notifyVizListeners();
  return next;
}

export function subscribeVizSettings(listener: VizListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function notifyVizListeners(): void {
  for (let i = 0; i < listeners.length; i++) listeners[i]();
}

/** Sibling viz modules (ability rules) reuse the same repaint subscription. */
export function notifyVizSettingsChanged(): void {
  notifyVizListeners();
}

/** Comm HUD panels can gate chips / thresholds without owning map paint. */
export function vizCommFlag(
  key: "comm.mechanicChips" | "comm.spawnAlert" | "comm.hpThresholds",
): boolean {
  return getVizSettings()[key] !== false;
}
