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
import {
  canCloseWindow,
  canGroupWindow,
  canResizeWindow,
} from "../../../lib/commWindow";
import {
  canAutoSizeWindow,
  panelIsContextEmpty,
  windowFramePersist,
} from "../../../lib/panelCatalog";
import { commWindowHasSnap, type CommWindowGraphState } from "../../../lib/commWindowGroup";
import type { ViewportProfile } from "../../../lib/viewport";
import type { MeterInstance } from "../../../meters/meterTypes";
import { PositionedPanel } from "../../chrome/PositionedPanel";
import { Players } from "../Players";
import { getMapData, MapInfo } from "../MapInfo";
import { InstancePanel } from "../CryptProgress";
import { InstanceRunPanel } from "../InstanceRunPanel";
import { ServerInfo } from "../ServerInfo";
import { Enemies } from "../Enemies";
import { EntityInfo } from "../EntityInfo";
import { StockInfoPanel } from "../InfoDialogPanel";
import { PlayerFrame, UNIT_FRAME_STYLE } from "../PlayerRow";
import { TargetFrame } from "../TargetFrame";
import { BossBarPanel } from "../BossBarPanel";
import { AbilityTimelinePanel } from "../AbilityTimelinePanel";
import { AbilityTimelineBigIconPanel } from "../AbilityTimelineBigIconPanel";
import { AbilityTimelineHighlightPanel } from "../AbilityTimelineHighlightPanel";
import { ThreatTable } from "../ThreatTable";
import { KillKpiPanel } from "../KillKpiPanel";
import { Minimap } from "../Minimap";
import { CommandPanel } from "../CommandPanel";
import { BagPanel } from "../BagPanel";
import { MailPanel } from "../mail/MailPanel";
import {
  BOSS_BAR_PANEL_STYLE,
  ABILITY_TIMELINE_PANEL_STYLE,
  ABILITY_TIMELINE_BIGICON_PANEL_STYLE,
  ABILITY_TIMELINE_HIGHLIGHT_PANEL_STYLE,
  CHIP_HUD_PANEL_STYLE,
  COMMAND_PANEL_STYLE,
  INSTANCE_PANEL_STYLE,
  INSTANCE_RUN_PANEL_STYLE,
  INFO_DIALOG_PANEL_STYLE,
  KILLS_PANEL_STYLE,
  MAIL_PANEL_STYLE,
  MINIMAP_PANEL_STYLE,
  PAPERDOLL_PANEL_STYLE,
  PLAYERS_PANEL_STYLE,
  THREAT_PANEL_STYLE,
  BAG_PANEL_STYLE,
} from "../../../lib/frameSizes";

export type CommPanelOpts = {
  style?: Record<string, any>;
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
  getGraphState: () => CommWindowGraphState;
  viewportProfile: ViewportProfile;
  visible: (id: PanelId) => boolean;
  opacityFor: (id: PanelId) => number;
  onMove: (id: PanelId, pos: PanelPos) => void;
  onMoveEnd?: (id: PanelId, pos: PanelPos, opts?: PanelGroupDragOpts) => void;
  /** Persist HUD frame size after corner-grip resize. */
  onResizeFrame?: (id: PanelId, size: { w: number; h: number }) => void;
  onAutoSizeChange?: (
    id: PanelId,
    autoSize: boolean,
    size?: { w: number; h: number },
  ) => void;
  onPanelDragStart?: (id: PanelId) => void;
  onPanelDragMove?: (id: PanelId, opts?: PanelGroupDragOpts) => void;
  ungroupPanel?: (id: PanelId) => void;
  panelSnapDragId?: string | null;
  panelSnapPeerId?: string | null;
  /** Ephemeral bring-to-front z for HUD panels (shared stack with meters). */
  panelFrontZ?: Partial<Record<PanelId, number>>;
  onActivatePanel?: (id: PanelId) => void;
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
  const ctx = {
    map: getMapData(deps.snap.entities).map,
    hasEnemies: deps.combat.hasEnemies,
    hasBosses: deps.combat.hasBosses,
    hasAbilityCasters: deps.combat.hasAbilityCasters,
    hasThreat: deps.combat.hasThreat,
  };
  return (id: PanelId, child: any, opts?: CommPanelOpts) => {
    const isClosablePanel = canCloseWindow(id);
    const isHidden = isClosablePanel && !deps.visible(id);
    if (isHidden && !deps.layoutEdit) return null;
    const empty = opts?.empty === true || panelIsContextEmpty(id, ctx);
    if (empty && !deps.layoutEdit) return null;
    const locked = deps.panelIsLocked(id);
    // Buff/item hosts stay mounted when idle (stock writers). Ephemeral tips:
    // never leave unlocked arrange chrome parked (ghost "Buff info" strip);
    // Alt still unlocks move like other panels. Party is always on-screen.
    const infoPanel = id === "buffInfo" || id === "itemInfo";
    const infoIdle =
      (id === "buffInfo" && !deps.buffInfoOpen) ||
      (id === "itemInfo" && !deps.itemInfoOpen);
    const playArrange =
      !deps.layoutEdit &&
      (!locked || deps.altHeld) &&
      id !== "toggles" &&
      !infoIdle &&
      !(infoPanel && !deps.altHeld);
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
    const frontZ = deps.panelFrontZ && deps.panelFrontZ[id];
    const style =
      typeof frontZ === "number"
        ? Object.assign({}, opts?.style, { zIndex: frontZ })
        : opts?.style;
    return e(
      PositionedPanel,
      {
        key: id,
        id,
        pos: deps.layout[id],
        editing: deps.layoutEdit,
        movable: playArrange,
        // Play-arrange HUD grip. `grip` chrome (toggles) also needs ⠿ in
        // layout edit — playArrange is false then, so keep the handle on.
        showMoveGrip: playArrange || opts?.editChrome === "grip",
        onMove: deps.onMove,
        // Always wire drag handlers — gating on playArrange cleared onMoveEnd
        // when Alt released mid-drag, before Windows delivered pointerup.
        onMoveEnd: deps.onMoveEnd,
        onDragStart: deps.onPanelDragStart,
        onDragMove: deps.onPanelDragMove
          ? (id: PanelId, _pos: PanelPos, opts?: PanelGroupDragOpts) =>
              deps.onPanelDragMove?.(id, opts)
          : undefined,
        softAvoid: groupable ? false : undefined,
        style,
        // Tip panels must not raise above paperdoll/bag — that caused the
        // floating buff chrome to steal the paperdoll × and inventory clicks.
        onActivate:
          infoPanel || !deps.onActivatePanel
            ? undefined
            : () => deps.onActivatePanel!(id),
        hidden: isHidden,
        hiddenBodyStyle: opts?.hiddenBodyStyle,
        opacity: deps.opacityFor(id),
        onOpacityChange:
          opts?.editChrome === "grip"
            ? undefined
            : (value: number) => deps.setOpacity(id, value),
        getGraphState: deps.getGraphState,
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
        // Match meters: × sits in the hover arrange chrome strip, not over the panel body.
        closePlacement: isClosablePanel ? "above" : undefined,
        closeOnHoverOnly: isClosablePanel ? true : undefined,
        windowNumber: deps.windowNumberById
          ? deps.windowNumberById[id]
          : undefined,
        showWindowIds: deps.showWindowIds,
        onWindowScale: deps.onWindowScale
          ? (scale: number) => deps.onWindowScale!(id, scale)
          : undefined,
        // Layout toggle is chrome-only. Bag / chips stay content-sized.
        showResizeHandles: canResizeWindow(id),
        resizeAxes: windowFramePersist(id) === "w" ? "w" : "wh",
        onResizeFrame:
          canResizeWindow(id) && deps.onResizeFrame
            ? (size: { w: number; h: number }) => deps.onResizeFrame!(id, size)
            : undefined,
        onAutoSizeChange:
          canAutoSizeWindow(id) && deps.onAutoSizeChange
            ? (autoSize: boolean, size?: { w: number; h: number }) =>
                deps.onAutoSizeChange!(id, autoSize, size)
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

  // Context empty-hide (panelIsContextEmpty): keep panelVisible default-on so
  // instance / combat panels auto-appear, but do not mount opaque shells when
  // the current map has no content — also keeps them out of edge-snap peers.

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
      { style: PLAYERS_PANEL_STYLE },
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
      },
    ),

    panel(
      "serverInfo",
      e(ServerInfo, {
        S: snap.S,
        serverRegion: snap.serverRegion,
        serverIdentifier: snap.serverIdentifier,
      }),
      { style: CHIP_HUD_PANEL_STYLE },
    ),

    panel("mapInfo", e(MapInfo, { entities: snap.entities }), {
      style: CHIP_HUD_PANEL_STYLE,
    }),

    panel(
      "minimap",
      e(Minimap, {
        layoutEdit: deps.layoutEdit,
        setSelectedEntity: deps.setSelectedEntity,
        selectedEntity: deps.selectedEntity,
      }),
      {
        style: MINIMAP_PANEL_STYLE,
        hiddenBodyStyle: MINIMAP_PANEL_STYLE,
      },
    ),

    panel(
      "instanceRun",
      e(InstanceRunPanel, {
        entities: snap.entities,
        layoutEdit: deps.layoutEdit,
      }),
      {
        style: INSTANCE_RUN_PANEL_STYLE,
        hiddenBodyStyle: INSTANCE_RUN_PANEL_STYLE,
      },
    ),

    panel(
      "instance",
      e(InstancePanel, {
        entities: snap.entities,
        layoutEdit: deps.layoutEdit,
        setSelectedEntity: deps.setSelectedEntity,
      }),
      {
        style: INSTANCE_PANEL_STYLE,
        hiddenBodyStyle: INSTANCE_PANEL_STYLE,
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
        style: BOSS_BAR_PANEL_STYLE,
      },
    ),

    panel(
      "abilityTimeline",
      e(AbilityTimelinePanel, {
        entities: snap.entities,
        selectedEntity: deps.selectedEntity,
        observing: snap.observing,
        layoutEdit: deps.layoutEdit,
      }),
      {
        style: ABILITY_TIMELINE_PANEL_STYLE,
        hiddenBodyStyle: ABILITY_TIMELINE_PANEL_STYLE,
      },
    ),

    panel(
      "abilityTimelineBigIcon",
      e(AbilityTimelineBigIconPanel, {
        entities: snap.entities,
        selectedEntity: deps.selectedEntity,
        observing: snap.observing,
        layoutEdit: deps.layoutEdit,
      }),
      {
        style: ABILITY_TIMELINE_BIGICON_PANEL_STYLE,
        hiddenBodyStyle: ABILITY_TIMELINE_BIGICON_PANEL_STYLE,
      },
    ),

    panel(
      "abilityTimelineHighlight",
      e(AbilityTimelineHighlightPanel, {
        entities: snap.entities,
        selectedEntity: deps.selectedEntity,
        observing: snap.observing,
        layoutEdit: deps.layoutEdit,
      }),
      {
        style: ABILITY_TIMELINE_HIGHLIGHT_PANEL_STYLE,
        hiddenBodyStyle: ABILITY_TIMELINE_HIGHLIGHT_PANEL_STYLE,
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
        // Shell stays click-through; StockInfoPanel enables hits only when open.
        style: Object.assign({}, INFO_DIALOG_PANEL_STYLE, {
          zIndex: deps.layoutEdit ? 45 : 35,
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
        }),
      },
    ),

    panel("kills", e(KillKpiPanel), {
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
        style: COMMAND_PANEL_STYLE,
        hiddenBodyStyle: COMMAND_PANEL_STYLE,
      },
    ),

    panel("mail", e(MailPanel, null), {
      style: MAIL_PANEL_STYLE,
      hiddenBodyStyle: MAIL_PANEL_STYLE,
    }),

    deps.bagOpen || deps.bagRefreshing || deps.layoutEdit
      ? panel("bag", e(BagPanel, { layoutEdit: deps.layoutEdit }), {
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
        style: THREAT_PANEL_STYLE,
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
