/**
 * Imperative ranked bar list — pool + patch (mock bar-list.js).
 * Ingest never remounts rows; paint mutates width/text.
 */

import { classColors } from "../lib/colors";
import { formatCompactNumber, formatCompactRate } from "../lib/format";
import { rowIconHtml } from "./meterIcons";
import type { RankedRow } from "./meterTypes";

export type BarPoolRow = RankedRow & {
  color?: string;
  you?: boolean;
  selected?: boolean;
  /** True 1-based rank when pinned below the fold (Always show me). */
  rank?: number;
};

export type BarPoolOpts = {
  rank?: boolean;
  pct?: boolean;
  metric?: string;
  icons?: boolean;
  classIcons?: boolean;
  animate?: boolean;
  detailsFormat?: boolean;
  onClick?: (ev: MouseEvent, row: BarPoolRow) => void;
  onContextMenu?: (ev: MouseEvent, row: BarPoolRow) => void;
  tooltipHtml?: (ev: MouseEvent, row: BarPoolRow) => void;
  onTooltipHide?: () => void;
};

function splashSuffix(row: BarPoolRow): string {
  if (!(row.splashDamage != null && row.splashDamage > 0)) return "";
  return ` <span class="ecu-meter-splash-hint" title="Explosion splash damage">+${formatCompactNumber(row.splashDamage)}</span>`;
}

function formatRowValue(
  row: BarPoolRow,
  share: number,
  opts: BarPoolOpts,
): string {
  if (opts.metric === "avoidance") {
    return `${(row.value * 100).toFixed(1)}%`;
  }
  const splash = splashSuffix(row);
  if (opts.detailsFormat !== false) {
    const rateStr =
      row.rate != null ? formatCompactRate(row.rate) : row.barValue != null ? formatCompactRate(row.barValue!) : "";
    const pctStr = opts.pct !== false ? `${share.toFixed(1)}%` : "";
    const inner =
      rateStr && pctStr
        ? `${rateStr}, ${pctStr}`
        : rateStr
          ? rateStr
          : pctStr
            ? pctStr
            : "";
    return inner ? `${formatCompactNumber(row.value)} (${inner})${splash}` : `${formatCompactNumber(row.value)}${splash}`;
  }
  const ratePrimary = row.barValue != null && row.rate != null;
  if (ratePrimary) {
    const pct = opts.pct !== false ? `, ${share.toFixed(0)}%` : "";
    return `${formatCompactRate(row.rate!)} (${formatCompactNumber(row.value)}${pct})${splash}`;
  }
  if (row.rate != null) {
    const pct = opts.pct !== false ? `, ${share.toFixed(0)}%` : "";
    return `${formatCompactNumber(row.value)} (${formatCompactRate(row.rate)}${pct})${splash}`;
  }
  const pct =
    opts.pct !== false
      ? ` <span class="ecu-meter-pct">${share.toFixed(0)}%</span>`
      : "";
  return `${formatCompactNumber(row.value)}${pct}${splash}`;
}

function rowColor(row: BarPoolRow): string {
  return row.color || classColors[row.ctype || ""] || "#607d8b";
}

function barAmount(row: BarPoolRow): number {
  return row.barValue != null ? row.barValue : row.value;
}

function makeRowEl(
  r: BarPoolRow,
  i: number,
  opts: BarPoolOpts,
  max: number,
  total: number,
): HTMLDivElement {
  const el = document.createElement("div");
  const isAbility = r.kind === "ability" || r.kind === "channel";
  el.className =
    "ecu-meter-row" +
    (r.you ? " you" : "") +
    (r.selected ? " is-selected" : "") +
    (r.id === "__total__" ? " is-total" : "") +
    (isAbility ? " has-skill" : "") +
    (opts.onClick || opts.onContextMenu ? " clickable" : "");
  el.dataset.id = r.id || String(i);
  const pct = max ? (barAmount(r) / max) * 100 : 0;
  const share = total ? (r.value / total) * 100 : 0;
  const icon = rowIconHtml(
    { id: r.id, ctype: r.ctype, kind: r.kind },
    {
      icons: opts.icons !== false,
      iconSize: 14,
      classIcons: opts.classIcons !== false,
    },
  );
  const anim = opts.animate !== false ? " ecu-meter-fill-anim" : "";
  el.innerHTML = `
    <div class="ecu-meter-fill${anim}" style="width:${pct}%;background:${rowColor(r)}"></div>
    ${opts.rank !== false ? `<span class="ecu-meter-rank">${r.rank != null ? r.rank : i + 1}.</span>` : "<span></span>"}
    <span class="ecu-meter-who">${icon}<span class="ecu-meter-label"></span></span>
    <span class="ecu-meter-vals"></span>`;
  const label = el.querySelector(".ecu-meter-label") as HTMLElement | null;
  if (label) label.textContent = r.name;
  const vals = el.querySelector(".ecu-meter-vals") as HTMLElement | null;
  if (vals) vals.innerHTML = formatRowValue(r, share, opts);
  return el;
}

function bindRow(el: HTMLDivElement, r: BarPoolRow, opts: BarPoolOpts): void {
  if (opts.tooltipHtml) {
    el.onmousemove = (e) => opts.tooltipHtml!(e, r);
    el.onmouseleave = () => {
      if (opts.onTooltipHide) opts.onTooltipHide();
    };
  }
  if (opts.onClick) {
    el.onclick = (e) => opts.onClick!(e, r);
  } else {
    el.onclick = null;
  }
  if (opts.onContextMenu) {
    el.oncontextmenu = (e) => {
      e.preventDefault();
      opts.onContextMenu!(e, r);
    };
  } else {
    el.oncontextmenu = null;
  }
}

export function renderRankedRows(
  container: HTMLElement,
  rows: BarPoolRow[],
  opts: BarPoolOpts = {},
): void {
  container.innerHTML = "";
  container.classList.add("ecu-meter-bar-list");
  const sorted =
    rows.length && rows[0].rank != null
      ? rows.slice()
      : rows.slice().sort((a, b) => barAmount(b) - barAmount(a));
  const max =
    sorted.reduce((m, r) => {
      const v = barAmount(r);
      return v > m ? v : m;
    }, 0) || 1;
  const total = sorted.reduce((s, r) => s + r.value, 0) || 1;
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    const el = makeRowEl(r, i, opts, max, total);
    bindRow(el, r, opts);
    container.appendChild(el);
  }
  (container as any)._barOpts = opts;
}

/** Mutate existing row DOM — no full remount. */
export function patchRankedRows(
  container: HTMLElement,
  rows: BarPoolRow[],
  opts: BarPoolOpts = {},
): void {
  const merged: BarPoolOpts = {
    ...((container as any)._barOpts || {}),
    ...opts,
  };
  const sorted =
    rows.length && rows[0].rank != null
      ? rows.slice()
      : rows.slice().sort((a, b) => barAmount(b) - barAmount(a));
  const max =
    sorted.reduce((m, r) => {
      const v = barAmount(r);
      return v > m ? v : m;
    }, 0) || 1;
  const total = sorted.reduce((s, r) => s + r.value, 0) || 1;
  // Drop leftover empty-state / non-row nodes so they cannot sit above bars.
  const stray = Array.from(container.children).filter(
    (el) => !(el as HTMLElement).classList.contains("ecu-meter-row"),
  );
  for (let i = 0; i < stray.length; i++) {
    stray[i].remove();
  }
  const kids = Array.from(container.children).filter((el) =>
    (el as HTMLElement).classList.contains("ecu-meter-row"),
  ) as HTMLDivElement[];

  while (kids.length > sorted.length) {
    const last = kids.pop();
    if (last) last.remove();
  }
  while (kids.length < sorted.length) {
    const r = sorted[kids.length];
    const el = makeRowEl(r, kids.length, merged, max, total);
    container.appendChild(el);
    kids.push(el);
  }

  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    const el = kids[i];
    el.dataset.id = r.id || String(i);
    el.className =
      "ecu-meter-row" +
      (r.you ? " you" : "") +
      (r.selected ? " is-selected" : "") +
      (r.kind === "ability" || r.kind === "channel" ? " has-skill" : "") +
      (merged.onClick || merged.onContextMenu ? " clickable" : "");
    const fill = el.querySelector(".ecu-meter-fill") as HTMLElement | null;
    const pct = max ? (barAmount(r) / max) * 100 : 0;
    if (fill) {
      fill.style.width = pct + "%";
      fill.style.background = rowColor(r);
    }
    const rank = el.querySelector(".ecu-meter-rank");
    if (rank && merged.rank !== false) {
      rank.textContent = `${r.rank != null ? r.rank : i + 1}.`;
    }
    const label = el.querySelector(".ecu-meter-label");
    if (label) label.textContent = r.name;
    const nameHost = el.querySelector(".ecu-meter-who");
    if (nameHost && (r.kind === "ability" || r.kind === "channel")) {
      const existing = nameHost.querySelector(".ecu-meter-icon");
      if (!existing) {
        nameHost.insertAdjacentHTML(
          "afterbegin",
          rowIconHtml(
            { id: r.id, kind: "ability" },
            { icons: merged.icons !== false },
          ),
        );
      }
    }
    const vals = el.querySelector(".ecu-meter-vals");
    const share = total ? (r.value / total) * 100 : 0;
    if (vals) vals.innerHTML = formatRowValue(r, share, merged);
    bindRow(el, r, merged);
  }
  (container as any)._barOpts = merged;
}
