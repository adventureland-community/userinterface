import { e } from "../../host/react";
import { PIXEL_TEXT } from "../../lib/typeScale";
import { getSettings, patchSettings } from "../../lib/settings";
import {
  BAR_MODE_CYCLE,
  barModeIndex,
  DISPLAY_TREE,
} from "../../meters/meterCatalog";
import type { MeterBookmark, MeterInstance, MeterQuery } from "../../meters/meterTypes";
import {
  cooltipStyle,
  type MeterCooltipAnchor,
  type MeterCooltipItem,
  type MeterCooltipKind,
} from "./meterCooltipMenu";
import {
  cooltipItemNode,
  modeLabel,
  presentationFor,
  rootQuery,
} from "./meterShellHelpers";

export type MeterShellCooltipCtx = {
  tip: {
    kind: MeterCooltipKind;
    anchor: MeterCooltipAnchor;
    bookmarkSlot?: number;
  } | null;
  bmDrag: number | null;
  setBmDrag: (v: number | null) => void;
  bmDrop: number | null;
  setBmDrop: (v: number | null) => void;
  finishBookmarkDrag: () => void;
  applyBookmark: (bm: MeterBookmark) => void;
  closeTip: () => void;
  instance: MeterInstance;
  openTip: (
    kind: MeterCooltipKind,
    el: HTMLElement,
    opts?: { pin?: boolean; bookmarkSlot?: number },
  ) => void;
  clearTipClose: () => void;
  scheduleTipClose: () => void;
  setOptionsOpen: (open: boolean) => void;
  saveBookmarkAtSlot: (
    slotIndex: number,
    d: { label: string; query: MeterQuery },
  ) => void;
  onPatchInstance: (partial: Partial<MeterInstance>) => void;
  tipItems: () => MeterCooltipItem[];
};

export function renderMeterShellCooltip(ctx: MeterShellCooltipCtx): any {
  const {
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
  } = ctx;

    if (!tip) return null;
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
                  const next = (getSettings().meterBookmarks || []).slice();
                  next[i] = {
                    id: bm.id,
                    label: modeLabel(rootQuery(instance), instance.label),
                    query: { ...rootQuery(instance) },
                    presentation: presentationFor(instance),
                    partyFocus: instance.partyFocus,
                    selectedset: instance.selectedset,
                  };
                  patchSettings({ meterBookmarks: next });
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
                  saveBookmarkAtSlot(slotIndex, d);
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

    const items = tipItems();
    const nodes: any[] = [];
    let startIdx = 0;
    if (
      tip.kind === "seg" &&
      items.length > 0 &&
      items[0].muted &&
      items[0].label.includes("·")
    ) {
      nodes.push(
        e("div", { className: "ecu-meter-cooltip-sec" }, items[0].label),
      );
      nodes.push(e("div", { className: "ecu-meter-cooltip-div" }));
      startIdx = 1;
    }
    for (let i = startIdx; i < items.length; i++) {
      const it = items[i];
      if (
        tip.kind === "report" &&
        it.label.startsWith("Recent: ") &&
        (i === 0 || !items[i - 1].label.startsWith("Recent: "))
      ) {
        nodes.push(e("div", { className: "ecu-meter-cooltip-sec" }, "Recent"));
      }
      if (
        tip.kind === "report" &&
        it.label === "Copy report" &&
        (i === 0 || !items[i - 1].label.startsWith("Recent: "))
      ) {
        nodes.push(e("div", { className: "ecu-meter-cooltip-div" }));
      }
      nodes.push(
        cooltipItemNode({
          ...it,
          label: it.label.startsWith("Recent: ") ? it.label.slice(8) : it.label,
        }),
      );
    }
    return e(
      "div",
      {
        className: "ecu-meter-cooltip",
        style: {
          ...cooltipStyle(tip.anchor, {
            minWidth: tip.kind === "report" || tip.kind === "reset" ? 188 : 168,
          }),
          ...PIXEL_TEXT,
        },
        onMouseEnter: () => clearTipClose(),
        onMouseLeave: () => scheduleTipClose(),
      },
      ...nodes,
    );
}
