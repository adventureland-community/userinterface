import { getReact, e } from "../../host/react";
import type { GameSnapshot } from "../../tick";
import { updateMeterContext } from "../../meters/meterEngine";
import { updateKillContext } from "../../kpi/sessionKills";
import { getSettings, patchSettings } from "../../lib/settings";
import { subscribeCommanderOpen } from "../../host/commander";
import { updateCommKeyboardHandlers } from "../../host/keyboardPolicy";
import { info } from "../../host/dialogHost";
import { combatSignals } from "../../queries/combatSignals";
import {
  CommUISetupWizard,
  readIntroStep,
  writeIntroStep,
} from "./comm/CommUISetupWizard";
import { CommUIWhatsNew } from "./comm/CommUIWhatsNew";
import { unseenChangelogEntries } from "../../lib/changelog";
import { useCommGuidedTours } from "../hooks/useCommGuidedTours";
import {
  triggerMeterToolbarTour,
  useContextualTourTriggers,
} from "../hooks/useContextualTourTriggers";
import { useCommMeterInstances } from "../hooks/useCommMeterInstances";
import { usePanelLayoutState } from "../hooks/usePanelLayoutState";
import { useBagBridge } from "../hooks/useBagBridge";
import { useSelectionFromXTarget } from "../hooks/useSelectionFromXTarget";
import { LayoutEditChrome } from "./comm/LayoutEditChrome";
import { CommMeterAddDialog } from "./comm/CommMeterAddDialog";
import { buildCommMeterPanels } from "./comm/CommMeterPanels";
import { LayoutEditGrid } from "./comm/LayoutEditGrid";
import { CommControlStrip } from "./comm/CommControlStrip";
import {
  renderCommPanels,
  renderCommTogglesPanel,
} from "./comm/CommPanelLayout";
import { getMapData } from "./MapInfo";
import { isTouchishProfile } from "../../lib/viewport";

export type CommUIProps = {
  snap: GameSnapshot;
};

export function CommUI(props: CommUIProps): any {
  const React = getReact();
  const snap = props.snap;

  const layoutState = usePanelLayoutState();
  const {
    setPanelVisible,
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
  } = layoutState;

  const { bagOpen, bagRefreshing } = useBagBridge(setPanelVisible);
  const { selectedEntity, setSelectedEntity, closePaperdoll, focusUnitId } =
    useSelectionFromXTarget(snap);

  const meters = useCommMeterInstances(layout);

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
  const [whatsNewEntries, setWhatsNewEntries] = React.useState(() => {
    const s = getSettings();
    if (!s.setupWizardDone) return [];
    return unseenChangelogEntries(s.changelogSeenId);
  });
  const [introStep, setIntroStep] = React.useState(() => readIntroStep());

  const setIntroStepPersist = (step: number) => {
    setIntroStep(step);
    writeIntroStep(step);
  };

  const setMetersHiddenPersist = (hidden: boolean) => {
    setMetersHidden(hidden);
    patchSettings({ metersHidden: hidden });
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
  });

  const { startIntroTour, toggleLayoutEdit, tourOverlay } = guidedTours;

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

  React.useEffect(() => {
    return subscribeCommanderOpen((payload) => {
      const hasDraft = typeof payload.draft === "string";
      if (hasDraft) {
        setCommandSeed(payload.draft as string);
        setCommandOpenSeq((n: number) => n + 1);
        setVisible("command", true);
        return;
      }
      if (commandOpenRef.current) {
        setVisible("command", false);
        return;
      }
      setCommandSeed(null);
      setCommandOpenSeq((n: number) => n + 1);
      setVisible("command", true);
    });
  }, [setVisible]);

  React.useEffect(() => {
    const root = document.getElementById("comm-ui");
    if (!root) return;
    root.setAttribute("data-viewport", viewportProfile);
    root.classList.toggle("comm-ui-touch", isTouchishProfile(viewportProfile));
  }, [viewportProfile]);

  const combat = combatSignals(snap.entities);
  const onCrypt = getMapData(snap.entities).map === "crypt";

  useContextualTourTriggers({
    selectedEntity,
    buffInfoOpen,
    meterCount: meters.meterInstances.length,
    entities: snap.entities,
    meterInstances: meters.meterInstances,
  });

  const panelDeps = {
    snap,
    layoutEdit,
    layout,
    peerLayout: meters.peerLayout,
    viewportProfile,
    visible,
    opacityFor,
    onMove,
    setVisible,
    setOpacity,
    selectedEntity,
    setSelectedEntity,
    closePaperdoll,
    focusUnitId,
    combat,
    onCrypt,
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
    altHeld: meters.altHeld,
    meterSnapDragId: meters.meterSnapDragId,
    meterSnapPeerId: meters.meterSnapPeerId,
    peerLayout: meters.peerLayout,
    viewportProfile,
    closedMeters: meters.closedMeters,
    meterIsLocked: meters.meterIsLocked,
    dragRefFor: meters.dragRefFor,
    moveMeterWithGroup: meters.moveMeterWithGroup,
    onMeterDragStart: meters.onMeterDragStart,
    onMeterDragMove: meters.onMeterDragMove,
    snapMeterAfterMove: meters.snapMeterAfterMove,
    patchMeter: meters.patchMeter,
    setMeterInstances: meters.setMeterInstances,
    setMetersHiddenPersist,
    reopenClosedMeter: meters.reopenClosedMeter,
    focusInspector: meters.focusInspector,
    focusReport: meters.focusReport,
    duplicateMeter: meters.duplicateMeter,
    removeMeter: meters.removeMeter,
    closeMeterRuntime: meters.closeMeterRuntime,
    ungroupMeterPanel: meters.ungroupMeterPanel,
    setMeterAddOpen,
    onToolbarInteract: triggerMeterToolbarTour,
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
    layoutEdit ? e(LayoutEditGrid) : null,

    layoutEdit
      ? e(LayoutEditChrome, {
          onReset: resetLayout,
          onDone: () => setLayoutEdit(false),
          viewportProfile,
          layoutProfileMode,
          onProfileMode: setLayoutProfileMode,
          exportLayouts,
          importLayouts,
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
          onDone: () => setWhatsNewEntries([]),
        })
      : null,

    renderCommTogglesPanel(
      panelDeps,
      e(CommControlStrip, {
        layoutEdit,
        toggleLayoutEdit,
        metersHidden,
        setMetersHiddenPersist,
        onAddMeter: () => setMeterAddOpen(true),
        onReplayIntroTour: () => startIntroTour(true),
        viewportProfile,
      }),
    ),

    tourOverlay,
  );
}
