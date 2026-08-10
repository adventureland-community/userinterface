import { getReact } from "../../host/react";
import {
  CLOSABLE_PANEL_IDS,
  getSettings,
  mergePanelOpacity,
  mergePanelVisible,
  panelOpacityOf,
  resetPanelLayout,
  savePanelPos,
  savePanelVisible,
  saveSettings,
  type PanelOpacityMap,
  type PanelVisibleMap,
} from "../../lib/settings";
import {
  mergeLayout,
  type PanelId,
  type PanelPos,
} from "../../lib/layout";
import { applyBagLayoutPos, isInventoryOpen, openInventory } from "../../host/inventory";

function isClosable(id: PanelId): boolean {
  return (CLOSABLE_PANEL_IDS as readonly PanelId[]).indexOf(id) >= 0;
}

export type PanelLayoutState = {
  panelVisible: PanelVisibleMap;
  setPanelVisible: (
    updater: PanelVisibleMap | ((prev: PanelVisibleMap) => PanelVisibleMap),
  ) => void;
  panelOpacity: PanelOpacityMap;
  opacityEdit: boolean;
  setOpacityEdit: (v: boolean | ((prev: boolean) => boolean)) => void;
  layoutEdit: boolean;
  setLayoutEdit: (v: boolean | ((prev: boolean) => boolean)) => void;
  layout: Record<PanelId, PanelPos>;
  onMove: (id: PanelId, pos: PanelPos) => void;
  resetLayout: () => void;
  setVisible: (id: PanelId, visible: boolean) => void;
  setOpacity: (id: PanelId, value: number) => void;
  visible: (id: PanelId) => boolean;
  opacityFor: (id: PanelId) => number;
};

export function usePanelLayoutState(): PanelLayoutState {
  const React = getReact();
  const settings0 = getSettings();

  const [panelVisible, setPanelVisible] = React.useState(
    () => mergePanelVisible(settings0.panelVisible) as PanelVisibleMap,
  );
  const [panelOpacity, setPanelOpacity] = React.useState(
    () => mergePanelOpacity(settings0.panelOpacity) as PanelOpacityMap,
  );
  const [opacityEdit, setOpacityEdit] = React.useState(false);
  const [layoutEdit, setLayoutEdit] = React.useState(false);
  const [layout, setLayout] = React.useState(() =>
    mergeLayout(settings0.panelLayout),
  );

  const onMove = (id: PanelId, pos: PanelPos) => {
    setLayout((prev: Record<PanelId, PanelPos>) => {
      const next = { ...prev, [id]: pos };
      return next;
    });
    savePanelPos(id, pos);
    if (id === "bag") applyBagLayoutPos(pos);
  };

  const resetLayout = () => {
    const settings = resetPanelLayout();
    const next = mergeLayout(settings.panelLayout);
    setLayout(next);
    applyBagLayoutPos(next.bag);
  };

  const setVisible = (id: PanelId, visible: boolean) => {
    if (!isClosable(id)) return;
    setPanelVisible((prev: PanelVisibleMap) => {
      const next = { ...prev, [id]: visible };
      return next;
    });
    savePanelVisible(id, visible);
    // Closing Bag via × also closes the game inventory.
    if (id === "bag" && !visible && isInventoryOpen()) {
      openInventory();
    }
  };

  const setOpacity = (id: PanelId, value: number) => {
    setPanelOpacity((prev: PanelOpacityMap) => {
      const next = { ...prev, [id]: value };
      saveSettings({ panelOpacity: { [id]: value } });
      return next;
    });
  };

  const visible = (id: PanelId): boolean => panelVisible[id] !== false;
  const opacityFor = (id: PanelId): number => {
    const v = panelOpacity[id];
    if (typeof v === "number") return v;
    return panelOpacityOf(getSettings(), id);
  };

  return {
    panelVisible,
    setPanelVisible,
    panelOpacity,
    opacityEdit,
    setOpacityEdit,
    layoutEdit,
    setLayoutEdit,
    layout,
    onMove,
    resetLayout,
    setVisible,
    setOpacity,
    visible,
    opacityFor,
  };
}
