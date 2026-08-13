/**
 * Declarative tour step effects — applied and restored atomically by tourRunner.
 */

import { CLOSABLE_PANEL_IDS } from "../../../../lib/settings";
import type { PanelId } from "../../../../lib/layout";
import { closeInventory } from "../../../../host/inventory";

export type TourStepEffects = {
  layoutEdit?: boolean;
  showMeters?: boolean;
  testBars?: boolean;
  meterAddOpen?: boolean;
  closeCommand?: boolean;
  closeBag?: boolean;
  refreshHud?: boolean;
};

export type TourUiSnapshot = {
  layoutEdit: boolean;
  metersHidden: boolean;
  meterAddOpen: boolean;
  testBars: boolean;
  /** Closable panel visibility captured at session start. */
  panelVisible: Partial<Record<PanelId, boolean>>;
};

export type TourEffectHost = {
  snapshot: () => TourUiSnapshot;
  setLayoutEdit: (value: boolean) => void;
  setMetersHidden: (hidden: boolean) => void;
  setMeterAddOpen: (open: boolean) => void;
  setPanelVisible: (id: PanelId, visible: boolean) => void;
  setTestBars: (enabled: boolean) => void;
  closeCommandPanel: () => void;
  closeBagPanel: () => void;
  refreshCommHud: () => void;
};

export function snapshotTourPanelVisible(
  getPanelVisible: (id: PanelId) => boolean,
): Partial<Record<PanelId, boolean>> {
  const out: Partial<Record<PanelId, boolean>> = {};
  for (let i = 0; i < CLOSABLE_PANEL_IDS.length; i++) {
    const id = CLOSABLE_PANEL_IDS[i];
    out[id] = getPanelVisible(id);
  }
  return out;
}

export function applyTourStepEffects(
  host: TourEffectHost,
  effects: TourStepEffects | undefined,
  snap: TourUiSnapshot,
): void {
  if (!effects) return;
  if (effects.layoutEdit != null) host.setLayoutEdit(effects.layoutEdit);
  if (effects.showMeters && snap.metersHidden) host.setMetersHidden(false);
  if (effects.testBars != null) host.setTestBars(effects.testBars);
  if (effects.meterAddOpen != null) host.setMeterAddOpen(effects.meterAddOpen);
  if (effects.closeCommand) host.closeCommandPanel();
  if (effects.closeBag) host.closeBagPanel();
  if (effects.refreshHud) host.refreshCommHud();
}

export function restoreTourUi(
  host: TourEffectHost,
  snap: TourUiSnapshot,
): void {
  host.setLayoutEdit(snap.layoutEdit);
  host.setMetersHidden(snap.metersHidden);
  host.setMeterAddOpen(snap.meterAddOpen);
  host.setTestBars(snap.testBars);
  const ids = CLOSABLE_PANEL_IDS;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const was = snap.panelVisible[id];
    if (typeof was === "boolean") host.setPanelVisible(id, was);
  }
}

function refreshCommChromeHud(): void {
  if (typeof window === "undefined") return;
  if (typeof window.render_characters === "function")
    window.render_characters();
  if (typeof window.render_servers === "function") window.render_servers();
}

export function defaultTourEffectHost(deps: {
  getLayoutEdit: () => boolean;
  setLayoutEdit: (value: boolean) => void;
  getMetersHidden: () => boolean;
  setMetersHidden: (hidden: boolean) => void;
  getMeterAddOpen: () => boolean;
  setMeterAddOpen: (open: boolean) => void;
  getPanelVisible: (id: PanelId) => boolean;
  setPanelVisible: (id: PanelId, visible: boolean) => void;
  getTestBars: () => boolean;
  setTestBars: (enabled: boolean) => void;
}): TourEffectHost {
  return {
    snapshot: () => ({
      layoutEdit: deps.getLayoutEdit(),
      metersHidden: deps.getMetersHidden(),
      meterAddOpen: deps.getMeterAddOpen(),
      testBars: deps.getTestBars(),
      panelVisible: snapshotTourPanelVisible(deps.getPanelVisible),
    }),
    setLayoutEdit: deps.setLayoutEdit,
    setMetersHidden: deps.setMetersHidden,
    setMeterAddOpen: deps.setMeterAddOpen,
    setPanelVisible: deps.setPanelVisible,
    setTestBars: deps.setTestBars,
    closeCommandPanel: () => {
      deps.setPanelVisible("command", false);
    },
    closeBagPanel: () => {
      closeInventory();
      deps.setPanelVisible("bag", false);
    },
    refreshCommHud: refreshCommChromeHud,
  };
}
