import { unequipCommand } from "../../host/gearCommands";
import { isObservedSelf } from "../../host/gearObserved";
import type { EntityLike, SlotLike } from "../../host/globals";
import {
  joinGiveawayCommand,
  tradeFulfillCommand,
  tradePurchaseCommand,
  tradeRepriceCommand,
} from "../../host/tradeCommands";
import { formatGearSlotLabel } from "../../lib/gearSlots";
import {
  formatTradeSlotLabel,
  isTradeSlot,
} from "../../lib/tradeSlots";
import { canRepriceTradeSlot } from "../../lib/standTradeSlotMemory";
import { formatFreeInventorySpace } from "../../lib/inventorySpace";
import {
  canAffordListing,
  confirmTradeFulfill,
  confirmTradePurchase,
  findBagMatchForBuyOrder,
  formatTradeGold,
  isGiveawayListing,
  isInTradeRange,
  isJoinedGiveaway,
} from "../../lib/tradeHelpers";
import { showTradeWishlistPicker } from "./tradeWishlistPicker";
import { showTradePriceDialog, showTradeQuantityDialog } from "../trade/tradePromptDialog";
import { ensureBagItemContextMenuCss } from "../bag/bagItemContextMenuCss";

export type GearSlotMenuAction = {
  id: string;
  label: string;
  title?: string;
  separatorBefore?: boolean;
  disabled?: boolean;
  run: () => void;
};

let ctxEl: HTMLDivElement | null = null;
let ctxKeyHandler: ((ev: KeyboardEvent) => void) | null = null;
let ctxDocHandler: ((ev: MouseEvent) => void) | null = null;

function hideCtx(): void {
  if (ctxKeyHandler) {
    document.removeEventListener("keydown", ctxKeyHandler, true);
    ctxKeyHandler = null;
  }
  if (ctxDocHandler) {
    document.removeEventListener("mousedown", ctxDocHandler, true);
    ctxDocHandler = null;
  }
  if (ctxEl) {
    ctxEl.remove();
    ctxEl = null;
  }
}

function clampMenuPosition(
  el: HTMLElement,
  clientX: number,
  clientY: number,
): void {
  const pad = 8;
  const w = el.offsetWidth || 200;
  const h = el.offsetHeight || 80;
  const maxX = Math.max(pad, window.innerWidth - w - pad);
  const maxY = Math.max(pad, window.innerHeight - h - pad);
  el.style.left = Math.min(Math.max(pad, clientX), maxX) + "px";
  el.style.top = Math.min(Math.max(pad, clientY), maxY) + "px";
}

function buildTradeSlotActions(
  slotName: string,
  hasItem: boolean,
  slot?: SlotLike | null,
  menuX?: number,
  menuY?: number,
  entity?: EntityLike | null,
): GearSlotMenuAction[] {
  const actions: GearSlotMenuAction[] = [];
  const liveSlots = entity?.slots;
  const standOpen = !!entity?.stand;
  if (hasItem) {
    actions.push({
      id: "trade-delist",
      label: `Delist ${formatTradeSlotLabel(slotName)}`,
      title: "Runs unequip(slot) — returns item to inventory",
      run: () => {
        unequipCommand(slotName, { slotListing: slot });
      },
    });
    const repriceOk = canRepriceTradeSlot(
      slotName,
      slot,
      liveSlots,
      standOpen,
    );
    actions.push({
      id: "trade-reprice",
      label: repriceOk ? "Change price…" : "Change price (open stand)",
      title: repriceOk
        ? "Delist and relist at a new price (one o:command)"
        : "Stand must be open to reprice trade5+ listings",
      separatorBefore: true,
      disabled: !repriceOk,
      run: () => {
        if (!repriceOk || !slot?.name) return;
        void (async () => {
          const obs = window.observing;
          const price = await showTradePriceDialog({
            mode: "reprice",
            itemName: slot.name,
            level: slot.level,
            p: slot.p,
            slots: obs?.slots,
            currentPrice: slot.price,
          });
          if (price == null) return;
          tradeRepriceCommand(slotName, price, slot);
        })();
      },    });
    if (slot?.price != null) {
      actions.push({
        id: "trade-price",
        label: `Listed at ${formatTradeGold(slot.price)} gold`,
        disabled: true,
        run: () => {},
      });
    }
  } else {
    actions.push({
      id: "trade-wishlist",
      label: "Wishlist catalog item…",
      title: "Pick an item from G.items and wishlist() on this slot",
      separatorBefore: true,
      run: () => {
        const x = menuX != null ? menuX : window.innerWidth / 2;
        const y = menuY != null ? menuY : window.innerHeight / 2;
        showTradeWishlistPicker(slotName, x, y);
      },
    });
    actions.push({
      id: "trade-list-hint",
      label: "List from bag (drag item here or bag menu)",
      disabled: true,
      run: () => {},
    });
  }
  return actions;
}

function buildForeignTradeActions(
  entity: EntityLike,
  slotName: string,
  slot: SlotLike,
): GearSlotMenuAction[] {
  const targetId = entity.id != null ? String(entity.id) : "";
  const rid = slot.rid != null ? String(slot.rid) : "";
  const name = slot.name != null ? String(slot.name) : "";
  if (!targetId || !rid || !name) return [];

  const obs = window.observing;
  const inRange = isInTradeRange(entity, obs);
  const priceLabel = slot.price != null ? `${formatTradeGold(slot.price)}g` : "?";
  const maxQ = slot.q != null && slot.q > 0 ? slot.q : undefined;
  const receiverBag = formatFreeInventorySpace(entity);

  if (isGiveawayListing(slot)) {
    if (isJoinedGiveaway(slot, obs)) {
      return [
        {
          id: "trade-giveaway-joined",
          label: "Giveaway — already joined",
          disabled: true,
          run: () => {},
        },
      ];
    }
    return [
      {
        id: "trade-giveaway-join",
        label: `Join giveaway — ${name}`,
        title: inRange
          ? "join_giveaway via o:command"
          : "Too far — move closer first",
        disabled: !inRange,
        run: () => {
          if (!inRange) {
            window.alert("Too far away — move your watched character closer.");
            return;
          }
          joinGiveawayCommand(targetId, slotName, rid);
        },
      },
    ];
  }

  if (slot.price == null) return [];

  if (slot.b) {
    const match = findBagMatchForBuyOrder(slot, obs?.items);
    const bagHint = receiverBag ? ` · their bag ${receiverBag}` : "";
    return [
      {
        id: "trade-fulfill",
        label: match
          ? `Sell to fulfill — ${name} (${priceLabel})…${bagHint}`
          : `Buy order — ${name} (${priceLabel}) — no match in bag`,
        title: match
          ? receiverBag
            ? `trade_sell · buyer bag ${receiverBag}`
            : "trade_sell via o:command on your watched character"
          : "No matching item in your bag",
        disabled: !match || !inRange,
        run: () => {
          if (!match) return;
          if (!inRange) {
            window.alert("Too far away — move your watched character closer.");
            return;
          }
          const cap =
            maxQ != null ? Math.min(maxQ, match.q) : match.q;
          void (async () => {
            const q = await showTradeQuantityDialog({
              itemName: name,
              maxQ: cap,
            });
            if (q == null) return;
            if (!confirmTradeFulfill(name, slot.price!, q)) return;
            tradeFulfillCommand(targetId, slotName, rid, q);
          })();
        },
      },
    ];
  }

  return [
    {
      id: "trade-buy",
      label: `Buy ${name} (${priceLabel})…`,
      title: inRange
        ? "trade_buy via o:command on your watched character"
        : "Too far — move closer first",
      disabled: !inRange,
      run: () => {
        if (!inRange) {
          window.alert("Too far away — move your watched character closer.");
          return;
        }
        void (async () => {
          const cap = maxQ != null && maxQ > 0 ? maxQ : 9999;
          const q = await showTradeQuantityDialog({
            itemName: name,
            maxQ: cap,
          });
          if (q == null) return;
          if (
            obs?.gold != null &&
            !canAffordListing(slot, q, obs.gold)
          ) {
            window.alert(
              `Not enough gold — need ${formatTradeGold(slot.price! * q)}, have ${formatTradeGold(obs.gold)}.`,
            );
            return;
          }
          if (!confirmTradePurchase(name, slot.price!, q)) return;
          tradePurchaseCommand(targetId, slotName, rid, q);
        })();
      },
    },
  ];
}

function buildGearSlotActions(
  slotName: string,
  hasItem: boolean,
): GearSlotMenuAction[] {
  const actions: GearSlotMenuAction[] = [];
  if (hasItem) {
    if (slotName !== "elixir") {
      actions.push({
        id: "unequip",
        label: `Unequip ${formatGearSlotLabel(slotName)}`,
        title: "Runs unequip(slot) on the observed character",
        run: () => {
          unequipCommand(slotName);
        },
      });
    } else {
      actions.push({
        id: "unequip-elixir",
        label: "Elixir cannot be unequipped",
        disabled: true,
        run: () => {},
      });
    }
  } else {
    actions.push({
      id: "equip-hint",
      label: "Equip from bag (right-click inventory item)",
      disabled: true,
      run: () => {},
    });
  }
  return actions;
}

export type GearSlotMenuOptions = {
  entity?: EntityLike;
  gearEditable?: boolean;
};

export function showGearSlotContextMenu(
  clientX: number,
  clientY: number,
  slotName: string,
  hasItem: boolean,
  slot?: SlotLike | null,
  options?: GearSlotMenuOptions,
): void {
  hideCtx();
  ensureBagItemContextMenuCss();

  const entity = options?.entity;
  const gearEditable = !!options?.gearEditable;
  let actions: GearSlotMenuAction[] = [];

  if (isTradeSlot(slotName)) {
    if (gearEditable) {
      actions = buildTradeSlotActions(
        slotName,
        hasItem,
        slot,
        clientX,
        clientY,
        entity,
      );
    } else if (
      entity &&
      hasItem &&
      slot &&
      !isObservedSelf(entity)
    ) {
      actions = buildForeignTradeActions(entity, slotName, slot);
    }
  } else if (gearEditable) {
    actions = buildGearSlotActions(slotName, hasItem);
  }

  if (!actions.length) return;

  const el = document.createElement("div");
  el.className = "comm-bag-ctx";
  el.setAttribute("role", "menu");
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (action.separatorBefore) {
      const sep = document.createElement("div");
      sep.className = "comm-bag-ctx__sep";
      sep.setAttribute("role", "separator");
      el.appendChild(sep);
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "comm-bag-ctx__item";
    btn.setAttribute("role", "menuitem");
    btn.textContent = action.label;
    if (action.title) btn.title = action.title;
    if (action.disabled) {
      btn.disabled = true;
      btn.className += " is-disabled";
    } else {
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        hideCtx();
        action.run();
      });
    }
    el.appendChild(btn);
  }
  document.body.appendChild(el);
  ctxEl = el;
  clampMenuPosition(el, clientX, clientY);

  ctxKeyHandler = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      hideCtx();
    }
  };
  ctxDocHandler = (ev: MouseEvent) => {
    if (ctxEl && ev.target instanceof Node && ctxEl.contains(ev.target)) {
      return;
    }
    hideCtx();
  };
  document.addEventListener("keydown", ctxKeyHandler, true);
  window.setTimeout(() => {
    if (ctxDocHandler) {
      document.addEventListener("mousedown", ctxDocHandler, true);
    }
  }, 0);
}

export function hideGearSlotContextMenu(): void {
  hideCtx();
}
