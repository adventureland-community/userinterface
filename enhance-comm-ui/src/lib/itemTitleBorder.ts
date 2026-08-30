/**
 * Title-prefix border colors — matches al-data-explorer / market-tracker ItemInstance.
 * Stock item_container uses grade borders; titled items recolor that same frame from `p`.
 */

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
    default:
      return undefined;
  }
}

export function shouldShowTitleBorder(p: string | null | undefined): boolean {
  return !!itemTitleBorderColor(p);
}

const ITEM_CONTAINER_BORDER_RE = /border:\s*2px\s+solid\s+[^;"']+/gi;

/**
 * Recolor stock item_container outer + inner borders — same footprint as grade border.
 * Does not wrap with an extra frame (that made gear/bag cells grow).
 */
export function wrapHtmlWithTitleBorder(
  html: string,
  p: string | null | undefined,
): string {
  const color = itemTitleBorderColor(p);
  if (!color) return html;
  return html.replace(ITEM_CONTAINER_BORDER_RE, `border: 2px solid ${color}`);
}

/** Stamp title border on native bag / paperdoll item_container roots. */
export function stampNativeItemTitleBorder(
  root: HTMLElement,
  p: string | null | undefined,
): void {
  const color = itemTitleBorderColor(p);
  if (!color) return;
  root.style.borderColor = color;
  root.style.boxShadow = "";
  const inner = root.querySelector(".rclick") as HTMLElement | null;
  if (inner) inner.style.borderColor = color;
  root.dataset.ecuTitleBorder = p || "";
}
