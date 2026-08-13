import { e } from "../../host/react";
import { PIXEL_TEXT } from "../../lib/typeScale";
import { METER_FRAME_DEFAULT } from "../../lib/frameSizes";
import type {
  CombatSegment,
  MeterInstance,
  MeterResult,
  SegmentRef,
} from "../../meters/meterTypes";
import {
  supportsViewModes,
  type ReportKind,
} from "../../meters/meterCatalog";
import type { MeterCooltipKind } from "./meterCooltipMenu";
import {
  attrBallClass,
  chromeBtn,
  cycleSegmentRef,
  rootQuery,
  toolBtn,
} from "./meterShellHelpers";

export type MeterShellTitlebarCtx = {
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
  cycle: (delta: number) => void;
  onPatchInstance: (partial: Partial<MeterInstance>) => void;
  layoutEdit?: boolean;
  onConfigure?: () => void;
  onDuplicate?: () => void;
  onClose?: () => void;
  /** Open shared Encounter / Deaths / Timeline report (skull / play badges). */
  onOpenReport?: (kind: ReportKind) => void;
};

export function renderMeterShellTitlebar(ctx: MeterShellTitlebarCtx): any {
  const {
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
    cycle,
    onPatchInstance,
    layoutEdit,
    onConfigure,
    onDuplicate,
    onClose,
    onOpenReport,
  } = ctx;

  const titleChildren: any[] = [];
  if (isInspector) {
    titleChildren.push(e("span", { className: "ecu-meter-ttl-text" }, title));
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

  // Details: post-encounter skull / play sit on the titlebar (not below statusbar).
  const showEncounterBadges =
    !isInspector &&
    !isReport &&
    !!resolved &&
    (resolved.deaths.length > 0 || past.length > 0);
  const encounterBadges = showEncounterBadges
    ? e(
        "div",
        { className: "ecu-meter-encounter-badges" },
        e(
          "button",
          {
            type: "button",
            className: "ecu-meter-encounter-badge is-skull",
            title: "Encounter Details",
            onClick: (ev: any) => {
              ev.stopPropagation();
              onOpenReport?.("encounter");
            },
          },
          "💀",
        ),
        e(
          "button",
          {
            type: "button",
            className: "ecu-meter-encounter-badge is-play",
            title: "Time Line",
            onClick: (ev: any) => {
              ev.stopPropagation();
              onOpenReport?.("timeline");
            },
          },
          "▶",
        ),
      )
    : null;

  /** Details toolbar: Mode · Segment · Attribute · View · Report · Reset. */
  const detailsTools = !isInspector
    ? e(
        "div",
        { className: "ecu-meter-tools" },
        toolBtn({
          title: "Mode — scope, plugins, window control, options",
          icon: "mode",
          tourId: "meter-gear",
          active: tip?.kind === "gear" || tip?.kind === "party" || optionsOpen,
          onEnter: (el) => openTip("gear", el),
          onLeave: scheduleTipClose,
          onClick: (ev) =>
            openTip("gear", ev.currentTarget as HTMLElement, {
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
            const next = cycleSegmentRef(selectedset, 1);
            applySegment(next);
            openTip("seg", ev.currentTarget as HTMLElement, { pin: true });
          },
          onContextMenu: (ev) => {
            const next = cycleSegmentRef(selectedset, -1);
            applySegment(next);
            openTip("seg", ev.currentTarget as HTMLElement, { pin: true });
          },
        }),
        !isReport && cycleable
          ? toolBtn({
              title: "Attribute — hover menu · right-click all",
              icon: "attribute",
              tourId: "meter-display",
              active: tip?.kind === "display" || tip?.kind === "allDisplays",
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
        !isReport && supportsViewModes(rootQuery(instance))
          ? toolBtn({
              title: "View — Bars · Pie · Graph",
              glyph: "◫",
              tourId: "meter-view",
              active: tip?.kind === "view",
              onEnter: (el) => openTip("view", el),
              onLeave: scheduleTipClose,
              onClick: (ev) =>
                openTip("view", ev.currentTarget as HTMLElement, {
                  pin: true,
                }),
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
    : null;

  // Stretch ↕ is always visible after Details Mode·…·Reset (same tool chrome as
  // gear/document — not a hover-only black chip). Layout ⚙/+/Rm stay hover-gated.
  // Hide × / lock / WC live on PositionedPanel arrange chrome — not here.
  const stretchBtn =
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
      : null;
  const layoutCfg =
    onConfigure && layoutEdit
      ? toolBtn({
          title: "Add / configure meters",
          glyph: "⚙",
          onClick: () => onConfigure!(),
        })
      : null;
  const layoutDup =
    onDuplicate && layoutEdit
      ? toolBtn({
          title: "Duplicate window",
          glyph: "+",
          onClick: () => onDuplicate!(),
        })
      : null;
  const layoutRm =
    layoutEdit && onClose
      ? chromeBtn("Remove meter", "Rm", () => onClose!(), false, true)
      : null;
  const chromeHover =
    layoutCfg || layoutDup || layoutRm
      ? e(
          "div",
          { className: "ecu-meter-chrome-hover" },
          layoutCfg,
          layoutDup,
          layoutRm,
        )
      : null;
  const playerTool = isInspector
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
    : null;
  const actions =
    playerTool || stretchBtn || chromeHover
      ? e(
          "div",
          { className: "ecu-meter-actions" },
          playerTool,
          stretchBtn,
          chromeHover,
        )
      : null;

  return e(
    "div",
    {
      className: "ecu-meter-titlebar",
      style: { ...PIXEL_TEXT },
    },
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
    encounterBadges,
    detailsTools,
    actions,
  );
}
