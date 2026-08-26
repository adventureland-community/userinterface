/**
 * Guided tour orchestration hook — extracted from CommUI.
 */

import { getReact, e } from "../../host/react";
import type { PanelId } from "../../lib/layout";
import { savePanelVisible } from "../../lib/settings";
import {
  getMeterAppearance,
  patchMeterAppearance,
} from "../../meters/meterAppearance";
import { GuidedTourOverlay } from "../frames/comm/guidedTour/GuidedTourOverlay";
import {
  flushContextualTourQueue,
  registerContextualTourHost,
  tryContextualTour,
} from "../frames/comm/guidedTour/contextualTour";
import {
  INTRO_TOUR_CHAIN,
  INTRO_TOUR_ID,
  clearTourCompleted,
  isTourCompleted,
  migrateLegacyTourFlags,
  tourById,
  type GuidedTourDef,
} from "../frames/comm/guidedTour/tourCatalog";
import {
  defaultTourEffectHost,
  type TourEffectHost,
} from "../frames/comm/guidedTour/tourEffects";
import {
  beginTourSession,
  endTourSession,
  type TourSession,
} from "../frames/comm/guidedTour/tourRunner";
import { pickMeterTourFocusId } from "./pickMeterTourFocusId";

export type UseCommGuidedToursOpts = {
  layoutEdit: boolean;
  setLayoutEdit: (value: boolean) => void;
  metersHidden: boolean;
  setMetersHidden: (hidden: boolean) => void;
  meterAddOpen: boolean;
  setMeterAddOpen: (open: boolean) => void;
  setVisible: (id: PanelId, visible: boolean) => void;
  getPanelVisible: (id: PanelId) => boolean;
  /** True while intro or What's New (or any blocking modal) is open. */
  toursBlocked: boolean;
  setSetupWizardOpen: (open: boolean) => void;
  isObserving: boolean;
  bagOpen: boolean;
  commandOpen: boolean;
  itemInfoOpen: boolean;
  /** Current meter instances — used when starting the meters tour without a prior add. */
  getMeterInstances?: () => Array<{ id: string; zIndex?: number }>;
};

export type CommGuidedToursApi = {
  startIntroTour: (force?: boolean) => void;
  toggleLayoutEdit: () => void;
  tourOverlay: any;
  /** True while a spotlight tour is on screen — lock destructive meter chrome. */
  tourActive: boolean;
  /** End the active spotlight tour (Skip / Done / intentional override). */
  dismissActiveTour: () => void;
  /** Meter shell spotlight for combat-meters tour. */
  tourFocusMeterId: string | null;
  setTourFocusMeterId: (id: string | null) => void;
};

export function useCommGuidedTours(
  opts: UseCommGuidedToursOpts,
): CommGuidedToursApi {
  const React = getReact();
  const [activeTour, setActiveTour] = React.useState(
    null as null | { tour: GuidedTourDef; step: number },
  );
  const [tourFocusMeterId, setTourFocusMeterId] = React.useState(
    null as string | null,
  );
  const sessionRef = React.useRef(null as TourSession | null);
  const activeTourRef = React.useRef(activeTour);
  const toursBlockedRef = React.useRef(opts.toursBlocked);
  const optsRef = React.useRef(opts);
  const tourFocusRef = React.useRef(tourFocusMeterId);
  activeTourRef.current = activeTour;
  toursBlockedRef.current = opts.toursBlocked;
  optsRef.current = opts;
  tourFocusRef.current = tourFocusMeterId;

  const effectHostRef = React.useRef(null as TourEffectHost | null);
  if (!effectHostRef.current) {
    effectHostRef.current = defaultTourEffectHost({
      getLayoutEdit: () => optsRef.current.layoutEdit,
      setLayoutEdit: (v) => optsRef.current.setLayoutEdit(v),
      getMetersHidden: () => optsRef.current.metersHidden,
      setMetersHidden: (v) => optsRef.current.setMetersHidden(v),
      getMeterAddOpen: () => optsRef.current.meterAddOpen,
      setMeterAddOpen: (v) => optsRef.current.setMeterAddOpen(v),
      getPanelVisible: (id) => optsRef.current.getPanelVisible(id),
      setPanelVisible: (id, visible) => {
        optsRef.current.setVisible(id, visible);
        if (visible) savePanelVisible(id, true);
      },
      getTestBars: () => !!getMeterAppearance().testBars,
      setTestBars: (enabled) => patchMeterAppearance({ testBars: enabled }),
    });
  }

  const finishTour = (finishedId?: string) => {
    const cur = activeTourRef.current;
    const id = finishedId || cur?.tour.id;
    endTourSession(
      sessionRef.current,
      cur?.tour,
      cur?.step,
      effectHostRef.current,
    );
    sessionRef.current = null;
    // Clear immediately so Done never leaves a stuck overlay.
    activeTourRef.current = null;
    setActiveTour(null);
    if (id === "meters" || id === INTRO_TOUR_ID) setTourFocusMeterId(null);

    if (!id) {
      flushContextualTourQueue();
      return;
    }

    let found = false;
    for (let i = 0; i < INTRO_TOUR_CHAIN.length; i++) {
      if (found) {
        const nextId = INTRO_TOUR_CHAIN[i];
        if (isTourCompleted(nextId)) continue;
        const tour = tourById(nextId);
        if (!tour || !effectHostRef.current) {
          flushContextualTourQueue();
          return;
        }
        sessionRef.current = beginTourSession(effectHostRef.current, tour);
        sessionRef.current.applyStep(0, null);
        const next = { tour, step: 0 };
        activeTourRef.current = next;
        setActiveTour(next);
        return;
      }
      if (INTRO_TOUR_CHAIN[i] === id) found = true;
    }
    flushContextualTourQueue();
  };

  const launchTour = (id: string) => {
    const tour = tourById(id);
    const effectHost = effectHostRef.current;
    if (!tour || !effectHost) return;
    if ((id === "meters" || id === INTRO_TOUR_ID) && !tourFocusRef.current) {
      const pick = pickMeterTourFocusId(
        optsRef.current.getMeterInstances?.() || [],
      );
      if (pick) setTourFocusMeterId(pick);
    }
    endTourSession(
      sessionRef.current,
      activeTourRef.current?.tour,
      activeTourRef.current?.step,
      effectHost,
    );
    sessionRef.current = beginTourSession(effectHost, tour);
    sessionRef.current.applyStep(0, null);
    const next = { tour, step: 0 };
    // Sync before setState so isBlocked() sees the active tour immediately.
    activeTourRef.current = next;
    setActiveTour(next);
  };

  const launchContextualTour = (id: string): boolean => {
    if (activeTourRef.current || toursBlockedRef.current) return false;
    launchTour(id);
    return true;
  };

  const startIntroTour = (force?: boolean) => {
    optsRef.current.setSetupWizardOpen(false);
    if (force) clearTourCompleted(INTRO_TOUR_ID);
    for (let i = 0; i < INTRO_TOUR_CHAIN.length; i++) {
      const id = INTRO_TOUR_CHAIN[i];
      if (!force && isTourCompleted(id)) continue;
      launchTour(id);
      return;
    }
  };

  const toggleLayoutEdit = () => {
    const next = !optsRef.current.layoutEdit;
    optsRef.current.setLayoutEdit(next);
    if (next) tryContextualTour("layout", 220);
  };

  React.useEffect(() => {
    migrateLegacyTourFlags();
    registerContextualTourHost({
      isBlocked: () => !!activeTourRef.current || !!toursBlockedRef.current,
      startTour: launchContextualTour,
    });
    return () => {
      registerContextualTourHost(null);
      endTourSession(
        sessionRef.current,
        activeTourRef.current?.tour,
        activeTourRef.current?.step,
        effectHostRef.current,
      );
    };
  }, []);

  React.useEffect(() => {
    if (!opts.toursBlocked && !activeTour) {
      flushContextualTourQueue();
    }
  }, [opts.toursBlocked, activeTour]);

  const setActiveTourStep = (step: number) => {
    setActiveTour((prev) => {
      if (!prev || !sessionRef.current) return prev;
      sessionRef.current.applyStep(step, prev.step);
      return { tour: prev.tour, step };
    });
  };

  const tourOverlay = activeTour
    ? e(GuidedTourOverlay, {
        tour: activeTour.tour,
        stepIndex: activeTour.step,
        onStep: setActiveTourStep,
        onDone: () => finishTour(activeTourRef.current?.tour.id),
        advanceContext: {
          isObserving: opts.isObserving,
          bagOpen: opts.bagOpen,
          commandOpen: opts.commandOpen,
          itemInfoOpen: opts.itemInfoOpen,
        },
      })
    : null;

  return {
    startIntroTour,
    toggleLayoutEdit,
    tourOverlay,
    tourActive: !!activeTour,
    dismissActiveTour: () => finishTour(activeTourRef.current?.tour.id),
    tourFocusMeterId,
    setTourFocusMeterId,
  };
}
