/**
 * Comm UI meter panel instances — extracted from CommUI render tree.
 * Same window chrome as HUD: PositionedPanel owns layout-edit header,
 * play-arrange drag bar, lock / ungroup / WC. Meter titlebar is tools only.
 */

import { e } from "../../../host/react";
import type { EntityLike } from "../../../host/globals";
import type { PanelPos } from "../../../lib/layout";
import {
  METER_PANEL_STYLE,
  METER_FRAME_DEFAULT,
} from "../../../lib/frameSizes";
import { getMeterAppearance } from "../../../meters/meterAppearance";
import {
  meterHidesWhenEmpty,
  type ReportKind,
} from "../../../meters/meterCatalog";
import { isMeterInCombat } from "../../../meters/meterEngine";
import { runMeterQuery } from "../../../meters/meterQuery";
import {
  applyGroupFrameSize,
  getMeterGroup,
} from "../../../meters/meterWindowGroup";
import type { MeterInstance } from "../../../meters/meterTypes";
import type { FocusInspectorOpts } from "../../hooks/useCommMeterInstances";
import { patchSettings } from "../../../lib/settings";
import { PositionedPanel } from "../../chrome/PositionedPanel";
import { MeterPanelShell } from "../../meter/MeterPanelShell";

export type CommMeterPanelsCtx = {
  snap: {
    entities: EntityLike[];
    observingId?: string;
    observing?: EntityLike;
  };
  meterInstances: MeterInstance[];
  layoutEdit: boolean;
  metersHidden: boolean;
  altHeld: boolean;
  snapDragId: string | null;
  snapPeerId: string | null;
  /** Details: large instance ids after ~1s of left-hold drag. */
  showWindowIds: boolean;
  windowNumberById: Record<string, number>;
  peerLayout: Record<string, PanelPos>;
  viewportProfile: string;
  closedMeters: MeterInstance[];
  closedWindows: Array<{ id: string; label: string }>;
  meterIsLocked: (inst: MeterInstance) => boolean;
  onMove: (id: string, pos: PanelPos) => void;
  onDragStart: (id: string) => void;
  onDragMove: (id: string) => void;
  onMoveEnd: (id: string) => void;
  /** Details SetToplevel — raise meter on click / drag. */
  onActivate: (id: string) => void;
  onWindowScale: (id: string, scale: number) => void;
  patchMeter: (id: string, partial: Partial<MeterInstance>) => void;
  setMeterInstances: (fn: (prev: MeterInstance[]) => MeterInstance[]) => void;
  setMetersHiddenPersist: (hidden: boolean) => void;
  reopenClosedMeter: (id: string) => void;
  onReopenWindow: (id: string) => void;
  focusInspector: (
    actorId: string,
    name: string,
    opts?: FocusInspectorOpts,
  ) => void;
  focusReport: (
    kind: ReportKind,
    from?: {
      selectedset?: MeterInstance["selectedset"];
      partyFocus?: MeterInstance["partyFocus"];
    },
  ) => void;
  duplicateMeter: (id: string) => void;
  removeMeter: (id: string) => void;
  closeMeterRuntime: (id: string) => void;
  ungroupWindow: (id: string) => void;
  windowHasSnap: (id: string) => boolean;
  setMeterAddOpen: (open: boolean) => void;
  onToolbarInteract: () => void;
};

export function buildCommMeterPanels(ctx: CommMeterPanelsCtx): any[] {
  const out: any[] = [];
  for (let mi = 0; mi < ctx.meterInstances.length; mi++) {
    const inst = ctx.meterInstances[mi];
    const isHidden = inst.visible === false;
    if (isHidden && !ctx.layoutEdit) continue;
    if (ctx.metersHidden && !ctx.layoutEdit) continue;
    if (!ctx.layoutEdit && meterHidesWhenEmpty(inst)) {
      const peek = runMeterQuery(inst.query, {
        entities: ctx.snap.entities,
        partyFocus: inst.partyFocus,
        segmentRef: inst.selectedset,
      });
      const hasRows =
        peek.kind === "ranked" ? peek.rows.length > 0 : peek.kind !== "empty";
      if (!hasRows) continue;
    }
    const frameW = inst.frameW || METER_FRAME_DEFAULT.w;
    const frameH = inst.frameH || METER_FRAME_DEFAULT.h;
    const locked = ctx.meterIsLocked(inst);
    const playArrange = !ctx.layoutEdit && (!locked || ctx.altHeld);
    const arrange = ctx.layoutEdit || playArrange;
    const hasSnap = ctx.windowHasSnap(inst.id);
    const windowNumber = ctx.windowNumberById[inst.id];
    const app = getMeterAppearance();
    let meterOpacity = inst.opacity != null ? inst.opacity : 1;
    const inCombat = isMeterInCombat();
    if (inCombat && app.autoHideCombat) {
      meterOpacity = Math.min(meterOpacity, app.idleAlpha);
    }
    if (!inCombat && app.autoHideOoc) {
      meterOpacity = Math.min(meterOpacity, app.idleAlpha);
    }
    const pos: PanelPos = {
      ...inst.pos,
      scale: inst.scale != null ? inst.scale : inst.pos.scale,
    };
    out.push(
      e(
        PositionedPanel,
        {
          key: inst.id,
          id: inst.id,
          label: inst.label || inst.id,
          pos,
          editing: ctx.layoutEdit,
          editChrome: "anchors",
          movable: playArrange,
          softAvoid: false,
          onMove: (_id: string, nextPos: PanelPos) =>
            ctx.onMove(inst.id, nextPos),
          onDragStart: () => ctx.onDragStart(inst.id),
          onDragMove: () => ctx.onDragMove(inst.id),
          onMoveEnd: () => ctx.onMoveEnd(inst.id),
          onActivate: () => ctx.onActivate(inst.id),
          onWindowScale: (scale: number) => ctx.onWindowScale(inst.id, scale),
          className:
            "ecu-meter-frame" +
            (playArrange ? " comm-pos-arrange" : "") +
            (hasSnap ? " comm-pos-grouped" : "") +
            (ctx.snapDragId === inst.id ? " comm-pos-dragging" : "") +
            (ctx.snapPeerId === inst.id ? " comm-pos-snap-target" : ""),
          style: {
            ...METER_PANEL_STYLE,
            width: frameW + "px",
            height: frameH + "px",
            overflow: "visible",
            ...(typeof inst.zIndex === "number" ? { zIndex: inst.zIndex } : {}),
          },
          closePlacement: "above",
          closeOnHoverOnly: true,
          hidden: isHidden,
          hiddenBodyStyle: {
            ...METER_PANEL_STYLE,
            width: frameW + "px",
            height: frameH + "px",
          },
          opacity: meterOpacity,
          onOpacityChange: ctx.layoutEdit
            ? (value: number) => ctx.patchMeter(inst.id, { opacity: value })
            : undefined,
          peerLayout: ctx.peerLayout,
          viewportProfile: ctx.viewportProfile,
          interactiveBody: ctx.layoutEdit,
          locked,
          onToggleLock: () => {
            ctx.patchMeter(inst.id, { locked: !locked });
          },
          onUngroup: hasSnap ? () => ctx.ungroupWindow(inst.id) : undefined,
          closedWindows: ctx.closedWindows,
          onReopenWindow: ctx.onReopenWindow,
          onCreateWindow: () => ctx.duplicateMeter(inst.id),
          onClose: () =>
            ctx.layoutEdit
              ? ctx.removeMeter(inst.id)
              : ctx.closeMeterRuntime(inst.id),
          onShow: () => ctx.patchMeter(inst.id, { visible: true }),
          windowNumber,
          showWindowIds: ctx.showWindowIds,
        },
        e(
          "div",
          {
            style: {
              position: "relative",
              width: "100%",
              height: "100%",
              overflow: playArrange || ctx.layoutEdit ? "hidden" : "visible",
            },
          },
          e(MeterPanelShell, {
            instance: inst,
            highlightId: ctx.snap.observingId,
            entities: ctx.snap.entities,
            watchedName: ctx.snap.observing?.name,
            layoutEdit: ctx.layoutEdit,
            arrange,
            locked,
            resizeGroupIds: hasSnap
              ? getMeterGroup(ctx.meterInstances, inst.id)
                  .map((g) => g.id)
                  .filter((gid) => gid !== inst.id)
              : undefined,
            onToggleMetersHidden: () =>
              ctx.setMetersHiddenPersist(!ctx.metersHidden),
            metersHidden: ctx.metersHidden,
            closedInstances: ctx.closedMeters,
            onReopenClosed: ctx.reopenClosedMeter,
            onPatchInstance: (partial: Partial<MeterInstance>) => {
              if (partial.frameW != null || partial.frameH != null) {
                ctx.setMeterInstances((prev: MeterInstance[]) => {
                  let next = applyGroupFrameSize(prev, inst.id, {
                    frameW: partial.frameW,
                    frameH: partial.frameH,
                  });
                  next = next.map((m) =>
                    m.id === inst.id ? { ...m, ...partial } : m,
                  );
                  patchSettings({ meterInstances: next });
                  return next;
                });
                return;
              }
              ctx.patchMeter(inst.id, partial);
            },
            onFocusInspector: ctx.focusInspector,
            onOpenReport: (kind: ReportKind) =>
              ctx.focusReport(kind, {
                selectedset: inst.selectedset,
                partyFocus: inst.partyFocus,
              }),
            onDuplicate: () => ctx.duplicateMeter(inst.id),
            onClose: ctx.layoutEdit
              ? () => ctx.removeMeter(inst.id)
              : () => ctx.closeMeterRuntime(inst.id),
            onConfigure: () => ctx.setMeterAddOpen(true),
            onToolbarInteract: ctx.onToolbarInteract,
          }),
        ),
      ),
    );
  }
  return out;
}
