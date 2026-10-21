/**
 * Title-prefix border colors — matches al-data-explorer / market-tracker ItemInstance.
 * Stock item_container uses grade borders; titled items recolor that same frame from `p`.
 */

import { getG } from "../host/al";

/** Fallback when `p` is a known G.titles key without a palette entry. */
const TITLE_BORDER_FALLBACK = "#c9a227";

/** Border color for a titled item instance (`item.p` / `G.titles` key). */
export function itemTitleBorderColor(
  p: string | null | undefined,
): string | undefined {
  if (!p) return undefined;
  switch (p) {
    case "festive":
      return "#79ff7e";
    case "firehazard":
      return "#f79b11";
    case "glitched":
      return "grey";
    case "gooped":
      return "#64B867";
    case "legacy":
      return "white";
    case "lucky":
      return "#00f3ff";
    case "shiny":
      return "#99b2d8";
    case "superfast":
      return "#c681dc";
    case "fast":
      return "#9ad0ff";
    case "stomped":
      return "#d4a574";
    case "sniper":
      return "#8ab4f8";
    case "abtesting":
      return "#b39ddb";
    case "critmonger":
      return "#ef9a9a";
    default: {
      try {
        const G = getG() as
          | { titles?: Record<string, { title?: string }> }
          | undefined;
        if (G?.titles?.[p]) return TITLE_BORDER_FALLBACK;
      } catch {
        /* node tests without window */
      }
      return undefined;
    }
  }
}

export function shouldShowTitleBorder(p: string | null | undefined): boolean {
  return !!itemTitleBorderColor(p);
}

const ITEM_CONTAINER_BORDER_RE = /border:\s*2px\s+solid\s+[^;"']+/gi;

/**
 * Recolor stock item_container outer + inner borders — same footprint as grade border.
 * When the HTML has no `border: 2px solid …` (sheet fallback), wrap with a thin frame.
 */
export function wrapHtmlWithTitleBorder(
  html: string,
  p: string | null | undefined,
): string {
  const color = itemTitleBorderColor(p);
  if (!color) return html;
  ITEM_CONTAINER_BORDER_RE.lastIndex = 0;
  if (ITEM_CONTAINER_BORDER_RE.test(html)) {
    ITEM_CONTAINER_BORDER_RE.lastIndex = 0;
    return html.replace(ITEM_CONTAINER_BORDER_RE, `border: 2px solid ${color}`);
  }
  // Sheet / letter fallbacks have no stock border to recolor.
  return (
    `<span class="ecu-item-title-frame" style="display:inline-flex;border:2px solid ${color};background:#000;line-height:0;padding:1px;box-sizing:border-box">` +
    html +
    `</span>`
  );
}

/** Stamp title border on native bag / paperdoll item_container roots. */
export function stampNativeItemTitleBorder(
  root: HTMLElement,
  p: string | null | undefined,
): void {
  const color = itemTitleBorderColor(p);
  if (!color) return;
  root.style.borderColor = color;
  root.style.borderStyle = root.style.borderStyle || "solid";
  root.style.borderWidth = root.style.borderWidth || "2px";
  root.style.boxShadow = "";
  const inner = root.querySelector(".rclick") as HTMLElement | null;
  if (inner) {
    inner.style.borderColor = color;
    inner.style.borderStyle = inner.style.borderStyle || "solid";
    inner.style.borderWidth = inner.style.borderWidth || "2px";
  }
  root.dataset.ecuTitleBorder = p || "";
}
