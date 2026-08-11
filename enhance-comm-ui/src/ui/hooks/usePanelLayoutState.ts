import { getReact } from "../../host/react";
import {
  CLOSABLE_PANEL_IDS,
  getSettings,
  importPanelLayouts,
  layoutForProfile,
  mergePanelOpacity,
  mergePanelVisible,
  panelOpacityOf,
  resetPanelLayout,
  resolveLayoutProfile,
  savePanelPos,
  savePanelVisible,
  saveSettings,
  type LayoutProfileMode,
  type PanelLayoutsByProfile,
  type PanelOpacityMap,
  type PanelVisibleMap,
  type ViewportProfile,
} from "../../lib/settings";
import {
  type PanelId,
  type PanelPos,
} from "../../lib/layout";
import { detectViewportProfile } from "../../lib/viewport";
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
  viewportProfile: ViewportProfile;
  layoutProfileMode: LayoutProfileMode;
  setLayoutProfileMode: (mode: LayoutProfileMode) => void;
  onMove: (id: PanelId, pos: PanelPos) => void;
  resetLayout: () => void;
  importLayouts: (layouts: PanelLayoutsByProfile) => void;
  exportLayouts: () => PanelLayoutsByProfile;
  setVisible: (id: PanelId, visible: boolean) => void;
  setOpacity: (id: PanelId, value: number) => void;
  visible: (id: PanelId) => boolean;
  opacityFor: (id: PanelId) => number;
  /** Per-panel z boost while layout edit is active (bring-to-front). */
  layoutEditZ: Partial<Record<PanelId, number>>;
  bringPanelToFront: (id: PanelId) => void;
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
  const [layoutEditZ, setLayoutEditZ] = React.useState(
    {} as Partial<Record<PanelId, number>>,
  );
  const layoutEditZCounter = React.useRef(0);
  const [detectedProfile, setDetectedProfile] = React.useState(() =>
    detectViewportProfile(),
  );
  const [layoutProfileMode, setLayoutProfileModeState] = React.useState(
    () => (settings0.layoutProfileMode || "auto") as LayoutProfileMode,
  );
  const viewportProfile = resolveLayoutProfile(
    layoutProfileMode,
    detectedProfile,
  );
  const [layout, setLayout] = React.useState(() =>
    layoutForProfile(settings0, viewportProfile),
  );

  // Track viewport size for auto profile switching.
  React.useEffect(() => {
    const onResize = () => {
      setDetectedProfile(detectViewportProfile());
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    if (layoutEdit) return;
    setLayoutEditZ({});
    layoutEditZCounter.current = 0;
  }, [layoutEdit]);

  const bringPanelToFront = (id: PanelId) => {
    layoutEditZCounter.current += 1;
    const boost = layoutEditZCounter.current;
    setLayoutEditZ((prev: Partial<Record<PanelId, number>>) => ({
      ...prev,
      [id]: boost,
    }));
  };

  // Reload layout when the active profile changes.
  React.useEffect(() => {
    const settings = getSettings();
    const next = layoutForProfile(settings, viewportProfile);
    setLayout(next);
    applyBagLayoutPos(next.bag);
  }, [viewportProfile]);

  const setLayoutProfileMode = (mode: LayoutProfileMode) => {
    setLayoutProfileModeState(mode);
    const settings = saveSettings({ layoutProfileMode: mode });
    const profile = resolveLayoutProfile(mode, detectViewportProfile());
    const next = layoutForProfile(settings, profile);
    setLayout(next);
    applyBagLayoutPos(next.bag);
  };

  const onMove = (id: PanelId, pos: PanelPos) => {
    setLayout((prev: Record<PanelId, PanelPos>) => {
      const next = { ...prev, [id]: pos };
      return next;
    });
    savePanelPos(id, pos, viewportProfile);
    if (id === "bag") applyBagLayoutPos(pos);
  };

  const resetLayout = () => {
    const settings = resetPanelLayout(viewportProfile);
    const next = layoutForProfile(settings, viewportProfile);
    setLayout(next);
    applyBagLayoutPos(next.bag);
  };

  const importLayouts = (layouts: PanelLayoutsByProfile) => {
    const settings = importPanelLayouts(layouts);
    const next = layoutForProfile(settings, viewportProfile);
    setLayout(next);
    applyBagLayoutPos(next.bag);
  };

  const exportLayouts = (): PanelLayoutsByProfile => {
    return { ...getSettings().panelLayoutsByProfile };
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
    viewportProfile,
    layoutProfileMode,
    setLayoutProfileMode,
    onMove,
    resetLayout,
    importLayouts,
    exportLayouts,
    setVisible,
    setOpacity,
    visible,
    opacityFor,
    layoutEditZ,
    bringPanelToFront,
  };
}
