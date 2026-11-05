import { getReact } from "../../host/react";
import {
  getSettings,
  importLayoutPackage,
  layoutForProfile,
  mergePanelOpacity,
  mergePanelVisible,
  panelOpacityOf,
  resetPanelLayout,
  resolveLayoutProfile,
  savePanelPos,
  savePanelVisible,
  patchSettings,
  saveSettings,
  type LayoutProfileMode,
  type PanelLayoutsByProfile,
  type PanelOpacityMap,
  type PanelVisibleMap,
  type ViewportProfile,
} from "../../lib/settings";
import { canCloseWindow } from "../../lib/commWindow";
import { type PanelId, type PanelPos } from "../../lib/layout";
import { applyWindowFramePersist } from "../../lib/panelCatalog";
import {
  applyLayoutEditPrefs,
  getLayoutEditPrefs,
} from "../../lib/layoutEditPrefs";
import type { LayoutExportInput } from "../../lib/layoutExport";
import type { MeterInstance } from "../../meters/meterTypes";
import { detectViewportProfile } from "../../lib/viewport";
import {
  liteAwarePanelVisible,
  resolveLiteHud,
  type HudDensity,
} from "../../lib/perfPrefs";
import {
  phoneHudPresetPatch,
  type PhoneHudPresetId,
} from "../../lib/phoneHudPresets";
import { gateObservedBagOpen } from "../../host/bagOpenGate";
import {
  applyBagLayoutPos,
  syncInventoryToBagPanel,
} from "../../host/inventory";

function isClosable(id: PanelId): boolean {
  return canCloseWindow(id);
}

export type LayoutImportPackage = {
  layoutsByProfile: PanelLayoutsByProfile;
  meterInstances?: MeterInstance[];
  layoutEditPrefs?: {
    freePlacement?: boolean;
    gridStep?: number;
    chromePos?: { x: number; y: number };
  };
};

export type PanelLayoutState = {
  panelVisible: PanelVisibleMap;
  setPanelVisible: (
    updater: PanelVisibleMap | ((prev: PanelVisibleMap) => PanelVisibleMap),
  ) => void;
  panelOpacity: PanelOpacityMap;
  layoutEdit: boolean;
  setLayoutEdit: (v: boolean | ((prev: boolean) => boolean)) => void;
  layout: Record<PanelId, PanelPos>;
  setLayout: (
    value:
      | Record<PanelId, PanelPos>
      | ((prev: Record<PanelId, PanelPos>) => Record<PanelId, PanelPos>),
  ) => void;
  viewportProfile: ViewportProfile;
  layoutProfileMode: LayoutProfileMode;
  setLayoutProfileMode: (mode: LayoutProfileMode) => void;
  /** Direct single-panel pos write (non-group). Prefer Comm window actions. */
  setPanelPos: (id: PanelId, pos: PanelPos) => void;
  windowsLocked: boolean;
  setWindowsLockedPersist: (locked: boolean) => void;
  panelIsLocked: (id: PanelId) => boolean;
  setPanelLocked: (id: PanelId, locked: boolean) => void;
  altHeld: boolean;
  resetLayout: () => void;
  importLayouts: (pkg: LayoutImportPackage) => MeterInstance[] | undefined;
  exportLayouts: () => LayoutExportInput;
  setVisible: (id: PanelId, visible: boolean) => void;
  setOpacity: (id: PanelId, value: number) => void;
  visible: (id: PanelId) => boolean;
  opacityFor: (id: PanelId) => number;
  hudDensity: HudDensity;
  setHudDensity: (mode: HudDensity) => void;
  applyPhoneHudPreset: (preset: PhoneHudPresetId) => void;
  liteHud: boolean;
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
  const [layoutEdit, setLayoutEdit] = React.useState(false);
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
  const [windowsLocked, setWindowsLocked] = React.useState(
    () => settings0.windowsLocked !== false,
  );
  const [hudDensity, setHudDensityState] = React.useState(
    () => (settings0.hudDensity || "auto") as HudDensity,
  );
  const [phoneHudVisible, setPhoneHudVisible] = React.useState(
    () => (settings0.phoneHudVisible || {}) as PanelVisibleMap,
  );
  const [altHeld, setAltHeld] = React.useState(false);
  const liteHud = resolveLiteHud(hudDensity, viewportProfile);

  React.useEffect(() => {
    // Windows browsers steal bare Alt for the menu bar (keyup/blur races).
    // Track modifier state from every input event; preventDefault on Alt itself.
    const sync = (ev: KeyboardEvent | MouseEvent) => {
      setAltHeld(!!ev.altKey);
    };
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Alt" || ev.code === "AltLeft" || ev.code === "AltRight") {
        ev.preventDefault();
      }
      sync(ev);
    };
    const onBlur = () => setAltHeld(false);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", sync, true);
    window.addEventListener("mousemove", sync, true);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", sync, true);
      window.removeEventListener("mousemove", sync, true);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  React.useEffect(() => {
    const onResize = () => {
      setDetectedProfile(detectViewportProfile());
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  const setWindowsLockedPersist = (locked: boolean) => {
    setWindowsLocked(locked);
    saveSettings({ windowsLocked: locked });
  };

  const panelIsLocked = (id: PanelId): boolean => {
    const pos = layout[id];
    if (pos && typeof pos.locked === "boolean") return pos.locked;
    return windowsLocked;
  };

  const setPanelLocked = (id: PanelId, locked: boolean) => {
    setLayout((prev: Record<PanelId, PanelPos>) => {
      const nextPos = { ...prev[id], locked };
      const next = { ...prev, [id]: nextPos };
      savePanelPos(id, nextPos, viewportProfile);
      return next;
    });
  };

  const setPanelPos = (id: PanelId, pos: PanelPos) => {
    setLayout((prev: Record<PanelId, PanelPos>) => {
      const nextPos = applyWindowFramePersist({ ...prev[id], ...pos }, id);
      const next = { ...prev, [id]: nextPos };
      savePanelPos(id, nextPos, viewportProfile);
      if (id === "bag") applyBagLayoutPos(nextPos);
      return next;
    });
  };

  const resetLayout = () => {
    const settings = resetPanelLayout(viewportProfile);
    const next = layoutForProfile(settings, viewportProfile);
    setLayout(next);
    applyBagLayoutPos(next.bag);
  };

  const importLayouts = (
    pkg: LayoutImportPackage,
  ): MeterInstance[] | undefined => {
    const settings = importLayoutPackage({
      layoutsByProfile: pkg.layoutsByProfile,
      meterInstances: pkg.meterInstances,
    });
    const next = layoutForProfile(settings, viewportProfile);
    setLayout(next);
    applyBagLayoutPos(next.bag);
    if (pkg.layoutEditPrefs) {
      applyLayoutEditPrefs(pkg.layoutEditPrefs);
    }
    return pkg.meterInstances ? settings.meterInstances : undefined;
  };

  const exportLayouts = (): LayoutExportInput => {
    const settings = getSettings();
    // Always export resolved maps so Copy works before any panel has been moved.
    return {
      layoutsByProfile: {
        desktop: layoutForProfile(settings, "desktop"),
        tablet: layoutForProfile(settings, "tablet"),
        phone: layoutForProfile(settings, "phone"),
      },
      meterInstances: settings.meterInstances,
      layoutEditPrefs: getLayoutEditPrefs(),
    };
  };

  const setVisible = (id: PanelId, visible: boolean) => {
    if (!isClosable(id)) return;
    if (id === "bag" && visible && !gateObservedBagOpen()) return;
    if (liteHud) {
      setPhoneHudVisible((prev: PanelVisibleMap) => {
        const next = { ...prev, [id]: visible };
        saveSettings({ phoneHudVisible: { [id]: visible } });
        return next;
      });
      // Always sync the global map — liteAwarePanelVisible only honors
      // phoneHudVisible for LITE_HUD_DEFAULT_OFF panels; Chat/Cmd/etc. need
      // panelVisible=false or they never close from the phone dock.
      setPanelVisible((prev: PanelVisibleMap) => {
        const next = { ...prev, [id]: visible };
        return next;
      });
      savePanelVisible(id, visible);
    } else {
      setPanelVisible((prev: PanelVisibleMap) => {
        const next = { ...prev, [id]: visible };
        return next;
      });
      savePanelVisible(id, visible);
    }
    if (id === "bag") syncInventoryToBagPanel(visible);
  };

  const setOpacity = (id: PanelId, value: number) => {
    setPanelOpacity((prev: PanelOpacityMap) => {
      const next = { ...prev, [id]: value };
      saveSettings({ panelOpacity: { [id]: value } });
      return next;
    });
  };

  const visible = (id: PanelId): boolean =>
    liteAwarePanelVisible(id, panelVisible, {
      lite: liteHud,
      phoneHudVisible,
    });
  const opacityFor = (id: PanelId): number => {
    const v = panelOpacity[id];
    if (typeof v === "number") return v;
    return panelOpacityOf(getSettings(), id);
  };

  const setHudDensity = (mode: HudDensity) => {
    setHudDensityState(mode);
    saveSettings({ hudDensity: mode });
  };

  const applyPhoneHudPreset = (preset: PhoneHudPresetId) => {
    const patch = phoneHudPresetPatch(preset);
    setPhoneHudVisible(patch.phoneHudVisible);
    setHudDensityState(patch.hudDensity);
    patchSettings({
      phoneHudVisible: patch.phoneHudVisible,
      hudDensity: patch.hudDensity,
      replacePhoneHudVisible: patch.replacePhoneHudVisible,
    });
  };

  return {
    panelVisible,
    setPanelVisible,
    panelOpacity,
    layoutEdit,
    setLayoutEdit,
    layout,
    setLayout,
    viewportProfile,
    layoutProfileMode,
    setLayoutProfileMode,
    setPanelPos,
    windowsLocked,
    setWindowsLockedPersist,
    panelIsLocked,
    setPanelLocked,
    altHeld,
    resetLayout,
    importLayouts,
    exportLayouts,
    setVisible,
    setOpacity,
    visible,
    opacityFor,
    hudDensity,
    setHudDensity,
    applyPhoneHudPreset,
    liteHud,
  };
}
