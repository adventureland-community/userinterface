/**
 * Details-style window chrome: lock, ungroup, Window Control menu.
 * Kept out of PositionedPanel so the drag shell stays under 1k lines.
 */

import { getReact, e } from "../../host/react";

export type ClosedWindowEntry = { id: string; label: string };

export type WindowControlChromeProps = {
  touchish: boolean;
  locked?: boolean;
  onToggleLock?: () => void;
  onUngroup?: () => void;
  onCreateWindow?: () => void;
  onClose?: () => void;
  closedWindows?: ClosedWindowEntry[];
  onReopenWindow?: (id: string) => void;
  /**
   * When true, show the ☰ menu even if only reopen/close items exist
   * (play-arrange / layout edit / lock affordance).
   */
  showMenu: boolean;
};

const chromeBtnStyle = (touchish: boolean, lockedBg?: boolean) => ({
  cursor: "pointer",
  fontSize: touchish ? "14px" : "12px",
  padding: touchish ? "4px 8px" : "1px 6px",
  minHeight: touchish ? "32px" : undefined,
  border: "1px solid #886",
  background: lockedBg ? "rgba(50,40,20,0.95)" : "rgba(30,30,20,0.95)",
  color: "#ffe08a",
  flexShrink: 0,
});

export function WindowControlChrome(props: WindowControlChromeProps): any {
  const React = getReact();
  const [wcOpen, setWcOpen] = React.useState(false);
  const touchish = props.touchish;

  const lockBtn = props.onToggleLock
    ? e(
        "button",
        {
          type: "button",
          className: "comm-pos-lock",
          title: props.locked
            ? "Unlock — allow move and resize"
            : "Lock — prevent move and resize",
          "aria-label": props.locked ? "Unlock window" : "Lock window",
          onClick: (ev: any) => {
            ev.preventDefault();
            ev.stopPropagation();
            props.onToggleLock!();
            // Drop button focus so chrome does not stay open via focus after lock.
            try {
              (ev.currentTarget as HTMLElement).blur();
            } catch {
              /* ignore */
            }
          },
          onPointerDown: (ev: any) => ev.stopPropagation(),
          style: chromeBtnStyle(touchish, !!props.locked),
        },
        props.locked ? "🔒" : "🔓",
      )
    : null;

  const ungroupBtn = props.onUngroup
    ? e(
        "button",
        {
          type: "button",
          className: "comm-pos-ungroup",
          title: "Ungroup",
          "aria-label": "Ungroup",
          onClick: (ev: any) => {
            ev.preventDefault();
            ev.stopPropagation();
            props.onUngroup!();
          },
          onPointerDown: (ev: any) => ev.stopPropagation(),
          style: chromeBtnStyle(touchish),
        },
        "⧉",
      )
    : null;

  const wcItems: any[] = [];
  if (props.onToggleLock) {
    wcItems.push(
      e(
        "button",
        {
          key: "lock",
          type: "button",
          className: "comm-pos-wc-item",
          onClick: (ev: any) => {
            ev.preventDefault();
            ev.stopPropagation();
            props.onToggleLock!();
            setWcOpen(false);
            try {
              (ev.currentTarget as HTMLElement).blur();
            } catch {
              /* ignore */
            }
          },
        },
        props.locked ? "Unlock" : "Lock",
      ),
    );
  }
  if (props.onUngroup) {
    wcItems.push(
      e(
        "button",
        {
          key: "ungroup",
          type: "button",
          className: "comm-pos-wc-item",
          onClick: (ev: any) => {
            ev.preventDefault();
            ev.stopPropagation();
            props.onUngroup!();
            setWcOpen(false);
          },
        },
        "Ungroup",
      ),
    );
  }
  if (props.onCreateWindow) {
    wcItems.push(
      e(
        "button",
        {
          key: "create",
          type: "button",
          className: "comm-pos-wc-item",
          onClick: (ev: any) => {
            ev.preventDefault();
            ev.stopPropagation();
            props.onCreateWindow!();
            setWcOpen(false);
          },
        },
        "+ Create window",
      ),
    );
  }
  if (props.onClose) {
    wcItems.push(
      e(
        "button",
        {
          key: "close",
          type: "button",
          className: "comm-pos-wc-item",
          onClick: (ev: any) => {
            ev.preventDefault();
            ev.stopPropagation();
            props.onClose!();
            setWcOpen(false);
          },
        },
        "Close window",
      ),
    );
  }
  const closed = props.closedWindows || [];
  for (let ci = 0; ci < closed.length; ci++) {
    const c = closed[ci];
    wcItems.push(
      e(
        "button",
        {
          key: "reopen-" + c.id,
          type: "button",
          className: "comm-pos-wc-item",
          onClick: (ev: any) => {
            ev.preventDefault();
            ev.stopPropagation();
            props.onReopenWindow?.(c.id);
            setWcOpen(false);
          },
        },
        "Reopen: " + c.label,
      ),
    );
  }

  const windowControl =
    wcItems.length > 0 && props.showMenu
      ? e(
          "div",
          {
            className: "comm-pos-wc",
            style: { position: "relative", flexShrink: 0 },
            onPointerDown: (ev: any) => ev.stopPropagation(),
          },
          e(
            "button",
            {
              type: "button",
              className: "comm-pos-wc-btn",
              title: "Window Control",
              "aria-label": "Window Control",
              "aria-expanded": wcOpen,
              onClick: (ev: any) => {
                ev.preventDefault();
                ev.stopPropagation();
                setWcOpen(!wcOpen);
              },
              style: chromeBtnStyle(touchish),
            },
            "☰",
          ),
          wcOpen
            ? e(
                "div",
                {
                  className: "comm-pos-wc-menu",
                  style: {
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 2,
                    minWidth: 160,
                    zIndex: 40,
                    background: "rgba(18,18,14,0.98)",
                    border: "1px solid #886",
                    padding: 4,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  },
                },
                ...wcItems,
              )
            : null,
        )
      : null;

  if (!lockBtn && !ungroupBtn && !windowControl) return null;

  return e(
    "div",
    {
      className: "comm-pos-window-chrome",
      style: {
        display: "flex",
        alignItems: "center",
        gap: 4,
        flexShrink: 0,
      },
      onPointerDown: (ev: any) => ev.stopPropagation(),
    },
    lockBtn,
    ungroupBtn,
    windowControl,
  );
}
