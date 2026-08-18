/**
 * Nearby trade send (`send_item` / socket `send`) for /comm bag actions.
 * Runs on the observed character via `o:command` → code_eval — not mail.
 */

import {
  emitObserverCommand,
  getEntitiesList,
  getObserving,
  simpleDistance,
} from "./al";
import { wrapCommandScript } from "./commandScript";
import type { EntityLike } from "./globals";
import { refreshObservedInventory } from "./inventory";
import { findFingerprintSlot } from "./mail/itemFingerprint";
import type { ItemFingerprint, MailItem } from "./mail/types";
import { isFocusablePlayer } from "../queries/entities";
import { isActuallyDead } from "../lib/stickyPresence";

/** Server `B.dist` for socket `send` (item/gold). */
export const SEND_ITEM_RANGE = 400;

export type NearbySendTarget = {
  name: string;
  id: string;
  /** Approximate px from observing; omitted when coords missing. */
  dist?: number;
};

function lit(value: string): string {
  return JSON.stringify(String(value));
}

function fingerprintCheckJs(fp: ItemFingerprint, varName: string): string {
  const parts = [`!${varName}`, `${varName}.name!==${lit(fp.name)}`];
  if (fp.level != null) parts.push(`${varName}.level!==${fp.level}`);
  if (fp.q != null) parts.push(`${varName}.q!==${fp.q}`);
  if (fp.p != null) parts.push(`${varName}.p!==${lit(fp.p)}`);
  return parts.join("||");
}

function selfNameLower(): string {
  const obs = getObserving() || window.observing;
  const n = obs && obs.name ? String(obs.name) : "";
  return n.toLowerCase();
}

function selfId(): string {
  const obs = getObserving() || window.observing;
  return obs && obs.id != null ? String(obs.id) : "";
}

/**
 * Visible character entities in send range (same map when known),
 * excluding the observed self. Sorted nearest-first.
 */
export function listNearbySendTargets(
  entities?: EntityLike[] | null,
): NearbySendTarget[] {
  const list = entities || getEntitiesList();
  const obs = getObserving() || window.observing || null;
  const skipName = selfNameLower();
  const skipId = selfId();
  const obsMap = obs && obs.map != null ? String(obs.map) : "";
  const out: NearbySendTarget[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < list.length; i++) {
    const ent = list[i];
    if (!ent || !isFocusablePlayer(ent)) continue;
    if (isActuallyDead(ent) || ent.rip) continue;
    const name = ent.name ? String(ent.name).trim() : "";
    if (!name) continue;
    const id = ent.id != null ? String(ent.id) : name;
    if (skipId && id === skipId) continue;
    if (skipName && name.toLowerCase() === skipName) continue;
    if (obsMap && ent.map != null && String(ent.map) !== obsMap) continue;

    let dist: number | undefined;
    if (obs) {
      dist = simpleDistance(obs, ent);
      if (Number.isFinite(dist) && dist > SEND_ITEM_RANGE) continue;
    }

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const row: NearbySendTarget = { name, id };
    if (dist != null && Number.isFinite(dist)) row.dist = dist;
    out.push(row);
  }

  out.sort((a, b) => {
    const da = a.dist != null ? a.dist : 1e9;
    const db = b.dist != null ? b.dist : 1e9;
    if (da !== db) return da - db;
    return a.name.localeCompare(b.name);
  });
  return out;
}

/**
 * Quantity for one send: whole stack when `fp.q` is known, else 1.
 */
export function sendItemQuantity(fp: ItemFingerprint): number {
  if (fp.q != null && Number.isFinite(fp.q) && fp.q > 0) {
    return Math.floor(Number(fp.q));
  }
  return 1;
}

/**
 * Self-contained CODE for o:command → code_eval.
 * Uses stock `send_item(receiver, slot, quantity)` (socket `send`).
 */
export function buildSendItemScript(
  fp: ItemFingerprint,
  receiver: string,
  quantity?: number,
): string {
  const to = String(receiver || "").trim();
  if (!to) {
    return wrapCommandScript(`game_log("Send item aborted — no recipient");`);
  }
  const q =
    quantity != null ? Math.max(1, Math.floor(quantity)) : sendItemQuantity(fp);
  const preferSlot = Number(fp.slot) | 0;
  const mismatch = fingerprintCheckJs(fp, "it");
  const candMismatch = fingerprintCheckJs(fp, "__cand");
  return wrapCommandScript(
    [
      `var __slot=${preferSlot};`,
      `var it=character.items[__slot];`,
      `if(${mismatch}){`,
      `__slot=-1;`,
      `for(var __si=0;__si<character.items.length;__si++){`,
      `var __cand=character.items[__si];`,
      `if(!(${candMismatch})){__slot=__si;break;}`,
      `}`,
      `if(__slot<0){game_log(${lit("Send item aborted — item mismatch")});return;}`,
      `it=character.items[__slot];`,
      `}`,
      `var __q=Math.min(${q | 0},it&&it.q?it.q:1);`,
      `if(!__q)__q=1;`,
      `try{await send_item(${lit(to)},__slot,__q);}catch(__e){`,
      `game_log(${lit("Send item failed → " + to)}+(__e&&__e.reason?(" · "+__e.reason):""));`,
      `}`,
    ].join(""),
  );
}

/** Optimistic local bag clear when the full stack leaves. */
function patchObservingAfterSend(fp: ItemFingerprint, quantity: number): void {
  const obs = window.observing as
    { items?: Array<MailItem | null | undefined> } | null | undefined;
  if (!obs || !Array.isArray(obs.items)) return;
  const slot = findFingerprintSlot(obs.items, fp, null);
  if (slot < 0) return;
  const cur = obs.items[slot];
  const stack = cur && cur.q != null ? Number(cur.q) : 1;
  if (quantity >= stack) {
    obs.items[slot] = null;
  } else if (cur && cur.q != null) {
    obs.items[slot] = { ...cur, q: stack - quantity };
  }
  try {
    if (typeof window.render_inventory === "function") {
      window.render_inventory();
    }
  } catch {
    /* ignore */
  }
}

/**
 * Emit send_item CODE to the observed character.
 * Returns false when socket missing / empty receiver.
 */
export function sendItemCommand(
  fp: ItemFingerprint,
  receiver: string,
  quantity?: number,
): boolean {
  const to = String(receiver || "").trim();
  if (!to) return false;
  const q =
    quantity != null ? Math.max(1, Math.floor(quantity)) : sendItemQuantity(fp);
  const script = buildSendItemScript(fp, to, q);
  const ok = emitObserverCommand(script);
  if (!ok) return false;
  patchObservingAfterSend(fp, q);
  window.setTimeout(() => {
    try {
      refreshObservedInventory();
    } catch {
      /* best-effort */
    }
  }, 900);
  return true;
}
