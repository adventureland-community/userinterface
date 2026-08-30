/**
 * Sort the observed character's bag via one sequential swap() script per run.
 * Finishes with refreshObservedInventory() — same welcome reconnect path as swap/equip.
 */

import { emitObserverCommand, getG } from "./al";
import { wrapCommandScript } from "./commandScript";
import { canEditObservedBag } from "./gearObserved";
import { refreshObservedInventory } from "./inventory";
import {
  bagAlreadySorted,
  normalizeObservedBagItems,
  planBagSortSwaps,
} from "../lib/bagSort";
import {
  describeBagSortRules,
  getBagSortPrefs,
} from "../lib/bagSortPrefs";

/** Per-swap pause — keeps imove callcost under stock limits. */
const SORT_SWAP_SLEEP_MS = 100;
/** Hard cap per o:command; larger plans are split with a character-side lock. */
const MAX_SWAPS_PER_COMMAND = 40;

let sortRunningUntil = 0;
let sortChunkTimer: number | null = null;
let pendingSortChunks: Array<Array<[number, number]>> | null = null;
let pendingSortChunkIndex = 0;

function clearSortPending(): void {
  pendingSortChunks = null;
  pendingSortChunkIndex = 0;
  if (sortChunkTimer != null) {
    window.clearTimeout(sortChunkTimer);
    sortChunkTimer = null;
  }
}

function clearSortRunState(): void {
  sortRunningUntil = 0;
  clearSortPending();
}

/** Wait for the last chunk script, then observer reconnect (stock /comm inventory refresh). */
function scheduleSortBagRefresh(lastChunkLen: number): void {
  sortChunkTimer = window.setTimeout(() => {
    sortChunkTimer = null;
    clearSortRunState();
    try {
      refreshObservedInventory();
    } catch {
      /* best-effort */
    }
  }, sortBatchDelayMs(lastChunkLen));
}

function markSortRunning(swaps: number): void {
  const ms = Math.max(1200, swaps * (SORT_SWAP_SLEEP_MS + 90) + 800);
  sortRunningUntil = Date.now() + ms;
}

/** Wait until the prior chunk's async script should finish before the next emit. */
export function sortBatchDelayMs(batchLen: number): number {
  const n = Math.max(1, batchLen | 0);
  return n * (SORT_SWAP_SLEEP_MS + 90) + 600;
}

export function isBagSortRunning(): boolean {
  if (pendingSortChunks) return true;
  return Date.now() < sortRunningUntil;
}

function splitSortChunks(swaps: Array<[number, number]>): Array<Array<[number, number]>> {
  if (swaps.length <= MAX_SWAPS_PER_COMMAND) return [swaps];
  const out: Array<Array<[number, number]>> = [];
  for (let i = 0; i < swaps.length; i += MAX_SWAPS_PER_COMMAND) {
    out.push(swaps.slice(i, i + MAX_SWAPS_PER_COMMAND));
  }
  return out;
}

export function buildBagSortScript(
  swaps: Array<[number, number]>,
  options?: {
    intro?: string;
    done?: boolean;
    chunk?: number;
    chunks?: number;
    useLock?: boolean;
  },
): string {
  if (!swaps.length) {
    return wrapCommandScript(`game_log("Bag already sorted");`);
  }
  const parts: string[] = [];
  if (options?.intro) {
    parts.push(`game_log(${JSON.stringify(options.intro)});`);
  }
  if (options?.useLock !== false) {
    parts.push(
      `if(globalThis.__ecuBagSortLock){game_log("Bag sort already running on character — wait");return;}`,
      `globalThis.__ecuBagSortLock=1;`,
      `try{`,
    );
  }
  parts.push(`var __n=Math.max(character.isize||42,character.items.length);`);
  for (let i = 0; i < swaps.length; i++) {
    const a = swaps[i][0] | 0;
    const b = swaps[i][1] | 0;
    parts.push(
      `if(${a}<0||${b}<0||${a}>=__n||${b}>=__n){`,
      `game_log("Sort stopped — slot out of range");return;}`,
      `if(character.items[${a}]&&character.items[${a}].name==="placeholder"){`,
      `game_log("Sort stopped — placeholder slot "+${a});return;}`,
      `if(character.items[${b}]&&character.items[${b}].name==="placeholder"){`,
      `game_log("Sort stopped — placeholder slot "+${b});return;}`,
      `try{await swap(${a},${b});}catch(__e){`,
      `game_log("Sort stopped at "+${a}+"↔"+${b}+(__e&&__e.reason?(" · "+__e.reason):""));`,
      `return;}`,
      `await sleep(${SORT_SWAP_SLEEP_MS});`,
    );
  }
  if (options?.done) {
    parts.push(`game_log("Bag sorted");`);
  } else if (
    options?.chunk != null &&
    options?.chunks != null &&
    options.chunk < options.chunks
  ) {
    parts.push(
      `game_log("Sort part ${options.chunk}/${options.chunks} done — continuing…");`,
    );
  }
  if (options?.useLock !== false) {
    parts.push(`}finally{globalThis.__ecuBagSortLock=0;}`);
  }
  return wrapCommandScript(parts.join(""));
}

/** Extract async body from wrapCommandScript output for syntax checks. */
export function unwrapBagSortScript(script: string): string {
  const prefix = "(async function(){";
  const suffix = "})();";
  if (!script.startsWith(prefix) || !script.endsWith(suffix)) return script;
  return script.slice(prefix.length, script.length - suffix.length);
}

function scheduleNextSortChunk(): void {
  if (!pendingSortChunks) return;
  pendingSortChunkIndex += 1;
  if (pendingSortChunkIndex >= pendingSortChunks.length) {
    const lastLen =
      pendingSortChunks[pendingSortChunks.length - 1]?.length ?? 1;
    clearSortPending();
    scheduleSortBagRefresh(lastLen);
    return;
  }
  const prev = pendingSortChunks[pendingSortChunkIndex - 1];
  sortChunkTimer = window.setTimeout(() => {
    sortChunkTimer = null;
    emitSortChunk(pendingSortChunkIndex);
  }, sortBatchDelayMs(prev.length));
}

function emitSortChunk(index: number): boolean {
  if (!pendingSortChunks || index >= pendingSortChunks.length) return false;
  const chunk = pendingSortChunks[index];
  const total = pendingSortChunks.reduce((n, c) => n + c.length, 0);
  const chunks = pendingSortChunks.length;
  const intro =
    index === 0
      ? `Sorting bag (${total} moves${chunks > 1 ? ` · ${chunks} parts` : ""})…`
      : `Sorting part ${index + 1}/${chunks}…`;
  const script = buildBagSortScript(chunk, {
    intro,
    done: index + 1 >= chunks,
    chunk: index + 1,
    chunks,
  });
  const ok = emitObserverCommand(script);
  if (!ok) {
    clearSortRunState();
    return false;
  }
  scheduleNextSortChunk();
  return true;
}

function startSortSwaps(swaps: Array<[number, number]>): boolean {
  clearSortRunState();
  pendingSortChunks = splitSortChunks(swaps);
  pendingSortChunkIndex = 0;
  markSortRunning(swaps.length);
  return emitSortChunk(0);
}

/** Plan + emit sort script for the watched character's bag. */
export function bagSortCommand(): boolean {
  if (!canEditObservedBag()) {
    window.alert("Sort only works on your watched character's bag.");
    return false;
  }
  if (isBagSortRunning()) {
    window.alert("Bag sort already in progress…");
    return false;
  }
  const obs = window.observing;
  if (!obs) return false;

  const items = normalizeObservedBagItems(obs);
  if (!items.length) {
    window.alert("No inventory snapshot loaded — open bag or Refresh first.");
    return false;
  }

  const prefs = getBagSortPrefs();
  if (!prefs.rules.some((r) => r.enabled)) {
    window.alert("Enable at least one sort rule in Settings → Bag.");
    return false;
  }

  const G = getG();
  if (bagAlreadySorted(items, prefs, G)) {
    emitObserverCommand(
      wrapCommandScript(
        `game_log("Bag already sorted (${describeBagSortRules(prefs).replace(/"/g, "")})");`,
      ),
    );
    return true;
  }

  const swaps = planBagSortSwaps(items, prefs, G);
  if (!swaps.length) {
    emitObserverCommand(
      wrapCommandScript(`game_log("Bag already matches sort rules");`),
    );
    return true;
  }

  return startSortSwaps(swaps);
}
