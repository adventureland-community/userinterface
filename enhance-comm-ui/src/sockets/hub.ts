import { getSocket } from "../host/al";

export type KillEvent = {
  id: string;
  luckm?: number;
  at: number;
};

export type DamageEvent = {
  actor?: string;
  target?: string;
  damage?: number;
  heal?: number;
  source?: string;
  at: number;
  raw?: any;
};

type KillListener = (ev: KillEvent) => void;
type DamageListener = (ev: DamageEvent) => void;

const killListeners: KillListener[] = [];
const damageListeners: DamageListener[] = [];

let lastSocketId: string | null = null;
let hubStarted = false;
let pollTimer: number | null = null;

function emitKill(ev: KillEvent): void {
  for (let i = 0; i < killListeners.length; i++) {
    killListeners[i](ev);
  }
}

function emitDamage(ev: DamageEvent): void {
  for (let i = 0; i < damageListeners.length; i++) {
    damageListeners[i](ev);
  }
}

function onDeath(data: any): void {
  if (!data || data.id == null) return;
  emitKill({
    id: String(data.id),
    luckm: data.luckm,
    at: Date.now(),
  });
}

function onHit(data: any): void {
  if (!data) return;
  const at = Date.now();
  const ev: DamageEvent = {
    actor: data.hid != null ? String(data.hid) : data.actor != null ? String(data.actor) : undefined,
    target: data.id != null ? String(data.id) : data.target != null ? String(data.target) : undefined,
    at,
    raw: data,
  };
  if (data.heal !== undefined) {
    ev.heal = Math.abs(Number(data.heal) || 0);
  } else if (data.damage !== undefined) {
    ev.damage = Math.abs(Number(data.damage) || 0);
  }
  if (data.evade || data.miss || data.reflect) {
    // still emit for completeness; combatMeter can ignore zero damage
  }
  emitDamage(ev);
}

function onAction(data: any): void {
  if (!data) return;
  // action is intent; hit carries resolved damage — keep for potential future use
  void data;
}

function maybeResubscribe(): void {
  const socket = getSocket();
  if (!socket || !socket.id) return;
  if (socket.id === lastSocketId) return;
  lastSocketId = socket.id;
  socket.on("death", onDeath);
  socket.on("hit", onHit);
  socket.on("action", onAction);
}

export function onKill(listener: KillListener): () => void {
  killListeners.push(listener);
  return () => {
    const idx = killListeners.indexOf(listener);
    if (idx >= 0) killListeners.splice(idx, 1);
  };
}

export function onDamage(listener: DamageListener): () => void {
  damageListeners.push(listener);
  return () => {
    const idx = damageListeners.indexOf(listener);
    if (idx >= 0) damageListeners.splice(idx, 1);
  };
}

/** Boot once; tracks socket.id reconnect and fans out typed events. */
export function startSocketHub(): () => void {
  if (hubStarted) {
    return () => {};
  }
  hubStarted = true;
  maybeResubscribe();
  pollTimer = window.setInterval(maybeResubscribe, 500);
  return () => {
    if (pollTimer != null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
    hubStarted = false;
    lastSocketId = null;
  };
}
