/**
 * Scripted instance scenarios for overlay preview — crypt, tomb, spider, winter.
 */

import { getG } from "../host/al";
import type { EntityLike } from "../host/globals";
import { getInstanceMobLabel } from "../instance/labels";
import { getInstanceConfig, type InstanceConfig } from "../instance/configs";

export type InstanceSimScenarioId =
  "crypt-pull" | "crypt-boss" | "tomb" | "spider" | "winter";

export type InstanceSimScenario = {
  id: InstanceSimScenarioId;
  label: string;
  map: string;
  build: (opts: SimBuildOpts) => EntityLike[];
};

export type SimBuildOpts = {
  instanceId: string;
  map: string;
  now: number;
  startedAt: number;
  /** Observed player id for aggro highlights. */
  focusId?: string;
};

export const INSTANCE_SIM_ID = "__ecu_sim__";

/** Sit at NOW as ready between looping overlay CDs (matches mock-ability-timeline). */
export const SIM_ABILITY_READY_HOLD_MS = 2800;

/** Looping remaining ms from a phase offset (0 = just fired → full CD). */
export function simCooldownMs(
  cooldown: number,
  phaseMs: number,
  now: number,
  startedAt: number,
): number {
  if (cooldown <= 0) return 0;
  const period = cooldown + SIM_ABILITY_READY_HOLD_MS;
  const t = Math.max(0, now - startedAt + phaseMs);
  const elapsed = t % period;
  if (elapsed >= cooldown) return 0;
  // Exact wrap used to return 0 for a whole sim tick, which snapped icons
  // to NOW then back to full CD. Just-fired is a full remaining CD.
  return elapsed === 0 ? cooldown : cooldown - elapsed;
}

/** Live G.monsters[mtype].abilities[id].cooldown — same source as ability timeline. */
export function monsterAbilityCooldownMs(
  mtype: string,
  abilityId: string,
): number {
  try {
    const ab = getG()?.monsters?.[mtype]?.abilities?.[abilityId];
    if (ab && typeof ab.cooldown === "number" && ab.cooldown > 0) {
      return ab.cooldown;
    }
  } catch {
    /* no window in node tests */
  }
  return 0;
}

/** Wire-faithful entity.s[id].ms for a monster ability CD. */
export function simAbilityMs(
  mtype: string,
  abilityId: string,
  phaseMs: number,
  opts: SimBuildOpts,
): number {
  const cooldown = monsterAbilityCooldownMs(mtype, abilityId);
  if (cooldown <= 0) return 0;
  return simCooldownMs(cooldown, phaseMs, opts.now, opts.startedAt);
}

function simAbilityStatuses(
  mtype: string,
  phases: Record<string, number>,
  opts: SimBuildOpts,
): EntityLike["s"] | undefined {
  const ids = Object.keys(phases);
  const s: NonNullable<EntityLike["s"]> = {};
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (monsterAbilityCooldownMs(mtype, id) <= 0) continue;
    s[id] = { ms: simAbilityMs(mtype, id, phases[id], opts) };
  }
  return Object.keys(s).length ? s : undefined;
}

function readMonsterRange(mtype: string): number | undefined {
  try {
    const r = getG()?.monsters?.[mtype]?.range;
    return typeof r === "number" ? r : undefined;
  } catch {
    return undefined;
  }
}

function monsterBase(
  id: string,
  mtype: string,
  opts: SimBuildOpts,
  extra: Partial<EntityLike> = {},
): EntityLike {
  return {
    id,
    type: "monster",
    mtype,
    name: getInstanceMobLabel(mtype),
    visible: true,
    dead: false,
    cooperative: true,
    map: opts.map,
    in: opts.instanceId,
    level: extra.level ?? 10,
    hp: extra.hp ?? 50000,
    max_hp: extra.max_hp ?? 50000,
    x: extra.x ?? 0,
    y: extra.y ?? 0,
    real_x: extra.real_x ?? extra.x ?? 0,
    real_y: extra.real_y ?? extra.y ?? 0,
    range: extra.range ?? readMonsterRange(mtype),
    ...extra,
  };
}

function cryptPull(opts: SimBuildOpts): EntityLike[] {
  const focus = opts.focusId || "ecu-sim-player";
  return [
    monsterBase("ecu-sim-a1", "a1", opts, {
      level: 12,
      target: focus,
      focus,
      x: -90,
      y: -20,
      going_x: -50,
      going_y: -20,
    }),
    monsterBase("ecu-sim-a2", "a2", opts, {
      level: 15,
      x: 36,
      y: 26,
      s: simAbilityStatuses("a2", { anger: 2000 }, opts),
    }),
    monsterBase("ecu-sim-a4", "a4", opts, {
      level: 14,
      x: 72,
      y: 40,
    }),
    monsterBase("ecu-sim-vbat", "vbat", opts, {
      cooperative: false,
      level: 1,
      hp: 800,
      max_hp: 800,
      x: -40,
      y: 92,
    }),
    monsterBase("ecu-sim-bat", "nerfedbat", opts, {
      cooperative: false,
      level: 1,
      hp: 400,
      max_hp: 400,
      x: 54,
      y: 86,
    }),
  ];
}

function cryptBoss(opts: SimBuildOpts): EntityLike[] {
  return [
    monsterBase("ecu-sim-a4", "a4", opts, {
      level: 14,
      hp: 120000,
      max_hp: 120000,
      x: 0,
      y: 0,
    }),
  ];
}

function tombPull(opts: SimBuildOpts): EntityLike[] {
  const focus = opts.focusId || "ecu-sim-player";
  return [
    monsterBase("ecu-sim-gpurple", "gpurplepro", opts, {
      level: 18,
      target: focus,
      hp: 200000,
      max_hp: 200000,
      x: 0,
      y: -12,
      s: simAbilityStatuses(
        "gpurplepro",
        { anger: 4000, warpstomp: 1000 },
        opts,
      ),
    }),
  ];
}

function spiderDen(opts: SimBuildOpts): EntityLike[] {
  const out: EntityLike[] = [
    monsterBase("ecu-sim-spbl", "spiderbl", opts, {
      level: 12,
      x: -72,
      y: -42,
    }),
    monsterBase("ecu-sim-spbr", "spiderbr", opts, { level: 12, x: 78, y: -36 }),
  ];
  const spiderPoints = [
    [-38, 28],
    [2, 8],
    [40, 32],
    [82, 16],
  ];
  for (let i = 0; i < 4; i++) {
    out.push(
      monsterBase(`ecu-sim-sp-${i}`, "spider", opts, {
        cooperative: false,
        level: 8,
        hp: 2000,
        max_hp: 2000,
        x: spiderPoints[i][0],
        y: spiderPoints[i][1],
      }),
    );
  }
  return out;
}

function winterLair(opts: SimBuildOpts): EntityLike[] {
  return [
    monsterBase("ecu-sim-xmagefi", "xmagefi", opts, {
      level: 20,
      hp: 90000,
      max_hp: 90000,
      x: 0,
      y: -10,
      s: simAbilityStatuses("xmagefi", { anger: 6000, multi_burn: 1500 }, opts),
    }),
  ];
}

export const INSTANCE_SIM_SCENARIOS: InstanceSimScenario[] = [
  {
    id: "crypt-pull",
    label: "Crypt — mid pull",
    map: "crypt",
    build: cryptPull,
  },
  { id: "crypt-boss", label: "Crypt — Orlok", map: "crypt", build: cryptBoss },
  { id: "tomb", label: "Tomb — purple", map: "tomb", build: tombPull },
  {
    id: "spider",
    label: "Spider den",
    map: "spider_instance",
    build: spiderDen,
  },
  {
    id: "winter",
    label: "Winter — fire phase",
    map: "winter_instance",
    build: winterLair,
  },
];

export function scenarioById(
  id: InstanceSimScenarioId,
): InstanceSimScenario | undefined {
  for (let i = 0; i < INSTANCE_SIM_SCENARIOS.length; i++) {
    if (INSTANCE_SIM_SCENARIOS[i].id === id) return INSTANCE_SIM_SCENARIOS[i];
  }
  return undefined;
}

export function trackedMtypesForMap(map: string): Set<string> {
  const cfg: InstanceConfig | null = getInstanceConfig(map);
  const out = new Set<string>();
  if (!cfg) return out;
  for (let i = 0; i < cfg.trackedMtypes.length; i++) {
    out.add(cfg.trackedMtypes[i]);
  }
  return out;
}
