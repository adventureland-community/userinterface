/**
 * Comm UI meter panel instances — extracted from CommUI render tree.
 */

import { e } from "../../../host/react";
import type { EntityLike } from "../../../host/globals";
import type { PanelPos } from "../../../lib/layout";
import { METER_PANEL_STYLE, METER_FRAME_DEFAULT } from "../../../lib/frameSizes";
import { getMeterAppearance } from "../../../meters/meterAppearance";
import { meterHidesWhenEmpty, type ReportKind } from "../../../meters/meterCatalog";
import { isMeterInCombat } from "../../../meters/meterEngine";
import { runMeterQuery } from "../../../meters/meterQuery";
import {
  applyGroupFrameSize,
  getMeterGroup,
  meterHasSnap,
} from "../../../meters/meterWindowGroup";
import type { MeterInstance } from "../../../meters/meterTypes";
import { patchSettings } from "../../../lib/settings";
import { PositionedPanel } from "../../chrome/PositionedPanel";
import { MeterPanelShell } from "../../meter/MeterPanelShell";

export type CommMeterPanelsCtx = {
  snap: { entities: EntityLike[]; observingId?: string; observing?: EntityLike };
  meterInstances: MeterInstance[];
  layoutEdit: boolean;
  metersHidden: boolean;
  altHeld: boolean;
  meterSnapDragId: string | null;
  meterSnapPeerId: string | null;
  peerLayout: Record<string, PanelPos>;
  viewportProfile: string;
  closedMeters: MeterInstance[];
  meterIsLocked: (inst: MeterInstance) => boolean;
  dragRefFor: (id: string) => { current: HTMLElement | null };
  moveMeterWithGroup: (id: string, pos: PanelPos) => void;
  onMeterDragStart: (id: string) => void;
  onMeterDragMove: (id: string) => void;
  snapMeterAfterMove: (id: string) => void;
  patchMeter: (id: string, partial: Partial<MeterInstance>) => void;
  setMeterInstances: (
    fn: (prev: MeterInstance[]) => MeterInstance[],
  ) => void;
  setMetersHiddenPersist: (hidden: boolean) => void;
  reopenClosedMeter: (id: string) => void;
  focusInspector: (actorId: string, name: string) => void;
  focusReport: (
    kind: ReportKind,
    from?: { selectedset?: MeterInstance["selectedset"]; partyFocus?: MeterInstance["partyFocus"] },
  ) => void;
  duplicateMeter: (id: string) => void;
  removeMeter: (id: string) => void;
  closeMeterRuntime: (id: string) => void;
  ungroupMeterPanel: (id: string) => void;
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
    const app = getMeterAppearance();
    let meterOpacity = inst.opacity != null ? inst.opacity : 1;
    const inCombat = isMeterInCombat();
    if (inCombat && app.autoHideCombat) {
      meterOpacity = Math.min(meterOpacity, app.idleAlpha);
    }
    if (!inCombat && app.autoHideOoc) {
      meterOpacity = Math.min(meterOpacity, app.idleAlpha);
    }
    out.push(
      e(
        PositionedPanel,
        {
          key: inst.id,
          id: inst.id,
          label: inst.label || inst.id,
          pos: inst.pos,
          editing: ctx.layoutEdit,
          editChrome: "anchors",
          movable: playArrange,
          showMoveGrip: false,
          softAvoid: false,
          extraDragRef: ctx.dragRefFor(inst.id),
          onMove: (_id: string, pos: PanelPos) =>
            ctx.moveMeterWithGroup(inst.id, pos),
          onDragStart: () => ctx.onMeterDragStart(inst.id),
          onDragMove: () => ctx.onMeterDragMove(inst.id),
          onMoveEnd: () => ctx.snapMeterAfterMove(inst.id),
          className:
            "ecu-meter-frame" +
            (playArrange ? " ecu-meter-arrange" : "") +
            (meterHasSnap(inst) ? " ecu-meter-grouped" : "") +
            (ctx.meterSnapDragId === inst.id ? " ecu-meter-dragging" : "") +
            (ctx.meterSnapPeerId === inst.id ? " ecu-meter-snap-target" : ""),
          style: {
            ...METER_PANEL_STYLE,
            width: frameW + "px",
            height: frameH + "px",
            overflow: "visible",
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
          onClose: () => ctx.patchMeter(inst.id, { visible: false }),
          onShow: () => ctx.patchMeter(inst.id, { visible: true }),
        },
        e(
          "div",
          {
            style: {
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
            titlebarDragRef: ctx.dragRefFor(inst.id),
            onToggleLock: () => {
              ctx.patchMeter(inst.id, { locked: !locked });
            },
            onUngroup: meterHasSnap(inst)
              ? () => ctx.ungroupMeterPanel(inst.id)
              : undefined,
            resizeGroupIds: meterHasSnap(inst)
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
                  const next = applyGroupFrameSize(prev, inst.id, {
                    frameW: partial.frameW,
                    frameH: partial.frameH,
                  }).map((m) => (m.id === inst.id ? { ...m, ...partial } : m));
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
