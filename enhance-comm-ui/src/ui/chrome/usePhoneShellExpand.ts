/**
 * Shared phone shell-expand lifecycle — Bank / Market / Chat pattern.
 * Lifts the PositionedPanel shell above the Material dock while expanded;
 * swipe-down on the head closes (or collapses when no onRequestClose).
 */

import { getReact } from "../../host/react";
import { detectViewportProfile } from "../../lib/viewport";
import { findPanelShell } from "./panelExpandControl";
import { bindSwipeDownClose, syncPhoneSheetOpenClass } from "./phoneShell";

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
    let cancelled = false;
    let tries = 0;
    let timer = 0 as number | ReturnType<typeof setTimeout>;
    /** Mail (and slow shells) can mount after the first paint — keep trying. */
    const maxTries = 80;

    const apply = () => {
      if (cancelled) return;
      let shell = findPanelShell(args.rootRef.current, args.panelId);
      // Fallback when ref is late (mail) but the PositionedPanel shell is already up.
      if (!shell && typeof document !== "undefined") {
        shell = document.querySelector(
          '[data-panel="' + args.panelId + '"]',
        ) as HTMLElement | null;
      }
      if (!shell) {
        if (args.expanded && tries < maxTries) {
          tries += 1;
          timer = window.setTimeout(apply, 50);
        }
        return;
      }

      if (args.expanded) {
        if (!preExpandSizeRef.current) {
          preExpandSizeRef.current = {
            w: Math.round(shell.offsetWidth),
            h: Math.round(shell.offsetHeight),
          };
        }
        shell.setAttribute("data-ecu-suspend-frame-resize", "1");
        shell.classList.add(args.shellClass);
        document.documentElement.classList.add("ecu-phone-sheet-open");
        // Shell nodes can be recreated by layout — re-assert for a few frames.
        if (tries < 8) {
          tries += 1;
          timer = window.setTimeout(apply, 100);
        }
        return;
      }

      shell.classList.remove(args.shellClass);
      shell.removeAttribute("data-ecu-suspend-frame-resize");
      syncPhoneSheetOpenClass();
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
    };

    apply();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      const shell = findPanelShell(args.rootRef.current, args.panelId);
      if (shell) {
        shell.classList.remove(args.shellClass);
        shell.removeAttribute("data-ecu-suspend-frame-resize");
      }
      syncPhoneSheetOpenClass();
    };
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
