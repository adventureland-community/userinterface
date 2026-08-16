import { getReact, getReactDOM, e } from "../../host/react";
import type { EntityLike } from "../../host/globals";
import type { PartyFocus } from "../../lib/settingsFocus";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import { getLayoutFreePlacement } from "../../lib/layoutEditPrefs";
import type { LayoutAnchor } from "../../lib/layout";
import {
  canCycleBarMode,
  cycleBarMode,
  formatMeterReportLines,
  isReportPresentation,
  REPORT_STUB_TABS,
  REPORT_TABS,
  reportKindForPresentation,
  type ReportKind,
} from "../../meters/meterCatalog";
import {
  isMeterInCombat,
  getLiveSegment,
  listPastSegments,
  resolveSegment,
} from "../../meters/meterSession";
import { segmentWantsLiveTick } from "../../meters/meterSegmentRef";
import { runMeterQuery, segmentTitle } from "../../meters/meterQuery";
import { panelHasSnap } from "../../lib/panelEdgeGroup";
import type {
  CombatSegment,
  MeterInstance,
  MeterResult,
  RankedRow,
  SegmentRef,
} from "../../meters/meterTypes";
import { segmentDurationMs } from "../../meters/meterTypes";
import { injectMeterChromeCss } from "./meterChromeCss";
import { rectToAnchor } from "./meterCooltipMenu";
import { MeterReportDialog } from "./MeterReportDialog";
import { MeterPluginRail } from "./MeterPluginRail";
import { MeterStatusbar } from "./MeterStatusbar";
import { MeterOptionsPanel } from "./MeterOptionsPanel";
import { getMeterAppearance } from "../../meters/meterAppearance";
import { renderMeterShellBody } from "./MeterShellBody";
import {
  meterShellTourId,
  modeLabel,
  portalOrInline,
  presentationFor,
  rootQuery,
} from "./meterShellHelpers";
import type { FocusInspectorOpts } from "../hooks/useCommMeterInstances";
import { renderMeterShellCooltip } from "./meterShellCooltip";
import { renderMeterShellTitlebar } from "./meterShellTitlebar";
import { meterPartyChrome } from "./meterPartyChrome";
import {
  createMeterShellCooltipCtl,
  type MeterShellTipState,
} from "./meterShellCooltipCtl";
import {
  canInspectMeterRow,
  detailsActorPatch,
  openInspectorFromRow,
  patchInspectorAbilityQuery,
} from "./meterShellInspector";
import { beginMeterShellResize } from "./meterShellResize";

export type MeterPanelShellProps = {
  instance: MeterInstance;
  highlightId?: string;
  entities: EntityLike[];
  watchedName?: string;
  layoutEdit?: boolean;
  /** Drag/resize active (unlocked, Alt, or layout edit). */
  arrange?: boolean;
  locked?: boolean;
  /** Drive shared Inspector from a specific player (Damage / Encounter rows). */
  onFocusInspector?: (
    actorId: string,
    name: string,
    opts?: FocusInspectorOpts,
  ) => void;
  /** Open shared Encounter / Deaths / Timeline report from a ranked meter. */
  onOpenReport?: (kind: ReportKind) => void;
  /** Peer ids in the same snap group (live resize preview). */
  resizeGroupPeers?: Array<{ id: string; anchor?: LayoutAnchor }>;
  /** Mass show/hide all meter windows (Details Hide). */
  onToggleMetersHidden?: () => void;
  metersHidden?: boolean;
  /** Closed windows — reopen from gear → Window Control. */
  closedInstances?: MeterInstance[];
  onReopenClosed?: (id: string) => void;
  onPatchInstance: (partial: Partial<MeterInstance>) => void;
  onDuplicate?: () => void;
  onClose?: () => void;
  onConfigure?: () => void;
  /** First toolbar click — contextual meter-toolbar tour. */
  onToolbarInteract?: () => void;
  /** Combat-meters tour: only this shell is spotlighted. */
  tourFocus?: boolean;
};

export function MeterPanelShell(props: MeterPanelShellProps): any {
  const React = getReact();
  const ReactDOM = getReactDOM();
  const {
    instance,
    highlightId,
    entities,
    watchedName,
    onPatchInstance,
    onFocusInspector,
    onOpenReport,
  } = props;
  const arrange = !!props.arrange;
  const [tip, setTip] = React.useState(null as MeterShellTipState | null);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [optionsOpen, setOptionsOpen] = React.useState(false);
  const [interacting, setInteracting] = React.useState(false);
  const tipCloseTimer = React.useRef(
    null as ReturnType<typeof setTimeout> | null,
  );
  const tipPinnedRef = React.useRef(false);
  const shellRef = React.useRef(null as HTMLElement | null);
  const [bmDrag, setBmDrag] = React.useState(null as number | null);
  const [bmDrop, setBmDrop] = React.useState(null as number | null);

  const patchInspectorAbility = (ability: string | null) => {
    const next = patchInspectorAbilityQuery(instance, ability);
    if (next) onPatchInstance({ query: next });
  };

  const tipCtl = createMeterShellCooltipCtl({
    tip,
    setTip,
    tipCloseTimer,
    tipPinnedRef,
    setInteracting,
    onToolbarInteract: props.onToolbarInteract,
  });
  const { clearTipClose, closeTip, openTip, openTipAnchor, scheduleTipClose } =
    tipCtl;

  React.useEffect(() => {
    if (!tip) return;
    return tipCtl.attachClickAway();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tip]);

  React.useEffect(() => {
    injectMeterChromeCss();
  }, []);

  React.useEffect(() => {
    closeTip();
  }, [instance.id]);

  const selectedset = (instance.selectedset || "current") as SegmentRef;
  const activeQuery = rootQuery(instance);
  const result: MeterResult = runMeterQuery(activeQuery, {
    segmentRef: selectedset,
    partyFocus: instance.partyFocus as PartyFocus | undefined,
    entities,
    now: Date.now(),
  });
  const inCombat = isMeterInCombat();
  const past = listPastSegments();
  const resolved = resolveSegment(selectedset) as CombatSegment | null;
  const partyChrome = meterPartyChrome({
    ref: selectedset,
    seg: resolved,
    partyFocus: instance.partyFocus as PartyFocus | undefined,
    watchedName,
  });
  const followLive = partyChrome.followCamera;
  const barsLive = segmentWantsLiveTick(selectedset, getLiveSegment());
  const { hasObserver, appliedFocus, partyLabel, partyMenuOpts } = partyChrome;
  const pres = presentationFor(instance);
  const isToolPanel = pres === "details" || isReportPresentation(pres);
  const idle =
    followLive && !isToolPanel && instance.fadeWhenIdle !== false && !inCombat;
  const titleMode =
    activeQuery.kind === "players" ||
    activeQuery.kind === "avoidance" ||
    activeQuery.kind === "rolling" ||
    activeQuery.kind === "snapshot"
      ? modeLabel(activeQuery)
      : modeLabel(activeQuery, instance.label);
  const titleSeg = segmentTitle(selectedset);
  const isCurrentSeg = selectedset === "current";
  const isInspector = pres === "details";
  const isReport = isReportPresentation(pres);
  const activeReportKind = reportKindForPresentation(pres);
  const cycleable = canCycleBarMode(activeQuery);
  const menuOpen = tip != null;
  const chromeActive = interacting || menuOpen || reportOpen;
  const title = isInspector
    ? "Player Breakdown"
    : isReport
      ? "Encounter Details"
      : titleMode;
  const durSec = resolved ? Math.max(segmentDurationMs(resolved) / 1000, 1) : 0;
  const barHighlightId = followLive ? highlightId : partyChrome.youId;

  const onRowClick = (row: RankedRow, ev?: any) => {
    if (ev?.button != null && ev.button !== 0) return;
    if (!canInspectMeterRow(instance)) return;
    openInspectorFromRow({
      instance,
      row,
      onFocusInspector,
      onPatchInstance,
    });
  };

  const onRowContextMenu = (row: RankedRow, ev: any) => {
    ev.preventDefault();
    onRowClick(row);
  };

  const cycle = (delta: number) => {
    if (!canCycleBarMode(activeQuery)) return;
    const next = cycleBarMode(activeQuery, delta);
    onPatchInstance({
      query: next.query,
      label: next.label,
    });
  };

  const body = renderMeterShellBody({
    pres,
    result,
    selectedset,
    instance,
    entities,
    highlightId: barHighlightId,
    layoutEdit: props.layoutEdit,
    activeQuery,
    barsProps: {
      query: activeQuery,
      segmentRef: selectedset,
      partyFocus: instance.partyFocus as PartyFocus | undefined,
      entities,
      highlightId: barHighlightId,
      live: barsLive,
      alwaysShowSelf: instance.alwaysShowSelf,
      onRowClick,
      onRowContextMenu,
    },
    onPatchInstance,
    patchInspectorAbility,
    onFocusInspector,
  });

  const actorPickerRows = (() => {
    if (!tip || tip.kind !== "actor") return [] as RankedRow[];
    const ranked = runMeterQuery(
      { kind: "players", metric: "damage" },
      {
        segmentRef: selectedset,
        partyFocus: instance.partyFocus as PartyFocus | undefined,
        entities,
      },
    );
    return ranked.kind === "ranked" ? ranked.rows : [];
  })();

  const setInspectorActor = (actorId: string, name: string) => {
    onPatchInstance(detailsActorPatch(instance, actorId, name));
    closeTip();
  };

  const onResizePointerDown = (ev: any, corner: "br" | "bl" = "br") => {
    beginMeterShellResize(ev, corner, {
      instance,
      resizeGroupPeers: props.resizeGroupPeers,
      onPatchInstance,
    });
  };

  // Details Minimalistic: statusbar off for rank meters; timer lives in title.
  const encounterFooter =
    isReport && resolved && activeReportKind === "encounter"
      ? e(
          "div",
          {
            className: "ecu-meter-status",
            style: { ...PIXEL_TEXT },
          },
          e("span", null, "Total damage"),
          (() => {
            const enc = runMeterQuery(
              { kind: "encounter_summary" },
              {
                segmentRef: selectedset,
                partyFocus: instance.partyFocus,
              },
            );
            if (enc.kind !== "encounter") return null;
            return e("span", null, `${Math.round(enc.totalDamage)} dmg`);
          })(),
        )
      : null;

  const setReportTab = (kind: ReportKind) => {
    const tab = REPORT_TABS.find((t) => t.kind === kind);
    if (!tab) return;
    onPatchInstance({
      presentation: tab.presentation,
      query: { ...tab.query },
      label: tab.label,
    });
    closeTip();
  };

  const applySegment = (next: SegmentRef) => {
    onPatchInstance({ selectedset: next });
  };

  const copyReport = () => {
    const ranked = runMeterQuery(activeQuery, {
      segmentRef: selectedset,
      partyFocus: instance.partyFocus,
      entities,
    });
    if (ranked.kind === "ranked") {
      const textOut = formatMeterReportLines(
        modeLabel(activeQuery, instance.label),
        ranked.rows,
        segmentTitle(selectedset),
      );
      if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(textOut);
      }
    }
  };

  const openReportDialog = () => {
    closeTip();
    setReportOpen(true);
  };

  const tipOverlay = tip
    ? renderMeterShellCooltip({
        tip,
        instance,
        partyMenuOpts,
        partyFocus: appliedFocus,
        hasObserver,
        partyLabel,
        watchedName: partyChrome.watchedLabel,
        selectedset,
        resolved,
        isCurrentSeg,
        titleSeg,
        durSec,
        actorPickerRows,
        metersHidden: props.metersHidden,
        closedInstances: props.closedInstances,
        bmDrag,
        setBmDrag,
        bmDrop,
        setBmDrop,
        actions: {
          closeTip,
          onPatchInstance,
          applySegment,
          setInspectorActor,
          copyReport,
          openReportDialog,
          setOptionsOpen,
          onOpenReport,
          onToggleMetersHidden: props.onToggleMetersHidden,
          onFocusInspector: props.onFocusInspector,
          onDuplicate: props.onDuplicate,
          onClose: props.onClose,
          onReopenClosed: props.onReopenClosed,
          openTip,
          clearTipClose,
          scheduleTipClose,
        },
      })
    : null;

  const reportNode = reportOpen
    ? (() => {
        const ranked = runMeterQuery(activeQuery, {
          segmentRef: selectedset,
          partyFocus: instance.partyFocus,
          entities,
        });
        const rows =
          ranked.kind === "ranked" ? (ranked.rows as RankedRow[]) : [];
        const dialog = e(MeterReportDialog, {
          title: modeLabel(activeQuery, instance.label),
          segmentLabel: segmentTitle(selectedset),
          rows,
          onClose: () => setReportOpen(false),
        });
        if (!ReactDOM.createPortal) return dialog;
        return e(
          "div",
          {
            className: "ecu-meter-report-backdrop",
            onMouseDown: (ev: any) => {
              if (ev.target === ev.currentTarget) setReportOpen(false);
            },
          },
          dialog,
        );
      })()
    : null;

  const optionsNode = optionsOpen
    ? e(MeterOptionsPanel, {
        instanceLabel: instance.label,
        instance,
        onPatchInstance,
        onClose: () => setOptionsOpen(false),
      })
    : null;

  const meterApp = getMeterAppearance();
  const shellTourId = meterShellTourId(activeQuery);
  const shellClass =
    "ecu-meter-shell" +
    (idle ? " is-idle" : "") +
    (menuOpen ? " is-menu-open" : "") +
    (chromeActive ? " is-interacting" : "") +
    (props.layoutEdit || arrange ? " is-layout" : "") +
    (isInspector ? " is-inspector" : "") +
    (isReport ? " is-report" : "") +
    (instance.chromeOnHover ? " is-chrome-hover" : "") +
    (panelHasSnap(instance) ? " is-grouped" : "");

  return e(
    "div",
    {
      className: shellClass,
      ...(shellTourId ? { "data-ecu-tour": shellTourId } : {}),
      ...(props.tourFocus ? { "data-ecu-tour-focus": "1" } : {}),
      style: {
        ...PIXEL_TEXT,
        fontSize: `calc(${TYPE.body} * ${meterApp.windowScale})`,
      },
      ref: (node: HTMLElement | null) => {
        shellRef.current = node;
      },
      onMouseEnter: () => setInteracting(true),
      onMouseLeave: () => {
        setInteracting(false);
        // Cooltips are portaled outside this shell — closing here races the
        // tip's own enter handler and makes menu clicks flaky.
      },
    },
    renderMeterShellTitlebar({
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
      layoutEdit: props.layoutEdit,
      onConfigure: props.onConfigure,
      onDuplicate: props.onDuplicate,
      onClose: props.onClose,
      onOpenReport: props.onOpenReport,
    }),
    isReport
      ? e(
          "div",
          { className: "ecu-meter-report-layout" },
          e(MeterPluginRail, {
            active: activeReportKind,
            onSelect: setReportTab,
          }),
          e(
            "div",
            { className: "ecu-meter-report-main" },
            activeReportKind === "encounter"
              ? e(
                  "div",
                  {
                    className: "ecu-meter-report-tabs",
                    style: { ...PIXEL_TEXT },
                  },
                  e(
                    "button",
                    {
                      type: "button",
                      className: "ecu-meter-report-tab active",
                    },
                    "Summary",
                  ),
                  ...REPORT_STUB_TABS.map((tab) =>
                    e(
                      "button",
                      {
                        key: tab.id,
                        type: "button",
                        className: "ecu-meter-report-tab is-stub",
                        title:
                          "Not available — Adventure Land has no CLEU emotes/phases/raid charts",
                        disabled: true,
                      },
                      tab.label,
                    ),
                  ),
                )
              : null,
            encounterFooter,
            e(
              "div",
              {
                className: "ecu-meter-body",
              },
              body,
            ),
          ),
        )
      : e(
          "div",
          {
            className: "ecu-meter-body",
            onContextMenu: (ev: any) => {
              if (isInspector) return;
              const t = ev.target as HTMLElement | null;
              if (t && t.closest && t.closest("button, a, input, textarea"))
                return;
              ev.preventDefault();
              ev.stopPropagation();
              const shell = shellRef.current;
              if (!shell) return;
              openTipAnchor("bookmarks", rectToAnchor(shell));
            },
          },
          body,
        ),
    !isInspector && !isReport
      ? MeterStatusbar({
          instance,
          segmentRef: selectedset || "current",
          segmentLabel: isCurrentSeg ? "Current" : titleSeg,
          onSegmentClick: (el) => {
            openTip("seg", el, { pin: true });
          },
          onEncounterClick: () => props.onOpenReport?.("encounter"),
        })
      : null,
    portalOrInline(ReactDOM, tipOverlay),
    portalOrInline(ReactDOM, reportNode),
    portalOrInline(ReactDOM, optionsNode),
    props.layoutEdit || arrange
      ? e("div", {
          className: "ecu-meter-resize ecu-meter-resize-left",
          title:
            "Resize from bottom-left (keeps top-right fixed · Shift = free size)",
          onPointerDown: (ev: any) => onResizePointerDown(ev, "bl"),
        })
      : null,
    props.layoutEdit || arrange
      ? e("div", {
          className: "ecu-meter-resize",
          title: getLayoutFreePlacement()
            ? "Resize from bottom-right (keeps top-left fixed · free size)"
            : "Resize from bottom-right (keeps top-left fixed · Shift = free size)",
          onPointerDown: (ev: any) => onResizePointerDown(ev, "br"),
        })
      : null,
  );
}
