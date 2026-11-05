/**
 * Shared maximize / restore control for panels that lift into shell-expand.
 * Uses the standard four-corner fullscreen glyph (not a "FULL" text label).
 */

import { getReact, e } from "../../host/react";

const STYLE_ID = "ecu-panel-expand-css";

/** Dark chrome matching window ☰ / × — not a stock white button. */
const EXPAND_CSS = `
.ecu-panel-expand {
  appearance: none;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  padding: 0;
  margin: 0;
  border: 1px solid #886;
  border-radius: 2px;
  background: rgba(30, 30, 20, 0.95);
  color: #ffe08a;
  cursor: pointer;
  line-height: 0;
  box-sizing: border-box;
}
.ecu-panel-expand:hover {
  border-color: #aa8;
  background: rgba(50, 40, 20, 0.95);
}
.ecu-panel-expand.is-expanded {
  border-color: rgba(232, 201, 106, 0.55);
  color: #ffe08a;
  background: #2a2410;
}
.ecu-panel-expand .ecu-expand-glyph {
  display: block;
}
#comm-ui.comm-ui-touch .ecu-panel-expand,
#comm-ui[data-viewport="tablet"] .ecu-panel-expand,
#comm-ui[data-viewport="phone"] .ecu-panel-expand {
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
}
`;

export function ensurePanelExpandCss(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = EXPAND_CSS;
  document.head.appendChild(el);
}

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
  ensurePanelExpandCss();
  const title = props.expanded ? props.restoreTitle : props.expandTitle;
  const extra = props.className ? " " + props.className : "";
  return e(
    "button",
    {
      type: "button",
      className:
        "ecu-panel-expand" +
        extra +
        (props.expanded ? " is-expanded" : ""),
      title,
      "aria-label": title,
      "aria-pressed": props.expanded,
      onClick: (ev: { preventDefault?: () => void; stopPropagation?: () => void }) => {
        if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
        if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
        props.onToggle();
      },
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
