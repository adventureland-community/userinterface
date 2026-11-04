/**
 * Shared peer-page pager — Chat server pages / Bank views / Market facets.
 * Shows where you are (current label) and what a swipe lands on (prev/next).
 * Track dots stay spans so phone `button { min-height }` cannot oval them.
 */

import { getReact, e } from "../../host/react";
import { ensurePeerPageDotsCss } from "./peerPageDotsCss";

export type PeerPageDot = {
  key: string;
  label: string;
};

export type PeerPageDotsProps = {
  pages: PeerPageDot[];
  activeKey: string | null | undefined;
  onSelect: (key: string) => void;
  ariaLabel: string;
  className?: string;
};

export function PeerPageDots(props: PeerPageDotsProps): any {
  const React = getReact();
  ensurePeerPageDotsCss();
  if (!props.pages || props.pages.length < 2) return null;

  let activeIdx = -1;
  for (let i = 0; i < props.pages.length; i++) {
    if (props.pages[i].key === props.activeKey) {
      activeIdx = i;
      break;
    }
  }
  if (activeIdx < 0) activeIdx = 0;

  const active = props.pages[activeIdx];
  const prev = activeIdx > 0 ? props.pages[activeIdx - 1] : null;
  const next =
    activeIdx < props.pages.length - 1 ? props.pages[activeIdx + 1] : null;

  const [flashKey, setFlashKey] = React.useState(active.key);
  const [flashOn, setFlashOn] = React.useState(false);
  React.useEffect(() => {
    if (active.key === flashKey) return;
    setFlashKey(active.key);
    setFlashOn(true);
    const id = window.setTimeout(() => setFlashOn(false), 420);
    return () => window.clearTimeout(id);
  }, [active.key, flashKey]);

  const dots: any[] = [];
  for (let i = 0; i < props.pages.length; i++) {
    const page = props.pages[i];
    dots.push(
      e("span", {
        key: page.key,
        role: "button",
        tabIndex: 0,
        className:
          "ecu-peer-page-dots__dot" + (i === activeIdx ? " is-on" : ""),
        "aria-label": page.label,
        "aria-current": i === activeIdx ? "true" : undefined,
        title: page.label,
        onClick: () => props.onSelect(page.key),
        onKeyDown: (ev: { key: string; preventDefault: () => void }) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            props.onSelect(page.key);
          }
        },
      }),
    );
  }

  return e(
    "div",
    {
      className:
        "ecu-peer-page-dots" +
        (flashOn ? " is-flash" : "") +
        (props.className ? " " + props.className : ""),
      role: "navigation",
      "aria-label": props.ariaLabel,
    },
    e(
      "button",
      {
        type: "button",
        className:
          "ecu-peer-page-dots__side is-prev" + (prev ? "" : " is-empty"),
        disabled: !prev,
        title: prev ? "Previous · " + prev.label : undefined,
        "aria-label": prev ? "Previous: " + prev.label : "No previous page",
        onClick: () => {
          if (prev) props.onSelect(prev.key);
        },
      },
      e("span", { className: "ecu-peer-page-dots__chev", "aria-hidden": true }, "‹"),
      e(
        "span",
        { className: "ecu-peer-page-dots__side-label" },
        prev ? prev.label : "",
      ),
    ),
    e(
      "div",
      { className: "ecu-peer-page-dots__center" },
      e(
        "div",
        {
          className: "ecu-peer-page-dots__current",
          "aria-live": "polite",
        },
        active.label,
      ),
      e(
        "div",
        {
          className: "ecu-peer-page-dots__meta",
          "aria-hidden": true,
        },
        activeIdx + 1 + " / " + props.pages.length,
      ),
      e(
        "div",
        {
          className: "ecu-peer-page-dots__track",
          role: "tablist",
          "aria-label": props.ariaLabel,
        },
        ...dots,
      ),
    ),
    e(
      "button",
      {
        type: "button",
        className:
          "ecu-peer-page-dots__side is-next" + (next ? "" : " is-empty"),
        disabled: !next,
        title: next ? "Next · " + next.label : undefined,
        "aria-label": next ? "Next: " + next.label : "No next page",
        onClick: () => {
          if (next) props.onSelect(next.key);
        },
      },
      e(
        "span",
        { className: "ecu-peer-page-dots__side-label" },
        next ? next.label : "",
      ),
      e("span", { className: "ecu-peer-page-dots__chev", "aria-hidden": true }, "›"),
    ),
  );
}
