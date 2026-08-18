import { e } from "../../host/react";
import {
  LAYOUT_ANCHOR_OPTIONS,
  LAYOUT_ANCHOR_PAD,
  type LayoutAnchor,
  type PanelPos,
} from "../../lib/layout";
import { TYPE } from "../../lib/typeScale";
import { WindowControlChrome } from "./WindowControlChrome";
import type { PositionedPanelProps } from "./PositionedPanel";

const PLACE_WITHOUT_GROUP_HINT = "Ctrl = place without grouping";

function dragMoveTitle(label?: string): string {
  const base = label ? `Drag to move · ${label}` : "Drag to move";
  return `${base} · ${PLACE_WITHOUT_GROUP_HINT}`;
}

function anchorMeta(id: LayoutAnchor): { glyph: string; title: string } {
  for (let i = 0; i < LAYOUT_ANCHOR_OPTIONS.length; i++) {
    if (LAYOUT_ANCHOR_OPTIONS[i].id === id) return LAYOUT_ANCHOR_OPTIONS[i];
  }
  return { glyph: "·", title: id };
}

export type PositionedPanelChromeArgs = {
  props: PositionedPanelProps;
  pos: PanelPos;
  editing: boolean;
  hidden: boolean;
  hover: boolean;
  touchish: boolean;
  movable: boolean;
  editChrome: "full" | "grip" | "anchors";
  panelLabel: string;
  closeSize: number;
  headerPad: string;
  headerFont: string;
  anchorBtn: number;
  opacity: number;
  arrangePlacement: "above" | "inline";
  showArrangeOverlay: boolean;
  onClose?: () => void;
  onShow?: () => void;
  setPanelHover: (next: boolean) => void;
  setAnchor: (next: LayoutAnchor) => void;
  onPointerDown: (ev: any) => void;
  onPointerMove: (ev: any) => void;
  onPointerUp: (ev: any) => void;
  autoSize?: boolean;
  onToggleAutoSize?: () => void;
};

export function PositionedPanelChrome(args: PositionedPanelChromeArgs): {
  editHeader: any;
  opacityRow: any;
  closeBtn: any;
  closeInArrangeOverlay: boolean;
  windowIdOverlay: any;
  needsChromeHover: boolean;
} {
  const props = args.props;
  const {
    pos,
    editing,
    hidden,
    hover,
    touchish,
    movable,
    editChrome,
    panelLabel,
    closeSize,
    headerPad,
    headerFont,
    anchorBtn,
    opacity,
    arrangePlacement,
    showArrangeOverlay,
    onClose,
    onShow,
    setPanelHover,
    setAnchor,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = args;
  const autoSize = args.autoSize;
  const onToggleAutoSize = args.onToggleAutoSize;

  const closeAbove = props.closePlacement === "above";
  // Unlocked (movable): strip stays open (CSS) so hide × + lock remain reachable.
  // Locked: hover / touch only.
  const showClose =
    !!onClose &&
    !hidden &&
    (hover || touchish || movable || (editing && !props.closeOnHoverOnly));
  // Layout-edit `grip` chrome (Layout toggles) *is* the drag handle — do not
  // let showMoveGrip:false (HUD passes playArrange, which is off in edit)
  // hide the only way to reposition that panel.
  const moveGrip =
    (movable && props.showMoveGrip !== false) ||
    (editing && editChrome === "grip")
      ? e(
          "div",
          {
            className: "comm-pos-edit-grip",
            title: dragMoveTitle(movable ? panelLabel : undefined),
            "aria-label": dragMoveTitle(movable ? panelLabel : undefined),
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: movable ? "6px" : undefined,
              padding: touchish ? "6px 8px" : "2px 4px",
              background: "rgba(40,40,20,0.92)",
              border: "1px solid #886",
              cursor: "grab",
              userSelect: "none",
              color: "#ffe08a",
              fontSize: headerFont,
              lineHeight: 1,
              touchAction: "none",
              pointerEvents: "auto",
              // Full-width drag strip in layout-edit grip rows and play-arrange
              // above-frame bar (CSS). Inline flex helps before CSS applies.
              flex: 1,
            },
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel: onPointerUp,
          },
          e("span", { "aria-hidden": true }, "⠿"),
          // Play-arrange: show the window name in the drag strip (Alt / unlock).
          movable
            ? e(
                "span",
                {
                  className: "comm-pos-arrange-label",
                  style: {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                    flex: 1,
                    textAlign: "left",
                  },
                },
                panelLabel,
              )
            : null,
        )
      : null;

  // Play-arrange chrome: hover bar (HUD + meters). Prefer above the frame;
  // when that would clip off-screen, sit in-flow and push content down.
  // Hide × lives in this strip with lock/WC — same row locked or unlocked.
  // Unlocked panels keep the strip open via .comm-pos-movable CSS.
  const closeInArrangeOverlay = showClose && closeAbove && showArrangeOverlay;

  const closeBtn = showClose
    ? e(
        "button",
        {
          type: "button",
          className:
            "comm-pos-panel-close" +
            (closeAbove ? " comm-pos-panel-close-above" : "") +
            (closeInArrangeOverlay ? " comm-pos-panel-close-in-chrome" : ""),
          title: `Hide ${panelLabel}`,
          "aria-label": `Hide ${panelLabel}`,
          onClick: (ev: any) => {
            ev.preventDefault();
            ev.stopPropagation();
            onClose!();
          },
          onPointerDown: (ev: any) => ev.stopPropagation(),
          onMouseEnter: () => setPanelHover(true),
          onMouseLeave: () => setPanelHover(false),
          style: closeInArrangeOverlay
            ? {
                position: "relative",
                top: "auto",
                right: "auto",
                zIndex: 1,
                width: `${closeSize}px`,
                height: `${closeSize}px`,
                padding: 0,
                margin: 0,
                flexShrink: 0,
                border: "1px solid #886",
                background: "rgba(30,30,20,0.95)",
                color: "#ffe08a",
                fontSize: touchish ? "18px" : "14px",
                lineHeight: `${closeSize - 2}px`,
                cursor: "pointer",
                pointerEvents: "auto",
              }
            : {
                position: "absolute",
                top: closeAbove ? `-${closeSize + 2}px` : editing ? "2px" : "0",
                right: "0",
                zIndex: 2,
                width: `${closeSize}px`,
                height: `${closeSize}px`,
                padding: 0,
                margin: 0,
                border: "1px solid #555",
                background: "rgba(20,20,20,0.9)",
                color: "#ccc",
                fontSize: touchish ? "18px" : "14px",
                lineHeight: `${closeSize - 2}px`,
                cursor: "pointer",
                pointerEvents: "auto",
              },
        },
        "×",
      )
    : null;

  const anchorPad = editing
    ? e(
        "div",
        {
          className: "comm-pos-anchor-pad",
          title: "Stretch / anchor point",
          onPointerDown: (ev: any) => ev.stopPropagation(),
          style: {
            display: "grid",
            gridTemplateColumns: `repeat(3, ${anchorBtn}px)`,
            gridTemplateRows: `repeat(3, ${anchorBtn}px)`,
            gap: "2px",
            marginLeft: "auto",
            flexShrink: 0,
            cursor: "default",
          },
        },
        ...LAYOUT_ANCHOR_PAD.reduce((cells: any[], row) => {
          for (let c = 0; c < row.length; c++) {
            const a = row[c];
            if (!a) {
              cells.push(
                e("div", {
                  key: `empty-${cells.length}`,
                  style: { width: anchorBtn, height: anchorBtn },
                }),
              );
              continue;
            }
            const meta = anchorMeta(a);
            const active = pos.anchor === a;
            cells.push(
              e(
                "button",
                {
                  key: a,
                  type: "button",
                  title: meta.title,
                  "aria-label": meta.title,
                  "aria-pressed": active,
                  onClick: (ev: any) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    setAnchor(a);
                  },
                  onPointerDown: (ev: any) => ev.stopPropagation(),
                  style: {
                    width: `${anchorBtn}px`,
                    height: `${anchorBtn}px`,
                    padding: 0,
                    margin: 0,
                    border: active ? "1px solid #ffe08a" : "1px solid #666",
                    background: active
                      ? "rgba(80,70,20,0.95)"
                      : "rgba(20,20,20,0.9)",
                    color: active ? "#ffe08a" : "#bbb",
                    fontSize: touchish ? "14px" : "12px",
                    lineHeight: `${anchorBtn - 2}px`,
                    cursor: "pointer",
                    boxSizing: "border-box",
                  },
                },
                meta.glyph,
              ),
            );
          }
          return cells;
        }, []),
      )
    : null;

  const hasWindowChrome =
    !!props.onToggleLock ||
    !!props.onUngroup ||
    !!props.onCreateWindow ||
    !!onClose ||
    !!args.onToggleAutoSize ||
    !!(props.closedWindows && props.closedWindows.length);

  const windowChrome = hasWindowChrome
    ? e(WindowControlChrome, {
        touchish,
        locked: props.locked,
        onToggleLock: props.onToggleLock,
        onUngroup: props.onUngroup,
        onCreateWindow: props.onCreateWindow,
        onClose: onClose || undefined,
        closedWindows: props.closedWindows,
        onReopenWindow: props.onReopenWindow,
        autoSize,
        onToggleAutoSize,
        showMenu:
          movable ||
          editing ||
          !!props.onToggleLock ||
          !!props.onUngroup ||
          !!onClose ||
          !!onToggleAutoSize ||
          !!(props.closedWindows && props.closedWindows.length),
      })
    : null;

  // When locked + hover without a move grip, still show the window name so
  // Alt/unlock expectations match Layout (“what is this panel?”).
  const arrangeLabel =
    !moveGrip && showArrangeOverlay
      ? e(
          "span",
          {
            className: "comm-pos-arrange-label",
            style: {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
              flex: 1,
              alignSelf: "center",
              padding: touchish ? "0 8px" : "0 6px",
              color: "#ffe08a",
              fontSize: headerFont,
              lineHeight: 1.2,
              pointerEvents: "none",
              userSelect: "none",
            },
          },
          panelLabel,
        )
      : null;

  const arrangeOverlay = showArrangeOverlay
    ? e(
        "div",
        {
          className:
            "comm-pos-arrange-overlay" +
            (moveGrip ? " has-grip" : " is-chrome-only") +
            (arrangePlacement === "inline" ? " is-inline" : " is-above"),
          title: moveGrip ? dragMoveTitle(panelLabel) : undefined,
        },
        moveGrip,
        arrangeLabel,
        props.onToggleLock || props.onUngroup ? windowChrome : null,
        closeInArrangeOverlay ? closeBtn : null,
      )
    : null;

  const editHeaderStyle: Record<string, any> = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: headerPad,
    paddingRight: onClose && !hidden ? `${closeSize + 8}px` : "8px",
    marginBottom: "2px",
    background: hidden ? "rgba(30,30,30,0.92)" : "rgba(40,40,20,0.92)",
    border: hidden ? "1px solid #666" : "1px solid #886",
    cursor: "grab",
    userSelect: "none",
    fontSize: headerFont,
    color: hidden ? "#bbb" : "#ffe08a",
    whiteSpace: "nowrap",
    touchAction: "none",
    minHeight: touchish ? "40px" : undefined,
    pointerEvents: "auto",
  };

  const editHeader = !editing
    ? arrangeOverlay
    : editChrome === "grip"
      ? e(
          "div",
          {
            className: "comm-pos-edit-grip-row",
            style: {
              display: "flex",
              alignItems: "stretch",
              gap: 4,
              marginBottom: "2px",
            },
          },
          moveGrip,
          windowChrome,
        )
      : editChrome === "anchors"
        ? e(
            "div",
            {
              className: "comm-pos-edit-header is-anchors-only",
              title: dragMoveTitle(panelLabel),
              "aria-label": dragMoveTitle(panelLabel),
              style: {
                ...editHeaderStyle,
                justifyContent: "space-between",
                paddingTop: touchish ? "4px" : "2px",
                paddingBottom: touchish ? "4px" : "2px",
              },
              onPointerDown,
              onPointerMove,
              onPointerUp,
              onPointerCancel: onPointerUp,
            },
            e(
              "span",
              {
                className: "comm-pos-edit-label",
                style: {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 0,
                  flex: 1,
                },
              },
              `${panelLabel}${hidden ? " (hidden)" : ""}`,
            ),
            windowChrome,
            anchorPad,
          )
        : e(
            "div",
            {
              className: "comm-pos-edit-header",
              title: dragMoveTitle(panelLabel),
              "aria-label": dragMoveTitle(panelLabel),
              style: editHeaderStyle,
              onPointerDown,
              onPointerMove,
              onPointerUp,
              onPointerCancel: onPointerUp,
            },
            e(
              "span",
              {
                className: "comm-pos-edit-label",
                style: {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 0,
                  flex: 1,
                },
              },
              `${panelLabel}${hidden ? " (hidden)" : ""}`,
            ),
            windowChrome,
            hidden && onShow
              ? e(
                  "button",
                  {
                    type: "button",
                    onClick: (ev: any) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      onShow();
                    },
                    onPointerDown: (ev: any) => ev.stopPropagation(),
                    style: {
                      cursor: "pointer",
                      fontSize: touchish ? "14px" : "12px",
                      padding: touchish ? "6px 12px" : "2px 8px",
                      minHeight: touchish ? "36px" : undefined,
                      border: "1px solid #7a7",
                      background: "#1a2a1a",
                      color: "#9e9",
                    },
                  },
                  "Show",
                )
              : null,
            anchorPad,
          );

  const opacityRow =
    editing && props.onOpacityChange && !hidden
      ? e(
          "div",
          {
            className: "comm-pos-opacity-row",
            style: {
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: touchish ? "4px 8px" : "2px 6px",
              marginBottom: "2px",
              background: "rgba(20,20,24,0.92)",
              border: "1px solid #555",
              color: "#bbb",
              fontSize: touchish ? "13px" : TYPE.secondaryMin,
              pointerEvents: "auto",
              flexShrink: 0,
              minWidth: 0,
            },
            onPointerDown: (ev: any) => ev.stopPropagation(),
          },
          e(
            "span",
            {
              style: {
                flexShrink: 0,
                color: "#999",
                minWidth: touchish ? "52px" : "44px",
              },
            },
            `${Math.round(opacity * 100)}%`,
          ),
          e("input", {
            type: "range",
            min: 25,
            max: 100,
            step: 5,
            value: Math.round(opacity * 100),
            title: "Panel opacity",
            "aria-label": "Panel opacity",
            style: {
              flex: 1,
              minWidth: 0,
              margin: 0,
              cursor: "pointer",
            },
            onChange: (ev: any) => {
              const pct = Number(ev.target.value);
              if (!Number.isFinite(pct)) return;
              props.onOpacityChange!(pct / 100);
            },
          }),
        )
      : null;

  const windowIdOverlay =
    props.showWindowIds &&
    typeof props.windowNumber === "number" &&
    props.windowNumber > 0
      ? e(
          "div",
          {
            className: "comm-pos-window-id",
            "aria-hidden": true,
          },
          String(props.windowNumber),
        )
      : null;

  const needsChromeHover =
    !!onClose ||
    showArrangeOverlay ||
    (!editing && (!!props.onToggleLock || !!props.onUngroup || movable));

  return {
    editHeader,
    opacityRow,
    closeBtn,
    closeInArrangeOverlay,
    windowIdOverlay,
    needsChromeHover,
  };
}
