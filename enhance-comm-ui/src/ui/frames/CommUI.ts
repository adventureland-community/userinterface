import { getReact, e } from "../../host/react";
import type { GameSnapshot } from "../../tick";
import { updateMeterContext } from "../../meters/meterEngine";
import { updateKillContext } from "../../kpi/sessionKills";
import { getSettings, patchSettings } from "../../lib/settings";
import { subscribeCommanderOpen } from "../../host/commander";
import {
  openCompose,
  openNewestUnread,
  queueMailAttach,
  setMailPanelOpen,
  subscribeMailOpen,
} from "../../host/mail";
import { updateCommKeyboardHandlers } from "../../host/keyboardPolicy";
import { info } from "../../host/dialogHost";
import { combatSignals } from "../../queries/combatSignals";
import {
  CommUISetupWizard,
  readIntroStep,
  writeIntroStep,
} from "./comm/CommUISetupWizard";
import { CommUIWhatsNew } from "./comm/CommUIWhatsNew";
import { CHANGELOG, hasUnseenChangelog } from "../../lib/changelog";
import { useCommGuidedTours } from "../hooks/useCommGuidedTours";
import {
  triggerMeterToolbarTour,
  useContextualTourTriggers,
} from "../hooks/useContextualTourTriggers";
import { useCommMeterInstances } from "../hooks/useCommMeterInstances";
import { usePanelLayoutState } from "../hooks/usePanelLayoutState";
import { setWorldOverlaySelectedId } from "../../viz/startWorldOverlay";
import { useCommWindowActions } from "../hooks/useCommWindowActions";
import { useBagBridge } from "../hooks/useBagBridge";
import { applyBagLayoutPos } from "../../host/inventory";
import { useSelectionFromXTarget } from "../hooks/useSelectionFromXTarget";
import {
  PANEL_LABELS,
  PANEL_IDS,
  type PanelId,
  type PanelPos,
} from "../../lib/layout";
import type { PanelGroupDragOpts } from "../../lib/panelGroupDrag";
import { canCloseWindow } from "../../lib/commWindow";
import { commWindowHasSnap } from "../../lib/commWindowGroup";
import { ensureWindowNumbers } from "../../lib/commWindowNumbers";
import {
  isLayoutGuideActive,
  resetLayoutGuide,
  subscribeLayoutGuide,
} from "../../lib/layoutGuide";
import { LayoutEditChrome } from "./comm/LayoutEditChrome";
import { CommMeterAddDialog } from "./comm/CommMeterAddDialog";
import { buildCommMeterPanels } from "./comm/CommMeterPanels";
import { LayoutEditGrid } from "./comm/LayoutEditGrid";
import { CommControlStrip } from "./comm/CommControlStrip";
import { SettingsPanel } from "./SettingsPanel";
import { findEntity } from "../../queries/entities";
import {
  renderCommPanels,
  renderCommTogglesPanel,
} from "./comm/CommPanelLayout";
import { SnapGuideLine } from "../chrome/SnapGuideLine";
import { isTouchishProfile } from "../../lib/viewport";
import { maxRecordStackZ, nextWindowFrontZ } from "../../lib/windowStack";

export type CommUIProps = {
  snap: GameSnapshot;
};

const SETTINGS_PANEL_POS_KEY = "ecu-settings-panel-pos";
const DEFAULT_SETTINGS_POS: PanelPos = {
  x: 50,
  y: 50,
  anchor: "center",
};

function readSettingsPanelPos(): PanelPos {
  try {
    const raw =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(SETTINGS_PANEL_POS_KEY)
        : null;
    if (!raw) return { ...DEFAULT_SETTINGS_POS };
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.x !== "number" ||
      typeof parsed.y !== "number"
    ) {
      return { ...DEFAULT_SETTINGS_POS };
    }
    const anchor = String(parsed.anchor || DEFAULT_SETTINGS_POS.anchor);
    return {
      x: Math.max(0, Math.min(100, parsed.x)),
      y: Math.max(0, Math.min(100, parsed.y)),
      anchor:
        anchor === "tl" ||
        anchor === "tr" ||
        anchor === "bl" ||
        anchor === "br" ||
        anchor === "tc" ||
        anchor === "bc" ||
        anchor === "center"
          ? anchor
          : DEFAULT_SETTINGS_POS.anchor,
    };
  } catch {
    return { ...DEFAULT_SETTINGS_POS };
  }
}

function writeSettingsPanelPos(pos: PanelPos): void {
  try {
    localStorage.setItem(
      SETTINGS_PANEL_POS_KEY,
      JSON.stringify({
        x: pos.x,
        y: pos.y,
        anchor: pos.anchor,
      }),
    );
  } catch {
    /* ignore */
  }
}

export function CommUI(props: CommUIProps): any {
  const React = getReact();
  const snap = props.snap;

  const layoutState = usePanelLayoutState();
  const {
    setPanelVisible,
    layoutEdit,
    setLayoutEdit,
    layout,
    setLayout,
    viewportProfile,
    layoutProfileMode,
    setLayoutProfileMode,
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
    setPanelPos,
  } = layoutState;

  const { bagOpen, bagRefreshing } = useBagBridge(setPanelVisible);
  const { selectedEntity, setSelectedEntity, closePaperdoll, focusUnitId } =
    useSelectionFromXTarget(snap);

  React.useEffect(() => {
    setWorldOverlaySelectedId(selectedEntity);
  }, [selectedEntity]);

  const [commandSeed, setCommandSeed] = React.useState(null as string | null);
  const [commandOpenSeq, setCommandOpenSeq] = React.useState(0);
  const [buffInfoOpen, setBuffInfoOpen] = React.useState(false);
  const [itemInfoOpen, setItemInfoOpen] = React.useState(false);
  const [meterAddOpen, setMeterAddOpen] = React.useState(false);
  const [metersHidden, setMetersHidden] = React.useState(
    () => !!getSettings().metersHidden,
  );
  const [setupWizardOpen, setSetupWizardOpen] = React.useState(
    () => !getSettings().setupWizardDone,
  );
  // Auto-open when there are unseen releases, but always show the full
  // CHANGELOG in the version nav (not only the unseen slice — that looked
  // like older entries had been deleted).
  const [whatsNewEntries, setWhatsNewEntries] = React.useState(() => {
    const s = getSettings();
    if (!s.setupWizardDone) return [];
    if (!hasUnseenChangelog(s.changelogSeenId)) return [];
    return CHANGELOG;
  });
  const [whatsNewBrowseAll, setWhatsNewBrowseAll] = React.useState(false);
  const [introStep, setIntroStep] = React.useState(() => readIntroStep());
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [settingsWindowPos, setSettingsWindowPos] =
    React.useState(readSettingsPanelPos);

  const setIntroStepPersist = (step: number) => {
    setIntroStep(step);
    writeIntroStep(step);
  };

  const tourActiveRef = React.useRef(false);
  const meterInstancesForTourRef = React.useRef(
    [] as Array<{ id: string; zIndex?: number }>,
  );
  const setMetersHiddenPersist = (hidden: boolean) => {
    // Spotlight hole is click-through — don't let Hide all stick mid-tour.
    if (hidden && tourActiveRef.current) return;
    setMetersHidden(hidden);
    patchSettings({ metersHidden: hidden });
  };
  const setSettingsWindowPosPersist = (pos: PanelPos) => {
    setSettingsWindowPos(pos);
    writeSettingsPanelPos(pos);
  };
  const openSettingsChangelog = () => {
    setWhatsNewBrowseAll(true);
    setWhatsNewEntries(CHANGELOG);
  };

  const guidedTours = useCommGuidedTours({
    layoutEdit,
    setLayoutEdit,
    metersHidden,
    setMetersHidden: setMetersHiddenPersist,
    meterAddOpen,
    setMeterAddOpen,
    setVisible,
    getPanelVisible: visible,
    toursBlocked: setupWizardOpen || whatsNewEntries.length > 0,
    setSetupWizardOpen,
    isObserving:
      (snap.observingId != null && snap.observingId !== "") || !!snap.observing,
    bagOpen,
    commandOpen: visible("command"),
    itemInfoOpen,
    getMeterInstances: () => meterInstancesForTourRef.current,
  });

  const {
    startIntroTour,
    toggleLayoutEdit,
    tourOverlay,
    tourActive,
    tourFocusMeterId,
    setTourFocusMeterId,
  } = guidedTours;
  tourActiveRef.current = tourActive;

  const meters = useCommMeterInstances(layout, {
    onMeterAdded: setTourFocusMeterId,
  });
  meterInstancesForTourRef.current = meters.meterInstances;

  const windowActions = useCommWindowActions({
    layout,
    setLayout,
    meters: meters.meterInstances,
    setMeters: meters.setMeterInstances,
    viewportProfile,
    applyBagPos: applyBagLayoutPos,
  });

  const closedWindows: Array<{ id: string; label: string }> = [];
  const hudIds = Object.keys(PANEL_LABELS) as PanelId[];
  for (let i = 0; i < hudIds.length; i++) {
    const id = hudIds[i];
    if (!canCloseWindow(id)) continue;
    if (visible(id)) continue;
    closedWindows.push({ id, label: PANEL_LABELS[id] || id });
  }
  for (let i = 0; i < meters.closedMeters.length; i++) {
    const m = meters.closedMeters[i];
    closedWindows.push({ id: m.id, label: m.label || m.id });
  }

  const reopenWindow = (id: string) => {
    if (canCloseWindow(id)) {
      setVisible(id as PanelId, true);
      return;
    }
    meters.reopenClosedMeter(id);
  };

  React.useEffect(() => {
    updateKillContext(snap.entities);
    updateMeterContext(snap.entities);
  }, [snap.entities]);

  React.useEffect(() => {
    updateCommKeyboardHandlers({
      clearPaperdoll: () => {
        if (!selectedEntity && !focusUnitId) return false;
        closePaperdoll();
        return true;
      },
      toggleLayoutEdit,
      exitLayoutEdit: () => {
        let wasOn = false;
        setLayoutEdit((v: boolean) => {
          wasOn = v;
          return false;
        });
        return wasOn;
      },
    });
    return () => updateCommKeyboardHandlers({});
  }, [selectedEntity, focusUnitId, closePaperdoll, toggleLayoutEdit]);

  React.useEffect(() => {
    info.setLayoutEditing(layoutEdit);
    return () => info.setLayoutEditing(false);
  }, [layoutEdit]);

  const commandOpenRef = React.useRef(false);
  commandOpenRef.current = visible("command");

  const [panelFrontZ, setPanelFrontZ] = React.useState(
    {} as Partial<Record<PanelId, number>>,
  );
  const panelFrontZRef = React.useRef(panelFrontZ);
  panelFrontZRef.current = panelFrontZ;

  const raisePanelToFront = React.useCallback(
    (id: PanelId) => {
      const prev = panelFrontZRef.current;
      const { zIndex, peers } = nextWindowFrontZ(meters.meterInstances, {
        hudZs: prev as Record<string, number | undefined>,
      });
      if (typeof prev[id] === "number" && prev[id] === zIndex) return;
      // Renormalize meter zs in React only — HUD raise must not persist meters.
      if (peers !== meters.meterInstances) {
        meters.setMeterInstances(peers);
      }
      const next = { ...prev, [id]: zIndex };
      panelFrontZRef.current = next;
      setPanelFrontZ(next);
    },
    [meters],
  );

  React.useEffect(() => {
    return subscribeCommanderOpen((payload) => {
      const hasDraft = typeof payload.draft === "string";
      if (hasDraft) {
        setCommandSeed(payload.draft as string);
        setCommandOpenSeq((n: number) => n + 1);
        setVisible("command", true);
        raisePanelToFront("command");
        return;
      }
      if (commandOpenRef.current) {
        setVisible("command", false);
        return;
      }
      setCommandSeed(null);
      setCommandOpenSeq((n: number) => n + 1);
      setVisible("command", true);
      raisePanelToFront("command");
    });
  }, [setVisible, raisePanelToFront]);

  const mailVisible = visible("mail");
  React.useEffect(() => {
    setMailPanelOpen(mailVisible);
  }, [mailVisible]);

  const mailOpenRef = React.useRef(false);
  mailOpenRef.current = mailVisible;

  React.useEffect(() => {
    return subscribeMailOpen((payload) => {
      const wantsCompose = !!(
        payload.compose ||
        payload.attach ||
        payload.draft
      );
      if (
        payload.toggle &&
        !wantsCompose &&
        !payload.focusNewestUnread &&
        mailOpenRef.current
      ) {
        setVisible("mail", false);
        return;
      }
      setVisible("mail", true);
      raisePanelToFront("mail");
      if (payload.focusNewestUnread) {
        void openNewestUnread();
        return;
      }
      if (payload.attach) {
        queueMailAttach(payload.attach);
      } else if (wantsCompose) {
        openCompose(payload.draft || {});
      }
    });
  }, [setVisible, raisePanelToFront]);

  React.useEffect(() => {
    const root = document.getElementById("comm-ui");
    if (!root) return;
    root.setAttribute("data-viewport", viewportProfile);
    root.classList.toggle("comm-ui-touch", isTouchishProfile(viewportProfile));
  }, [viewportProfile]);

  const [layoutGuideActive, setLayoutGuideActive] = React.useState(() =>
    isLayoutGuideActive(),
  );
  React.useEffect(
    () =>
      subscribeLayoutGuide(() => {
        setLayoutGuideActive(isLayoutGuideActive());
      }),
    [],
  );
  React.useEffect(() => {
    return () => {
      resetLayoutGuide();
    };
  }, []);

  const combat = combatSignals(snap.entities);

  useContextualTourTriggers({
    selectedEntity,
    buffInfoOpen,
    meterCount: meters.meterInstances.length,
    entities: snap.entities,
    meterInstances: meters.meterInstances,
    onMetersTourFocus: setTourFocusMeterId,
  });

  const meterIdKey = (() => {
    const parts: string[] = [];
    for (let i = 0; i < meters.meterInstances.length; i++) {
      parts.push(meters.meterInstances[i].id);
    }
    parts.push("|");
    for (let i = 0; i < meters.closedMeters.length; i++) {
      parts.push(meters.closedMeters[i].id);
    }
    return parts.join(",");
  })();
  const windowNumberById = React.useMemo(() => {
    const ids: string[] = PANEL_IDS.slice();
    for (let i = 0; i < meters.meterInstances.length; i++) {
      ids.push(meters.meterInstances[i].id);
    }
    for (let i = 0; i < meters.closedMeters.length; i++) {
      ids.push(meters.closedMeters[i].id);
    }
    return ensureWindowNumbers(ids);
    // meterIdKey tracks instance id set; closed + open meters share the pool.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meterIdKey]);

  const panelDeps = {
    snap,
    layoutEdit,
    layout,
    meterInstances: meters.meterInstances,
    peerLayout: meters.peerLayout,
    viewportProfile,
    visible,
    opacityFor,
    onMove: (id: PanelId, pos: any) => windowActions.moveWindow(id, pos),
    onMoveEnd: (id: PanelId, _pos: any, opts?: PanelGroupDragOpts) =>
      windowActions.snapAfterMove(id, opts),
    onResizeFrame: (id: PanelId, size: { w: number; h: number }) => {
      windowActions.resizeWindowFrame(id, {
        frameW: size.w,
        frameH: size.h,
      });
    },
    onAutoSizeChange: (id, autoSize, size) =>
      windowActions.setWindowAutoSize(id, autoSize, size),
    onPanelDragStart: (id: PanelId) => windowActions.onDragStart(id),
    onPanelDragMove: (id: PanelId, opts?: PanelGroupDragOpts) =>
      windowActions.onDragMove(id, opts),
    ungroupPanel: (id: PanelId) => windowActions.ungroupWindow(id),
    panelSnapDragId: windowActions.snapDragId,
    panelSnapPeerId: windowActions.snapPeerId,
    panelFrontZ,
    onActivatePanel: raisePanelToFront,
    windowNumberById,
    // Window ids paint on SnapGuideLine overlay (above panel stack).
    showWindowIds: false,
    onWindowScale: (id: string, scale: number) =>
      windowActions.setWindowScale(id, scale),
    panelIsLocked,
    setPanelLocked,
    altHeld,
    closedWindows,
    onReopenWindow: reopenWindow,
    setVisible,
    setOpacity,
    selectedEntity,
    setSelectedEntity,
    closePaperdoll,
    focusUnitId,
    combat,
    commandSeed,
    commandOpenSeq,
    bagOpen,
    bagRefreshing,
    buffInfoOpen,
    setBuffInfoOpen,
    itemInfoOpen,
    setItemInfoOpen,
  };

  const meterPanels = buildCommMeterPanels({
    snap,
    meterInstances: meters.meterInstances,
    layoutEdit,
    metersHidden,
    altHeld,
    snapDragId: windowActions.snapDragId,
    snapPeerId: windowActions.snapPeerId,
    // Window ids paint on SnapGuideLine overlay (above panel stack).
    showWindowIds: false,
    windowNumberById,
    peerLayout: meters.peerLayout,
    viewportProfile,
    closedMeters: meters.closedMeters,
    closedWindows,
    meterIsLocked: meters.meterIsLocked,
    onMove: (id, pos) => windowActions.moveWindow(id, pos),
    onDragStart: (id) => windowActions.onDragStart(id),
    onDragMove: (id, opts) => windowActions.onDragMove(id, opts),
    onMoveEnd: (id, opts) => windowActions.snapAfterMove(id, opts),
    onActivate: (id) =>
      meters.raiseMeterToFront(id, maxRecordStackZ(panelFrontZ)),
    onWindowScale: (id, scale) => windowActions.setWindowScale(id, scale),
    patchMeter: meters.patchMeter,
    setMeterInstances: meters.setMeterInstances,
    setMetersHiddenPersist,
    reopenClosedMeter: meters.reopenClosedMeter,
    onReopenWindow: reopenWindow,
    focusInspector: meters.focusInspector,
    focusReport: meters.focusReport,
    duplicateMeter: meters.duplicateMeter,
    removeMeter: meters.removeMeter,
    closeMeterRuntime: meters.closeMeterRuntime,
    ungroupWindow: (id) => windowActions.ungroupWindow(id),
    windowHasSnap: (id) => commWindowHasSnap(windowActions.graphState(), id),
    setMeterAddOpen,
    onToolbarInteract: triggerMeterToolbarTour,
    tourActive,
    tourFocusMeterId,
  });

  return e(
    "div",
    {
      style: {
        position: "relative",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "hidden",
      },
    },
    layoutEdit || layoutGuideActive ? e(LayoutEditGrid) : null,

    layoutEdit
      ? e(LayoutEditChrome, {
          onReset: resetLayout,
          onDone: () => setLayoutEdit(false),
          viewportProfile,
          layoutProfileMode,
          onProfileMode: setLayoutProfileMode,
          exportLayouts,
          importLayouts,
          onMetersImported: (next) => meters.setMeterInstances(next),
          onApplyAllCurrent: () => meters.applyAllSegments("current"),
          onApplyAllTotal: () => meters.applyAllSegments("total"),
          onAddMeter: () => setMeterAddOpen(true),
          onResetMeters: () => meters.resetMetersFromSettings(),
        })
      : null,

    meterAddOpen
      ? e(CommMeterAddDialog, {
          onClose: () => setMeterAddOpen(false),
          onAddPreset: meters.addMeterFromPreset,
        })
      : null,

    ...renderCommPanels(panelDeps),

    ...meterPanels,

    // After panels so guide balls + window ids sit above the stack
    // (z-index LAYOUT_GUIDE_OVERLAY_Z; pointer-events: none).
    e(SnapGuideLine, {
      dragId: windowActions.snapDragId,
      snapPeerId: windowActions.snapPeerId,
      nearPeerId: windowActions.nearPeerId,
      showWindowIds: windowActions.showWindowIds,
      windowNumberById,
    }),

    setupWizardOpen
      ? e(CommUISetupWizard, {
          step: introStep,
          onStep: setIntroStepPersist,
          onDone: () => setSetupWizardOpen(false),
          onStartTour: () => startIntroTour(false),
        })
      : null,

    !setupWizardOpen && whatsNewEntries.length > 0
      ? e(CommUIWhatsNew, {
          entries: whatsNewEntries,
          browseAll: whatsNewBrowseAll,
          onDone: () => {
            setWhatsNewEntries([]);
            setWhatsNewBrowseAll(false);
          },
        })
      : null,

    settingsOpen
      ? e(SettingsPanel, {
          onClose: () => setSettingsOpen(false),
          visible,
          setVisible,
          setPanelPos,
          windowPos: settingsWindowPos,
          onMoveWindow: setSettingsWindowPosPersist,
          onReplayIntroTour: () => startIntroTour(true),
          onOpenChangelog: openSettingsChangelog,
        })
      : null,

    renderCommTogglesPanel(
      panelDeps,
      e(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            pointerEvents: "none",
          },
        },
        e(CommControlStrip, {
          layoutEdit,
          toggleLayoutEdit,
          metersHidden,
          setMetersHiddenPersist,
          onAddMeter: () => setMeterAddOpen(true),
          onOpenSettings: () => setSettingsOpen(true),
          viewportProfile,
        }),
      ),
    ),

    tourOverlay,
  );
}
