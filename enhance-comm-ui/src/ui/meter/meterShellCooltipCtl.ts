/**
 * Cooltip open/close/schedule + click-away for MeterPanelShell.
 */

import {
  COOLTIP_HIDE_MS,
  rectToAnchor,
  type MeterCooltipAnchor,
  type MeterCooltipKind,
} from "./meterCooltipMenu";

export type MeterShellTipState = {
  kind: MeterCooltipKind;
  anchor: MeterCooltipAnchor;
  pinned?: boolean;
  bookmarkSlot?: number;
};

export type MeterShellCooltipCtl = {
  tip: MeterShellTipState | null;
  tipPinnedRef: { current: boolean };
  clearTipClose: () => void;
  closeTip: () => void;
  openTip: (
    kind: MeterCooltipKind,
    el: HTMLElement,
    opts?: { pin?: boolean; bookmarkSlot?: number },
  ) => void;
  openTipAnchor: (
    kind: MeterCooltipKind,
    anchor: MeterCooltipAnchor,
    opts?: { pin?: boolean; bookmarkSlot?: number },
  ) => void;
  scheduleTipClose: () => void;
  /** Wire document mousedown click-away; returns unsubscribe. */
  attachClickAway: () => () => void;
};

const TOOLBAR_KINDS: Record<string, boolean> = {
  gear: true,
  party: true,
  seg: true,
  display: true,
  view: true,
  allDisplays: true,
  report: true,
  tools: true,
  reset: true,
};

export function createMeterShellCooltipCtl(args: {
  tip: MeterShellTipState | null;
  setTip: (next: MeterShellTipState | null) => void;
  tipCloseTimer: { current: ReturnType<typeof setTimeout> | null };
  tipPinnedRef: { current: boolean };
  setInteracting: (v: boolean) => void;
  onToolbarInteract?: () => void;
}): MeterShellCooltipCtl {
  const clearTipClose = () => {
    if (args.tipCloseTimer.current != null) {
      clearTimeout(args.tipCloseTimer.current);
      args.tipCloseTimer.current = null;
    }
  };
  const closeTip = () => {
    clearTipClose();
    args.tipPinnedRef.current = false;
    args.setTip(null);
  };
  const openTip = (
    kind: MeterCooltipKind,
    el: HTMLElement,
    opts?: { pin?: boolean; bookmarkSlot?: number },
  ) => {
    clearTipClose();
    const pinned = !!opts?.pin;
    if (pinned && args.onToolbarInteract && TOOLBAR_KINDS[kind]) {
      args.onToolbarInteract();
    }
    args.tipPinnedRef.current = pinned;
    args.setInteracting(true);
    args.setTip({
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
    args.tipPinnedRef.current = pinned;
    args.setInteracting(true);
    args.setTip({ kind, anchor, pinned, bookmarkSlot: opts?.bookmarkSlot });
  };
  const scheduleTipClose = () => {
    if (args.tipPinnedRef.current) return;
    clearTipClose();
    args.tipCloseTimer.current = setTimeout(() => {
      args.tipPinnedRef.current = false;
      args.setTip(null);
      args.tipCloseTimer.current = null;
    }, COOLTIP_HIDE_MS);
  };
  const attachClickAway = () => {
    const onDown = (ev: MouseEvent) => {
      const el = ev.target as HTMLElement | null;
      if (!el || typeof el.closest !== "function") return;
      if (
        el.closest(
          ".ecu-meter-cooltip, .ecu-meter-cooltip-wrap, .ecu-meter-switch-overlay, .ecu-meter-bookmark-overlay, .ecu-meter-report-backdrop, .ecu-meter-tool, .ecu-meter-ttl",
        )
      ) {
        return;
      }
      closeTip();
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  };
  return {
    tip: args.tip,
    tipPinnedRef: args.tipPinnedRef,
    clearTipClose,
    closeTip,
    openTip,
    openTipAnchor,
    scheduleTipClose,
    attachClickAway,
  };
}
