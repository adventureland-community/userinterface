/**
 * Shared maximize / restore control for panels that lift into shell-expand.
 * Uses the standard four-corner fullscreen glyph (not a "FULL" text label).
 */

import { getReact, e } from "../../host/react";

export type PanelExpandButtonProps = {
  expanded: boolean;
  onToggle: () => void;
  /** Tooltip / aria when collapsed (enter expand). */
  expandTitle: string;
  /** Tooltip / aria when expanded (restore). */
  restoreTitle: string;
  className?: string;
};

function ExpandGlyph(expanded: boolean): any {
  const React = getReact();
  // Four corner brackets — classic fullscreen / exit-fullscreen affordance.
  const d = expanded
    ? // Exit: corners point inward.
      "M5 1v4H1M11 1v4h4M5 15v-4H1M11 15v-4h4"
    : // Enter: corners point outward (open frame).
      "M1 5V1h4M11 1h4v4M15 11v4h-4M5 15H1v-4";
  return e(
    "svg",
    {
      className: "ecu-expand-glyph",
      viewBox: "0 0 16 16",
      width: 14,
      height: 14,
      "aria-hidden": true,
      focusable: "false",
    },
    e("path", {
      d,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.6,
      strokeLinecap: "square",
      strokeLinejoin: "miter",
    }),
  );
}

/** Four-corner fullscreen / exit-fullscreen control. */
export function PanelExpandButton(props: PanelExpandButtonProps): any {
  const React = getReact();
  const title = props.expanded ? props.restoreTitle : props.expandTitle;
  return e(
    "button",
    {
      type: "button",
      className:
        (props.className || "ecu-panel-expand") +
        (props.expanded ? " is-expanded" : ""),
      title,
      "aria-label": title,
      "aria-pressed": props.expanded,
      onClick: () => props.onToggle(),
    },
    ExpandGlyph(props.expanded),
  );
}

/**
 * Find the positioned shell for a panel id walking up from an inner root.
 */
export function findPanelShell(
  from: HTMLElement | null,
  panelId: string,
): HTMLElement | null {
  let shell: HTMLElement | null = from;
  while (shell) {
    if (shell.getAttribute && shell.getAttribute("data-panel") === panelId) {
      return shell;
    }
    shell = shell.parentElement;
  }
  return null;
}
