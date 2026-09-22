import { getReact, e } from "../../host/react";
import type { EntityLike, SlotLike } from "../../host/globals";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import { itemContainer } from "../../host/icons";
import {
  itemInstanceLabel,
  itemSkin,
  stampNativeItemTitle,
} from "../../lib/gameIcon";
import { GEAR_SLOT_SIZE } from "../chrome/gearSlotCell";
import { ItemInstance, ensureItemInstanceBadgeCss } from "../chrome/ItemInstance";
import { TRADE_SLOT_CELL } from "../../lib/frameSizes";
import { showGearSlotContextMenu } from "../gear/gearSlotContextMenu";
import { handleBagDragOverGearSlot, handleBagDropOnTradeSlot } from "../gear/gearSlotDragDrop";
import {
  canAffordListing,
  findBagMatchForBuyOrder,
  formatGiveawayTimeLeft,
  formatTradeGold,
  isGiveawayListing,
  isInTradeRange,
  isJoinedGiveaway,
} from "../../lib/tradeHelpers";
import { writeTradeDragPayload } from "../bag/tradeDragPayload";
import { handleTradeSlotClick } from "./tradeSlotActions";

const TRADE_SHADE = { shade: "shade_gold", s_op: 0.2 };
const EMPTY_BCOLOR = "#292929";

/** Suppress click after HTML5 drag from a trade listing cell. */
let tradeListingDragActive = false;

function wrapContainerHtml(
  html: string,
  title?: string,
  options?: { stripNativeDrag?: boolean },
): any {
  return e("div", {
    style: {
      display: "inline-block",
      lineHeight: 0,
      fontSize: 0,
      pointerEvents: "auto",
    },
    dangerouslySetInnerHTML: { __html: html },
    ref: (node: HTMLElement | null) => {
      if (!node) return;
      const root = node.firstElementChild as HTMLElement | null;
      if (!root) return;
      root.style.margin = "0";
      root.removeAttribute("onmousedown");
      root.removeAttribute("ontouchstart");
      root.removeAttribute("onclick");
      if (options?.stripNativeDrag) {
        root.removeAttribute("draggable");
        root.removeAttribute("ondragstart");
        root.removeAttribute("ondrop");
        root.removeAttribute("ondragover");
      }
      const tip = title || root.getAttribute("title") || "";
      if (tip) stampNativeItemTitle(node, tip);
    },
  });
}

export type TradeSlotCellProps = {
  entity: EntityLike;
  observing?: EntityLike | null;
  slotName: string;
  slot: SlotLike | null | undefined;
  gearEditable?: boolean;
  allSlots?: Record<string, SlotLike | null | undefined>;
  /** Icon pixel size (default GEAR_SLOT_SIZE). Dense stand grids use ~34. */
  iconSize?: number;
  /** Fill CSS grid cell instead of fixed TRADE_SLOT_CELL width (Market stand). */
  fluid?: boolean;
  /** Selected / focus chrome (Market stand). */
  selected?: boolean;
  /**
   * Pack-mode free-slot stack count (empty cell only). Shown as a qty badge
   * on the empty stand icon so you can see how many slots are still free.
   */
  emptyQty?: number;
  /**
   * When set, replaces default buy / wishlist / item-info click handling.
   * Market You stand uses this so primary click focuses the item instead of
   * opening the stock tip (which felt like a click-through).
   */
  onSlotClick?: (ev: any) => void;
};

export function TradeSlotCell(props: TradeSlotCellProps): any {
  const React = getReact();
  ensureItemInstanceBadgeCss();
  const [bagDropHover, setBagDropHover] = React.useState(false);
  const {
    entity,
    observing,
    slotName,
    slot,
    gearEditable,
    allSlots,
    iconSize,
    fluid,
    selected,
    emptyQty,
    onSlotClick,
  } = props;
  const obs = observing || window.observing;
  const filled = !!(slot && slot.name);
  const foreign = !gearEditable;
  const editable = !!gearEditable;
  const customClick = typeof onSlotClick === "function";
  const inRange = !foreign || isInTradeRange(entity, obs);
  const bagMatch =
    foreign && filled && slot?.b
      ? findBagMatchForBuyOrder(slot, obs?.items)
      : null;
  const canBuy =
    foreign && filled && slot && !slot.b && !isGiveawayListing(slot) && inRange;
  const canFulfill = foreign && filled && !!slot?.b && !!bagMatch && inRange;
  const canJoinGiveaway =
    foreign &&
    filled &&
    isGiveawayListing(slot) &&
    !isJoinedGiveaway(slot, obs) &&
    inRange;
  const canAfford =
    canBuy &&
    slot &&
    (obs?.gold == null ||
      canAffordListing(slot, slot.q && slot.q > 0 ? slot.q : 1, obs.gold));
  const disabled =
    foreign && filled && !canBuy && !canFulfill && !canJoinGiveaway;

  const size =
    iconSize != null && Number.isFinite(iconSize) && iconSize > 0
      ? iconSize
      : GEAR_SLOT_SIZE;
  const emptyPx = size + 6;
  const cellW = fluid ? undefined : TRADE_SLOT_CELL;

  const skin =
    (slot && slot.skin) || (slot && slot.name ? itemSkin(slot.name) : undefined);
  let content: any = null;

  if (slot && slot.name) {
    content = e(ItemInstance, {
      name: slot.name,
      skin,
      size,
      level: typeof slot.level === "number" ? slot.level : undefined,
      q: typeof slot.q === "number" ? slot.q : undefined,
      p: slot.p != null && String(slot.p) !== "" ? String(slot.p) : undefined,
      title: itemInstanceLabel(slot.name, { p: slot.p, level: slot.level }),
    });
  } else {
    // Same stock empty chrome as TradeGrid — overlay "+" for Market fluid stand.
    let html = "";
    try {
      html =
        itemContainer({
          size,
          shade: TRADE_SHADE.shade,
          s_op: TRADE_SHADE.s_op,
          slot: slotName,
          bcolor: EMPTY_BCOLOR,
          draggable: false,
        }) || "";
    } catch {
      html = "";
    }
    const frame = html
      ? wrapContainerHtml(html)
      : e("div", {
          className: "comm-trade-slot-empty",
          style: {
            width: `${emptyPx}px`,
            height: `${emptyPx}px`,
            background: "#000",
            border: `2px solid ${EMPTY_BCOLOR}`,
            boxSizing: "border-box",
          },
          title: slotName,
        });
    content =
      fluid || iconSize != null
        ? e(
            "div",
            {
              className: "comm-trade-slot-emptyWrap",
              style: {
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: emptyPx,
                height: emptyPx,
                lineHeight: 0,
                boxSizing: "border-box",
              },
            },
            frame,
            e(
              "span",
              {
                className: "comm-trade-slot-emptyPlus",
                style: {
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#555",
                  fontSize: size <= 34 ? 14 : 18,
                  lineHeight: 1,
                  pointerEvents: "none",
                  userSelect: "none",
                },
                "aria-hidden": true,
              },
              "+",
            ),
            emptyQty != null && emptyQty > 0
              ? e(
                  "span",
                  {
                    className: "ecu-item-badge ecu-item-badge--qty",
                    title:
                      emptyQty === 1
                        ? "1 free slot"
                        : emptyQty + " free slots",
                  },
                  String(emptyQty),
                )
              : null,
          )
        : frame;
  }

  const badge = filled
    ? slot!.b
      ? "B"
      : isGiveawayListing(slot)
        ? "G"
        : "S"
    : null;
  const priceLabel = slot?.price != null ? formatTradeGold(slot.price) : null;

  const tipParts: string[] = [];
  if (filled && slot?.name) {
    tipParts.push(itemInstanceLabel(slot.name, { p: slot.p, level: slot.level }));
    if (priceLabel) {
      tipParts.push(
        isGiveawayListing(slot)
          ? "Giveaway"
          : `${slot.b ? "Buy" : "Sell"}: ${priceLabel}g`,
      );
    } else if (isGiveawayListing(slot)) {
      tipParts.push("Giveaway");
    }
    if (isGiveawayListing(slot) && typeof slot.giveaway === "number") {
      const left = formatGiveawayTimeLeft(slot.giveaway);
      if (left) tipParts.push(left + " left");
    }
    if (foreign && !inRange) tipParts.push("(too far)");
    if (canFulfill) tipParts.push("Click to sell");
    else if (slot.b && bagMatch) tipParts.push("Buy order — matching item in bag");
    else if (slot.b) tipParts.push("Buy order — no match in bag");
    else if (canBuy && canAfford) tipParts.push("Click to buy");
    else if (canJoinGiveaway) tipParts.push("Click to join giveaway");
    else if (disabled) tipParts.push("(unavailable)");
    if (editable) tipParts.push("Drag to bag to delist");
    if (customClick) tipParts.push("Click: focus in Market · Shift+click: item info");
    else tipParts.push("Shift+click: item info");
  } else if (editable) {
    if (emptyQty != null && emptyQty > 0) {
      tipParts.push(
        emptyQty === 1 ? "1 free slot" : emptyQty + " free slots",
      );
    }
    tipParts.push(
      customClick
        ? "Drag bag item to list · Shift+drag: giveaway"
        : "Click: wishlist · drag bag item to list · Shift+drag: giveaway",
    );
  }

  return e(
    "div",
    {
      key: slotName,
      className:
        "comm-trade-slot" +
        (filled ? " is-filled" : "") +
        (fluid ? " is-fluid" : "") +
        (selected ? " is-on" : "") +
        (bagDropHover ? " is-bag-drop-target" : "") +
        (disabled ? " is-disabled" : ""),
      "data-slot": slotName,
      title: tipParts.join(" · "),
      draggable: editable && filled ? true : undefined,
      onDragStart:
        editable && filled
          ? (ev: DragEvent) => {
              if (!ev.dataTransfer) return;
              tradeListingDragActive = true;
              writeTradeDragPayload(ev.dataTransfer, slotName);
              ev.stopPropagation();
            }
          : undefined,
      onDragEnd:
        editable && filled
          ? () => {
              window.setTimeout(() => {
                tradeListingDragActive = false;
              }, 0);
            }
          : undefined,
      onPointerDown:
        customClick || editable
          ? (ev: any) => {
              if (ev && typeof ev.stopPropagation === "function") {
                ev.stopPropagation();
              }
            }
          : undefined,
      onClick:
        customClick
          ? (ev: any) => {
              if (filled && tradeListingDragActive) return;
              if (ev && typeof ev.preventDefault === "function") {
                ev.preventDefault();
              }
              if (ev && typeof ev.stopPropagation === "function") {
                ev.stopPropagation();
              }
              onSlotClick!(ev);
            }
          : editable
            ? (ev: any) => {
                if (editable && filled && tradeListingDragActive) return;
                handleTradeSlotClick(
                  ev,
                  entity,
                  slotName,
                  slot,
                  !!gearEditable,
                  obs,
                );
              }
            : undefined,
      onDragOver: editable
        ? (ev: any) => {
            setBagDropHover(
              handleBagDragOverGearSlot(ev, slotName, allSlots || null),
            );
          }
        : undefined,
      onDragLeave: editable ? () => setBagDropHover(false) : undefined,
      onDrop: editable
        ? (ev: any) => {
            setBagDropHover(false);
            handleBagDropOnTradeSlot(ev, slotName, allSlots || null);
          }
        : undefined,
      onContextMenu: (ev: any) => {
        if (ev && ev.shiftKey) return;
        if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
        if (ev && typeof ev.stopPropagation === "function")
          ev.stopPropagation();
        showGearSlotContextMenu(
          ev.clientX ?? 0,
          ev.clientY ?? 0,
          slotName,
          filled,
          slot,
          { entity, gearEditable },
        );
      },
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1px",
        position: "relative",
        width: fluid ? "100%" : `${cellW}px`,
        maxWidth: fluid ? "100%" : `${cellW}px`,
        minWidth: fluid ? 0 : undefined,
        flex: fluid ? "1 1 0" : `0 0 ${cellW}px`,
        boxSizing: "border-box",
        opacity: disabled ? 0.45 : 1,
        cursor: customClick || editable || filled ? "pointer" : "default",
        pointerEvents: "auto",
      },
    },
    e(
      "div",
      {
        className: "comm-trade-slot-art",
        style: {
          position: "relative",
          lineHeight: 0,
          margin: fluid ? "0 auto" : undefined,
          boxShadow: bagDropHover ? "0 0 0 2px #6ab04c" : undefined,
        },
      },
      content,
      badge
        ? e(
            "div",
            {
              className:
                "comm-trade-slot-badge" +
                (badge === "B" ? " is-buy" : badge === "G" ? " is-give" : ""),
              style: {
                position: "absolute",
                top: "-2px",
                left: "-2px",
                minWidth: "14px",
                height: "14px",
                padding: "0 3px",
                boxSizing: "border-box",
                background:
                  badge === "B"
                    ? "#1a3a4a"
                    : badge === "G"
                      ? "#3a1a4a"
                      : "#3a2a10",
                border:
                  badge === "B"
                    ? "1px solid #8fd4ff"
                    : badge === "G"
                      ? "1px solid #c98fff"
                      : "1px solid #ffd700",
                color: "#fff",
                fontSize: TYPE.microMin,
                lineHeight: "12px",
                textAlign: "center",
                zIndex: 1,
                ...PIXEL_TEXT,
                pointerEvents: "none",
              },
            },
            badge,
          )
        : null,
    ),
    priceLabel
      ? e(
          "div",
          {
            className: "comm-trade-slot-price",
            style: {
              fontSize: size <= 34 ? 10 : TYPE.microMin,
              color: slot!.b ? "#8fd4ff" : "#ffd700",
              width: "100%",
              maxWidth: fluid ? "100%" : `${cellW}px`,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "center",
              minHeight: "14px",
              fontVariantNumeric: "tabular-nums",
              ...PIXEL_TEXT,
            },
            title: priceLabel,
          },
          priceLabel,
        )
      : iconSize != null
        ? e(
            "div",
            {
              className: "comm-trade-slot-price is-empty",
              style: {
                width: "100%",
                maxWidth: fluid ? "100%" : `${cellW}px`,
                minHeight: "14px",
                fontSize: size <= 34 ? 10 : TYPE.microMin,
                visibility: "hidden",
              },
              "aria-hidden": true,
            },
            "0",
          )
        : null,
  );
}
