/**
 * Shared phone shell-expand lifecycle — Bank / Market / Chat pattern.
 * Lifts the PositionedPanel shell above the Material dock while expanded;
 * swipe-down on the head closes (or collapses when no onRequestClose).
 */

import { getReact } from "../../host/react";
import { detectViewportProfile } from "../../lib/viewport";
import { findPanelShell } from "./panelExpandControl";
import { bindSwipeDownClose } from "./phoneShell";

export type UsePhoneShellExpandArgs = {
  panelId: string;
  shellClass: string;
  rootRef: { current: HTMLElement | null };
  headRef: { current: HTMLElement | null };
  expanded: boolean;
  setExpanded: (next: boolean) => void;
  onFrameSizeRestore?: (size: { w: number; h: number }) => void;
  onRequestClose?: () => void;
};

export function usePhoneShellExpand(args: UsePhoneShellExpandArgs): void {
  const React = getReact();
  const preExpandSizeRef = React.useRef(null as { w: number; h: number } | null);

  React.useEffect(() => {
    const shell = findPanelShell(args.rootRef.current, args.panelId);
    if (!shell) return;

    if (args.expanded) {
      if (!preExpandSizeRef.current) {
        preExpandSizeRef.current = {
          w: Math.round(shell.offsetWidth),
          h: Math.round(shell.offsetHeight),
        };
      }
      shell.setAttribute("data-ecu-suspend-frame-resize", "1");
      shell.classList.add(args.shellClass);
      return () => {
        shell.classList.remove(args.shellClass);
        shell.removeAttribute("data-ecu-suspend-frame-resize");
      };
    }

    shell.classList.remove(args.shellClass);
    shell.removeAttribute("data-ecu-suspend-frame-resize");
    const saved = preExpandSizeRef.current;
    preExpandSizeRef.current = null;
    if (
      saved &&
      saved.w >= 80 &&
      saved.h >= 80 &&
      typeof args.onFrameSizeRestore === "function"
    ) {
      window.requestAnimationFrame(() => {
        args.onFrameSizeRestore!({ w: saved.w, h: saved.h });
      });
    }
  }, [
    args.expanded,
    args.onFrameSizeRestore,
    args.panelId,
    args.rootRef,
    args.shellClass,
  ]);

  React.useEffect(() => {
    if (!args.expanded || detectViewportProfile() !== "phone") return;
    const close = () => {
      if (typeof args.onRequestClose === "function") args.onRequestClose();
      else args.setExpanded(false);
    };
    return bindSwipeDownClose(args.headRef.current, close);
  }, [args.expanded, args.headRef, args.onRequestClose, args.setExpanded]);
}
