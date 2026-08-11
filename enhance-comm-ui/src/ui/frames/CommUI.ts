import { getReact, e } from "../../host/react";
import type { GameSnapshot } from "../../tick";
import { RankMeter } from "../../meters/RankMeter";
import { buildPdpsRows } from "../../meters/strategies/pdps";
import { buildCoopV1Rows } from "../../meters/strategies/coopV1";
import { buildCoopV2Rows } from "../../meters/strategies/coopV2";
import { buildHitDpsRows } from "../../meters/strategies/hitDps";
import { updateCombatContext } from "../../meters/partyCombat";
import { updateKillContext } from "../../kpi/sessionKills";
import { type PanelId } from "../../lib/layout";
import { subscribeCommanderOpen } from "../../host/commander";
import { updateCommKeyboardHandlers } from "../../host/keyboardPolicy";
import { info } from "../../host/dialogHost";
import {
  aggroByTarget,
  aggroedMonsters,
  activeBosses,
  findEntity,
} from "../../queries/entities";
import { PositionedPanel } from "../chrome/PositionedPanel";
import { PanelShellDummy } from "../chrome/PanelShellDummy";
import { Players } from "./Players";
import { MapInfo, getMapData } from "./MapInfo";
import { CryptProgress } from "./CryptProgress";
import { ServerInfo } from "./ServerInfo";
import { Enemies } from "./Enemies";
import { EntityInfo } from "./EntityInfo";
import { StockInfoPanel } from "./InfoDialogPanel";
import { PlayerFrame, UNIT_FRAME_STYLE } from "./PlayerRow";
import { TargetFrame } from "./TargetFrame";
import { BossBarPanel } from "./BossBarPanel";
import { ThreatTable } from "./ThreatTable";
import { KillKpiPanel } from "./KillKpiPanel";
import { CombatMetricsPanel } from "./CombatMetricsPanel";
import { CommandPanel } from "./CommandPanel";
import { BagPanel } from "./BagPanel";
import {
  BAG_PANEL_STYLE,
  BOSS_BAR_PANEL_STYLE,
  COMBAT_PANEL_STYLE,
  COMMAND_PANEL_STYLE,
  CRYPT_PANEL_STYLE,
  INFO_DIALOG_PANEL_STYLE,
  KILLS_PANEL_STYLE,
  METER_PANEL_STYLE,
  PAPERDOLL_PANEL_STYLE,
  THREAT_PANEL_STYLE,
} from "../../lib/frameSizes";
import { usePanelLayoutState } from "../hooks/usePanelLayoutState";
import { useBagBridge } from "../hooks/useBagBridge";
import { useSelectionFromXTarget } from "../hooks/useSelectionFromXTarget";
import { LayoutEditChrome } from "./comm/LayoutEditChrome";
import { LayoutEditGrid } from "./comm/LayoutEditGrid";
import { OpacityEditor } from "./comm/OpacityEditor";
import { isTouchishProfile } from "../../lib/viewport";
import { resolveTarget } from "../../tick";

export type CommUIProps = {
  snap: GameSnapshot;
};

const OPACITY_PANEL_IDS: PanelId[] = [
  "bossBar",
  "crypt",
  "combat",
  "kills",
  "threat",
  "pdps",
  "hitDps",
  "coopV1",
  "coopV2",
  "command",
  "bag",
  "paperdoll",
  "buffInfo",
  "itemInfo",
  "playerFrame",
  "targetFrame",
];

type PanelOpts = {
  style?: Record<string, any>;
  closable?: boolean;
  empty?: boolean;
  /** Extra style for the hidden/closed edit body (e.g. bag footprint). */
  hiddenBodyStyle?: Record<string, any>;
};

function meterOrDummy(
  title: string,
  rows: any[],
  layoutEdit: boolean,
  highlightId?: string,
  className?: string,
): any {
  if (rows && rows.length) {
    return e(RankMeter, {
      title,
      className,
      rows,
      highlightId,
    });
  }
  if (!layoutEdit) return null;
  return e(PanelShellDummy, {
    label: title,
    hint: "No contributors yet",
    accent: "#555",
    rows: 3,
    style: METER_PANEL_STYLE,
  });
}

export function CommUI(props: CommUIProps): any {
  const React = getReact();
  const snap = props.snap;

  const layoutState = usePanelLayoutState();
  const {
    setPanelVisible,
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
  } = layoutState;

  const { bagOpen, bagRefreshing } = useBagBridge(setPanelVisible);
  const {
    selectedEntity,
    setSelectedEntity,
    closePaperdoll,
    focusUnitId,
  } = useSelectionFromXTarget(snap);

  const [commandSeed, setCommandSeed] = React.useState(
    null as string | null,
  );
  const [commandOpenSeq, setCommandOpenSeq] = React.useState(0);
  const [buffInfoOpen, setBuffInfoOpen] = React.useState(false);
  const [itemInfoOpen, setItemInfoOpen] = React.useState(false);

  React.useEffect(() => {
    updateKillContext(snap.entities);
    updateCombatContext(snap.entities);
  }, [snap.entities]);

  // Shared Esc / Ctrl+Shift+L policy (info dialog → server dd → paperdoll/focus).
  React.useEffect(() => {
    updateCommKeyboardHandlers({
      clearPaperdoll: () => {
        if (!selectedEntity && !focusUnitId) return false;
        closePaperdoll();
        return true;
      },
      toggleLayoutEdit: () => setLayoutEdit((v: boolean) => !v),
    });
    return () => updateCommKeyboardHandlers({});
  }, [selectedEntity, focusUnitId, closePaperdoll, setLayoutEdit]);

  React.useEffect(() => {
    info.setLayoutEditing(layoutEdit);
    return () => info.setLayoutEditing(false);
  }, [layoutEdit]);

  React.useEffect(() => {
    return subscribeCommanderOpen((payload) => {
      if (typeof payload.draft === "string") {
        setCommandSeed(payload.draft);
      } else {
        setCommandSeed(null);
      }
      setCommandOpenSeq((n: number) => n + 1);
      setVisible("command", true);
    });
  }, [setVisible]);

  // Mark #comm-ui with viewport profile for CSS touch targets.
  React.useEffect(() => {
    const root = document.getElementById("comm-ui");
    if (!root) return;
    root.setAttribute("data-viewport", viewportProfile);
    root.classList.toggle(
      "comm-ui-touch",
      isTouchishProfile(viewportProfile),
    );
  }, [viewportProfile]);

  const pdpsRows = buildPdpsRows(snap.entities);
  const coopV1Rows = buildCoopV1Rows(snap.entities);
  const coopV2Rows = buildCoopV2Rows(snap.entities);
  const hitDpsRows = buildHitDpsRows(snap.entities, snap.now);
  const hasEnemies = aggroedMonsters(snap.entities).length > 0;
  const hasThreat = Object.keys(aggroByTarget(snap.entities)).length > 0;
  const hasBosses = activeBosses(snap.entities).length > 0;
  const onCrypt = getMapData(snap.entities).map === "crypt";

  // Observing owns player/target frames absolutely. Spectator focusUnitId only
  // applies when not observing — party/world clicks must not steal frames.
  const isObserving =
    (snap.observingId != null && snap.observingId !== "") || !!snap.observing;
  let framePlayer = snap.observing;
  let frameTarget = snap.target;
  if (!isObserving) {
    const focusEntity = focusUnitId
      ? findEntity(snap.entities, focusUnitId)
      : undefined;
    framePlayer = focusEntity;
    frameTarget = resolveTarget(focusEntity);
  }

  const panel = (
    id: PanelId,
    child: any,
    opts?: PanelOpts & {
      /**
       * Skip drag/anchor chrome (Layout / Opacity toggles).
       * Must pair with a high zIndex — without editing, panelStyle stays at
       * z=20 while other panels rise to z=40 and would eat the clicks.
       */
      skipEditChrome?: boolean;
    },
  ) => {
    const isClosablePanel = opts?.closable === true;
    const isHidden = isClosablePanel && !visible(id);
    if (isHidden && !layoutEdit) return null;
    if (opts?.empty && !layoutEdit) return null;
    const editing = opts?.skipEditChrome ? false : layoutEdit;
    return e(
      PositionedPanel,
      {
        id,
        pos: layout[id],
        editing,
        onMove,
        style: opts?.style,
        hidden: isHidden,
        hiddenBodyStyle: opts?.hiddenBodyStyle,
        opacity: opacityFor(id),
        peerLayout: layout,
        viewportProfile,
        onClose: isClosablePanel ? () => setVisible(id, false) : undefined,
        onShow: isClosablePanel ? () => setVisible(id, true) : undefined,
      },
      child,
    );
  };

  const touchPad = isTouchishProfile(viewportProfile);
  const toggleBtnPad = touchPad ? "10px 16px" : "5px 12px";
  const toggleFont = touchPad ? "16px" : "14px";

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
        })
      : null,

    opacityEdit
      ? e(OpacityEditor, {
          panelIds: OPACITY_PANEL_IDS,
          opacityFor,
          onChange: setOpacity,
          onClose: () => setOpacityEdit(false),
        })
      : null,

    panel(
      "players",
      e(Players, {
        entities: snap.entities,
        setSelectedEntity,
        selectedEntity,
        observingId: snap.observingId,
        observing: snap.observing,
        layoutEdit,
      }),
      { style: { width: "auto", maxWidth: "min(560px, 78vw)" } },
    ),

    panel(
      "enemies",
      e(Enemies, {
        entities: snap.entities,
        setSelectedEntity,
        selectedEntity,
      }),
      {
        style: { width: "auto", maxWidth: "min(420px, 78vw)", textAlign: "right" },
        empty: !hasEnemies,
      },
    ),

    panel(
      "topCenter",
      e(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          },
        },
        e(ServerInfo, {
          S: snap.S,
          serverRegion: snap.serverRegion,
          serverIdentifier: snap.serverIdentifier,
        }),
        e(MapInfo, { entities: snap.entities }),
      ),
    ),

    panel(
      "crypt",
      e(CryptProgress, {
        entities: snap.entities,
        layoutEdit,
        setSelectedEntity,
      }),
      {
        closable: true,
        style: CRYPT_PANEL_STYLE,
        empty: !onCrypt,
        hiddenBodyStyle: CRYPT_PANEL_STYLE,
      },
    ),

    panel(
      "bossBar",
      e(BossBarPanel, {
        entities: snap.entities,
        observing: snap.observing,
        setSelectedEntity,
        layoutEdit,
      }),
      {
        closable: true,
        style: BOSS_BAR_PANEL_STYLE,
        empty: !hasBosses,
      },
    ),

    selectedEntity || layoutEdit
      ? panel(
          "paperdoll",
          e(EntityInfo, {
            entities: snap.entities,
            selectedEntity,
            onClose: closePaperdoll,
            layoutEdit,
            observing: snap.observing,
          }),
          { style: PAPERDOLL_PANEL_STYLE },
        )
      : null,

    panel(
      "buffInfo",
      e(StockInfoPanel, {
        kind: "buff",
        layoutEdit,
        onOpenChange: setBuffInfoOpen,
      }),
      {
        style: Object.assign({}, INFO_DIALOG_PANEL_STYLE, {
          zIndex: layoutEdit ? 45 : 35,
          pointerEvents:
            layoutEdit || buffInfoOpen ? "auto" : "none",
        }),
      },
    ),

    panel(
      "itemInfo",
      e(StockInfoPanel, {
        kind: "item",
        layoutEdit,
        onOpenChange: setItemInfoOpen,
      }),
      {
        style: Object.assign({}, INFO_DIALOG_PANEL_STYLE, {
          zIndex: layoutEdit ? 45 : 35,
          pointerEvents:
            layoutEdit || itemInfoOpen ? "auto" : "none",
        }),
      },
    ),

    panel("kills", e(KillKpiPanel), {
      closable: true,
      style: KILLS_PANEL_STYLE,
      hiddenBodyStyle: KILLS_PANEL_STYLE,
    }),

    panel("combat", e(CombatMetricsPanel), {
      closable: true,
      style: COMBAT_PANEL_STYLE,
      hiddenBodyStyle: COMBAT_PANEL_STYLE,
    }),

    panel(
      "command",
      e(CommandPanel, {
        seedDraft: commandSeed,
        openSeq: commandOpenSeq,
      }),
      {
        closable: true,
        style: COMMAND_PANEL_STYLE,
        hiddenBodyStyle: COMMAND_PANEL_STYLE,
      },
    ),

    bagOpen || bagRefreshing || layoutEdit
      ? panel(
          "bag",
          e(BagPanel, { layoutEdit }),
          {
            closable: true,
            style: layoutEdit ? BAG_PANEL_STYLE : undefined,
            hiddenBodyStyle: Object.assign({}, BAG_PANEL_STYLE, {
              display: "flex",
              alignItems: "flex-start",
            }),
          },
        )
      : null,

    framePlayer || layoutEdit
      ? panel(
          "playerFrame",
          e(PlayerFrame, {
            observing: framePlayer,
            setSelectedEntity,
            layoutEdit,
          }),
          { style: UNIT_FRAME_STYLE },
        )
      : null,

    frameTarget || layoutEdit
      ? panel(
          "targetFrame",
          e(TargetFrame, {
            observing: framePlayer,
            target: frameTarget,
            entities: snap.entities,
            setSelectedEntity,
            layoutEdit,
          }),
          { style: UNIT_FRAME_STYLE },
        )
      : null,

    panel(
      "threat",
      e(ThreatTable, {
        entities: snap.entities,
        observingId: snap.observingId,
        layoutEdit,
        setSelectedEntity,
      }),
      {
        closable: true,
        style: THREAT_PANEL_STYLE,
        empty: !hasThreat,
        hiddenBodyStyle: THREAT_PANEL_STYLE,
      },
    ),

    panel(
      "pdps",
      meterOrDummy("PDPS", pdpsRows, layoutEdit, snap.observingId, "PdpsMeter"),
      {
        closable: true,
        style: METER_PANEL_STYLE,
        empty: !pdpsRows.length,
        hiddenBodyStyle: METER_PANEL_STYLE,
      },
    ),

    panel(
      "hitDps",
      meterOrDummy(
        "Hit DPS (10s)",
        hitDpsRows,
        layoutEdit,
        snap.observingId,
        "HitDpsMeter",
      ),
      {
        closable: true,
        style: METER_PANEL_STYLE,
        empty: !hitDpsRows.length,
        hiddenBodyStyle: METER_PANEL_STYLE,
      },
    ),

    panel(
      "coopV1",
      meterOrDummy("s.coop v1", coopV1Rows, layoutEdit, snap.observingId),
      {
        closable: true,
        style: METER_PANEL_STYLE,
        empty: !coopV1Rows.length,
        hiddenBodyStyle: METER_PANEL_STYLE,
      },
    ),

    panel(
      "coopV2",
      meterOrDummy(
        "s.coop v2",
        coopV2Rows,
        layoutEdit,
        snap.observingId,
        "CoopContributionMeterV2",
      ),
      {
        closable: true,
        style: METER_PANEL_STYLE,
        empty: !coopV2Rows.length,
        hiddenBodyStyle: METER_PANEL_STYLE,
      },
    ),

    panel(
      "toggles",
      e(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            pointerEvents: "auto",
          },
        },
        e(
          "button",
          {
            type: "button",
            title: "Toggle layout edit (Ctrl+Shift+L)",
            style: {
              cursor: "pointer",
              padding: toggleBtnPad,
              fontSize: toggleFont,
              minHeight: touchPad ? "40px" : undefined,
              border: layoutEdit ? "1px solid #ffe08a" : "1px solid #555",
              background: layoutEdit ? "#3a3510" : "#1a1a1a",
              color: layoutEdit ? "#ffe08a" : "#eee",
              textShadow: "none",
              fontWeight: "normal",
            },
            onClick: () => setLayoutEdit((v: boolean) => !v),
          },
          layoutEdit ? "Layout: ON" : "Layout",
        ),
        e(
          "button",
          {
            type: "button",
            title: "Per-panel overlay opacity",
            style: {
              cursor: "pointer",
              padding: toggleBtnPad,
              fontSize: toggleFont,
              minHeight: touchPad ? "40px" : undefined,
              border: opacityEdit ? "1px solid #8ab" : "1px solid #555",
              background: opacityEdit ? "#1a2830" : "#1a1a1a",
              color: opacityEdit ? "#9cf" : "#eee",
              textShadow: "none",
              fontWeight: "normal",
            },
            onClick: () => setOpacityEdit((v: boolean) => !v),
          },
          opacityEdit ? "Opacity: ON" : "Opacity",
        ),
      ),
      {
        // Above layout-edit panels (40), info (45), and the edit toolbar (50).
        skipEditChrome: true,
        style: { zIndex: 60 },
      },
    ),
  );
}
