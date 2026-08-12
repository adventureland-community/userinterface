/**
 * Comm overlay panel tree — extracted from CommUI.
 */

import { e } from "../../../host/react";
import type { GameSnapshot } from "../../../tick";
import { resolveTarget } from "../../../tick";
import type { EntityLike } from "../../../host/globals";
import { findEntity } from "../../../queries/entities";
import type { CombatSignals } from "../../../queries/combatSignals";
import { type PanelId, type PanelPos } from "../../../lib/layout";
import type { ViewportProfile } from "../../../lib/viewport";
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
  peerLayout: Record<string, PanelPos>;
  viewportProfile: ViewportProfile;
  visible: (id: PanelId) => boolean;
  opacityFor: (id: PanelId) => number;
  onMove: (id: PanelId, pos: PanelPos) => void;
  setVisible: (id: PanelId, visible: boolean) => void;
  setOpacity: (id: PanelId, value: number) => void;
  selectedEntity: EntityLike | null | undefined;
  setSelectedEntity: (entity: EntityLike | null) => void;
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
    const isClosablePanel = opts?.closable === true;
    const isHidden = isClosablePanel && !deps.visible(id);
    if (isHidden && !deps.layoutEdit) return null;
    if (opts?.empty && !deps.layoutEdit) return null;
    return e(
      PositionedPanel,
      {
        id,
        pos: deps.layout[id],
        editing: deps.layoutEdit,
        onMove: deps.onMove,
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
        onClose: isClosablePanel ? () => deps.setVisible(id, false) : undefined,
        onShow: isClosablePanel ? () => deps.setVisible(id, true) : undefined,
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
    const focusEntity = deps.focusUnitId
      ? findEntity(snap.entities, deps.focusUnitId)
      : undefined;
    framePlayer = focusEntity;
    frameTarget = resolveTarget(focusEntity);
  }

  return [
    panel(
      "players",
      e(Players, {
        entities: snap.entities,
        setSelectedEntity: deps.setSelectedEntity,
        selectedEntity: deps.selectedEntity,
        observingId: snap.observingId,
        observing: snap.observing,
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
            entities: snap.entities,
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
