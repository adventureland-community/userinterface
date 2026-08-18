/**
 * Shared live model + clock for the three ability-timeline HUD frames
 * and the Settings preview. Dummy only when there is no live caster model.
 *
 * Root skips React when snapshotUiKey is unchanged (2s status buckets), so
 * countdown labels need a local clock — same idea as EffectIcon, one interval
 * for every subscriber instead of one per panel.
 */

import { getReact } from "../../host/react";
import type { EntityLike } from "../../host/globals";
import {
  type AbilityTimelinePanelModel,
  buildAbilityTimelinePanelModel,
} from "../../instance/abilityTimelineModel";
import {
  type AbilityTimelinePrefs,
  getAbilityTimelinePrefs,
} from "../../instance/abilityTimelinePrefs";
import { dummyAbilityTimelineModel } from "../../instance/abilityTimelineDummy";
import { dismissAbilityTimelineTip } from "../frames/abilityTimelineTip";
import { tickAbilityMotion } from "../frames/abilityTimelineMotion";

const CLOCK_MS = 100;

type ClockListener = () => void;
const clockListeners: ClockListener[] = [];
let clockId = 0;
let clockVisBound = false;

function notifyAbilityClock(): void {
  if (typeof document !== "undefined" && document.hidden) return;
  for (let i = 0; i < clockListeners.length; i++) {
    clockListeners[i]();
  }
}

function onAbilityClockVisibility(): void {
  if (typeof document !== "undefined" && document.hidden) return;
  notifyAbilityClock();
}

function subscribeAbilityClock(listener: ClockListener): () => void {
  clockListeners.push(listener);
  if (!clockId) {
    clockId = window.setInterval(notifyAbilityClock, CLOCK_MS);
    if (!clockVisBound && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onAbilityClockVisibility);
      clockVisBound = true;
    }
  }
  return () => {
    const idx = clockListeners.indexOf(listener);
    if (idx >= 0) clockListeners.splice(idx, 1);
    if (!clockListeners.length && clockId) {
      window.clearInterval(clockId);
      clockId = 0;
    }
  };
}

export type AbilityTimelineLiveArgs = {
  entities: EntityLike[];
  selectedEntity?: string;
  observing?: EntityLike | null;
  layoutEdit?: boolean;
  /** Settings preview: ticking dummy when no live casters. */
  dummyEpoch?: number;
  /** Settings preview: which dummy mtypes to show. */
  dummyMtypes?: string[];
};

export type AbilityTimelineLive = {
  prefs: AbilityTimelinePrefs;
  model: AbilityTimelinePanelModel | null;
  hasActive: boolean;
  tickKey: string;
};

type LiveCache = {
  bucket: number;
  args: AbilityTimelineLiveArgs;
  value: AbilityTimelineLive;
};
let liveCache: LiveCache | null = null;

export function resolveAbilityTimelineLive(
  args: AbilityTimelineLiveArgs,
  now: number = Date.now(),
): AbilityTimelineLive {
  const bucket = Math.floor(now / CLOCK_MS);
  if (
    liveCache &&
    liveCache.bucket === bucket &&
    liveCache.args.entities === args.entities &&
    liveCache.args.selectedEntity === args.selectedEntity &&
    liveCache.args.observing === args.observing &&
    liveCache.args.layoutEdit === args.layoutEdit &&
    liveCache.args.dummyEpoch === args.dummyEpoch &&
    liveCache.args.dummyMtypes === args.dummyMtypes
  ) {
    return liveCache.value;
  }
  const prefs = getAbilityTimelinePrefs();
  const live = buildAbilityTimelinePanelModel(
    args.entities,
    args.selectedEntity,
    args.observing,
    now,
    prefs,
  );
  const wantDummy = !!args.layoutEdit || args.dummyEpoch != null;
  const model =
    live ??
    (wantDummy
      ? dummyAbilityTimelineModel(prefs, now, args.dummyEpoch, args.dummyMtypes)
      : null);
  const loopingDummy = args.dummyEpoch != null;
  const hasActive = !!(
    loopingDummy ||
    (model &&
      model.sections.some((section) => section.rows.some((r) => r.ms > 0)))
  );
  const tickKey = model?.sections.map((s) => s.targetId).join("|") || "";
  const value = { prefs, model, hasActive, tickKey };
  liveCache = { bucket, args, value };
  return value;
}

export function useAbilityTimelineLive(
  args: AbilityTimelineLiveArgs,
): AbilityTimelineLive {
  const React = getReact();
  const [clock, setClock] = React.useState(0);
  void clock;
  const resolved = resolveAbilityTimelineLive(args);
  React.useEffect(() => {
    if (!resolved.hasActive) return;
    return subscribeAbilityClock(() => setClock((n: number) => n + 1));
  }, [resolved.hasActive, resolved.tickKey]);
  React.useEffect(() => {
    if (resolved.model) return;
    dismissAbilityTimelineTip();
  }, [resolved.model]);
  React.useEffect(() => () => dismissAbilityTimelineTip(), []);
  return resolved;
}

/** rAF owns travel-axis pixels. Call once per rail host — not every React render. */
export function useAbilityTimelineMotion(
  hostRef: { current: HTMLElement | null },
  hasActive: boolean,
  tickKey: string,
): void {
  const React = getReact();
  React.useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    tickAbilityMotion(host);
    if (!hasActive) return;
    let raf = 0;
    let live = true;
    const loop = () => {
      if (!live) return;
      tickAbilityMotion(host);
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => {
      live = false;
      window.cancelAnimationFrame(raf);
    };
  }, [hasActive, tickKey]);
}
