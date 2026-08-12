/**
 * Contextual tour triggers — declarative table + hook for CommUI.
 */

import { getReact } from "../../host/react";
import type { EntityLike } from "../../host/globals";
import { hasVisibleCoopMeter } from "../../meters/meterCoopSignal";
import { runMeterQuery } from "../../meters/meterQuery";
import type { MeterInstance } from "../../meters/meterTypes";
import { combatSignals } from "../../queries/combatSignals";
import { isTourCompleted } from "../frames/comm/guidedTour/tourCatalog";
import { tryContextualTour } from "../frames/comm/guidedTour/contextualTour";

export type ContextualTourContext = {
  selectedEntity: EntityLike | null | undefined;
  meterCount: number;
  entities: EntityLike[];
  meterInstances: MeterInstance[];
};

type TriggerDef = {
  id: string;
  delayMs: number;
  /** Fire once per mount session after first success (coop). */
  oncePerSession?: boolean;
  when: (
    ctx: ContextualTourContext,
    prev: ContextualTourContext | null,
  ) => boolean;
};

const TRIGGERS: TriggerDef[] = [
  {
    id: "meters",
    delayMs: 350,
    when: (ctx, prev) => prev != null && ctx.meterCount > prev.meterCount,
  },
  {
    id: "inspect",
    delayMs: 250,
    when: (ctx, prev) => !!ctx.selectedEntity && !prev?.selectedEntity,
  },
  {
    id: "combat",
    delayMs: 450,
    when: (ctx, prev) => {
      const now = combatSignals(ctx.entities).inCombat;
      const was = prev ? combatSignals(prev.entities).inCombat : false;
      return now && !was;
    },
  },
  {
    id: "coop",
    delayMs: 500,
    oncePerSession: true,
    when: (ctx) => {
      if (isTourCompleted("coop")) return false;
      if (!hasVisibleCoopMeter(ctx.meterInstances)) return false;
      for (let i = 0; i < ctx.meterInstances.length; i++) {
        const inst = ctx.meterInstances[i];
        if (inst.visible === false) continue;
        const q = inst.query;
        if (q.kind !== "snapshot") continue;
        if (q.mode !== "coop_v1" && q.mode !== "coop_v2") continue;
        const peek = runMeterQuery(q, {
          entities: ctx.entities,
          partyFocus: inst.partyFocus,
          segmentRef: inst.selectedset,
        });
        if (peek.kind === "ranked" && peek.rows.length > 0) return true;
      }
      return false;
    },
  },
];

function scheduleContextualTour(
  pending: Set<string>,
  id: string,
  delayMs: number,
): void {
  if (pending.has(id)) return;
  if (isTourCompleted(id)) return;
  pending.add(id);
  tryContextualTour(id, delayMs);
  window.setTimeout(() => pending.delete(id), delayMs + 120);
}

export function useContextualTourTriggers(ctx: ContextualTourContext): void {
  const React = getReact();
  const prevRef = React.useRef(null as ContextualTourContext | null);
  const onceFiredRef = React.useRef(new Set<string>());
  const pendingRef = React.useRef(new Set<string>());

  React.useEffect(() => {
    const prev = prevRef.current;

    for (let i = 0; i < TRIGGERS.length; i++) {
      const t = TRIGGERS[i];
      if (t.oncePerSession && onceFiredRef.current.has(t.id)) continue;
      if (!t.when(ctx, prev)) continue;
      if (t.oncePerSession) onceFiredRef.current.add(t.id);
      scheduleContextualTour(pendingRef.current, t.id, t.delayMs);
    }

    prevRef.current = {
      selectedEntity: ctx.selectedEntity,
      meterCount: ctx.meterCount,
      entities: ctx.entities,
      meterInstances: ctx.meterInstances,
    };
  }, [ctx.selectedEntity, ctx.meterCount, ctx.entities, ctx.meterInstances]);
}

export function triggerMeterToolbarTour(): void {
  tryContextualTour("meter-toolbar", 200);
}
