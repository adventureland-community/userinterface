import { e } from "../../host/react";
import { PIXEL_TEXT } from "../../lib/typeScale";
import {
  METER_FRAME_DEFAULT,
} from "../../lib/frameSizes";
import { classColors } from "../../lib/colors";
import { meterHasSnap } from "../../meters/meterWindowGroup";
import type {
  CombatSegment,
  MeterInstance,
  MeterResult,
  SegmentRef,
} from "../../meters/meterTypes";
import type { ReportKind } from "../../meters/meterCatalog";
import type { MeterCooltipKind } from "./meterCooltipMenu";
import {
  attrBallClass,
  chromeBtn,
  cycleSegmentRef,
  formatCompactRatePerSec,
  rootQuery,
  toolBtn,
} from "./meterShellHelpers";

export type MeterShellTitlebarCtx = {
  arrange: boolean;
  titlebarDragRef?: { current: HTMLElement | null };
  isInspector: boolean;
  isReport: boolean;
  result: MeterResult;
  title: string;
  titleMode: string;
  resolved: CombatSegment | null;
  isCurrentSeg: boolean;
  titleSeg: string;
  durSec: number;
  partyLabel: string;
  instance: MeterInstance;
  tip: {
    kind: MeterCooltipKind;
  } | null;
  optionsOpen: boolean;
  openTip: (
    kind: MeterCooltipKind,
    el: HTMLElement,
    opts?: { pin?: boolean; bookmarkSlot?: number },
  ) => void;
  scheduleTipClose: () => void;
  cycleable: boolean;
  selectedset: SegmentRef;
  past: { id: string; label?: string }[];
  applySegment: (next: SegmentRef) => void;
  reportOpen: boolean;
  openReportDialog: () => void;
  onOpenReport?: (kind: ReportKind) => void;
  cycle: (delta: number) => void;
  onPatchInstance: (partial: Partial<MeterInstance>) => void;
  locked: boolean;
  layoutEdit?: boolean;
  onUngroup?: () => void;
  onToggleLock?: () => void;
  onConfigure?: () => void;
  onDuplicate?: () => void;
  onClose?: () => void;
};

export function renderMeterShellTitlebar(ctx: MeterShellTitlebarCtx): any {
  const {
    arrange,
    titlebarDragRef,
    isInspector,
    isReport,
    result,
    title,
    titleMode,
    resolved,
    isCurrentSeg,
    titleSeg,
    durSec,
    partyLabel,
    instance,
    tip,
    optionsOpen,
    openTip,
    scheduleTipClose,
    cycleable,
    selectedset,
    past,
    applySegment,
    reportOpen,
    openReportDialog,
    onOpenReport,
    cycle,
    onPatchInstance,
    locked,
    layoutEdit,
    onUngroup,
    onToggleLock,
    onConfigure,
    onDuplicate,
    onClose,
  } = ctx;

  const titleChildren: any[] = [];
  if (isInspector && result.kind === "details" && result.actorId) {
    const ctype = result.ctype || "";
    titleChildren.push(
      e("span", {
        className: "ecu-meter-inspector-class",
        style: { background: classColors[ctype] || "#607d8b" },
        title: ctype || "class",
      }),
    );
    const sec = Math.max(result.durationMs / 1000, 1);
    titleChildren.push(
      e("span", { className: "ecu-meter-ttl-text" }, title),
      e(
        "span",
        { className: "ecu-meter-inspector-sub" },
        `${formatCompactRatePerSec(result.totals.damage / sec)} · ${sec.toFixed(0)}s`,
      ),
    );
  } else if (isReport) {
    titleChildren.push(
      e("span", { className: "ecu-meter-report-mark", title: "Report" }, "⊞"),
      e("span", { className: "ecu-meter-ttl-text" }, title),
      resolved
        ? e(
            "span",
            { className: "ecu-meter-inspector-sub" },
            `${isCurrentSeg ? "Current" : titleSeg} · ${durSec.toFixed(0)}s · ${partyLabel}`,
          )
        : null,
    );
  } else {
    if (!isInspector) {
      titleChildren.push(
        e("span", {
          className:
            "ecu-meter-attr-ball " + attrBallClass(rootQuery(instance)),
          title: titleMode,
        }),
      );
    }
    titleChildren.push(e("span", { className: "ecu-meter-ttl-text" }, title));
  }

  return e(
    "div",
    {
      className: "ecu-meter-titlebar" + (arrange ? " is-draggable" : ""),
      style: { ...PIXEL_TEXT },
      ref: titlebarDragRef || undefined,
    },
    !isInspector
      ? e(
          "div",
          { className: "ecu-meter-tools-left" },
          toolBtn({
            title: "Settings — options, window control",
            glyph: "⚙",
            tourId: "meter-gear",
            active: tip?.kind === "gear" || optionsOpen,
            onEnter: (el) => openTip("gear", el),
            onLeave: scheduleTipClose,
            onClick: (ev) =>
              openTip("gear", ev.currentTarget as HTMLElement, {
                pin: true,
              }),
          }),
          toolBtn({
            title: "Mode / Scope — who appears",
            icon: "mode",
            tourId: "meter-mode",
            active: tip?.kind === "party",
            onEnter: (el) => openTip("party", el),
            onLeave: scheduleTipClose,
            onClick: (ev) =>
              openTip("party", ev.currentTarget as HTMLElement, {
                pin: true,
              }),
          }),
          toolBtn({
            title: "Segment — L click older · R click newer · hover menu",
            icon: "segment",
            tourId: "meter-segment",
            active: tip?.kind === "seg",
            onEnter: (el) => openTip("seg", el),
            onLeave: scheduleTipClose,
            onClick: (ev) => {
              const next = cycleSegmentRef(selectedset, past, 1);
              applySegment(next);
              openTip("seg", ev.currentTarget as HTMLElement, { pin: true });
            },
            onContextMenu: (ev) => {
              const next = cycleSegmentRef(selectedset, past, -1);
              applySegment(next);
              openTip("seg", ev.currentTarget as HTMLElement, { pin: true });
            },
          }),
          !isReport && cycleable
            ? toolBtn({
                title: "Attribute / Display — hover menu",
                icon: "attribute",
                tourId: "meter-display",
                active:
                  tip?.kind === "display" || tip?.kind === "allDisplays",
                onEnter: (el) => openTip("display", el),
                onLeave: scheduleTipClose,
                onClick: (ev) =>
                  openTip("display", ev.currentTarget as HTMLElement, {
                    pin: true,
                  }),
                onContextMenu: (ev) => {
                  openTip("allDisplays", ev.currentTarget as HTMLElement, {
                    pin: true,
                  });
                },
              })
            : null,
          !isReport
            ? toolBtn({
                title: "Report — click opens dialog · hover for copy",
                icon: "report",
                tourId: "meter-report",
                active: tip?.kind === "report" || reportOpen,
                onEnter: (el) => openTip("report", el),
                onLeave: scheduleTipClose,
                onClick: () => {
                  openReportDialog();
                },
              })
            : null,
          !isReport && onOpenReport
            ? toolBtn({
                title: "Tools — Encounter · Deaths · Timeline",
                glyph: "⊞",
                tourId: "meter-tools",
                active: tip?.kind === "tools",
                onEnter: (el) => openTip("tools", el),
                onLeave: scheduleTipClose,
                onClick: (ev) =>
                  openTip("tools", ev.currentTarget as HTMLElement, {
                    pin: true,
                  }),
              })
            : null,
          toolBtn({
            title: "Reset — hover menu · click opens menu",
            icon: "reset",
            tourId: "meter-reset",
            active: tip?.kind === "reset",
            onEnter: (el) => openTip("reset", el),
            onLeave: scheduleTipClose,
            onClick: (ev) =>
              openTip("reset", ev.currentTarget as HTMLElement, {
                pin: true,
              }),
          }),
        )
      : null,
    e(
      "button",
      {
        type: "button",
        className: "ecu-meter-ttl",
        style: { ...PIXEL_TEXT },
        onPointerDown: (ev: any) => {
          // Keep title clicks/wheel from starting a panel drag.
          ev.stopPropagation();
        },
        onClick: (ev: any) => {
          if (isInspector) {
            openTip("actor", ev.currentTarget as HTMLElement, { pin: true });
            return;
          }
          if (isReport) {
            openTip("seg", ev.currentTarget as HTMLElement, { pin: true });
            return;
          }
          if (cycleable) {
            // Details: title click cycles display
            cycle(1);
            return;
          }
          openTip("seg", ev.currentTarget as HTMLElement, { pin: true });
        },
        onContextMenu: (ev: any) => {
          ev.preventDefault();
          if (isInspector) {
            openTip("actor", ev.currentTarget as HTMLElement, { pin: true });
            return;
          }
          if (isReport) {
            openTip("party", ev.currentTarget as HTMLElement, { pin: true });
            return;
          }
          openTip("allDisplays", ev.currentTarget as HTMLElement, {
            pin: true,
          });
        },
        onWheel: (ev: any) => {
          if (!cycleable || isInspector || isReport) return;
          ev.preventDefault();
          ev.stopPropagation();
          cycle(ev.deltaY > 0 ? 1 : -1);
        },
        title: undefined,
        "aria-label": isInspector
          ? "Player — click to switch subject"
          : isReport
            ? "Report — click segment · right-click scope"
            : "Display — click cycle · wheel cycle · right-click all",
      },
      ...titleChildren,
    ),
    e(
      "div",
      { className: "ecu-meter-actions" },
      isInspector
        ? toolBtn({
            title: "Player",
            glyph: "👤",
            active: tip?.kind === "actor",
            onEnter: (el) => openTip("actor", el),
            onLeave: scheduleTipClose,
            onClick: (ev) =>
              openTip("actor", ev.currentTarget as HTMLElement, {
                pin: true,
              }),
          })
        : null,
      e(
        "div",
        { className: "ecu-meter-chrome-hover" },
        onUngroup && meterHasSnap(instance)
          ? toolBtn({
              title: "Ungroup windows",
              glyph: "⧉",
              onClick: () => onUngroup!(),
            })
          : null,
        !isInspector && !isReport
          ? toolBtn({
              title:
                (instance.frameH || METER_FRAME_DEFAULT.h) >= 340
                  ? "Unstretch window"
                  : "Stretch window (taller)",
              glyph: "↕",
              onClick: () => {
                const h = instance.frameH || METER_FRAME_DEFAULT.h;
                onPatchInstance({
                  frameH: h >= 340 ? METER_FRAME_DEFAULT.h : 360,
                });
              },
            })
          : null,
        onToggleLock
          ? toolBtn({
              title: locked
                ? "Unlock — drag titlebar to move (or hold Alt)"
                : "Lock this meter",
              glyph: locked ? "🔒" : "🔓",
              active: locked,
              onClick: () => onToggleLock!(),
            })
          : null,
        onConfigure && layoutEdit
          ? toolBtn({
              title: "Add / configure meters",
              glyph: "⚙",
              onClick: () => onConfigure!(),
            })
          : null,
        onDuplicate && layoutEdit
          ? toolBtn({
              title: "Duplicate window",
              glyph: "+",
              onClick: () => onDuplicate!(),
            })
          : null,
        layoutEdit && onClose
          ? chromeBtn(
              "Remove meter",
              "Rm",
              () => onClose!(),
              false,
              true,
            )
          : null,
      ),
    ),
  );
}
