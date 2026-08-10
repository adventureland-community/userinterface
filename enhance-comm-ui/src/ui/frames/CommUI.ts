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
import { aggroByTarget, aggroedMonsters, activeBosses } from "../../queries/entities";
import { PositionedPanel } from "../chrome/PositionedPanel";
import { Players } from "./Players";
import { MapInfo } from "./MapInfo";
import { CryptProgress } from "./CryptProgress";
import { ServerInfo } from "./ServerInfo";
import { BossInfo } from "./BossInfo";
import { Enemies } from "./Enemies";
import { EntityInfo } from "./EntityInfo";
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
  PAPERDOLL_PANEL_STYLE,
} from "../../lib/frameSizes";
import { usePanelLayoutState } from "../hooks/usePanelLayoutState";
import { useBagBridge } from "../hooks/useBagBridge";
import { useSelectionFromXTarget } from "../hooks/useSelectionFromXTarget";
import { LayoutEditChrome } from "./comm/LayoutEditChrome";
import { OpacityEditor } from "./comm/OpacityEditor";

export type CommUIProps = {
  snap: GameSnapshot;
};

const OPACITY_PANEL_IDS: PanelId[] = [
  "bossBar",
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
    onMove,
    resetLayout,
    setVisible,
    setOpacity,
    visible,
    opacityFor,
  } = layoutState;

  const { bagOpen } = useBagBridge(setPanelVisible);
  const { selectedEntity, setSelectedEntity, closePaperdoll } =
    useSelectionFromXTarget(snap);

  const [commandSeed, setCommandSeed] = React.useState(
    null as string | null,
  );
  const [commandOpenSeq, setCommandOpenSeq] = React.useState(0);

  React.useEffect(() => {
    updateKillContext(snap.entities);
    updateCombatContext(snap.entities);
  }, [snap.entities]);

  // Shared Esc / Ctrl+Shift+L policy (also closes server dropdown in host).
  React.useEffect(() => {
    updateCommKeyboardHandlers({
      clearPaperdoll: () => {
        if (!selectedEntity) return false;
        closePaperdoll();
        return true;
      },
      toggleLayoutEdit: () => setLayoutEdit((v: boolean) => !v),
    });
    return () => updateCommKeyboardHandlers({});
  }, [selectedEntity, closePaperdoll, setLayoutEdit]);

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

  const pdpsRows = buildPdpsRows(snap.entities);
  const coopV1Rows = buildCoopV1Rows(snap.entities);
  const coopV2Rows = buildCoopV2Rows(snap.entities);
  const hitDpsRows = buildHitDpsRows(snap.entities, snap.now);
  const hasEnemies = aggroedMonsters(snap.entities).length > 0;
  const hasThreat = Object.keys(aggroByTarget(snap.entities)).length > 0;
  const hasBosses = activeBosses(snap.entities).length > 0;

  const panel = (id: PanelId, child: any, opts?: PanelOpts) => {
    const isClosablePanel = opts?.closable === true;
    const isHidden = isClosablePanel && !visible(id);
    if (isHidden && !layoutEdit) return null;
    if (opts?.empty && !layoutEdit) return null;
    return e(
      PositionedPanel,
      {
        id,
        pos: layout[id],
        editing: layoutEdit,
        onMove,
        style: opts?.style,
        hidden: isHidden,
        hiddenBodyStyle: opts?.hiddenBodyStyle,
        opacity: opacityFor(id),
        onClose: isClosablePanel ? () => setVisible(id, false) : undefined,
        onShow: isClosablePanel ? () => setVisible(id, true) : undefined,
      },
      child,
    );
  };

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
    layoutEdit
      ? e(LayoutEditChrome, {
          onReset: resetLayout,
          onDone: () => setLayoutEdit(false),
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
        e(CryptProgress, { entities: snap.entities }),
        e(BossInfo, {
          entities: snap.entities,
          setSelectedEntity,
        }),
      ),
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

    panel("kills", e(KillKpiPanel), { closable: true }),

    panel("combat", e(CombatMetricsPanel), { closable: true }),

    panel(
      "command",
      e(CommandPanel, {
        seedDraft: commandSeed,
        openSeq: commandOpenSeq,
      }),
      { closable: true },
    ),

    bagOpen || layoutEdit
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

    snap.observing || layoutEdit
      ? panel(
          "playerFrame",
          e(PlayerFrame, {
            observing: snap.observing,
            setSelectedEntity,
            layoutEdit,
          }),
          { style: UNIT_FRAME_STYLE },
        )
      : null,

    snap.target || layoutEdit
      ? panel(
          "targetFrame",
          e(TargetFrame, {
            observing: snap.observing,
            target: snap.target,
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
      }),
      {
        closable: true,
        style: { minWidth: "160px" },
        empty: !hasThreat,
      },
    ),

    panel(
      "pdps",
      e(RankMeter, {
        title: "PDPS",
        className: "PdpsMeter",
        rows: pdpsRows,
        highlightId: snap.observingId,
      }),
      { closable: true, style: { width: "200px" }, empty: !pdpsRows.length },
    ),

    panel(
      "hitDps",
      e(RankMeter, {
        title: "Hit DPS (10s)",
        className: "HitDpsMeter",
        rows: hitDpsRows,
        highlightId: snap.observingId,
      }),
      { closable: true, style: { width: "200px" }, empty: !hitDpsRows.length },
    ),

    panel(
      "coopV1",
      e(RankMeter, {
        title: "s.coop v1",
        rows: coopV1Rows,
        highlightId: snap.observingId,
      }),
      { closable: true, style: { width: "200px" }, empty: !coopV1Rows.length },
    ),

    panel(
      "coopV2",
      e(RankMeter, {
        title: "s.coop v2",
        className: "CoopContributionMeterV2",
        rows: coopV2Rows,
        highlightId: snap.observingId,
      }),
      { closable: true, style: { width: "200px" }, empty: !coopV2Rows.length },
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
              padding: "5px 12px",
              fontSize: "14px",
              border: layoutEdit ? "1px solid #ffe08a" : "1px solid #555",
              background: layoutEdit ? "#3a3510" : "#1a1a1a",
              color: layoutEdit ? "#ffe08a" : "#eee",
            },
            onClick: () => setLayoutEdit(!layoutEdit),
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
              padding: "5px 12px",
              fontSize: "14px",
              border: opacityEdit ? "1px solid #8ab" : "1px solid #555",
              background: opacityEdit ? "#1a2830" : "#1a1a1a",
              color: opacityEdit ? "#9cf" : "#eee",
            },
            onClick: () => setOpacityEdit(!opacityEdit),
          },
          opacityEdit ? "Opacity: ON" : "Opacity",
        ),
      ),
    ),
  );
}
