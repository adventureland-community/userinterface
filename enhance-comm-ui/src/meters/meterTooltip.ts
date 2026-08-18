/**
 * Floating HTML tooltip — Details-like cooltip for meter bars.
 * Positioned in viewport; flips / clamps so it never clips off-screen.
 * Shift expands Spells; Ctrl expands Targets (Details ToolTip_DamageDone).
 */

import { formatCompactNumber, formatCompactRate } from "../lib/format";
import type { PartyFocus } from "../lib/settingsFocus";
import {
  characterIconHtml,
  skillIconHtml,
  targetIconHtml,
} from "../lib/gameIcon";
import { runMeterQuery } from "./meterQuery";
import type { PlayersMetric, RankedRow, SegmentRef } from "./meterTypes";

const PAD = 8;
const CURSOR = 14;

/**
 * Shared tip icon size (px). Keep in sync with `--meter-tt-icon` in
 * `meterBodyCoreCss.ts` — bar + timeline hover tips both use this.
 * Larger than bar-row 14px so Cooltip sprites stay readable.
 */
export const METER_TT_ICON = 22;

/** Details profile defaults (`tooltip_max_abilities` / `tooltip_max_targets`). */
const MAX_SPELLS = 6;
const MAX_TARGETS = 2;
/** Expanded cap after pack-fold — 99 unique Spark Bots covered the screen. */
const MAX_EXPANDED = 16;

let tipEl: HTMLDivElement | null = null;
let lastMods = { shift: false, ctrl: false };
let hoverRebuild: ((mods: { shift: boolean; ctrl: boolean }) => string) | null =
  null;
let hoverX = 0;
let hoverY = 0;
let keysBound = false;
let tipWheelBound = false;

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TIP_WHEEL_OPTS: AddEventListenerOptions = {
  capture: true,
  passive: false,
};

function isMeterTooltipOpen(): boolean {
  return !!(tipEl && tipEl.isConnected && tipEl.style.display === "block");
}

/** Keep Ctrl+wheel on an open tip from also scaling the window underneath. */
function onTipCtrlWheel(ev: WheelEvent): void {
  if (!ev.ctrlKey || !isMeterTooltipOpen()) return;
  ev.preventDefault();
  ev.stopPropagation();
}

function ensureTip(): HTMLDivElement {
  if (tipEl && tipEl.isConnected) return tipEl;
  tipEl = document.createElement("div");
  tipEl.className = "ecu-meter-tt";
  tipEl.style.display = "none";
  tipEl.style.position = "fixed";
  tipEl.style.zIndex = "10000";
  document.body.appendChild(tipEl);
  if (!tipWheelBound) {
    tipWheelBound = true;
    document.addEventListener("wheel", onTipCtrlWheel, TIP_WHEEL_OPTS);
  }
  return tipEl;
}

function placeTip(tip: HTMLDivElement, clientX: number, clientY: number): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = tip.getBoundingClientRect();
  const tw = Math.max(1, rect.width);
  const th = Math.max(1, rect.height);

  let x = clientX + CURSOR;
  let y = clientY + CURSOR;

  if (x + tw > vw - PAD) x = clientX - tw - CURSOR;
  if (y + th > vh - PAD) y = clientY - th - CURSOR;

  x = Math.max(PAD, Math.min(vw - tw - PAD, x));
  y = Math.max(PAD, Math.min(vh - th - PAD, y));

  tip.style.left = Math.round(x) + "px";
  tip.style.top = Math.round(y) + "px";
}

function paintTip(html: string, clientX: number, clientY: number): void {
  const tip = ensureTip();
  tip.innerHTML = html;
  const isGear = html.indexOf("ecu-meter-tt-gear") !== -1;
  const isEvs = html.indexOf("ecu-meter-tt-evs") !== -1;
  tip.classList.toggle("is-gear-tip", isGear);
  tip.classList.toggle("is-tl-ev-tip", isEvs);
  tip.classList.toggle("is-tl-cluster", isGear || isEvs);
  tip.style.display = "block";
  tip.style.left = "-9999px";
  tip.style.top = "0px";
  placeTip(tip, clientX, clientY);
}

function readMods(ev: {
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}): { shift: boolean; ctrl: boolean } {
  return {
    shift: !!ev.shiftKey,
    ctrl: !!ev.ctrlKey || !!ev.metaKey,
  };
}

/** Rebuild tip when Shift/Ctrl change — any key event may carry fresh modifiers. */
function onModKey(ev: KeyboardEvent): void {
  if (!hoverRebuild || !tipEl || tipEl.style.display === "none") return;
  const mods = readMods(ev);
  if (mods.shift === lastMods.shift && mods.ctrl === lastMods.ctrl) return;
  lastMods = mods;
  paintTip(hoverRebuild(mods), hoverX, hoverY);
}

const MOD_KEY_OPTS: AddEventListenerOptions = { capture: true };

function bindModKeys(): void {
  if (keysBound) return;
  keysBound = true;
  // Capture on document so canvas / game handlers cannot swallow the event first.
  document.addEventListener("keydown", onModKey, MOD_KEY_OPTS);
  document.addEventListener("keyup", onModKey, MOD_KEY_OPTS);
}

function unbindModKeys(): void {
  if (!keysBound) return;
  keysBound = false;
  document.removeEventListener("keydown", onModKey, MOD_KEY_OPTS);
  document.removeEventListener("keyup", onModKey, MOD_KEY_OPTS);
}

export function showMeterTooltip(ev: MouseEvent, html: string): void {
  hoverRebuild = null;
  unbindModKeys();
  lastMods = readMods(ev);
  hoverX = ev.clientX;
  hoverY = ev.clientY;
  paintTip(html, ev.clientX, ev.clientY);
}

/**
 * Live tooltip that rebuilds when Shift/Ctrl change (Details shiftMonitor).
 */
export function showMeterTooltipLive(
  ev: MouseEvent,
  rebuild: (mods: { shift: boolean; ctrl: boolean }) => string,
): void {
  const mods = readMods(ev);
  hoverRebuild = rebuild;
  lastMods = mods;
  hoverX = ev.clientX;
  hoverY = ev.clientY;
  bindModKeys();
  paintTip(rebuild(mods), ev.clientX, ev.clientY);
}

export function hideMeterTooltip(): void {
  hoverRebuild = null;
  unbindModKeys();
  if (!tipEl) return;
  tipEl.style.display = "none";
  tipEl.classList.remove("is-gear-tip", "is-tl-ev-tip", "is-tl-cluster");
}

function metricForBreakdown(metric?: string): PlayersMetric {
  if (
    metric === "heal" ||
    metric === "taken" ||
    metric === "healing_required" ||
    metric === "avoidance" ||
    metric === "damage"
  ) {
    return metric;
  }
  return "damage";
}

function formatAmtPct(
  value: number,
  total: number,
  avoidance: boolean,
): string {
  if (avoidance) {
    const pct = (value * 100).toFixed(1);
    return `${pct}%`;
  }
  const pct = total > 0 ? (value / total) * 100 : 0;
  return `${formatCompactNumber(value)} (${pct.toFixed(1)}%)`;
}

function sectionHeader(
  icon: string,
  title: string,
  hint: string | null,
  maximized: boolean,
): string {
  const canExpand = !!hint;
  const maxCls = canExpand && maximized ? " is-max" : "";
  const kbd = canExpand ? `<span class="ecu-meter-tt-kbd">${hint}</span>` : "";
  return `<div class="ecu-meter-tt-sec${maxCls}">
    <span class="ecu-meter-tt-sec-l">${icon}<span class="ecu-meter-tt-sec-t">${title}</span></span>
    ${kbd}
  </div>`;
}

function packFoldKey(row: RankedRow): string {
  if (row.ctype) return "p:" + row.id;
  if (row.mtype) return "m:" + row.mtype;
  return "n:" + row.name;
}

/** Collapse identical pack mobs (Spark Bot ×40) so Ctrl-expand stays readable. */
function foldPackTargets(rows: RankedRow[]): RankedRow[] {
  const byKey: Record<string, { row: RankedRow; count: number }> = {};
  const order: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const key = packFoldKey(r);
    const cur = byKey[key];
    if (!cur) {
      byKey[key] = { row: { ...r }, count: 1 };
      order.push(key);
    } else {
      cur.count += 1;
      cur.row.value += r.value;
    }
  }
  const out: RankedRow[] = [];
  for (let i = 0; i < order.length; i++) {
    const { row, count } = byKey[order[i]];
    if (count > 1) row.name = `${row.name} ×${count}`;
    out.push(row);
  }
  return out;
}

function rankRowsHtml(
  rows: RankedRow[],
  limit: number,
  total: number,
  iconFor: (row: RankedRow) => string,
  avoidance: boolean,
): string {
  if (!rows.length) {
    return `<div class="ecu-meter-tt-empty">None</div>`;
  }
  const n = Math.min(limit, rows.length);
  let html = "";
  for (let i = 0; i < n; i++) {
    const r = rows[i];
    const alt = i % 2 === 1 ? " is-alt" : "";
    const name = escapeHtml(r.name);
    const amt = formatAmtPct(r.value, total, avoidance);
    html += `<div class="ecu-meter-tt-row${alt}">
      <span class="ecu-meter-tt-row-l">${iconFor(r)}<span class="ecu-meter-tt-name">${name}:</span></span>
      <span class="ecu-meter-tt-amt">${amt}</span>
    </div>`;
  }
  if (rows.length > n) {
    html += `<div class="ecu-meter-tt-more">+${rows.length - n} more</div>`;
  }
  return html;
}

function queryRanked(
  kind: "abilities" | "targets",
  actorId: string,
  metric: PlayersMetric,
  segmentRef: SegmentRef,
  partyFocus?: PartyFocus,
  entities?: any[],
): RankedRow[] {
  const result = runMeterQuery(
    kind === "abilities"
      ? { kind: "abilities", actorId, metric }
      : { kind: "targets", actorId, metric },
    {
      segmentRef,
      partyFocus,
      entities,
      now: Date.now(),
    },
  );
  if (result.kind !== "ranked") return [];
  return result.rows.slice().sort((a, b) => b.value - a.value);
}

export type PlayerTooltipCtx = {
  row: RankedRow;
  metric?: string;
  segmentRef: SegmentRef;
  partyFocus?: PartyFocus;
  entities?: any[];
};

/**
 * Details `ToolTip_DamageDone` shape: Spells (+Shift) then Targets (+Ctrl).
 * Uses real ability/target aggregates from the segment — never invents spells.
 */
export function playerBarTooltipHtml(
  ctx: PlayerTooltipCtx,
  mods: { shift: boolean; ctrl: boolean },
): string {
  const { row, metric, segmentRef, partyFocus, entities } = ctx;
  const avoidance = metric === "avoidance";
  const rate =
    row.rate != null
      ? `<div class="line"><span>Rate</span><b>${formatCompactRate(row.rate)}/s</b></div>`
      : "";
  const abs = avoidance
    ? `<div class="line"><span>Value</span><b>${(row.value * 100).toFixed(1)}%</b></div>`
    : `<div class="line"><span>Total</span><b>${formatCompactNumber(row.value)}</b></div>${rate}`;

  const isPlayerRow =
    row.id !== "__total__" &&
    row.kind !== "channel" &&
    row.kind !== "ability" &&
    row.kind !== "target";
  const headIcon = isPlayerRow
    ? characterIconHtml(row.id, {
        size: METER_TT_ICON,
        ctype: row.ctype,
        name: row.name,
        title: row.ctype ? `${row.name} · ${row.ctype}` : row.name || row.id,
      }) + " "
    : "";
  const classLine =
    isPlayerRow && row.ctype
      ? `<div class="line"><span>Class</span><b>${escapeHtml(row.ctype)}</b></div>`
      : "";
  const head = `<h4>${headIcon}${escapeHtml(row.name)}</h4>${classLine}${abs}
    <div class="line"><span>Share</span><b>${(row.pct * 100).toFixed(0)}%</b></div>`;

  if (row.kind === "target") {
    return targetBarTooltipHtml(row);
  }

  if (
    row.id === "__total__" ||
    row.kind === "channel" ||
    row.kind === "ability"
  ) {
    return `${head}<div class="ecu-meter-tt-foot">Click row → Inspector</div>`;
  }

  const m = metricForBreakdown(metric);
  const spells = queryRanked(
    "abilities",
    row.id,
    m,
    segmentRef,
    partyFocus,
    entities,
  );
  const targets = foldPackTargets(
    queryRanked("targets", row.id, m, segmentRef, partyFocus, entities),
  );

  const spellExpandable = spells.length > MAX_SPELLS;
  const targetExpandable = targets.length > MAX_TARGETS;
  const spellLimit = mods.shift && spellExpandable ? MAX_EXPANDED : MAX_SPELLS;
  const targetLimit =
    mods.ctrl && targetExpandable ? MAX_EXPANDED : MAX_TARGETS;
  const spellTotal = spells.reduce((s, r) => s + r.value, 0) || row.value || 1;
  const targetTotal =
    targets.reduce((s, r) => s + r.value, 0) || row.value || 1;

  const spellsSec =
    sectionHeader(
      `<span class="ecu-meter-tt-sec-ico" aria-hidden="true">⚔</span>`,
      "Spells",
      spellExpandable ? "Shift" : null,
      mods.shift,
    ) +
    rankRowsHtml(
      spells,
      spellLimit,
      spellTotal,
      (r) => skillIconHtml(r.id, METER_TT_ICON),
      avoidance,
    );

  const targetsSec =
    sectionHeader(
      `<span class="ecu-meter-tt-sec-ico" aria-hidden="true">✓</span>`,
      "Targets",
      targetExpandable ? "Ctrl" : null,
      mods.ctrl,
    ) +
    rankRowsHtml(
      targets,
      targetLimit,
      targetTotal,
      (r) => targetIconHtml(r, METER_TT_ICON),
      avoidance,
    );

  return `${head}
    <div class="ecu-meter-tt-div"></div>
    ${spellsSec}
    <div class="ecu-meter-tt-div"></div>
    ${targetsSec}
    <div class="ecu-meter-tt-foot">Click → Inspector</div>`;
}

export function abilityBarTooltipHtml(row: RankedRow): string {
  const splash =
    row.splashDamage != null && row.splashDamage > 0
      ? `<div class="line"><span>Explosion</span><b>+${formatCompactNumber(row.splashDamage)}</b></div>`
      : "";
  return `<h4>${skillIconHtml(row.id, METER_TT_ICON)} ${escapeHtml(row.name)}</h4>
    <div class="line"><span>Total</span><b>${formatCompactNumber(row.value)}</b></div>
    ${splash}
    ${row.rate != null ? `<div class="line"><span>Rate</span><b>${formatCompactRate(row.rate)}/s</b></div>` : ""}
    <div class="line"><span>Share</span><b>${(row.pct * 100).toFixed(0)}%</b></div>
    <div class="ecu-meter-tt-foot">Click → targets for spell</div>`;
}

/** TARGETS list / ability-target row — monster sprite or player class letter. */
export function targetBarTooltipHtml(row: RankedRow): string {
  return `<h4>${targetIconHtml(row, METER_TT_ICON)} ${escapeHtml(row.name)}</h4>
    <div class="line"><span>Total</span><b>${formatCompactNumber(row.value)}</b></div>
    ${row.rate != null ? `<div class="line"><span>Rate</span><b>${formatCompactRate(row.rate)}/s</b></div>` : ""}
    <div class="line"><span>Share</span><b>${(row.pct * 100).toFixed(0)}%</b></div>
    <div class="ecu-meter-tt-foot">Click → Inspector</div>`;
}
