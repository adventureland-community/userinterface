/**
 * Comm overlay panel tree — extracted from CommUI.
 */

import { e } from "../../../host/react";
import type { GameSnapshot } from "../../../tick";
import { resolveTarget } from "../../../tick";
import {
  findEntity,
  findLocalSelf,
  aggroMobsForFramedEntity,
} from "../../../queries/entities";
import type { CombatSignals } from "../../../queries/combatSignals";
import { type PanelId, type PanelPos } from "../../../lib/layout";
import type { PanelGroupDragOpts } from "../../../lib/panelGroupDrag";
import { canCloseWindow, canGroupWindow } from "../../../lib/commWindow";
import { commWindowHasSnap } from "../../../lib/commWindowGroup";
import type { ViewportProfile } from "../../../lib/viewport";
import type { MeterInstance } from "../../../meters/meterTypes";
import { PositionedPanel } from "../../chrome/PositionedPanel";
import { Players } from "../Players";
import { MapInfo } from "../MapInfo";
import { CryptProgress } from "../CryptProgress";
import { ServerInfo } from "../ServerInfo";
import { Enemies } from "../Enemies";
import { EntityInfo } from "../EntityInfo";
import { StockInfoPanel } from "../InfoDialogPanel";
import { PlayerFrame, UNIT_FRAME_STYLE } from "../PlayerRow";
import { TargetFrame } from "../TargetFrame";
import { BossBarPanel } from "../BossBarPanel";
import { ThreatTable } from "../ThreatTable";
import { KillKpiPanel } from "../KillKpiPanel";
import { CommandPanel } from "../CommandPanel";
import { BagPanel } from "../BagPanel";
import {
  BAG_PANEL_STYLE,
  BOSS_BAR_PANEL_STYLE,
  COMMAND_PANEL_STYLE,
  CRYPT_PANEL_STYLE,
  INFO_DIALOG_PANEL_STYLE,
  KILLS_PANEL_STYLE,
  PAPERDOLL_PANEL_STYLE,
  THREAT_PANEL_STYLE,
} from "../../../lib/frameSizes";

export type CommPanelOpts = {
  style?: Record<string, any>;
  closable?: boolean;
  empty?: boolean;
  hiddenBodyStyle?: Record<string, any>;
  interactiveBody?: boolean;
  editChrome?: "full" | "grip" | "anchors";
};

export type CommPanelLayoutDeps = {
  snap: GameSnapshot;
  layoutEdit: boolean;
  layout: Record<PanelId, PanelPos>;
  meterInstances: MeterInstance[];
  peerLayout: Record<string, PanelPos>;
  viewportProfile: ViewportProfile;
  visible: (id: PanelId) => boolean;
  opacityFor: (id: PanelId) => number;
  onMove: (id: PanelId, pos: PanelPos) => void;
  onMoveEnd?: (id: PanelId, pos: PanelPos, opts?: PanelGroupDragOpts) => void;
  /** Persist HUD frame size after corner-grip resize. */
  onResizeFrame?: (id: PanelId, size: { w: number; h: number }) => void;
  onPanelDragStart?: (id: PanelId) => void;
  onPanelDragMove?: (id: PanelId, opts?: PanelGroupDragOpts) => void;
  ungroupPanel?: (id: PanelId) => void;
  panelSnapDragId?: string | null;
  panelSnapPeerId?: string | null;
  /** Stable window numbers (HUD + meters share one pool). */
  windowNumberById?: Record<string, number>;
  showWindowIds?: boolean;
  onWindowScale?: (id: string, scale: number) => void;
  panelIsLocked: (id: PanelId) => boolean;
  setPanelLocked: (id: PanelId, locked: boolean) => void;
  altHeld: boolean;
  closedWindows?: Array<{ id: string; label: string }>;
  onReopenWindow?: (id: string) => void;
  setVisible: (id: PanelId, visible: boolean) => void;
  setOpacity: (id: PanelId, value: number) => void;
  selectedEntity: string | undefined;
  setSelectedEntity: (entity: string | undefined) => void;
  closePaperdoll: () => void;
  focusUnitId: string | null | undefined;
  combat: CombatSignals;
  onCrypt: boolean;
  commandSeed: string | null;
  commandOpenSeq: number;
  bagOpen: boolean;
  bagRefreshing: boolean;
  buffInfoOpen: boolean;
  setBuffInfoOpen: (open: boolean) => void;
  itemInfoOpen: boolean;
  setItemInfoOpen: (open: boolean) => void;
};

function createPanelRenderer(deps: CommPanelLayoutDeps) {
  return (id: PanelId, child: any, opts?: CommPanelOpts) => {
    const isClosablePanel = opts?.closable === true || canCloseWindow(id);
    const isHidden = isClosablePanel && !deps.visible(id);
    if (isHidden && !deps.layoutEdit) return null;
    if (opts?.empty && !deps.layoutEdit) return null;
    const locked = deps.panelIsLocked(id);
    // Buff/item hosts stay mounted when idle (stock writers); treat them as
    // on-screen for Alt only while the dialog is open — Layout still places
    // the empty footprint. Party (players) is always on-screen.
    const infoIdle =
      (id === "buffInfo" && !deps.buffInfoOpen) ||
      (id === "itemInfo" && !deps.itemInfoOpen);
    const playArrange =
      !deps.layoutEdit &&
      (!locked || deps.altHeld) &&
      id !== "toggles" &&
      !infoIdle;
    const groupable = canGroupWindow(id);
    const grouped =
      groupable &&
      commWindowHasSnap(
        { layout: deps.layout, meters: deps.meterInstances },
        id,
      );
    const classBits: string[] = [];
    if (playArrange) classBits.push("comm-pos-arrange");
    if (grouped) classBits.push("comm-pos-grouped");
    if (deps.panelSnapDragId === id) classBits.push("comm-pos-dragging");
    if (deps.panelSnapPeerId === id) classBits.push("comm-pos-snap-target");
    return e(
      PositionedPanel,
      {
        id,
        pos: deps.layout[id],
        editing: deps.layoutEdit,
        movable: playArrange,
        // Play-arrange HUD grip. `grip` chrome (toggles) also needs ⠿ in
        // layout edit — playArrange is false then, so keep the handle on.
        showMoveGrip: playArrange || opts?.editChrome === "grip",
        onMove: deps.onMove,
        onMoveEnd: playArrange || deps.layoutEdit ? deps.onMoveEnd : undefined,
        onDragStart:
          playArrange || deps.layoutEdit ? deps.onPanelDragStart : undefined,
        onDragMove:
          playArrange || deps.layoutEdit
            ? (id: PanelId, _pos: PanelPos, opts?: PanelGroupDragOpts) =>
                deps.onPanelDragMove?.(id, opts)
            : undefined,
        softAvoid: groupable ? false : undefined,
        style: opts?.style,
        hidden: isHidden,
        hiddenBodyStyle: opts?.hiddenBodyStyle,
        opacity: deps.opacityFor(id),
        onOpacityChange:
          opts?.editChrome === "grip"
            ? undefined
            : (value: number) => deps.setOpacity(id, value),
        peerLayout: deps.peerLayout,
        viewportProfile: deps.viewportProfile,
        interactiveBody: opts?.interactiveBody,
        editChrome: opts?.editChrome,
        className: classBits.length ? classBits.join(" ") : undefined,
        locked,
        onToggleLock:
          id === "toggles" ? undefined : () => deps.setPanelLocked(id, !locked),
        onUngroup:
          grouped && deps.ungroupPanel
            ? () => deps.ungroupPanel!(id)
            : undefined,
        closedWindows: deps.closedWindows,
        onReopenWindow: deps.onReopenWindow,
        onClose: isClosablePanel ? () => deps.setVisible(id, false) : undefined,
        onShow: isClosablePanel ? () => deps.setVisible(id, true) : undefined,
        windowNumber: deps.windowNumberById
          ? deps.windowNumberById[id]
          : undefined,
        showWindowIds: deps.showWindowIds,
        onWindowScale: deps.onWindowScale
          ? (scale: number) => deps.onWindowScale!(id, scale)
          : undefined,
        // Layout toggle is chrome-only. Bag must stay content-sized (7-col
        // float grid breaks under a locked shell width/height).
        showResizeHandles: id !== "toggles" && id !== "bag",
        onResizeFrame:
          id !== "toggles" && id !== "bag" && deps.onResizeFrame
            ? (size: { w: number; h: number }) => deps.onResizeFrame!(id, size)
            : undefined,
      },
      child,
    );
  };
}

export function renderCommPanels(deps: CommPanelLayoutDeps): any[] {
  const panel = createPanelRenderer(deps);
  const snap = deps.snap;

  const isObserving =
    (snap.observingId != null && snap.observingId !== "") || !!snap.observing;
  let framePlayer = snap.observing;
  let frameTarget = snap.target;
  if (!isObserving) {
    // Self is merged into snap.entities; prefer explicit focus, else local me.
    framePlayer =
      (deps.focusUnitId
        ? findEntity(snap.entities, deps.focusUnitId)
        : undefined) ||
      findLocalSelf(snap.entities) ||
      undefined;
    frameTarget = resolveTarget(framePlayer);
  }
  const byTarget = deps.combat.byTarget;

  return [
    panel(
      "players",
      e(Players, {
        entities: snap.entities,
        byTarget,
        setSelectedEntity: deps.setSelectedEntity,
        selectedEntity: deps.selectedEntity,
        observingId: snap.observingId,
        layoutEdit: deps.layoutEdit,
      }),
      { style: { width: "auto", maxWidth: "min(560px, 78vw)" } },
    ),

    panel(
      "enemies",
      e(Enemies, {
        entities: snap.entities,
        setSelectedEntity: deps.setSelectedEntity,
        selectedEntity: deps.selectedEntity,
      }),
      {
        style: {
          width: "auto",
          maxWidth: "min(420px, 78vw)",
          textAlign: "right",
        },
        empty: !deps.combat.hasEnemies,
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
        layoutEdit: deps.layoutEdit,
        setSelectedEntity: deps.setSelectedEntity,
      }),
      {
        closable: true,
        style: CRYPT_PANEL_STYLE,
        empty: !deps.onCrypt,
        hiddenBodyStyle: CRYPT_PANEL_STYLE,
      },
    ),

    panel(
      "bossBar",
      e(BossBarPanel, {
        entities: snap.entities,
        observing: snap.observing,
        setSelectedEntity: deps.setSelectedEntity,
        layoutEdit: deps.layoutEdit,
      }),
      {
        closable: true,
        style: BOSS_BAR_PANEL_STYLE,
        empty: !deps.combat.hasBosses,
      },
    ),

    deps.selectedEntity || deps.layoutEdit
      ? panel(
          "paperdoll",
          e(EntityInfo, {
            entities: snap.entities,
            selectedEntity: deps.selectedEntity,
            onClose: deps.closePaperdoll,
            layoutEdit: deps.layoutEdit,
            observing: snap.observing,
          }),
          { style: PAPERDOLL_PANEL_STYLE },
        )
      : null,

    panel(
      "buffInfo",
      e(StockInfoPanel, {
        kind: "buff",
        layoutEdit: deps.layoutEdit,
        onOpenChange: deps.setBuffInfoOpen,
      }),
      {
        style: Object.assign({}, INFO_DIALOG_PANEL_STYLE, {
          zIndex: deps.layoutEdit ? 45 : 35,
          pointerEvents: deps.layoutEdit || deps.buffInfoOpen ? "auto" : "none",
        }),
      },
    ),

    panel(
      "itemInfo",
      e(StockInfoPanel, {
        kind: "item",
        layoutEdit: deps.layoutEdit,
        onOpenChange: deps.setItemInfoOpen,
      }),
      {
        style: Object.assign({}, INFO_DIALOG_PANEL_STYLE, {
          zIndex: deps.layoutEdit ? 45 : 35,
          pointerEvents: deps.layoutEdit || deps.itemInfoOpen ? "auto" : "none",
        }),
      },
    ),

    panel("kills", e(KillKpiPanel), {
      closable: true,
      style: KILLS_PANEL_STYLE,
      hiddenBodyStyle: KILLS_PANEL_STYLE,
    }),

    panel(
      "command",
      e(CommandPanel, {
        seedDraft: deps.commandSeed,
        openSeq: deps.commandOpenSeq,
      }),
      {
        closable: true,
        style: COMMAND_PANEL_STYLE,
        hiddenBodyStyle: COMMAND_PANEL_STYLE,
      },
    ),

    deps.bagOpen || deps.bagRefreshing || deps.layoutEdit
      ? panel("bag", e(BagPanel, { layoutEdit: deps.layoutEdit }), {
          closable: true,
          style: deps.layoutEdit ? BAG_PANEL_STYLE : undefined,
          hiddenBodyStyle: Object.assign({}, BAG_PANEL_STYLE, {
            display: "flex",
            alignItems: "flex-start",
          }),
        })
      : null,

    framePlayer || deps.layoutEdit
      ? panel(
          "playerFrame",
          e(PlayerFrame, {
            observing: framePlayer,
            aggroMobs: aggroMobsForFramedEntity(byTarget, framePlayer),
            setSelectedEntity: deps.setSelectedEntity,
            layoutEdit: deps.layoutEdit,
          }),
          { style: UNIT_FRAME_STYLE },
        )
      : null,

    frameTarget || deps.layoutEdit
      ? panel(
          "targetFrame",
          e(TargetFrame, {
            observing: framePlayer,
            target: frameTarget,
            aggroMobs: aggroMobsForFramedEntity(byTarget, frameTarget),
            setSelectedEntity: deps.setSelectedEntity,
            layoutEdit: deps.layoutEdit,
          }),
          { style: UNIT_FRAME_STYLE },
        )
      : null,

    panel(
      "threat",
      e(ThreatTable, {
        entities: snap.entities,
        byTarget,
        observingId: snap.observingId,
        layoutEdit: deps.layoutEdit,
        setSelectedEntity: deps.setSelectedEntity,
      }),
      {
        closable: true,
        style: THREAT_PANEL_STYLE,
        empty: !deps.combat.hasThreat,
        hiddenBodyStyle: THREAT_PANEL_STYLE,
      },
    ),
  ];
}

/** Wrap control strip in the toggles positioned panel. */
export function renderCommTogglesPanel(
  deps: CommPanelLayoutDeps,
  controlStrip: any,
): any {
  const panel = createPanelRenderer(deps);
  return panel("toggles", controlStrip, {
    interactiveBody: true,
    editChrome: "grip",
    style: { zIndex: 100 },
  });
}
