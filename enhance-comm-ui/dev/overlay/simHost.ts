/**
 * Push instance-sim entities onto the preview host (window.entities / map).
 * When stock game.js is loaded, uses add_character / add_monster so ECU
 * nameplates and FOV hit the real host path.
 */

import type { EntityLike } from "../../src/host/globals";
import {
  applyInstanceSim,
  getInstanceSimInstanceId,
  getInstanceSimMapOverride,
  isInstanceSimActive,
} from "../../src/debug/instanceSim";
import type { PreviewPlayer } from "./hostStub";
import { setHostMapName } from "./fakePixi";
import { isStockHostReady } from "./bootStockHost";

const IDLE_MAP = "main";

type StockApi = {
  add_character?: (data: Record<string, unknown>, me?: boolean) => EntityLike;
  add_monster?: (data: Record<string, unknown>) => EntityLike;
  name_logic?: (el: EntityLike) => void;
  destroy_sprite?: (sprite: EntityLike, mode?: string) => void;
  create_map?: () => void;
  current_map?: string;
  map?: { map_name?: string; real_x?: number; real_y?: number; addChild?: unknown };
};

function stock(): StockApi {
  return window as unknown as StockApi;
}

function ensureMap(mapName: string, instanceId: string): void {
  const w = stock();
  const host = window as {
    current_map?: string;
    current_in?: string;
    M?: unknown;
    GEO?: unknown;
    G?: {
      maps?: Record<string, { data?: unknown }>;
      geometry?: Record<string, unknown>;
    };
  };
  const pools = window as {
    tile_sprites?: Record<string, unknown[][]>;
    tile_textures?: Record<string, unknown[][]>;
    sprite_last?: Record<string, unknown[]>;
  };
  // Read before any rename — setHostMapName must not flip map_name ahead of
  // create_map or we skip rebuild and keep main textures under a crypt name.
  const existingName =
    w.map && typeof w.map.map_name === "string" ? w.map.map_name : null;

  let poisoned = false;
  const sprites = pools.tile_sprites && pools.tile_sprites[mapName];
  const textures = pools.tile_textures && pools.tile_textures[mapName];
  if (sprites) {
    if (!(pools.sprite_last && Array.isArray(pools.sprite_last[mapName]))) {
      poisoned = true;
    } else if (Array.isArray(textures)) {
      let anyTex = false;
      for (let i = 0; i < textures.length; i++) {
        if (textures[i] && textures[i].length > 0) {
          anyTex = true;
          break;
        }
      }
      if (textures.length > 0 && !anyTex) poisoned = true;
    }
  }
  if (poisoned) {
    delete pools.tile_sprites![mapName];
    if (pools.tile_textures) delete pools.tile_textures[mapName];
    if (pools.sprite_last) delete pools.sprite_last[mapName];
  }

  const needsCreate =
    poisoned ||
    existingName !== mapName ||
    !(pools.tile_sprites && pools.tile_sprites[mapName]);

  host.current_map = mapName;
  host.current_in = instanceId;
  const G = host.G;
  if (G && G.maps && G.maps[mapName] && G.geometry && G.geometry[mapName]) {
    host.M = G.maps[mapName].data;
    host.GEO = G.geometry[mapName];
  }

  if (!needsCreate) return;

  if (typeof w.create_map === "function" && isStockHostReady()) {
    try {
      w.create_map();
    } catch (err) {
      console.warn("[ecu] create_map failed", err);
    }
    return;
  }
  // Pre-stock / fake map stub only.
  setHostMapName(mapName);
}

function upsertCharacter(
  data: Record<string, unknown>,
  existing: EntityLike | undefined,
): EntityLike | null {
  const w = stock();
  if (typeof w.add_character !== "function") return null;
  if (existing && existing.type === "character") {
    const x = Number(data.x ?? data.real_x ?? 0);
    const y = Number(data.y ?? data.real_y ?? 0);
    existing.real_x = x;
    existing.real_y = y;
    existing.x = x;
    existing.y = y;
    existing.map = data.map as string;
    existing.in = data.in as string;
    existing.dead = false;
    if (data.hp != null) existing.hp = data.hp as number;
    if (data.max_hp != null) existing.max_hp = data.max_hp as number;
    if (typeof w.name_logic === "function") w.name_logic(existing);
    return existing;
  }
  try {
    const sprite = w.add_character(data) as EntityLike & {
      drawn?: boolean;
      resync?: boolean;
    };
    sprite.drawn = false;
    sprite.resync = true;
    if (typeof w.name_logic === "function") w.name_logic(sprite);
    return sprite;
  } catch (err) {
    console.warn("[ecu] add_character failed", data.id, err);
    return null;
  }
}

function upsertMonster(
  data: Record<string, unknown>,
  existing: EntityLike | undefined,
): EntityLike | null {
  const w = stock();
  if (typeof w.add_monster !== "function") return null;
  if (existing && existing.type === "monster") {
    const x = Number(data.x ?? data.real_x ?? 0);
    const y = Number(data.y ?? data.real_y ?? 0);
    existing.real_x = x;
    existing.real_y = y;
    existing.x = x;
    existing.y = y;
    existing.map = data.map as string;
    existing.in = data.in as string;
    existing.dead = false;
    if (data.hp != null) existing.hp = data.hp as number;
    return existing;
  }
  try {
    const payload = {
      ...data,
      type: data.mtype || data.type,
      id: data.id,
    };
    const sprite = w.add_monster(payload) as EntityLike & {
      drawn?: boolean;
      resync?: boolean;
    };
    sprite.drawn = false;
    sprite.resync = true;
    return sprite;
  } catch (err) {
    console.warn("[ecu] add_monster failed", data.id, err);
    return null;
  }
}

function syncViaStock(
  player: PreviewPlayer,
  party: PreviewPlayer[],
  map: string,
  instanceId: string,
): void {
  ensureMap(map, instanceId);
  player.map = map;
  player.in = instanceId;

  const ents =
    (window.entities as Record<string, EntityLike | undefined>) ||
    ((window.entities = {}) as Record<string, EntityLike | undefined>);

  const keep = new Set<string>();

  const playerData: Record<string, unknown> = {
    id: player.id,
    name: player.name,
    skin: player.skin || "fpriest",
    ctype: player.ctype,
    level: player.level,
    hp: player.hp,
    max_hp: player.max_hp,
    mp: player.mp,
    max_mp: player.max_mp,
    x: player.real_x ?? player.x ?? 0,
    y: player.real_y ?? player.y ?? 0,
    map,
    in: instanceId,
    player: true,
    cx: {},
    slots: {},
    c: {},
    s: {},
  };
  const self = upsertCharacter(playerData, ents[String(player.id)]);
  if (self) {
    ents[String(player.id)] = self;
    keep.add(String(player.id));
    window.observing = self;
    const m = stock().map;
    if (m) {
      m.real_x = Number(self.real_x ?? 0);
      m.real_y = Number(self.real_y ?? 0);
    }
  }

  for (let i = 0; i < party.length; i++) {
    const mate = party[i];
    mate.map = map;
    mate.in = instanceId;
    const data: Record<string, unknown> = {
      id: mate.id,
      name: mate.name,
      skin: mate.skin || "mwarrior",
      ctype: mate.ctype,
      level: mate.level,
      hp: mate.hp,
      max_hp: mate.max_hp,
      mp: mate.mp,
      max_mp: mate.max_mp,
      x: mate.real_x ?? mate.x ?? 0,
      y: mate.real_y ?? mate.y ?? 0,
      map,
      in: instanceId,
      player: true,
      cx: {},
      slots: {},
      c: {},
      s: {},
    };
    const spr = upsertCharacter(data, ents[String(mate.id)]);
    if (spr) {
      ents[String(mate.id)] = spr;
      keep.add(String(mate.id));
    }
  }

  if (isInstanceSimActive()) {
    const seed: EntityLike[] = [player];
    for (let i = 0; i < party.length; i++) seed.push(party[i]);
    const merged = applyInstanceSim({
      entities: seed,
      observing: player,
      observingId: String(player.id),
      target: undefined,
      S: window.S,
      serverRegion: window.server_region,
      serverIdentifier: window.server_identifier,
      now: Date.now(),
    });
    let focus: EntityLike | undefined;
    for (let i = 0; i < merged.entities.length; i++) {
      const ent = merged.entities[i];
      if (!ent || ent.id == null) continue;
      const id = String(ent.id);
      if (id === String(player.id)) continue;
      let isParty = false;
      for (let p = 0; p < party.length; p++) {
        if (String(party[p].id) === id) {
          isParty = true;
          break;
        }
      }
      if (isParty) continue;

      if (ent.type === "monster" || ent.mtype) {
        const data: Record<string, unknown> = {
          id: ent.id,
          type: ent.mtype || ent.type,
          mtype: ent.mtype,
          skin: (ent as { skin?: string }).skin,
          x: ent.real_x ?? ent.x ?? 0,
          y: ent.real_y ?? ent.y ?? 0,
          hp: ent.hp,
          max_hp: ent.max_hp,
          map,
          in: instanceId,
          target: ent.target,
          cooperative: ent.cooperative,
          s: (ent as { s?: Record<string, unknown> }).s || {},
        };
        const spr = upsertMonster(data, ents[id]);
        if (spr) {
          ents[id] = spr;
          keep.add(id);
          if (
            !focus &&
            spr.visible !== false &&
            !spr.dead &&
            (ent.target === player.id || ent.cooperative)
          ) {
            focus = spr;
          }
        }
      }
    }
    if (focus && !(window as { __ecuFreezeTarget?: boolean }).__ecuFreezeTarget) {
      (window.observing as { target?: unknown }).target = focus.id;
      window.xtarget = focus;
    } else if ((window as { __ecuFreezeTarget?: boolean }).__ecuFreezeTarget) {
      if (window.observing) {
        try {
          delete (window.observing as { target?: unknown }).target;
        } catch {
          /* ignore */
        }
      }
      window.xtarget = null;
    }
  }

  const ids = Object.keys(ents);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (keep.has(id)) continue;
    const gone = ents[id];
    if (gone && typeof stock().destroy_sprite === "function") {
      try {
        stock().destroy_sprite!(gone, "just");
      } catch {
        /* ignore */
      }
    }
    delete ents[id];
  }
}

/** Fallback when stock game.js is not ready yet. */
function syncPlain(
  player: PreviewPlayer,
  party: PreviewPlayer[],
  map: string,
  instanceId: string,
): void {
  player.map = map;
  player.in = instanceId;
  window.observing = player;
  window.current_map = map;
  window.current_in = instanceId;
  setHostMapName(map);

  const seed: EntityLike[] = [player];
  for (let i = 0; i < party.length; i++) {
    const mate = party[i];
    mate.map = map;
    mate.in = instanceId;
    seed.push(mate);
  }

  const rec: Record<string, EntityLike> = {};
  rec[String(player.id)] = player;

  if (isInstanceSimActive()) {
    const merged = applyInstanceSim({
      entities: seed,
      observing: player,
      observingId: String(player.id),
      target: undefined,
      S: window.S,
      serverRegion: window.server_region,
      serverIdentifier: window.server_identifier,
      now: Date.now(),
    });
    let focus: EntityLike | undefined;
    for (let i = 0; i < merged.entities.length; i++) {
      const ent = merged.entities[i];
      if (!ent || ent.id == null) continue;
      rec[String(ent.id)] = ent;
      if (
        !focus &&
        ent.type === "monster" &&
        ent.visible &&
        !ent.dead &&
        (ent.target === player.id || ent.cooperative)
      ) {
        focus = ent;
      }
    }
    if (focus && !(window as { __ecuFreezeTarget?: boolean }).__ecuFreezeTarget) {
      player.target = focus.id;
      window.xtarget = focus;
    } else if ((window as { __ecuFreezeTarget?: boolean }).__ecuFreezeTarget) {
      player.target = undefined;
      window.xtarget = null;
    }
  } else {
    for (let i = 0; i < seed.length; i++) {
      const ent = seed[i];
      rec[String(ent.id)] = ent;
    }
    player.target = undefined;
    window.xtarget = null;
  }

  window.entities = rec;
}

export function syncSimToHost(
  player: PreviewPlayer,
  party: PreviewPlayer[],
): void {
  const simMap = getInstanceSimMapOverride();
  const simIn = getInstanceSimInstanceId();
  const map = simMap || IDLE_MAP;
  const instanceId = simIn || IDLE_MAP;

  if (isStockHostReady()) {
    syncViaStock(player, party, map, instanceId);
    return;
  }
  syncPlain(player, party, map, instanceId);
}
