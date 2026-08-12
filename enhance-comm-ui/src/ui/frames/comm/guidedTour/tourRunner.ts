/**
 * Guided tour session — snapshot UI once, apply prepare/step effects, restore atomically.
 */

import type { GuidedTourDef } from "./tourCatalog";
import { tourPrepare } from "./tourCatalog";
import {
  applyTourStepEffects,
  restoreTourUi,
  type TourEffectHost,
  type TourStepEffects,
  type TourUiSnapshot,
} from "./tourEffects";

export type TourSession = {
  snap: TourUiSnapshot;
  restore: () => void;
  applyStep: (stepIndex: number, prevIndex: number | null) => void;
};

function prepareEffects(prep: ReturnType<typeof tourPrepare>): TourStepEffects {
  const out: TourStepEffects = {};
  if (prep.layoutEdit) out.layoutEdit = true;
  if (prep.showMeters) out.showMeters = true;
  if (prep.testBars) out.testBars = true;
  return out;
}

export function beginTourSession(
  host: TourEffectHost,
  tour: GuidedTourDef,
): TourSession {
  const snap = host.snapshot();
  applyTourStepEffects(host, prepareEffects(tour.prepare || {}), snap);

  return {
    snap,
    restore: () => restoreTourUi(host, snap),
    applyStep: (stepIndex: number, prevIndex: number | null) => {
      if (prevIndex != null && prevIndex !== stepIndex) {
        const prev = tour.steps[prevIndex];
        if (prev?.exit) applyTourStepEffects(host, prev.exit, snap);
      }
      const step = tour.steps[stepIndex];
      if (step?.enter) applyTourStepEffects(host, step.enter, snap);
    },
  };
}

export function endTourSession(
  session: TourSession | null,
  tour?: GuidedTourDef | null,
  stepIndex?: number | null,
  host?: TourEffectHost | null,
): void {
  if (!session) return;
  if (tour && host != null && stepIndex != null && stepIndex >= 0) {
    const step = tour.steps[stepIndex];
    if (step?.exit) applyTourStepEffects(host, step.exit, session.snap);
  }
  session.restore();
}
