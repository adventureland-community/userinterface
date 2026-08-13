/**
 * Imperative ranked bar list — pool + patch (mock bar-list.js).
 * Ingest never remounts rows; paint mutates width/text.
 *
 * Bar width follows Details: relative to top actor (`barMax` / max barValue),
 * never relative to the optional Total footer (which is always 100%).
 */

import { classColors } from "../lib/colors";
import { formatCompactNumber, formatCompactRate } from "../lib/format";
import { classIconHtml, rowIconHtml } from "../lib/gameIcon";
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

const TOTAL_ROW_ID = "__total__";

function isTotalRow(row: BarPoolRow): boolean {
  return row.id === TOTAL_ROW_ID;
}

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
  const rate = row.rate != null ? row.rate : null;
  /** DPS/HPS: rate first. Damage/Healing Done: total first (Details). */
  const ratePrimary = row.primary === "rate" && rate != null;
  const pctStr =
    opts.pct !== false
      ? `${share.toFixed(opts.detailsFormat !== false ? 1 : 0)}%`
      : "";

  if (opts.detailsFormat !== false) {
    // Damage Done: `52.03M (33.2K, 36.8%)` — DPS: `33.2K (52.03M, 36.8%)`
    if (ratePrimary) {
      const inner = pctStr
        ? `${formatCompactNumber(row.value)}, ${pctStr}`
        : formatCompactNumber(row.value);
      return `${formatCompactRate(rate)} (${inner})${splash}`;
    }
    if (rate != null) {
      const inner = pctStr
        ? `${formatCompactRate(rate)}, ${pctStr}`
        : formatCompactRate(rate);
      return `${formatCompactNumber(row.value)} (${inner})${splash}`;
    }
    return pctStr
      ? `${formatCompactNumber(row.value)} (${pctStr})${splash}`
      : `${formatCompactNumber(row.value)}${splash}`;
  }
  if (ratePrimary) {
    const pct = pctStr ? `, ${pctStr}` : "";
    return `${formatCompactRate(rate)} (${formatCompactNumber(row.value)}${pct})${splash}`;
  }
  if (rate != null) {
    const pct = pctStr ? `, ${pctStr}` : "";
    return `${formatCompactNumber(row.value)} (${formatCompactRate(rate)}${pct})${splash}`;
  }
  const pct = pctStr ? ` <span class="ecu-meter-pct">${pctStr}</span>` : "";
  return `${formatCompactNumber(row.value)}${pct}${splash}`;
}

function rowColor(row: BarPoolRow): string {
  return row.color || classColors[row.ctype || ""] || "#607d8b";
}

/** Primary bar amount — total for Done displays, rate for DPS/HPS. */
function barAmount(row: BarPoolRow): number {
  return row.barValue != null ? row.barValue : row.value;
}

/**
 * Details `instance.top`: max among actor rows only.
 * Prefer each row's `barMax` (overall #1) so scrolled/pinned views keep scale.
 * Never let the Total footer become the scale — that made Done bars shrink
 * as group sum grew (share-of-group instead of relative-to-top).
 */
function scaleMax(rows: BarPoolRow[]): number {
  let fromMeta = 0;
  let fromVisible = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (isTotalRow(r)) continue;
    fromVisible = Math.max(fromVisible, barAmount(r));
    if (r.barMax > 0) fromMeta = Math.max(fromMeta, r.barMax);
  }
  return fromMeta || fromVisible || 1;
}

/** Group sum for share % — exclude Total footer so it does not double-count. */
function groupSum(rows: BarPoolRow[]): number {
  let sum = 0;
  for (let i = 0; i < rows.length; i++) {
    if (isTotalRow(rows[i])) continue;
    sum += rows[i].value;
  }
  return sum || 1;
}

function barWidthPct(row: BarPoolRow, max: number): number {
  // Details total_bar is always full width; actors are relative to top.
  if (isTotalRow(row)) return 100;
  return max ? (barAmount(row) / max) * 100 : 0;
}

function isSkillOrTargetRow(row: BarPoolRow): boolean {
  return (
    row.kind === "ability" || row.kind === "channel" || row.kind === "target"
  );
}

/**
 * Ranking player bars (DPS/HPS/Damage Done, Total): name + numbers + class
 * color — no ctype/character/"?" chips. Inspector Spells/TARGETS keep icons.
 * Optional class chips require the appearance toggle *and* a known ctype.
 */
function barRowIconHtml(r: BarPoolRow, opts: BarPoolOpts): string {
  if (isTotalRow(r)) return "";
  if (isSkillOrTargetRow(r)) {
    return rowIconHtml(
      { id: r.id, name: r.name, ctype: r.ctype, mtype: r.mtype, kind: r.kind },
      { icons: opts.icons !== false, iconSize: 14 },
    );
  }
  if (!opts.classIcons || !r.ctype) return "";
  return classIconHtml(r.ctype, 14);
}

function iconCacheKey(r: BarPoolRow, opts: BarPoolOpts): string {
  if (isTotalRow(r)) return "";
  if (isSkillOrTargetRow(r)) return `${r.kind}:${r.id}`;
  if (!opts.classIcons || !r.ctype) return "";
  return `class:${r.ctype}`;
}

function syncRowIcon(
  nameHost: HTMLElement,
  r: BarPoolRow,
  opts: BarPoolOpts,
): void {
  const want = iconCacheKey(r, opts);
  const existing = nameHost.querySelector(".ecu-meter-icon");
  if (want && nameHost.dataset.iconId === want && existing) return;
  if (!want && !existing) {
    delete nameHost.dataset.iconId;
    return;
  }
  const html = barRowIconHtml(r, opts);
  if (!html) {
    if (existing) existing.remove();
    delete nameHost.dataset.iconId;
    return;
  }
  if (existing) existing.outerHTML = html;
  else nameHost.insertAdjacentHTML("afterbegin", html);
  nameHost.dataset.iconId = want;
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
    (isTotalRow(r) ? " is-total" : "") +
    (isAbility ? " has-skill" : "") +
    (opts.onClick || opts.onContextMenu ? " clickable" : "");
  el.dataset.id = r.id || String(i);
  const pct = barWidthPct(r, max);
  const share = total ? (r.value / total) * 100 : 0;
  const icon = barRowIconHtml(r, opts);
  const anim = opts.animate !== false ? " ecu-meter-fill-anim" : "";
  el.innerHTML = `
    <div class="ecu-meter-fill${anim}" style="width:${pct}%;background:${rowColor(r)}"></div>
    ${opts.rank !== false ? `<span class="ecu-meter-rank">${r.rank != null ? r.rank : i + 1}.</span>` : "<span></span>"}
    <span class="ecu-meter-who">${icon}<span class="ecu-meter-label"></span></span>
    <span class="ecu-meter-vals"></span>`;
  const label = el.querySelector(".ecu-meter-label") as HTMLElement | null;
  if (label) label.textContent = r.name;
  const who = el.querySelector(".ecu-meter-who") as HTMLElement | null;
  if (who) {
    const key = iconCacheKey(r, opts);
    if (key) who.dataset.iconId = key;
  }
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

function sortForPaint(rows: BarPoolRow[]): BarPoolRow[] {
  if (rows.length && rows[0].rank != null) return rows.slice();
  return rows.slice().sort((a, b) => {
    if (isTotalRow(a)) return 1;
    if (isTotalRow(b)) return -1;
    return barAmount(b) - barAmount(a);
  });
}

export function renderRankedRows(
  container: HTMLElement,
  rows: BarPoolRow[],
  opts: BarPoolOpts = {},
): void {
  container.innerHTML = "";
  container.classList.add("ecu-meter-bar-list");
  const sorted = sortForPaint(rows);
  const max = scaleMax(sorted);
  const total = groupSum(sorted);
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
  const sorted = sortForPaint(rows);
  const max = scaleMax(sorted);
  const total = groupSum(sorted);
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
      (isTotalRow(r) ? " is-total" : "") +
      (r.kind === "ability" || r.kind === "channel" ? " has-skill" : "") +
      (merged.onClick || merged.onContextMenu ? " clickable" : "");
    const fill = el.querySelector(".ecu-meter-fill") as HTMLElement | null;
    const pct = barWidthPct(r, max);
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
    const nameHost = el.querySelector(".ecu-meter-who") as HTMLElement | null;
    if (nameHost) syncRowIcon(nameHost, r, merged);
    const vals = el.querySelector(".ecu-meter-vals");
    const share = total ? (r.value / total) * 100 : 0;
    if (vals) vals.innerHTML = formatRowValue(r, share, merged);
    bindRow(el, r, merged);
  }
  (container as any)._barOpts = merged;
}
