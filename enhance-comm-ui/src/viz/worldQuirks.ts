import { getCurrentMap, getG, getMapName, getSocket } from "../host/al";
import {
  hideCommHover,
  showCommHover,
  showCommNotice,
  type CommNotice,
} from "../host/commNotice";
import type {
  ContainerLike,
  GraphicsLike,
  RectLike,
  SpriteLike,
} from "./mapHost";
import { getHostMap, getHostPixi } from "./mapHost";
import { strokeRect } from "./paintGfx";
import type { VizSettings } from "./vizSettings";

export type WorldQuirk = [number, number, number, number, string, string?];

const HELP_CURSOR_EXCLUDE = new Set(["upgrade", "compound"]);
const SUPPORTED_TYPES = new Set([
  "sign",
  "note",
  "tavern_info",
  "mainframe",
  "the_lever",
  "log",
  "upgrade",
  "compound",
  "list_pvp",
  "invisible_statue",
]);
const PIXI4_OVER_EVENTS = ["mouseover", "pointerover"];
const PIXI4_OUT_EVENTS = ["mouseout", "pointerout"];
const PIXI4_MOVE_EVENTS = ["mousemove", "pointermove"];
const PIXI4_DOWN_EVENTS = ["rightdown", "mousedown", "touchstart"];

let hoveredQuirk: WorldQuirk | null = null;
let syncedSignature = "";

function stopEvent(event: unknown): void {
  const ev = event as { stopPropagation?: () => void } | null | undefined;
  try {
    ev?.stopPropagation?.();
  } catch {
    /* ignore host event oddities */
  }
}

export function isSupportedWorldQuirkType(
  type: string | null | undefined,
): boolean {
  return typeof type === "string" && SUPPORTED_TYPES.has(type);
}

export function getCurrentWorldQuirks(): WorldQuirk[] {
  const map = getCurrentMap() || getMapName();
  if (!map) return [];
  const quirks = getG()?.maps?.[map]?.quirks;
  if (!Array.isArray(quirks)) return [];
  const out: WorldQuirk[] = [];
  for (let i = 0; i < quirks.length; i++) {
    const quirk = quirks[i];
    if (!Array.isArray(quirk) || quirk.length < 5) continue;
    const type = typeof quirk[4] === "string" ? quirk[4] : "";
    if (!isSupportedWorldQuirkType(type)) continue;
    const x = Number(quirk[0]);
    const y = Number(quirk[1]);
    const w = Number(quirk[2]);
    const h = Number(quirk[3]);
    if (![x, y, w, h].every(Number.isFinite)) continue;
    out.push([
      x,
      y,
      w,
      h,
      type,
      typeof quirk[5] === "string" ? quirk[5] : undefined,
    ]);
  }
  return out;
}

function quirksSignature(map: string, quirks: WorldQuirk[]): string {
  return `${map}|${JSON.stringify(quirks)}`;
}

export function quirkWorldRect(quirk: WorldQuirk): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  const w = Math.round(quirk[2]);
  const h = Math.round(quirk[3]);
  const x = Math.round(quirk[0]) - Math.round(w * 0.5);
  const y = Math.round(quirk[1]) - h;
  return { x, y, w, h };
}

export function quirkHoverText(quirk: WorldQuirk): string | null {
  const type = quirk[4];
  const value = quirk[5] || "";
  switch (type) {
    case "sign":
      return value ? `Sign: "${value}"` : "Sign";
    case "note":
      return value ? `Note: "${value}"` : "Note";
    case "log":
      return value || "Log";
    case "tavern_info":
      return "Tavern info";
    case "mainframe":
      return "Mainframe";
    case "the_lever":
      return "Lever";
    case "upgrade":
      return "Upgrade shrine";
    case "compound":
      return "Compound shrine";
    case "list_pvp":
      return "PvP list";
    case "invisible_statue":
      return "Invisible statue";
    default:
      return null;
  }
}

export function quirkKey(quirk: WorldQuirk): string {
  return `${quirk[0]}|${quirk[1]}|${quirk[2]}|${quirk[3]}|${quirk[4]}|${quirk[5] || ""}`;
}

export function isHoveredWorldQuirk(quirk: WorldQuirk): boolean {
  return hoveredQuirk != null && quirkKey(hoveredQuirk) === quirkKey(quirk);
}

export function commNoticeFromQuirk(quirk: WorldQuirk): CommNotice | null {
  const type = quirk[4];
  const value = quirk[5] || "";
  switch (type) {
    case "sign":
      return { title: "Sign", body: value || "(blank)" };
    case "note":
      return { title: "Note", body: value || "(blank)" };
    case "log":
      return { title: "Notice", body: value || "(blank)" };
    case "invisible_statue":
      return { title: "Statue", body: "An invisible statue!" };
    default:
      return null;
  }
}

type PointerOnMap = {
  mapX: number;
  mapY: number;
  clientX: number;
  clientY: number;
};

function eventGlobalXY(event: unknown): { x: number; y: number } | null {
  const ev = event as {
    data?: { global?: { x?: number; y?: number } };
  } | null;
  const global = ev?.data?.global;
  if (typeof global?.x === "number" && typeof global?.y === "number") {
    return { x: global.x, y: global.y };
  }
  return null;
}

function eventClientXY(event: unknown): { x: number; y: number } | null {
  const ev = event as {
    data?: {
      originalEvent?: { clientX?: number; clientY?: number };
      global?: { x?: number; y?: number };
    };
    clientX?: number;
    clientY?: number;
  } | null;
  const orig = ev?.data?.originalEvent;
  if (typeof orig?.clientX === "number" && typeof orig?.clientY === "number") {
    return { x: orig.clientX, y: orig.clientY };
  }
  if (typeof ev?.clientX === "number" && typeof ev?.clientY === "number") {
    return { x: ev.clientX, y: ev.clientY };
  }
  const global = ev?.data?.global;
  if (typeof global?.x === "number" && typeof global?.y === "number") {
    const view = (window as { renderer?: { view?: HTMLElement } }).renderer
      ?.view;
    const rect = view?.getBoundingClientRect?.();
    return {
      x: (rect?.left ?? 0) + global.x,
      y: (rect?.top ?? 0) + global.y,
    };
  }
  return null;
}

function toMapLocal(global: { x: number; y: number }): {
  x: number;
  y: number;
} | null {
  const map = getHostMap();
  if (!map) return null;
  if (typeof map.toLocal === "function") {
    const local = map.toLocal(global);
    if (local && typeof local.x === "number" && typeof local.y === "number") {
      return { x: local.x, y: local.y };
    }
  }
  const scaleX = map.scale?.x || 1;
  const scaleY = map.scale?.y || 1;
  if (!scaleX || !scaleY) return null;
  return {
    x: (global.x - (map.x || 0)) / scaleX,
    y: (global.y - (map.y || 0)) / scaleY,
  };
}

function rendererPointer(): PointerOnMap | null {
  const renderer = (
    window as {
      renderer?: {
        view?: HTMLElement;
        plugins?: {
          interaction?: {
            mouseOverRenderer?: boolean;
            mouse?: { global?: { x: number; y: number } };
          };
        };
      };
    }
  ).renderer;
  const interaction = renderer?.plugins?.interaction;
  if (!interaction) return null;
  if (interaction.mouseOverRenderer === false) {
    return {
      mapX: Number.NaN,
      mapY: Number.NaN,
      clientX: 0,
      clientY: 0,
    };
  }
  const global = interaction.mouse?.global;
  if (!global || typeof global.x !== "number" || typeof global.y !== "number") {
    return null;
  }
  const local = toMapLocal(global);
  if (!local) return null;
  const rect = renderer?.view?.getBoundingClientRect?.();
  return {
    mapX: local.x,
    mapY: local.y,
    clientX: (rect?.left ?? 0) + global.x,
    clientY: (rect?.top ?? 0) + global.y,
  };
}

export function quirkContainsMapPoint(
  quirk: WorldQuirk,
  mapX: number,
  mapY: number,
): boolean {
  const rect = quirkWorldRect(quirk);
  return (
    mapX >= rect.x &&
    mapX <= rect.x + rect.w &&
    mapY >= rect.y &&
    mapY <= rect.y + rect.h
  );
}

export function findQuirkAtMapPoint(
  mapX: number,
  mapY: number,
): WorldQuirk | null {
  const quirks = getCurrentWorldQuirks();
  for (let i = quirks.length - 1; i >= 0; i--) {
    if (quirkContainsMapPoint(quirks[i], mapX, mapY)) return quirks[i];
  }
  return null;
}

function pointerHitsQuirk(quirk: WorldQuirk, event?: unknown): boolean {
  const global = eventGlobalXY(event);
  if (!global) return false;
  const local = toMapLocal(global);
  if (!local) return false;
  return quirkContainsMapPoint(quirk, local.x, local.y);
}

function clearHoveredQuirk(): void {
  hoveredQuirk = null;
  hideCommHover();
}

function setHoveredQuirk(
  quirk: WorldQuirk,
  client?: { x: number; y: number },
): void {
  hoveredQuirk = quirk;
  const text = quirkHoverText(quirk);
  if (!text || !client) {
    hideCommHover();
    return;
  }
  showCommHover(text, client.x, client.y);
}

/** Resolve hover from the live pointer. PIXI 4 can fire mouseover on every hotspot. */
export function refreshHoveredWorldQuirk(): void {
  const ptr = rendererPointer();
  if (!ptr) return;
  if (!Number.isFinite(ptr.mapX) || !Number.isFinite(ptr.mapY)) {
    if (hoveredQuirk) clearHoveredQuirk();
    return;
  }
  const hit = findQuirkAtMapPoint(ptr.mapX, ptr.mapY);
  if (!hit) {
    if (hoveredQuirk) clearHoveredQuirk();
    return;
  }
  setHoveredQuirk(hit, { x: ptr.clientX, y: ptr.clientY });
}

export function getHoveredWorldQuirk(): WorldQuirk | null {
  return hoveredQuirk;
}

export function activateWorldQuirk(
  quirk: WorldQuirk,
  event?: unknown,
): boolean {
  const type = quirk[4];
  const notice = commNoticeFromQuirk(quirk);
  const socket = getSocket();
  let handled = true;
  if (notice) {
    hideCommHover();
    showCommNotice(notice);
    if (type === "invisible_statue") window.render_none_shrine?.();
  } else if (type === "tavern_info") {
    socket?.emit?.("tavern", { event: "info" });
  } else if (type === "mainframe") {
    window.render_mainframe?.();
  } else if (type === "the_lever") {
    window.the_lever?.();
  } else if (type === "upgrade") {
    window.render_upgrade_shrine?.(1);
  } else if (type === "compound") {
    window.render_compound_shrine?.(1);
  } else if (type === "list_pvp") {
    socket?.emit?.("list_pvp");
  } else {
    handled = false;
  }
  if (handled) stopEvent(event);
  return handled;
}

function destroyChildren(container: ContainerLike): void {
  if (typeof container.removeChildren === "function") {
    const kids = container.children ? container.children.slice() : [];
    container.removeChildren();
    for (let i = 0; i < kids.length; i++) {
      const kid = kids[i] as SpriteLike;
      try {
        kid?.destroy?.();
      } catch {
        /* ignore */
      }
    }
    return;
  }
  if (typeof container.removeChild !== "function" || !container.children)
    return;
  while (container.children.length) {
    const kid = container.children[0] as SpriteLike;
    container.removeChild(kid);
    try {
      kid?.destroy?.();
    } catch {
      /* ignore */
    }
  }
}

function bindOn(
  sprite: SpriteLike,
  events: readonly string[],
  handler: (event?: unknown) => void,
): void {
  for (let i = 0; i < events.length; i++) sprite.on?.(events[i], handler);
}

function bindQuirkEvents(sprite: SpriteLike, quirk: WorldQuirk): void {
  bindOn(sprite, PIXI4_OVER_EVENTS, (event) => {
    if (eventGlobalXY(event) && !pointerHitsQuirk(quirk, event)) return;
    const client = eventClientXY(event);
    if (!client) return;
    setHoveredQuirk(quirk, client);
  });
  bindOn(sprite, PIXI4_MOVE_EVENTS, (event) => {
    if (eventGlobalXY(event) && !pointerHitsQuirk(quirk, event)) return;
    if (!isHoveredWorldQuirk(quirk) && eventGlobalXY(event)) return;
    const client = eventClientXY(event);
    if (!client) return;
    setHoveredQuirk(quirk, client);
  });
  bindOn(sprite, PIXI4_OUT_EVENTS, () => {
    if (isHoveredWorldQuirk(quirk)) clearHoveredQuirk();
  });
  bindOn(sprite, PIXI4_DOWN_EVENTS, (event) =>
    activateWorldQuirk(quirk, event),
  );
}

function makeRect(x: number, y: number, w: number, h: number): RectLike | null {
  const pixi = getHostPixi();
  if (!pixi || typeof pixi.Rectangle !== "function") return null;
  return new pixi.Rectangle(x, y, w, h);
}

function makeSprite(): SpriteLike | null {
  const pixi = getHostPixi();
  if (!pixi || typeof pixi.Sprite !== "function") return null;
  return new pixi.Sprite();
}

function quirkHotspot(quirk: WorldQuirk): SpriteLike | null {
  const sprite = makeSprite();
  if (!sprite) return null;
  sprite.interactive = true;
  sprite.buttonMode = true;
  const x = Math.round(quirk[0]);
  const y = Math.round(quirk[1]);
  const w = Math.round(quirk[2]);
  const h = Math.round(quirk[3]);
  sprite.x = x;
  sprite.y = y;
  sprite.anchor?.set?.(0.5, 1);
  sprite.hitArea = makeRect(-Math.round(w * 0.5), -h, w, h);
  const layer = window.player_layer;
  if (layer) {
    sprite.parentGroup = layer;
    sprite.displayGroup = layer;
  }
  if (!HELP_CURSOR_EXCLUDE.has(quirk[4])) sprite.cursor = "help";
  bindQuirkEvents(sprite, quirk);
  return sprite;
}

export function syncWorldQuirkHotspots(hotspots: ContainerLike): void {
  const map = getCurrentMap() || getMapName() || "";
  const quirks = getCurrentWorldQuirks();
  const signature = quirksSignature(map, quirks);
  if (
    signature === syncedSignature &&
    hotspots.children?.length === quirks.length
  ) {
    return;
  }
  syncedSignature = signature;
  hoveredQuirk = null;
  hideCommHover();
  destroyChildren(hotspots);
  hotspots.interactiveChildren = quirks.length > 0;
  for (let i = 0; i < quirks.length; i++) {
    const sprite = quirkHotspot(quirks[i]);
    if (sprite) hotspots.addChild(sprite);
  }
}

export function paintWorldQuirkDebug(
  gfx: GraphicsLike,
  settings: VizSettings,
): void {
  if (!settings["world.quirkHitboxes"]) return;
  const hovered = getHoveredWorldQuirk();
  if (!hovered) return;
  const rect = quirkWorldRect(hovered);
  strokeRect(gfx, rect.x, rect.y, rect.w, rect.h, 0xffcc66, 2, 0.95, 0.18);
}

/** Test helper — reset cached hotspot sync state. */
export function resetWorldQuirkHotspotCache(): void {
  hoveredQuirk = null;
  syncedSignature = "";
  hideCommHover();
}
