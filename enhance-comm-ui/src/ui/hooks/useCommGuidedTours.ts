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
  registerContextualTourHost,
  tryContextualTour,
} from "../frames/comm/guidedTour/contextualTour";
import {
  INTRO_TOUR_CHAIN,
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

export type UseCommGuidedToursOpts = {
  layoutEdit: boolean;
  setLayoutEdit: (value: boolean) => void;
  metersHidden: boolean;
  setMetersHidden: (hidden: boolean) => void;
  meterAddOpen: boolean;
  setMeterAddOpen: (open: boolean) => void;
  setVisible: (id: PanelId, visible: boolean) => void;
  getPanelVisible: (id: PanelId) => boolean;
  setupWizardOpen: boolean;
  setSetupWizardOpen: (open: boolean) => void;
  isObserving: boolean;
  bagOpen: boolean;
  commandOpen: boolean;
};

export type CommGuidedToursApi = {
  startIntroTour: (force?: boolean) => void;
  toggleLayoutEdit: () => void;
  tourOverlay: any;
};

export function useCommGuidedTours(
  opts: UseCommGuidedToursOpts,
): CommGuidedToursApi {
  const React = getReact();
  const [activeTour, setActiveTour] = React.useState(
    null as null | { tour: GuidedTourDef; step: number },
  );
  const sessionRef = React.useRef(null as TourSession | null);
  const activeTourRef = React.useRef(activeTour);
  const setupWizardOpenRef = React.useRef(opts.setupWizardOpen);
  const optsRef = React.useRef(opts);
  activeTourRef.current = activeTour;
  setupWizardOpenRef.current = opts.setupWizardOpen;
  optsRef.current = opts;

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

  const finishTour = (finishedId: string) => {
    const cur = activeTourRef.current;
    endTourSession(
      sessionRef.current,
      cur?.tour,
      cur?.step,
      effectHostRef.current,
    );
    sessionRef.current = null;

    let found = false;
    for (let i = 0; i < INTRO_TOUR_CHAIN.length; i++) {
      if (found) {
        const id = INTRO_TOUR_CHAIN[i];
        if (isTourCompleted(id)) continue;
        const tour = tourById(id);
        if (!tour || !effectHostRef.current) return;
        sessionRef.current = beginTourSession(effectHostRef.current, tour);
        sessionRef.current.applyStep(0, null);
        setActiveTour({ tour, step: 0 });
        return;
      }
      if (INTRO_TOUR_CHAIN[i] === finishedId) found = true;
    }
    setActiveTour(null);
  };

  const launchTour = (id: string) => {
    const tour = tourById(id);
    const host = effectHostRef.current;
    if (!tour || !host) return;
    endTourSession(
      sessionRef.current,
      activeTourRef.current?.tour,
      activeTourRef.current?.step,
      host,
    );
    sessionRef.current = beginTourSession(host, tour);
    sessionRef.current.applyStep(0, null);
    setActiveTour({ tour, step: 0 });
  };

  const launchContextualTour = (id: string) => {
    if (activeTourRef.current || setupWizardOpenRef.current) return;
    launchTour(id);
  };

  const startIntroTour = (force?: boolean) => {
    optsRef.current.setSetupWizardOpen(false);
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
      isBlocked: () => !!activeTourRef.current || !!setupWizardOpenRef.current,
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
        onDone: () => finishTour(activeTour.tour.id),
        advanceContext: {
          isObserving: opts.isObserving,
          bagOpen: opts.bagOpen,
          commandOpen: opts.commandOpen,
        },
      })
    : null;

  return {
    startIntroTour,
    toggleLayoutEdit,
    tourOverlay,
  };
}
