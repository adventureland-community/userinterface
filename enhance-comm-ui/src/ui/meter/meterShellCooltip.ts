/**
 * Cooltip overlays for MeterPanelShell (bookmarks / switch / item menus).
 */

import { e, getReact } from "../../host/react";
import { PIXEL_TEXT } from "../../lib/typeScale";
import { getSettings } from "../../lib/settings";
import {
  applyMeterBookmarkPatch,
  bookmarkFromInstance,
  replaceMeterBookmarkAtSlot,
  reorderMeterBookmarks,
  saveMeterBookmarkAtSlot,
} from "../../meters/meterBookmarks";
import type { PartyFocus, PartyFocusOption } from "../../lib/settingsFocus";
import type {
  MeterBookmark,
  MeterInstance,
  MeterQuery,
  RankedRow,
  SegmentRef,
} from "../../meters/meterTypes";
import {
  BAR_MODE_CYCLE,
  barModeIndex,
  DISPLAY_TREE,
} from "../../meters/meterCatalog";
import {
  cooltipStyle,
  type MeterCooltipItem,
  type MeterCooltipKind,
  type MeterCooltipMenu,
} from "./meterCooltipMenu";
import { meterHoverDetailNode } from "./meterHoverDetail";
import {
  cooltipItemNode,
  modeLabel,
  presentationFor,
  rootQuery,
} from "./meterShellHelpers";
import {
  meterShellTipItems,
  type MeterShellTipActions,
  type MeterShellTipItemsCtx,
} from "./meterShellTipItems";
import type { MeterShellTipState } from "./meterShellCooltipCtl";

export type MeterShellCooltipActions = MeterShellTipActions & {
  openTip: (
    kind: MeterCooltipKind,
    el: HTMLElement,
    opts?: { pin?: boolean; bookmarkSlot?: number },
  ) => void;
  clearTipClose: () => void;
  scheduleTipClose: () => void;
};

export type MeterShellCooltipCtx = {
  tip: MeterShellTipState | null;
  instance: MeterInstance;
  partyMenuOpts: PartyFocusOption[];
  partyFocus: PartyFocus;
  hasObserver: boolean;
  partyLabel: string;
  watchedName?: string;
  selectedset: SegmentRef;
  resolved: { outcome?: string } | null;
  isCurrentSeg: boolean;
  titleSeg: string;
  durSec: number;
  actorPickerRows: RankedRow[];
  metersHidden?: boolean;
  closedInstances?: MeterInstance[];
  bmDrag: number | null;
  setBmDrag: (v: number | null) => void;
  bmDrop: number | null;
  setBmDrop: (v: number | null) => void;
  actions: MeterShellCooltipActions;
};

function tipItemsCtx(ctx: MeterShellCooltipCtx): MeterShellTipItemsCtx {
  return {
    tip: ctx.tip,
    instance: ctx.instance,
    partyMenuOpts: ctx.partyMenuOpts,
    partyFocus: ctx.partyFocus,
    hasObserver: ctx.hasObserver,
    partyLabel: ctx.partyLabel,
    watchedName: ctx.watchedName,
    selectedset: ctx.selectedset,
    resolved: ctx.resolved,
    isCurrentSeg: ctx.isCurrentSeg,
    titleSeg: ctx.titleSeg,
    durSec: ctx.durSec,
    actorPickerRows: ctx.actorPickerRows,
    metersHidden: ctx.metersHidden,
    closedInstances: ctx.closedInstances,
    actions: ctx.actions,
  };
}

export function renderMeterShellCooltip(ctx: MeterShellCooltipCtx): any {
  const {
    tip,
    bmDrag,
    setBmDrag,
    bmDrop,
    setBmDrop,
    instance,
    actions,
  } = ctx;
  const {
    closeTip,
    openTip,
    clearTipClose,
    scheduleTipClose,
    setOptionsOpen,
    onPatchInstance,
  } = actions;

  if (!tip) return null;

  const finishBookmarkDrag = () => {
    if (bmDrag != null && bmDrop != null && bmDrag !== bmDrop) {
      reorderMeterBookmarks(bmDrag, bmDrop);
    }
    setBmDrag(null);
    setBmDrop(null);
  };

  const applyBookmark = (bm: MeterBookmark) => {
    onPatchInstance(applyMeterBookmarkPatch(bm));
  };

  const saveAtSlot = (
    slotIndex: number,
    d: { label: string; query: MeterQuery },
  ) => {
    saveMeterBookmarkAtSlot(
      slotIndex,
      bookmarkFromInstance(instance, d.label, d.query, "bars"),
    );
  };

  if (tip.kind === "bookmarks") {
    const bookmarks = getSettings().meterBookmarks || [];
    const slots: any[] = [];
    const slotCount = Math.max(6, bookmarks.length + 1);
    for (let i = 0; i < slotCount; i++) {
      const bm = bookmarks[i];
      const slotClass =
        "ecu-meter-bookmark-slot" +
        (bmDrag === i ? " is-dragging" : "") +
        (bmDrop === i && bmDrag != null && bmDrag !== i
          ? " is-drop-target"
          : "");
      if (bm) {
        slots.push(
          e(
            "button",
            {
              key: bm.id,
              type: "button",
              className: slotClass,
              title:
                "Drag to reorder · Left: apply · Right: replace with current display",
              onPointerDown: (ev: any) => {
                ev.preventDefault();
                setBmDrag(i);
                setBmDrop(i);
                try {
                  (ev.currentTarget as HTMLElement).setPointerCapture(
                    ev.pointerId,
                  );
                } catch (_e) {
                  /* ignore */
                }
              },
              onPointerEnter: () => {
                if (bmDrag != null) setBmDrop(i);
              },
              onPointerUp: () => finishBookmarkDrag(),
              onPointerCancel: () => finishBookmarkDrag(),
              onClick: (ev: any) => {
                if (bmDrag != null) return;
                ev.preventDefault();
                applyBookmark(bm);
                closeTip();
              },
              onContextMenu: (ev: any) => {
                ev.preventDefault();
                replaceMeterBookmarkAtSlot(
                  i,
                  instance,
                  modeLabel(rootQuery(instance), instance.label),
                  rootQuery(instance),
                  presentationFor(instance),
                );
                closeTip();
              },
            },
            bm.label,
          ),
        );
      } else {
        slots.push(
          e(
            "button",
            {
              key: `empty-${i}`,
              type: "button",
              className: slotClass + " is-empty",
              onPointerEnter: () => {
                if (bmDrag != null) setBmDrop(i);
              },
              onPointerUp: () => finishBookmarkDrag(),
              onClick: (ev: any) => {
                if (bmDrag != null) return;
                ev.preventDefault();
                openTip("bookmarkPick", ev.currentTarget as HTMLElement, {
                  pin: true,
                  bookmarkSlot: i,
                });
              },
            },
            "Select Display",
          ),
        );
      }
    }
    return e(
      "div",
      {
        className: "ecu-meter-bookmark-overlay",
        style: {
          ...cooltipStyle(tip.anchor, { cover: true }),
          ...PIXEL_TEXT,
        },
        onMouseEnter: () => clearTipClose(),
        onMouseLeave: () => scheduleTipClose(),
        onContextMenu: (ev: any) => {
          ev.preventDefault();
          closeTip();
        },
      },
      e(
        "div",
        { className: "ecu-meter-bookmark-hd" },
        e("span", { className: "ecu-meter-bookmark-hd-title" }, "Bookmark"),
        e(
          "button",
          {
            type: "button",
            className: "ecu-meter-bookmark-hd-btn",
            title: "Options",
            onClick: (ev: any) => {
              ev.stopPropagation();
              setOptionsOpen(true);
              closeTip();
            },
          },
          "⚙",
        ),
        e(
          "button",
          {
            type: "button",
            className: "ecu-meter-bookmark-hd-btn",
            title: "Close",
            onClick: (ev: any) => {
              ev.stopPropagation();
              closeTip();
            },
          },
          "×",
        ),
      ),
      e(
        "div",
        { className: "ecu-meter-bookmark-hint" },
        "Drag slots to reorder",
      ),
      e("div", { className: "ecu-meter-bookmark-grid" }, ...slots),
      e(
        "button",
        {
          type: "button",
          className: "ecu-meter-cooltip-item",
          onClick: () => closeTip(),
        },
        "Close",
      ),
    );
  }

  if (tip.kind === "bookmarkPick") {
    const slotIndex = tip.bookmarkSlot ?? 0;
    const cells: any[] = [];
    for (let g = 0; g < DISPLAY_TREE.length; g++) {
      const group = DISPLAY_TREE[g];
      cells.push(
        e(
          "div",
          { key: `bp-sec-${group.id}`, className: "ecu-meter-switch-sec" },
          group.label,
        ),
      );
      for (let c = 0; c < group.children.length; c++) {
        const d = group.children[c];
        cells.push(
          e(
            "button",
            {
              key: d.id,
              type: "button",
              className: "ecu-meter-switch-cell",
              onMouseDown: (ev: any) => {
                ev.preventDefault();
                ev.stopPropagation();
                saveAtSlot(slotIndex, d);
                closeTip();
              },
            },
            d.label,
          ),
        );
      }
    }
    return e(
      "div",
      {
        className: "ecu-meter-switch-overlay",
        style: {
          ...cooltipStyle(tip.anchor, { minWidth: 280, preferRight: true }),
          ...PIXEL_TEXT,
        },
        onMouseEnter: () => clearTipClose(),
        onMouseLeave: () => scheduleTipClose(),
      },
      e("div", { className: "ecu-meter-cooltip-sec" }, "Select Display"),
      e("div", { className: "ecu-meter-switch-grid" }, ...cells),
    );
  }

  if (tip.kind === "allDisplays") {
    const curIdx = barModeIndex(rootQuery(instance));
    const curId = curIdx >= 0 ? BAR_MODE_CYCLE[curIdx].id : "";
    const cells: any[] = [];
    for (let g = 0; g < DISPLAY_TREE.length; g++) {
      const group = DISPLAY_TREE[g];
      cells.push(
        e(
          "div",
          {
            key: `sec-${group.id}`,
            className: "ecu-meter-switch-sec",
          },
          group.label,
        ),
      );
      for (let c = 0; c < group.children.length; c++) {
        const d = group.children[c];
        cells.push(
          e(
            "button",
            {
              key: d.id,
              type: "button",
              className:
                "ecu-meter-switch-cell" +
                (d.id === curId ? " is-selected" : ""),
              onMouseDown: (ev: any) => {
                ev.preventDefault();
                ev.stopPropagation();
                onPatchInstance({
                  query: { ...d.query },
                  label: d.label,
                  presentation: "bars",
                });
                closeTip();
              },
              onClick: (ev: any) => {
                ev.preventDefault();
                ev.stopPropagation();
              },
            },
            d.label,
          ),
        );
      }
    }
    return e(
      "div",
      {
        className: "ecu-meter-switch-overlay",
        style: {
          ...cooltipStyle(tip.anchor, { minWidth: 280, preferRight: true }),
          ...PIXEL_TEXT,
        },
        onMouseEnter: () => clearTipClose(),
        onMouseLeave: () => scheduleTipClose(),
      },
      e(
        "div",
        { className: "ecu-meter-cooltip-sec" },
        "Switch · All displays",
      ),
      e("div", { className: "ecu-meter-switch-grid" }, ...cells),
    );
  }

  if (tip.kind === "display") {
    const curIdx = barModeIndex(rootQuery(instance));
    const curId = curIdx >= 0 ? BAR_MODE_CYCLE[curIdx].id : "";
    const nodes: any[] = [];
    for (let g = 0; g < DISPLAY_TREE.length; g++) {
      const group = DISPLAY_TREE[g];
      if (g > 0) nodes.push(e("div", { className: "ecu-meter-cooltip-div" }));
      nodes.push(
        e("div", { className: "ecu-meter-cooltip-sec" }, group.label),
      );
      for (let c = 0; c < group.children.length; c++) {
        const d = group.children[c];
        nodes.push(
          cooltipItemNode({
            label: d.label,
            selected: d.id === curId,
            onSelect: () => {
              onPatchInstance({
                query: { ...d.query },
                label: d.label,
                presentation: "bars",
              });
              closeTip();
            },
          }),
        );
      }
    }
    return e(
      "div",
      {
        className: "ecu-meter-cooltip",
        style: {
          ...cooltipStyle(tip.anchor, { minWidth: 168 }),
          ...PIXEL_TEXT,
        },
        onMouseEnter: () => clearTipClose(),
        onMouseLeave: () => scheduleTipClose(),
      },
      ...nodes,
    );
  }

  return e(MeterItemsCooltip, {
    menu: meterShellTipItems(tipItemsCtx(ctx)),
    panelStyle: {
      ...cooltipStyle(tip.anchor, {
        minWidth:
          tip.kind === "report" || tip.kind === "reset"
            ? 188
            : tip.kind === "seg"
              ? 228
              : 168,
      }),
      ...PIXEL_TEXT,
    },
    onEnter: () => clearTipClose(),
    onLeave: () => scheduleTipClose(),
  });
}

function hoverKeyOf(item: MeterCooltipItem): string {
  return item.itemKey || item.label;
}

function detailForHover(
  menu: MeterCooltipMenu,
  hoverKey: string | null,
): string | null {
  if (!hoverKey) return null;
  if (menu.header && hoverKeyOf(menu.header) === hoverKey) {
    return menu.header.detail || null;
  }
  for (let s = 0; s < menu.sections.length; s++) {
    const items = menu.sections[s].items;
    for (let i = 0; i < items.length; i++) {
      if (hoverKeyOf(items[i]) === hoverKey) return items[i].detail || null;
    }
  }
  return null;
}

/** Item cooltip with a pointer-events-none flyout (native `title` blinks on ticks). */
function MeterItemsCooltip(props: {
  menu: MeterCooltipMenu;
  panelStyle: Record<string, string | number>;
  onEnter: () => void;
  onLeave: () => void;
}): any {
  const React = getReact();
  const [hoverKey, setHoverKey] = React.useState(null as string | null);
  const { menu } = props;
  const onHoverDetail = (key: string, text: string | null) => {
    setHoverKey(text ? key : null);
  };
  const nodes: any[] = [];
  if (menu.header) {
    const head = menu.header;
    nodes.push(
      e(
        "div",
        {
          key: hoverKeyOf(head),
          className: "ecu-meter-cooltip-sec",
          onMouseEnter: () =>
            onHoverDetail(hoverKeyOf(head), head.detail || null),
        },
        head.label,
      ),
    );
    nodes.push(
      e("div", { key: "seg-head-div", className: "ecu-meter-cooltip-div" }),
    );
  }
  for (let s = 0; s < menu.sections.length; s++) {
    const sec = menu.sections[s];
    if (s > 0) {
      nodes.push(
        e("div", { key: `div-${s}`, className: "ecu-meter-cooltip-div" }),
      );
    }
    if (sec.title) {
      nodes.push(
        e(
          "div",
          { key: `sec-${s}`, className: "ecu-meter-cooltip-sec" },
          sec.title,
        ),
      );
    }
    for (let i = 0; i < sec.items.length; i++) {
      nodes.push(cooltipItemNode(sec.items[i], onHoverDetail));
    }
  }
  const detail = detailForHover(menu, hoverKey);
  const left = Number(props.panelStyle.left) || 0;
  const minW = Number(props.panelStyle.minWidth) || 168;
  const flip = left + minW + 272 > window.innerWidth - 8;
  return e(
    "div",
    {
      className: "ecu-meter-cooltip-wrap" + (flip ? " is-flip" : ""),
      style: props.panelStyle,
      onMouseEnter: props.onEnter,
      onMouseLeave: props.onLeave,
    },
    e("div", { className: "ecu-meter-cooltip" }, ...nodes),
    detail ? meterHoverDetailNode(detail) : null,
  );
}
