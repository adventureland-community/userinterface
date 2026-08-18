/**
 * Instance simulator for overlay-preview (dev/overlay) — not part of the live /comm HUD.
 * Preview writes fake entities + map onto the host stub; tests import applyInstanceSim.
 *
 * Ability cooldowns come from `window.G.monsters[mtype].abilities`.
 * Console (preview page): window.__ecuInstanceSim.enable("crypt-pull")
 */

import type { EntityLike } from "../host/globals";
import { getSettings, mergePanelVisible, patchSettings } from "../lib/settings";
import type { GameSnapshot } from "../tick";
import {
  INSTANCE_SIM_ID,
  INSTANCE_SIM_SCENARIOS,
  scenarioById,
  trackedMtypesForMap,
  type InstanceSimScenarioId,
} from "./instanceSimScenarios";

const STORAGE_KEY = "ecu-instance-sim";

type SimState = {
  active: boolean;
  scenarioId: InstanceSimScenarioId;
  startedAt: number;
};

let state: SimState = readPersisted();
const listeners = new Set<() => void>();

function readPersisted(): SimState {
  if (typeof sessionStorage === "undefined") {
    return {
      active: false,
      scenarioId: "crypt-pull",
      startedAt: Date.now(),
    };
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SimState>;
      if (
        parsed.active &&
        parsed.scenarioId &&
        scenarioById(parsed.scenarioId)
      ) {
        return {
          active: true,
          scenarioId: parsed.scenarioId,
          startedAt:
            typeof parsed.startedAt === "number"
              ? parsed.startedAt
              : Date.now(),
        };
      }
    }
  } catch {
    /* ignore */
  }
  return {
    active: false,
    scenarioId: "crypt-pull",
    startedAt: Date.now(),
  };
}

function persist(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (state.active) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

function notify(): void {
  for (const fn of listeners) {
    fn();
  }
}

function hasBrowserEnv(): boolean {
  return typeof globalThis !== "undefined" && globalThis.window != null;
}

export function subscribeInstanceSim(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function isInstanceSimActive(): boolean {
  return state.active;
}

export function getInstanceSimScenarioId(): InstanceSimScenarioId {
  return state.scenarioId;
}

export function getInstanceSimMapOverride(): string | undefined {
  if (!state.active) return undefined;
  const sc = scenarioById(state.scenarioId);
  return sc?.map;
}

export function getInstanceSimInstanceId(): string | undefined {
  return state.active ? INSTANCE_SIM_ID : undefined;
}

/** Cheap tick bucket so ability CDs re-render while sim is on. */
export function instanceSimUiBucket(now: number = Date.now()): number {
  if (!state.active) return 0;
  return Math.floor(now / 250);
}

export function listInstanceSimScenarios(): ReadonlyArray<{
  id: InstanceSimScenarioId;
  label: string;
}> {
  return INSTANCE_SIM_SCENARIOS.map((s) => ({ id: s.id, label: s.label }));
}

export function revealInstancePanels(): void {
  const cur = getSettings().panelVisible;
  patchSettings({
    panelVisible: mergePanelVisible({
      ...cur,
      instance: true,
      instanceRun: true,
      abilityTimeline: true,
      abilityTimelineBigIcon: true,
      abilityTimelineHighlight: true,
      bossBar: true,
    }),
  });
}

export function setInstanceSimEnabled(on: boolean): void {
  if (on === state.active) return;
  state = {
    ...state,
    active: on,
    startedAt: Date.now(),
  };
  if (on) {
    if (hasBrowserEnv()) revealInstancePanels();
  }
  persist();
  notify();
}

export function setInstanceSimScenario(id: InstanceSimScenarioId): void {
  if (!scenarioById(id)) return;
  state = {
    ...state,
    scenarioId: id,
    startedAt: Date.now(),
  };
  persist();
  notify();
}

export function toggleInstanceSim(): boolean {
  setInstanceSimEnabled(!state.active);
  return state.active;
}

function buildSimEntities(now: number, focusId?: string): EntityLike[] {
  const sc = scenarioById(state.scenarioId);
  if (!sc) return [];
  return sc.build({
    instanceId: INSTANCE_SIM_ID,
    map: sc.map,
    now,
    startedAt: state.startedAt,
    focusId,
  });
}

/**
 * Merge sim entities into the tick snapshot and strip conflicting live mtypes.
 */
export function applyInstanceSim(snap: GameSnapshot): GameSnapshot {
  if (!state.active) return snap;
  const sc = scenarioById(state.scenarioId);
  if (!sc) return snap;

  const tracked = trackedMtypesForMap(sc.map);
  const filtered: EntityLike[] = [];
  for (let i = 0; i < snap.entities.length; i++) {
    const ent = snap.entities[i];
    if (ent.mtype && tracked.has(ent.mtype)) continue;
    filtered.push(ent);
  }

  const focusId =
    snap.observing && snap.observing.id != null
      ? String(snap.observing.id)
      : undefined;
  const simEntities = buildSimEntities(snap.now, focusId);
  return {
    ...snap,
    entities: filtered.concat(simEntities),
  };
}

export type InstanceSimDebugApi = {
  enable: (scenario?: InstanceSimScenarioId) => void;
  disable: () => void;
  toggle: () => boolean;
  setScenario: (id: InstanceSimScenarioId) => void;
  isActive: () => boolean;
  listScenarios: () => ReturnType<typeof listInstanceSimScenarios>;
  revealPanels: () => void;
};

export function installInstanceSimDebug(): void {
  if (!hasBrowserEnv()) return;
  const api: InstanceSimDebugApi = {
    enable: (scenario) => {
      if (scenario) setInstanceSimScenario(scenario);
      setInstanceSimEnabled(true);
    },
    disable: () => setInstanceSimEnabled(false),
    toggle: toggleInstanceSim,
    setScenario: setInstanceSimScenario,
    isActive: isInstanceSimActive,
    listScenarios: listInstanceSimScenarios,
    revealPanels: revealInstancePanels,
  };
  (
    window as Window & { __ecuInstanceSim?: InstanceSimDebugApi }
  ).__ecuInstanceSim = api;
}
