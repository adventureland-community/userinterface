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
  lifesteal?: number;
  manasteal?: number;
  dreturn?: number;
  /** Reflect announce amount (damage:0 packet). Not the same as landed reflect hit. */
  reflect?: number;
  splash?: boolean;
  source?: string;
  damageType?: string;
  evade?: boolean;
  miss?: boolean;
  /** Soft avoid / other fail path (damage:0). */
  avoid?: boolean;
  /** Crit multiplier from packet (e.g. 2, 2.5) — not a boolean. */
  crit?: number;
  /** Lethal blow flag. */
  kill?: boolean;
  /** Skill was cleave/shadowstrike-style AoE. */
  aoe?: boolean;
  /** Projectile id — join to matching action. */
  pid?: string | number;
  at: number;
  raw?: any;
};

export type ActionEvent = {
  actor?: string;
  target?: string;
  source?: string;
  pid?: string | number;
  projectile?: string;
  eta?: number;
  damage?: number;
  heal?: number;
  at: number;
  raw?: any;
};

/** Stock `eval` packet — observers get animation snippets, never run them. */
export type EvalEvent = {
  code: string;
  at: number;
  raw?: any;
};

/** Caster-only `game_response` (string or `{ response }`). */
export type GameResponseEvent = {
  response: string;
  at: number;
  raw?: any;
};

/**
 * Nearby `ui` packet from `xy_emit`. Combat skills that skip `action`
 * (stomp, mluck, warcry, …) show up here; merchants/FX use other `type`s.
 */
export type UiEvent = {
  type: string;
  name?: string;
  from?: string;
  to?: string;
  id?: string;
  at: number;
  raw?: any;
};

function createChannel<T>(): {
  emit: (ev: T) => void;
  subscribe: (listener: (ev: T) => void) => () => void;
} {
  const listeners: Array<(ev: T) => void> = [];
  return {
    emit: (ev: T): void => {
      for (let i = 0; i < listeners.length; i++) listeners[i](ev);
    },
    subscribe: (listener: (ev: T) => void): () => void => {
      listeners.push(listener);
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    },
  };
}

const killCh = createChannel<KillEvent>();
const damageCh = createChannel<DamageEvent>();
const actionCh = createChannel<ActionEvent>();
const evalCh = createChannel<EvalEvent>();
const gameResponseCh = createChannel<GameResponseEvent>();
const uiCh = createChannel<UiEvent>();

let lastSocketId: string | null = null;
let hubStarted = false;
let pollTimer: number | null = null;

function onDeath(data: any): void {
  if (!data || data.id == null) return;
  killCh.emit({
    id: String(data.id),
    luckm: data.luckm,
    at: Date.now(),
  });
}

function onHit(data: any): void {
  if (!data) return;
  const at = Date.now();
  const ev: DamageEvent = {
    actor:
      data.hid != null
        ? String(data.hid)
        : data.actor != null
          ? String(data.actor)
          : undefined,
    target:
      data.id != null
        ? String(data.id)
        : data.target != null
          ? String(data.target)
          : undefined,
    source: data.source != null ? String(data.source) : undefined,
    splash: !!data.splash,
    damageType: data.damage_type != null ? String(data.damage_type) : undefined,
    evade: !!data.evade,
    miss: !!data.miss,
    avoid: !!data.avoid,
    aoe: !!data.aoe,
    kill: !!data.kill,
    at,
    raw: data,
  };

  if (data.heal !== undefined) {
    ev.heal = Math.abs(Number(data.heal) || 0);
  }
  if (data.damage !== undefined) {
    ev.damage = Math.abs(Number(data.damage) || 0);
  }
  if (data.lifesteal) ev.lifesteal = Math.abs(Number(data.lifesteal) || 0);
  if (data.manasteal) ev.manasteal = Math.abs(Number(data.manasteal) || 0);
  if (data.dreturn) ev.dreturn = Math.abs(Number(data.dreturn) || 0);
  // Reflect announce packets use numeric reflect amount with damage:0
  if (data.reflect && typeof data.reflect === "number") {
    ev.reflect = Math.abs(data.reflect);
  }
  if (data.crit != null && Number(data.crit) > 1) {
    ev.crit = Number(data.crit);
  }
  if (data.pid != null) ev.pid = data.pid;

  damageCh.emit(ev);
}

function onAction(data: any): void {
  if (!data) return;
  const at = Date.now();
  const ev: ActionEvent = {
    actor:
      data.attacker != null
        ? String(data.attacker)
        : data.hid != null
          ? String(data.hid)
          : data.actor != null
            ? String(data.actor)
            : undefined,
    target:
      data.target != null
        ? String(data.target)
        : data.id != null
          ? String(data.id)
          : undefined,
    source:
      data.source != null
        ? String(data.source)
        : data.type != null
          ? String(data.type)
          : undefined,
    projectile: data.projectile != null ? String(data.projectile) : undefined,
    eta: data.eta != null ? Number(data.eta) : undefined,
    at,
    raw: data,
  };
  if (data.pid != null) ev.pid = data.pid;
  if (data.damage !== undefined) {
    ev.damage = Math.abs(Number(data.damage) || 0);
  }
  if (data.heal !== undefined) {
    ev.heal = Math.abs(Number(data.heal) || 0);
  }
  actionCh.emit(ev);
}

function evalCodeFromPacket(data: any): string {
  if (typeof data === "string") return data;
  if (data && data.code != null) return String(data.code);
  return "";
}

function onEval(data: any): void {
  const code = evalCodeFromPacket(data);
  if (!code) return;
  evalCh.emit({ code, at: Date.now(), raw: data });
}

function responseFromPacket(data: any): string {
  if (typeof data === "string") return data;
  if (data && data.response != null) return String(data.response);
  return "";
}

function onGameResponse(data: any): void {
  const response = responseFromPacket(data);
  if (!response) return;
  gameResponseCh.emit({ response, at: Date.now(), raw: data });
}

function hintString(v: unknown): string | undefined {
  if (v == null || v === "") return undefined;
  return String(v);
}

function onUi(data: any): void {
  if (!data || data.type == null || data.type === "") return;
  uiCh.emit({
    type: String(data.type),
    name: hintString(data.name),
    from: hintString(data.from),
    to: hintString(data.to),
    id: hintString(data.id),
    at: Date.now(),
    raw: data,
  });
}

function maybeResubscribe(): void {
  const socket = getSocket();
  if (!socket || !socket.id) return;
  if (socket.id === lastSocketId) return;
  lastSocketId = socket.id;
  socket.on("death", onDeath);
  socket.on("hit", onHit);
  socket.on("action", onAction);
  socket.on("eval", onEval);
  socket.on("game_response", onGameResponse);
  socket.on("ui", onUi);
}

export const onKill = killCh.subscribe;
export const onDamage = damageCh.subscribe;
export const onActionSubscribe = actionCh.subscribe;
export const onEvalSubscribe = evalCh.subscribe;
export const onGameResponseSubscribe = gameResponseCh.subscribe;
export const onUiSubscribe = uiCh.subscribe;

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
