/**
 * Bag context menu — Exchange / Dismantle / Craft / Upgrade / Compound
 * (+ explicit bank withdraw for crafts). Bag stock only; travel when needed.
 */

import {
  registerBagMenuProvider,
  type BagMenuAction,
  type BagMenuContext,
} from "../ui/bag/bagItemContextMenu";
import {
  showCompoundDialog,
  showUpgradeDialog,
} from "../ui/bag/upgradeCompoundDialog";
import { canEditObservedBag } from "./gearObserved";
import {
  craftOfferNotReadySuffix,
  dismantleOfferForBagItem,
  dismantleUnavailableHint,
  exchangeOfferForBagItem,
  listCraftOffersForBagItem,
  type CraftFromBagOffer,
} from "../lib/bagStationActions";
import { itemDisplayName, itemInstanceHtml } from "../lib/gameIcon";
import {
  compoundOfferForBagItem,
  upgradeOfferForBagItem,
} from "../lib/bagUpgradeCompound";
import {
  autoCraftCommand,
  cachedBankAgg,
  compoundCommand,
  dismantleCommand,
  exchangeCommand,
  getG,
  observingBagItems,
  observingGold,
  upgradeCommand,
  withdrawCraftIngredientsCommand,
} from "./stationCommands";

function travelSuffix(access: {
  ok: boolean;
  hasComputer: boolean;
  inRange: boolean;
}): string {
  if (access.ok && access.hasComputer) return "";
  if (access.ok && access.inRange) return "";
  return " (travel)…";
}

function craftTitle(offer: CraftFromBagOffer): string {
  const parts: string[] = [];
  if (offer.cost > 0) parts.push(`${offer.cost} gold`);
  if (!offer.bagReady) {
    const miss: string[] = [];
    for (let i = 0; i < offer.ingredients.length; i++) {
      const ing = offer.ingredients[i];
      if (ing.missingFromBag > 0) {
        miss.push(
          `${ing.missingFromBag}× ${itemDisplayName(ing.name)}` +
            (ing.level != null && ing.level > 0 ? `+${ing.level}` : ""),
        );
      }
    }
    if (miss.length) parts.push("need in bag: " + miss.join(", "));
    else if (offer.cost > 0) parts.push("need gold");
  }
  if (!offer.access.ok && offer.access.reason) {
    parts.push(offer.access.reason);
  } else if (!offer.access.hasComputer && !offer.access.inRange) {
    parts.push("will smart_move to station first");
  } else if (offer.access.hasComputer) {
    parts.push("computer — any map");
  }
  parts.push("auto_craft on observed character");
  return parts.join(" · ");
}

function formatCraftGold(cost: number): string {
  if (!(cost > 0)) return "";
  if (cost >= 1_000_000) {
    const m = cost / 1_000_000;
    return m % 1 === 0 ? m + "M" : m.toFixed(1) + "M";
  }
  if (cost >= 1000) {
    const k = cost / 1000;
    return k % 1 === 0 ? k + "k" : k.toFixed(1) + "k";
  }
  return String(cost);
}

function craftRowText(
  offer: CraftFromBagOffer,
  canCraft: boolean,
  prefix?: string,
): string {
  let text =
    (prefix || "") +
    offer.outputName +
    (canCraft
      ? travelSuffix(offer.access)
      : craftOfferNotReadySuffix(offer));
  if (offer.cost > 0) text += " · " + formatCraftGold(offer.cost);
  return text;
}

function mountCraftRecipeLabel(
  host: HTMLElement,
  offer: CraftFromBagOffer,
  text: string,
): void {
  const row = document.createElement("div");
  row.className = "comm-bag-ctx__craft";
  const out = document.createElement("span");
  out.className = "comm-bag-ctx__craft-out";
  out.innerHTML = itemInstanceHtml(offer.output, { size: 22, bare: true });
  const body = document.createElement("div");
  body.className = "comm-bag-ctx__craft-body";
  const name = document.createElement("div");
  name.className = "comm-bag-ctx__craft-name";
  name.textContent = text;
  const ings = document.createElement("div");
  ings.className = "comm-bag-ctx__craft-ings";
  for (let i = 0; i < offer.ingredients.length; i++) {
    const ing = offer.ingredients[i];
    const chip = document.createElement("span");
    const have = ing.bagSlotHave >= ing.need;
    chip.className =
      "comm-bag-ctx__craft-ing " + (have ? "is-have" : "is-need");
    chip.innerHTML = itemInstanceHtml(ing.name, {
      size: 18,
      bare: true,
      level: ing.level,
    });
    const needLabel =
      itemDisplayName(ing.name) +
      (ing.level != null && ing.level > 0 ? `+${ing.level}` : "");
    chip.title = have
      ? `${needLabel} · have ${ing.bagSlotHave}/${ing.need}`
      : `${needLabel} · need ${ing.need} (bag ${ing.bagTotal}` +
        (ing.bankHave > 0 ? `, bank ${ing.bankHave}` : "") +
        ")";
    ings.appendChild(chip);
  }
  body.appendChild(name);
  if (offer.ingredients.length) body.appendChild(ings);
  row.appendChild(out);
  row.appendChild(body);
  host.appendChild(row);
}

function buildStationBagMenuActions(ctx: BagMenuContext): BagMenuAction[] {
  if (!canEditObservedBag()) return [];
  const G = getG();
  if (!G) return [];
  const bagItems = observingBagItems();
  const actions: BagMenuAction[] = [];
  let first = true;

  const exchange = exchangeOfferForBagItem(ctx.item, bagItems, G);
  if (exchange) {
    const canRun =
      exchange.enoughQty && !exchange.locked && (exchange.access.ok || !!exchange.station);
    let label = "Exchange" + travelSuffix(exchange.access);
    if (!exchange.enoughQty) {
      label = `Exchange (need ${exchange.e})`;
    } else if (exchange.locked) {
      label = "Exchange (locked)";
    }
    actions.push({
      id: "station-exchange",
      label,
      title: exchange.locked
        ? "Item is locked"
        : !exchange.enoughQty
          ? `Need ${exchange.e} in this stack`
          : exchange.access.ok
            ? exchange.access.hasComputer
              ? "exchange() via computer"
              : "exchange() at shrine"
            : exchange.access.reason || "Travel to exchange shrine, then exchange",
      separatorBefore: first,
      disabled: !canRun || exchange.locked || !exchange.enoughQty,
      run: () => {
        exchangeCommand(ctx.fp, exchange.station);
      },
    });
    first = false;
  }

  const upgrade = upgradeOfferForBagItem(
    ctx.item,
    ctx.fp.slot,
    bagItems,
    G,
  );
  if (upgrade) {
    const canOpen =
      !upgrade.locked &&
      !upgrade.maxLevel &&
      (upgrade.scrolls.length > 0 || upgrade.offerings.length > 0) &&
      (upgrade.access.ok || !!upgrade.station);
    let label = "Upgrade…" + travelSuffix(upgrade.access);
    if (upgrade.locked) label = "Upgrade (locked)";
    else if (upgrade.maxLevel) label = "Upgrade (max level)";
    else if (!upgrade.scrolls.length && !upgrade.offerings.length) {
      label = "Upgrade (need scroll in bag)";
    }
    actions.push({
      id: "station-upgrade",
      label,
      title: upgrade.locked
        ? "Item is locked"
        : upgrade.maxLevel
          ? "Already at max upgrade grade"
          : !upgrade.scrolls.length && !upgrade.offerings.length
            ? "Put a compatible scroll (or offering) in the bag first"
            : "Pick scroll + optional offering, then upgrade() at the shrine",
      separatorBefore: first,
      disabled: !canOpen,
      run: () => {
        void showUpgradeDialog(upgrade, {
          execute: (picked) =>
            upgradeCommand(
              picked.item,
              picked.scroll,
              picked.offering,
              upgrade.station,
            ),
        });
      },
    });
    first = false;
  }

  const compound = compoundOfferForBagItem(
    ctx.item,
    ctx.fp.slot,
    bagItems,
    G,
  );
  if (compound) {
    const haveTriple = compound.partners.length >= 2;
    const canOpen =
      !compound.locked &&
      !compound.maxLevel &&
      haveTriple &&
      compound.scrolls.length > 0 &&
      (compound.access.ok || !!compound.station);
    let label = "Compound…" + travelSuffix(compound.access);
    if (compound.locked) label = "Compound (locked)";
    else if (compound.maxLevel) label = "Compound (max level)";
    else if (!haveTriple) {
      label = `Compound (need 3 · have ${1 + compound.partners.length})`;
    } else if (!compound.scrolls.length) {
      label = "Compound (need cscroll in bag)";
    }
    actions.push({
      id: "station-compound",
      label,
      title: compound.locked
        ? "Item is locked"
        : compound.maxLevel
          ? "Already at max compound grade"
          : !haveTriple
            ? "Need three matching copies at this level in the bag"
            : !compound.scrolls.length
              ? "Put a compatible compound scroll in the bag first"
              : "Pick partners + scroll + optional offering, then compound()",
      separatorBefore: first,
      disabled: !canOpen,
      run: () => {
        void showCompoundDialog(compound, {
          execute: (picked) =>
            compoundCommand(
              picked.items,
              picked.scroll,
              picked.offering,
              compound.station,
            ),
        });
      },
    });
    first = false;
  }

  const dismantle = dismantleOfferForBagItem(ctx.item, bagItems, G);
  if (dismantle) {
    const canRun =
      !dismantle.locked &&
      !dismantle.blocked &&
      (dismantle.access.ok || !!dismantle.station);
    let label =
      (dismantle.kind === "compound" ? "Dismantle (split)" : "Dismantle") +
      travelSuffix(dismantle.access);
    if (dismantle.locked) label = "Dismantle (locked)";
    if (dismantle.blocked) label = "Dismantle (blocked)";
    actions.push({
      id: "station-dismantle",
      label,
      title: dismantle.locked
        ? "Item is locked"
        : dismantle.blocked
          ? "Item is blocked"
          : dismantle.access.ok
            ? dismantle.access.hasComputer
              ? "dismantle() via computer"
              : "dismantle() at craftsman"
            : dismantle.access.reason || "Travel to craftsman, then dismantle",
      separatorBefore: first,
      disabled: !canRun,
      run: () => {
        dismantleCommand(ctx.fp, dismantle.station);
      },
    });
    first = false;
  } else {
    const unavailable = dismantleUnavailableHint(ctx.item, G);
    if (unavailable) {
      actions.push({
        id: "station-dismantle-na",
        label: unavailable.label,
        title: unavailable.title,
        separatorBefore: first,
        disabled: true,
      });
      first = false;
    }
  }

  const crafts = listCraftOffersForBagItem(ctx.fp.name, bagItems, {
    G,
    gold: observingGold(),
    bankAgg: cachedBankAgg(),
  });

  if (crafts.length === 1) {
    const offer = crafts[0];
    const canCraft =
      offer.bagReady && (offer.access.ok || !!offer.station);
    const text = craftRowText(offer, canCraft, "Craft ");
    actions.push({
      id: `station-craft-${offer.output}`,
      label: text,
      title: craftTitle(offer),
      separatorBefore: first,
      disabled: !canCraft,
      mountLabel: (host) => mountCraftRecipeLabel(host, offer, text),
      run: () => {
        autoCraftCommand(offer.output, offer.station);
      },
    });
    first = false;
    if (offer.withdrawCanReady) {
      actions.push({
        id: `station-withdraw-${offer.output}`,
        label: `Withdraw ingredients for ${offer.outputName}…`,
        title:
          "bank_retrieve missing reagents into bag — does not craft. Refresh Bank if stale.",
        disabled: false,
        run: () => {
          withdrawCraftIngredientsCommand(offer);
        },
      });
    }
  } else if (crafts.length > 1) {
    const children: BagMenuAction[] = [];
    for (let i = 0; i < crafts.length; i++) {
      const offer = crafts[i];
      const canCraft =
        offer.bagReady && (offer.access.ok || !!offer.station);
      const text = craftRowText(offer, canCraft);
      children.push({
        id: `station-craft-${offer.output}`,
        label: text,
        title: craftTitle(offer),
        disabled: !canCraft,
        mountLabel: (host) => mountCraftRecipeLabel(host, offer, text),
        run: () => {
          autoCraftCommand(offer.output, offer.station);
        },
      });
      if (offer.withdrawCanReady) {
        children.push({
          id: `station-withdraw-${offer.output}`,
          label: `Withdraw for ${offer.outputName}…`,
          title:
            "bank_retrieve missing reagents into bag — does not craft",
          run: () => {
            withdrawCraftIngredientsCommand(offer);
          },
        });
      }
    }
    actions.push({
      id: "station-craft-menu",
      label: "Craft…",
      title: "Recipes that use this item (bag stock only)",
      separatorBefore: first,
      children,
    });
    first = false;
  }

  return actions;
}

registerBagMenuProvider(buildStationBagMenuActions);
