/**
 * Catalog item picker for empty trade slots → wishlist() on observed character.
 */

import { getG } from "../../host/al";
import {
  promptTradePrice,
  promptWishlistLevel,
  wishlistCommand,
} from "../../host/tradeCommands";
import { formatTradeSlotLabel } from "../../lib/tradeSlots";
import { itemIconHtml } from "../../lib/gameIcon";
import { ensureTradeWishlistPickerCss } from "./tradeWishlistPickerCss";

const PAGE_SIZE = 20;

type CatalogRow = { key: string; name: string; skin: string };

let pickerEl: HTMLDivElement | null = null;
let keyHandler: ((ev: KeyboardEvent) => void) | null = null;
let docHandler: ((ev: MouseEvent) => void) | null = null;

function hidePicker(): void {
  if (keyHandler) {
    document.removeEventListener("keydown", keyHandler, true);
    keyHandler = null;
  }
  if (docHandler) {
    document.removeEventListener("mousedown", docHandler, true);
    docHandler = null;
  }
  if (pickerEl) {
    pickerEl.remove();
    pickerEl = null;
  }
}

function catalogItems(): CatalogRow[] {
  const G = getG() as
    | {
        items?: Record<
          string,
          { ignore?: boolean; name?: string; skin?: string; g?: number }
        >;
      }
    | undefined;
  if (!G || !G.items) return [];
  const rows: CatalogRow[] = [];
  const keys = Object.keys(G.items);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const def = G.items[key];
    if (!def || def.ignore || key === "placeholder") continue;
    rows.push({
      key,
      name: def.name || key,
      skin: def.skin || key,
    });
  }
  rows.sort((a, b) => {
    const ga = G.items![a.key]?.g || 0;
    const gb = G.items![b.key]?.g || 0;
    return gb - ga;
  });
  return rows;
}

function clampPosition(el: HTMLElement, clientX: number, clientY: number): void {
  const pad = 8;
  const w = el.offsetWidth || 320;
  const h = el.offsetHeight || 400;
  const maxX = Math.max(pad, window.innerWidth - w - pad);
  const maxY = Math.max(pad, window.innerHeight - h - pad);
  el.style.left = Math.min(Math.max(pad, clientX), maxX) + "px";
  el.style.top = Math.min(Math.max(pad, clientY), maxY) + "px";
}

function pickItem(tradeSlot: string, itemKey: string): void {
  hidePicker();
  const price = promptTradePrice(itemKey);
  if (price == null) return;
  const level = promptWishlistLevel(itemKey);
  if (level == null) return;
  wishlistCommand(tradeSlot, itemKey, price, 1, level);
}

function renderPage(
  root: HTMLDivElement,
  tradeSlot: string,
  rows: CatalogRow[],
  query: string,
  page: number,
): number {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) =>
          r.key.toLowerCase().indexOf(q) >= 0 ||
          r.name.toLowerCase().indexOf(q) >= 0,
      )
    : rows;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const slice = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const grid = root.querySelector(".comm-wishlist-picker__grid") as
    | HTMLDivElement
    | null;
  const pageLabel = root.querySelector(".comm-wishlist-picker__page");
  const prevBtn = root.querySelector(
    "[data-wishlist-prev]",
  ) as HTMLButtonElement | null;
  const nextBtn = root.querySelector(
    "[data-wishlist-next]",
  ) as HTMLButtonElement | null;
  if (!grid) return safePage;

  grid.innerHTML = "";
  for (let i = 0; i < slice.length; i++) {
    const row = slice[i];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "comm-wishlist-picker__item";
    btn.title = `${row.name} (${row.key})`;
    btn.innerHTML =
      itemIconHtml(row.key, { skin: row.skin, size: 32, title: row.name }) ||
      row.key;
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      pickItem(tradeSlot, row.key);
    });
    grid.appendChild(btn);
  }

  if (pageLabel) {
    pageLabel.textContent =
      filtered.length === 0
        ? "No matches"
        : `Page ${safePage + 1} / ${pageCount} · ${filtered.length} items`;
  }
  if (prevBtn) prevBtn.disabled = safePage <= 0;
  if (nextBtn) nextBtn.disabled = safePage >= pageCount - 1;

  return safePage;
}

export function showTradeWishlistPicker(
  tradeSlot: string,
  clientX: number,
  clientY: number,
): void {
  hidePicker();
  ensureTradeWishlistPickerCss();

  const rows = catalogItems();
  if (!rows.length) {
    window.alert("Item catalog (G.items) is not available.");
    return;
  }

  let page = 0;
  let query = "";

  const el = document.createElement("div");
  el.className = "comm-wishlist-picker";
  el.setAttribute("role", "dialog");
  el.innerHTML =
    `<div class="comm-wishlist-picker__head">` +
    `<div class="comm-wishlist-picker__title">Wishlist → ${formatTradeSlotLabel(tradeSlot)}</div>` +
    `<input class="comm-wishlist-picker__search" type="search" placeholder="Search items…" autocomplete="off" />` +
    `</div>` +
    `<div class="comm-wishlist-picker__grid"></div>` +
    `<div class="comm-wishlist-picker__foot">` +
    `<button type="button" data-wishlist-prev>Prev</button>` +
    `<span class="comm-wishlist-picker__page"></span>` +
    `<button type="button" data-wishlist-next>Next</button>` +
    `</div>`;

  document.body.appendChild(el);
  pickerEl = el;
  clampPosition(el, clientX, clientY);

  const search = el.querySelector(
    ".comm-wishlist-picker__search",
  ) as HTMLInputElement | null;
  const prevBtn = el.querySelector(
    "[data-wishlist-prev]",
  ) as HTMLButtonElement | null;
  const nextBtn = el.querySelector(
    "[data-wishlist-next]",
  ) as HTMLButtonElement | null;

  const redraw = () => {
    page = renderPage(el, tradeSlot, rows, query, page);
  };

  if (search) {
    search.addEventListener("input", () => {
      query = search.value;
      page = 0;
      redraw();
    });
  }
  prevBtn?.addEventListener("click", (ev) => {
    ev.preventDefault();
    page = Math.max(0, page - 1);
    redraw();
  });
  nextBtn?.addEventListener("click", (ev) => {
    ev.preventDefault();
    page += 1;
    redraw();
  });

  redraw();
  search?.focus();

  keyHandler = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      hidePicker();
    }
  };
  docHandler = (ev: MouseEvent) => {
    if (pickerEl && ev.target instanceof Node && pickerEl.contains(ev.target)) {
      return;
    }
    hidePicker();
  };
  document.addEventListener("keydown", keyHandler, true);
  window.setTimeout(() => {
    if (docHandler) document.addEventListener("mousedown", docHandler, true);
  }, 0);
}

export function hideTradeWishlistPicker(): void {
  hidePicker();
}
