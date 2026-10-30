/**
 * Item hover cooltip — stock `render_item("html")` body inside the Comm shell.
 */
import { buildItemHtml } from "../../host/infoDialog/write";
import { getG } from "../../host/al";
import { itemInstanceLabel } from "../../lib/gameIcon";
import {
  cooltipHandlers,
  dismissCooltip,
  escapeCooltipHtml,
} from "./cooltip";

export type ItemCooltipActual = {
  name?: string;
  level?: number | string;
  q?: number;
  p?: string | null;
  [key: string]: unknown;
};

export type ItemCooltipArgs = {
  name: string;
  level?: number | string;
  q?: number;
  p?: string | null;
  /** Full slot / bag object when available (preferred over flat fields). */
  actual?: ItemCooltipActual | null;
};

let tipSeq = 0;

export function nextItemCooltipKey(name: string): string {
  tipSeq += 1;
  return `item:${name}:${tipSeq}`;
}

/**
 * Stock item card HTML for hover. Falls back to a one-line name tip when
 * `render_item` / G.items is missing.
 */
export function itemCooltipHtml(args: ItemCooltipArgs): string {
  const G = getG();
  const def = G?.items?.[args.name];
  const actual: ItemCooltipActual = {
    name: args.name,
    ...(args.actual || {}),
  };
  if (actual.level == null && args.level != null) actual.level = args.level;
  if (actual.q == null && args.q != null) actual.q = args.q;
  if (actual.p == null && args.p != null) actual.p = args.p;
  if (!actual.name) actual.name = args.name;

  if (def) {
    const html = buildItemHtml({
      item: def,
      name: args.name,
      actual,
      readonly: true,
    });
    if (html && String(html).trim()) return html;
  }

  const label =
    itemInstanceLabel(args.name, {
      p: actual.p != null ? String(actual.p) : undefined,
      level: actual.level as number | string | undefined,
    }) || args.name;
  return `<h4>${escapeCooltipHtml(label)}</h4>`;
}

export function itemCooltipHandlers(
  key: string,
  rebuild: () => string,
): {
  onMouseEnter: (ev: MouseEvent) => void;
  onMouseMove: (ev: MouseEvent) => void;
  onMouseLeave: () => void;
} {
  return cooltipHandlers(key, rebuild, { itemTip: true });
}

export function dismissItemCooltip(key?: string): void {
  dismissCooltip(key);
}
