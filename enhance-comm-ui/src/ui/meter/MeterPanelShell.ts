import { getReact, getReactDOM, e } from "../../host/react";
import type { EntityLike } from "../../host/globals";
import type { PartyFocus } from "../../lib/settingsFocus";
import {
  partyFocusLabel,
  partyFocusMenuOptions,
} from "../../lib/settingsFocus";
import { PIXEL_TEXT } from "../../lib/typeScale";
import {
  METER_FRAME_DEFAULT,
  METER_FRAME_MAX,
  METER_FRAME_MIN,
} from "../../lib/frameSizes";
import {
  getLayoutFreePlacement,
  getLayoutGridStep,
} from "../../lib/layoutEditPrefs";
import { snapFrameSizeToGrid } from "../../lib/layoutGrid";
import { layoutDragRoot } from "../../lib/percentDrag";
import {
  canCycleBarMode,
  cycleBarMode,
  formatMeterReportLines,
  isReportPresentation,
  REPORT_TABS,
  reportKindForPresentation,
  type ReportKind,
} from "../../meters/meterCatalog";
import {
  isMeterInCombat,
  listPastSegments,
  listVisibleParties,
  getWatchedPartyKey,
  resolveSegment,
  getYouId,
} from "../../meters/meterEngine";
import { runMeterQuery, segmentTitle } from "../../meters/meterQuery";
import { meterHasSnap } from "../../meters/meterWindowGroup";
import { getSettings, patchSettings } from "../../lib/settings";
import type { MeterBookmark } from "../../meters/meterTypes";
import { subscribeMeterTick } from "../../meters/meterUiTick";
import type {
  CombatSegment,
  MeterInstance,
  MeterQuery,
  MeterResult,
  RankedRow,
  SegmentRef,
} from "../../meters/meterTypes";
import { segmentDurationMs } from "../../meters/meterTypes";
import { injectMeterChromeCss } from "./meterChromeCss";
import {
  COOLTIP_HIDE_MS,
  rectToAnchor,
  type MeterCooltipAnchor,
  type MeterCooltipKind,
} from "./meterCooltipMenu";
import { MeterReportDialog } from "./MeterReportDialog";
import { MeterStatusbar } from "./MeterStatusbar";
import { MeterOptionsPanel } from "./MeterOptionsPanel";
import { getMeterAppearance } from "../../meters/meterAppearance";
import { renderMeterShellBody } from "./MeterShellBody";
import {
  meterShellTourId,
  modeLabel,
  presentationFor,
  rootQuery,
} from "./meterShellHelpers";
import { meterShellTipItems } from "./meterShellTipItems";
import { renderMeterShellCooltip } from "./meterShellCooltip";
import { renderMeterShellTitlebar } from "./meterShellTitlebar";

export type MeterPanelShellProps = {
  instance: MeterInstance;
  highlightId?: string;
  entities: EntityLike[];
  watchedName?: string;
  layoutEdit?: boolean;
  /** Drag/resize active (unlocked, Alt, or layout edit). */
  arrange?: boolean;
  locked?: boolean;
  onToggleLock?: () => void;
  /** Ref filled with the titlebar node so PositionedPanel can drag from it. */
  titlebarDragRef?: { current: HTMLElement | null };
  /** Drive shared Inspector from a specific player (Damage / Encounter rows). */
  onFocusInspector?: (actorId: string, name: string) => void;
  /** Open shared Encounter / Deaths / Timeline report from a ranked meter. */
  onOpenReport?: (kind: ReportKind) => void;
  /** Ungroup this meter from its snap cluster. */
  onUngroup?: () => void;
  /** Peer ids in the same snap group (live resize preview). */
  resizeGroupIds?: string[];
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
  const locked = props.locked === true;
  const [tick, setTick] = React.useState(0);
  const [tip, setTip] = React.useState(
    null as null | {
      kind: MeterCooltipKind;
      anchor: MeterCooltipAnchor;
      pinned?: boolean;
      bookmarkSlot?: number;
    },
  );
  const [reportOpen, setReportOpen] = React.useState(false);
  const [optionsOpen, setOptionsOpen] = React.useState(false);
  const [interacting, setInteracting] = React.useState(false);
  const [stretchDrag, setStretchDrag] = React.useState(null as number | null);
  const tipCloseTimer = React.useRef(
    null as ReturnType<typeof setTimeout> | null,
  );
  const tipPinnedRef = React.useRef(false);
  const shellRef = React.useRef(null as HTMLElement | null);

  const patchInspectorAbility = (ability: string | null) => {
    const q = rootQuery(instance);
    if (q.kind !== "details") return;
    const next: MeterQuery = { kind: "details", actorId: q.actorId };
    if (ability) next.ability = ability;
    onPatchInstance({ query: next });
  };

  const [bmDrag, setBmDrag] = React.useState(null as number | null);
  const [bmDrop, setBmDrop] = React.useState(null as number | null);

  const finishBookmarkDrag = () => {
    if (bmDrag != null && bmDrop != null && bmDrag !== bmDrop) {
      const bookmarks = (getSettings().meterBookmarks || []).slice();
      const moved = bookmarks[bmDrag];
      if (moved) {
        bookmarks.splice(bmDrag, 1);
        bookmarks.splice(bmDrop, 0, moved);
        patchSettings({ meterBookmarks: bookmarks });
      }
    }
    setBmDrag(null);
    setBmDrop(null);
  };

  const clearTipClose = () => {
    if (tipCloseTimer.current != null) {
      clearTimeout(tipCloseTimer.current);
      tipCloseTimer.current = null;
    }
  };
  const closeTip = () => {
    clearTipClose();
    tipPinnedRef.current = false;
    setTip(null);
  };
  const openTip = (
    kind: MeterCooltipKind,
    el: HTMLElement,
    opts?: { pin?: boolean; bookmarkSlot?: number },
  ) => {
    clearTipClose();
    const pinned = !!opts?.pin;
    if (pinned && props.onToolbarInteract) {
      const toolbarKinds: Record<string, boolean> = {
        gear: true,
        party: true,
        seg: true,
        display: true,
        allDisplays: true,
        report: true,
        tools: true,
        reset: true,
      };
      if (toolbarKinds[kind]) props.onToolbarInteract();
    }
    tipPinnedRef.current = pinned;
    setInteracting(true);
    setTip({
      kind,
      anchor: rectToAnchor(el),
      pinned,
      bookmarkSlot: opts?.bookmarkSlot,
    });
  };
  const openTipAnchor = (
    kind: MeterCooltipKind,
    anchor: MeterCooltipAnchor,
    opts?: { pin?: boolean; bookmarkSlot?: number },
  ) => {
    clearTipClose();
    const pinned = !!opts?.pin;
    tipPinnedRef.current = pinned;
    setInteracting(true);
    setTip({ kind, anchor, pinned, bookmarkSlot: opts?.bookmarkSlot });
  };
  const scheduleTipClose = () => {
    if (tipPinnedRef.current) return;
    clearTipClose();
    tipCloseTimer.current = setTimeout(() => {
      tipPinnedRef.current = false;
      setTip(null);
      tipCloseTimer.current = null;
    }, COOLTIP_HIDE_MS);
  };

  // Click outside a pinned/open cooltip dismisses it (Details click-away).
  React.useEffect(() => {
    if (!tip) return;
    const onDown = (ev: MouseEvent) => {
      const el = ev.target as HTMLElement | null;
      if (!el || typeof el.closest !== "function") return;
      if (
        el.closest(
          ".ecu-meter-cooltip, .ecu-meter-switch-overlay, .ecu-meter-bookmark-overlay, .ecu-meter-report-backdrop, .ecu-meter-tool, .ecu-meter-ttl",
        )
      ) {
        return;
      }
      closeTip();
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tip]);

  React.useEffect(() => {
    injectMeterChromeCss();
    return subscribeMeterTick(() => setTick((n: number) => n + 1));
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
  void tick;

  const inCombat = isMeterInCombat();
  const presNow = presentationFor(instance);
  const isToolPanel = presNow === "details" || isReportPresentation(presNow);
  const idle = !isToolPanel && instance.fadeWhenIdle !== false && !inCombat;
  const rootQ = rootQuery(instance);
  const titleMode =
    rootQ.kind === "players" ||
    rootQ.kind === "avoidance" ||
    rootQ.kind === "rolling" ||
    rootQ.kind === "snapshot"
      ? modeLabel(rootQ)
      : modeLabel(rootQ, instance.label);
  const titleSeg = segmentTitle(selectedset);
  const isCurrentSeg = selectedset === "current";

  const openInspectorRow = (row: RankedRow) => {
    if (onFocusInspector) {
      onFocusInspector(row.id, row.name);
      return;
    }
    if (presentationFor(instance) === "details") {
      onPatchInstance({
        query: { kind: "details", actorId: row.id },
        label: `Inspector · ${row.name}`,
      });
    }
  };

  const onRowClick = (row: RankedRow, ev?: any) => {
    if (ev?.button != null && ev.button !== 0) return;
    const q = rootQuery(instance);
    const canInspect =
      q.kind === "players" ||
      q.kind === "avoidance" ||
      presentationFor(instance) === "encounter" ||
      presentationFor(instance) === "details";
    if (!canInspect) return;
    openInspectorRow(row);
  };

  const onRowContextMenu = (row: RankedRow, ev: any) => {
    ev.preventDefault();
    onRowClick(row);
  };

  const cycle = (delta: number) => {
    if (!canCycleBarMode(rootQuery(instance))) return;
    const next = cycleBarMode(rootQuery(instance), delta);
    onPatchInstance({
      query: next.query,
      label: next.label,
    });
  };

  const past = listPastSegments();
  const resolved = resolveSegment(selectedset) as CombatSegment | null;
  const pres = presentationFor(instance);

  const barsProps = {
    query: activeQuery,
    segmentRef: selectedset,
    partyFocus: instance.partyFocus as PartyFocus | undefined,
    entities,
    highlightId,
    live: selectedset === "current",
    frameH: instance.frameH,
    alwaysShowSelf: instance.alwaysShowSelf,
    onRowClick,
    onRowContextMenu,
  };

  const body = renderMeterShellBody({
    pres,
    result,
    selectedset,
    instance,
    entities,
    highlightId,
    layoutEdit: props.layoutEdit,
    activeQuery,
    barsProps,
    onPatchInstance,
    patchInspectorAbility,
    onFocusInspector,
  });

  const hasObserver = !!getYouId();
  const partyFocus = (instance.partyFocus || "watched") as PartyFocus;
  const visibleParties = listVisibleParties();
  const partyLabels: Record<string, string> = {};
  for (let i = 0; i < visibleParties.length; i++) {
    partyLabels[visibleParties[i].id] = visibleParties[i].label;
  }
  const partyLabel = partyFocusLabel(
    partyFocus,
    watchedName,
    hasObserver,
    partyLabels,
  );
  const partyMenuOpts = partyFocusMenuOptions({
    hasObserver,
    watchedName,
    watchedPartyKey: getWatchedPartyKey(),
    visibleParties,
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
    onPatchInstance({
      query: { kind: "details", actorId },
      presentation: "details",
      label: `Inspector · ${name}`,
    });
    closeTip();
  };

  const clampFrame = (w: number, h: number) => ({
    frameW: Math.min(
      METER_FRAME_MAX.w,
      Math.max(METER_FRAME_MIN.w, Math.round(w)),
    ),
    frameH: Math.min(
      METER_FRAME_MAX.h,
      Math.max(METER_FRAME_MIN.h, Math.round(h)),
    ),
  });

  const sizeFrame = (w: number, h: number, freeForm: boolean) => {
    if (freeForm || getLayoutFreePlacement()) {
      return clampFrame(w, h);
    }
    const root = layoutDragRoot().getBoundingClientRect();
    const snapped = snapFrameSizeToGrid(
      w,
      h,
      getLayoutGridStep(),
      root.width,
      root.height,
    );
    return clampFrame(snapped.w, snapped.h);
  };

  const onResizePointerDown = (ev: any, corner: "br" | "bl" = "br") => {
    ev.preventDefault();
    ev.stopPropagation();
    const startX = ev.clientX;
    const startY = ev.clientY;
    const startW = instance.frameW || METER_FRAME_DEFAULT.w;
    const startH = instance.frameH || METER_FRAME_DEFAULT.h;
    const target = ev.currentTarget as HTMLElement;
    const shell = target.closest(".ecu-meter-shell") as HTMLElement | null;
    const outer = shell
      ? (shell.closest(".comm-pos-panel") as HTMLElement | null)
      : null;
    if (shell) shell.classList.add("is-resizing");
    const pointerId = ev.pointerId;
    try {
      target.setPointerCapture(pointerId);
    } catch {
      /* ignore */
    }
    let pending = sizeFrame(startW, startH, !!ev.shiftKey);
    const shareH =
      !!instance.horizontalSnap ||
      !!(instance.snap && (instance.snap[1] || instance.snap[3]));
    const shareW =
      !!instance.verticalSnap ||
      !!(instance.snap && (instance.snap[2] || instance.snap[4]));
    const peerIds = props.resizeGroupIds || [];
    const syncOuter = (w: number, h: number) => {
      if (outer) {
        outer.style.width = w + "px";
        outer.style.height = h + "px";
      }
      for (let i = 0; i < peerIds.length; i++) {
        const pid = peerIds[i];
        const sel =
          typeof CSS !== "undefined" && typeof CSS.escape === "function"
            ? CSS.escape(pid)
            : pid.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
        const pel = document.querySelector(
          `.comm-pos-panel.comm-pos-${sel}`,
        ) as HTMLElement | null;
        if (!pel) continue;
        if (shareH) pel.style.height = h + "px";
        if (shareW) pel.style.width = w + "px";
      }
    };
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const w = corner === "br" ? startW + dx : startW - dx;
      pending = sizeFrame(w, startH + dy, !!e.shiftKey);
      syncOuter(pending.frameW, pending.frameH);
    };
    const onUp = () => {
      if (shell) shell.classList.remove("is-resizing");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      try {
        target.releasePointerCapture(pointerId);
      } catch {
        /* ignore */
      }
      onPatchInstance(pending);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const durSec = resolved ? Math.max(segmentDurationMs(resolved) / 1000, 1) : 0;

  const isInspector = presentationFor(instance) === "details";
  const isReport = isReportPresentation(presentationFor(instance));
  const activeReportKind = reportKindForPresentation(presentationFor(instance));

  // Details Minimalistic: statusbar off for rank meters; timer lives in title.
  const showStatusbar = isReportPresentation(presentationFor(instance));
  const encounterFooter =
    showStatusbar && resolved && activeReportKind === "encounter"
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

  const cycleable = canCycleBarMode(rootQuery(instance));
  const menuOpen = tip != null;
  const chromeActive = interacting || menuOpen || reportOpen;
  const reportTabLabel =
    REPORT_TABS.find((t) => t.kind === activeReportKind)?.label || titleMode;
  const title = isInspector
    ? instance.label?.replace(/^Inspector · /, "") || "Inspector"
    : isReport
      ? reportTabLabel
      : titleMode;

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
    const ranked = runMeterQuery(rootQuery(instance), {
      segmentRef: selectedset,
      partyFocus: instance.partyFocus,
      entities,
    });
    if (ranked.kind === "ranked") {
      const textOut = formatMeterReportLines(
        modeLabel(rootQuery(instance), instance.label),
        ranked.rows,
        segmentTitle(selectedset),
      );
      if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(textOut);
      }
    }
  };

  const saveBookmark = () => {
    const bm: MeterBookmark = {
      id: `bm-${Date.now().toString(36)}`,
      label: modeLabel(rootQuery(instance), instance.label),
      query: { ...rootQuery(instance) },
      presentation: presentationFor(instance),
      partyFocus: instance.partyFocus,
      selectedset: instance.selectedset,
    };
    const prev = getSettings().meterBookmarks || [];
    patchSettings({ meterBookmarks: prev.concat([bm]) });
  };

  const saveBookmarkAtSlot = (
    slotIndex: number,
    d: { label: string; query: MeterQuery },
  ) => {
    const bm: MeterBookmark = {
      id: `bm-${Date.now().toString(36)}`,
      label: d.label,
      query: { ...d.query },
      presentation: "bars",
      partyFocus: instance.partyFocus,
      selectedset: instance.selectedset,
    };
    const prev = (getSettings().meterBookmarks || []).slice();
    if (slotIndex >= prev.length) {
      prev.push(bm);
    } else {
      prev[slotIndex] = bm;
    }
    patchSettings({ meterBookmarks: prev });
  };

  const applyBookmark = (bm: MeterBookmark) => {
    onPatchInstance({
      query: { ...bm.query },
      presentation: bm.presentation || "bars",
      label: bm.label,
      partyFocus: bm.partyFocus,
      selectedset: bm.selectedset,
    });
  };

  const openReportDialog = () => {
    closeTip();
    setReportOpen(true);
  };

  const tipItems = () =>
    meterShellTipItems({
      tip,
      partyMenuOpts,
      partyFocus,
      hasObserver,
      instance,
      onPatchInstance,
      closeTip,
      resolved,
      isCurrentSeg,
      titleSeg,
      durSec,
      partyLabel,
      selectedset,
      applySegment,
      past,
      actorPickerRows,
      setInspectorActor,
      onOpenReport,
      copyReport,
      openReportDialog,
      setOptionsOpen,
      watchedName,
      metersHidden: props.metersHidden,
      onToggleMetersHidden: props.onToggleMetersHidden,
      onFocusInspector: props.onFocusInspector,
      onDuplicate: props.onDuplicate,
      onClose: props.onClose,
      closedInstances: props.closedInstances,
      onReopenClosed: props.onReopenClosed,
    });

  const renderCooltip = () =>
    renderMeterShellCooltip({
      tip,
      bmDrag,
      setBmDrag,
      bmDrop,
      setBmDrop,
      finishBookmarkDrag,
      applyBookmark,
      closeTip,
      instance,
      openTip,
      clearTipClose,
      scheduleTipClose,
      setOptionsOpen,
      saveBookmarkAtSlot,
      onPatchInstance,
      tipItems,
    });

  const shellClass =
    "ecu-meter-shell" +
    (idle ? " is-idle" : "") +
    (menuOpen ? " is-menu-open" : "") +
    (chromeActive ? " is-interacting" : "") +
    (props.layoutEdit || arrange ? " is-layout" : "") +
    (isInspector ? " is-inspector" : "") +
    (isReport ? " is-report" : "") +
    (meterHasSnap(instance) ? " is-grouped" : "");

  const meterApp = getMeterAppearance();
  const shellTourId = meterShellTourId(rootQuery(instance));

  return e(
    "div",
    {
      className: shellClass,
      ...(shellTourId ? { "data-ecu-tour": shellTourId } : {}),
      style: {
        ...PIXEL_TEXT,
        fontSize: `${Math.round(meterApp.windowScale * 100)}%`,
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
      arrange,
      titlebarDragRef: props.titlebarDragRef,
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
      layoutEdit: props.layoutEdit,
      onUngroup: props.onUngroup,
      onToggleLock: props.onToggleLock,
      onConfigure: props.onConfigure,
      onDuplicate: props.onDuplicate,
      onClose: props.onClose,
    }),
    isReport
      ? e(
          "div",
          {
            className: "ecu-meter-report-tabs",
            style: { ...PIXEL_TEXT },
          },
          ...REPORT_TABS.map((tab) =>
            e(
              "button",
              {
                key: tab.kind,
                type: "button",
                className:
                  "ecu-meter-report-tab" +
                  (activeReportKind === tab.kind ? " active" : ""),
                onClick: () => setReportTab(tab.kind),
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
        onContextMenu: (ev: any) => {
          if (isInspector || isReport) return;
          const t = ev.target as HTMLElement | null;
          if (t && t.closest && t.closest("button, a, input, textarea")) return;
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
          segmentLabel: `${isCurrentSeg ? "Current" : titleSeg} · ${durSec.toFixed(0)}s`,
          onSegmentClick: () => {
            const shell = shellRef.current;
            if (shell) openTipAnchor("seg", rectToAnchor(shell));
          },
          onEncounterClick: () => props.onOpenReport?.("encounter"),
        })
      : null,
    !isInspector && !isReport && arrange
      ? e("div", {
          className: "ecu-meter-stretch-tab",
          title: "Drag to stretch",
          onPointerDown: (ev: any) => {
            ev.preventDefault();
            ev.stopPropagation();
            setStretchDrag(ev.clientY);
          },
          onPointerMove: (ev: any) => {
            if (stretchDrag == null) return;
            const dy = stretchDrag - ev.clientY;
            if (Math.abs(dy) < 4) return;
            const h = instance.frameH || METER_FRAME_DEFAULT.h;
            onPatchInstance({
              frameH: clampFrame(
                instance.frameW || METER_FRAME_DEFAULT.w,
                h + dy,
              ).frameH,
            });
            setStretchDrag(ev.clientY);
          },
          onPointerUp: () => setStretchDrag(null),
          onPointerCancel: () => setStretchDrag(null),
        })
      : null,
    !isInspector &&
      !isReport &&
      resolved &&
      (resolved.deaths.length > 0 || past.length > 0)
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
                props.onOpenReport?.("encounter");
              },
            },
            "💀",
          ),
          e(
            "button",
            {
              type: "button",
              className: "ecu-meter-encounter-badge is-play",
              title: "Timeline",
              onClick: (ev: any) => {
                ev.stopPropagation();
                props.onOpenReport?.("timeline");
              },
            },
            "▶",
          ),
        )
      : null,
    tip && ReactDOM.createPortal
      ? ReactDOM.createPortal(renderCooltip(), document.body)
      : renderCooltip(),
    reportOpen && ReactDOM.createPortal
      ? ReactDOM.createPortal(
          (() => {
            const ranked = runMeterQuery(rootQuery(instance), {
              segmentRef: selectedset,
              partyFocus: instance.partyFocus,
              entities,
            });
            const rows =
              ranked.kind === "ranked" ? (ranked.rows as RankedRow[]) : [];
            return e(
              "div",
              {
                className: "ecu-meter-report-backdrop",
                onMouseDown: (ev: any) => {
                  if (ev.target === ev.currentTarget) setReportOpen(false);
                },
              },
              e(MeterReportDialog, {
                title: modeLabel(rootQuery(instance), instance.label),
                segmentLabel: segmentTitle(selectedset),
                rows,
                onClose: () => setReportOpen(false),
              }),
            );
          })(),
          document.body,
        )
      : reportOpen
        ? (() => {
            const ranked = runMeterQuery(rootQuery(instance), {
              segmentRef: selectedset,
              partyFocus: instance.partyFocus,
              entities,
            });
            const rows =
              ranked.kind === "ranked" ? (ranked.rows as RankedRow[]) : [];
            return e(MeterReportDialog, {
              title: modeLabel(rootQuery(instance), instance.label),
              segmentLabel: segmentTitle(selectedset),
              rows,
              onClose: () => setReportOpen(false),
            });
          })()
        : null,
    optionsOpen && ReactDOM.createPortal
      ? ReactDOM.createPortal(
          e(MeterOptionsPanel, {
            instanceLabel: instance.label,
            onClose: () => setOptionsOpen(false),
          }),
          document.body,
        )
      : optionsOpen
        ? e(MeterOptionsPanel, {
            instanceLabel: instance.label,
            onClose: () => setOptionsOpen(false),
          })
        : null,
    props.layoutEdit || arrange
      ? e("div", {
          className: "ecu-meter-resize ecu-meter-resize-left",
          title:
            "Drag to resize (left corner · Shift = free size · Alt/Ctrl = group)",
          onPointerDown: (ev: any) => onResizePointerDown(ev, "bl"),
        })
      : null,
    props.layoutEdit || arrange
      ? e("div", {
          className: "ecu-meter-resize",
          title: getLayoutFreePlacement()
            ? "Drag to resize (Free placement — no grid snap)"
            : "Drag to resize (Shift = free size · Alt/Ctrl = group resize)",
          onPointerDown: (ev: any) => onResizePointerDown(ev, "br"),
        })
      : null,
  );
}
