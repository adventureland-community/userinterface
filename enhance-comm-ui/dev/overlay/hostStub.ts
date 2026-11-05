/**
 * Minimal Adventure.land /comm host so CommUI can mount without the game client.
 */

import { latestChangelogId } from "../../src/lib/changelog";
import type { EntityLike } from "../../src/host/globals";
import { isStockHostReady } from "./bootStockHost";
import { buildPreviewG } from "./gStub";
import { setHostMapName } from "./fakePixi";
import {
  adoptLiveGameData,
  ensureSpriteApis,
  hasLiveG,
  prepareGameData,
  type GameDataSource,
} from "./spriteApis";

/** Stock sets sprite.name = sprite.id — use the display name as id. */
export const PREVIEW_PLAYER_ID = "Preview";
export const PREVIEW_PARTY = "Preview";

const SETTINGS_KEY = "al-comm-ui-settings-v1";
const DATA_JS = "/al/data.js";
const CLIENT_KIT = "/al/client-kit.js";

export type PreviewPlayer = EntityLike & {
  id: string;
  name: string;
  type: "character";
  player: true;
  ctype: string;
  visible: true;
  dead: false;
};

function seedPreviewSettings(): void {
  let parsed: Record<string, unknown> = {};
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (raw) parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    parsed = {};
  }
  if (!parsed || typeof parsed !== "object") parsed = {};
  parsed.setupWizardDone = true;
  if (typeof parsed.changelogSeenId !== "string" || !parsed.changelogSeenId) {
    parsed.changelogSeenId = latestChangelogId();
  }
  const visible =
    parsed.panelVisible && typeof parsed.panelVisible === "object"
      ? (parsed.panelVisible as Record<string, boolean>)
      : {};
  parsed.panelVisible = {
    ...visible,
    instance: true,
    instanceRun: true,
    abilityTimeline: true,
    abilityTimelineBigIcon: true,
    abilityTimelineHighlight: true,
    bossBar: true,
  };
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src^="${src}"]`);
    if (existing && hasLiveG()) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("failed " + src));
    document.head.append(s);
  });
}

function markOverlayHost(): void {
  (window as any).__ecuOverlayPreview = true;
  if (typeof (window as any).__ecuAssetOrigin !== "string") {
    (window as any).__ecuAssetOrigin = "";
  }
}

function adoptOrFallback(): GameDataSource {
  if (!hasLiveG()) {
    window.G = buildPreviewG() as any;
    prepareGameData(window.G);
    ensureSpriteApis();
    return "stub";
  }
  adoptLiveGameData();
  ensureSpriteApis();
  return "live";
}

export async function ensureGameData(): Promise<GameDataSource> {
  markOverlayHost();
  if (!hasLiveG()) {
    try {
      await loadScript(DATA_JS);
      await loadScript(CLIENT_KIT);
    } catch {
      /* offline / cache missing */
    }
  }
  return adoptOrFallback();
}

export function makePreviewPlayer(): PreviewPlayer {
  return {
    id: PREVIEW_PLAYER_ID,
    name: "Preview",
    type: "character",
    player: true,
    ctype: "priest",
    level: 80,
    hp: 8200,
    max_hp: 12000,
    mp: 2400,
    max_mp: 4000,
    visible: true,
    dead: false,
    map: "main",
    in: "main",
    x: 0,
    y: 0,
    real_x: 0,
    real_y: 0,
    skin: "fpriest",
    party: PREVIEW_PARTY,
    gold: 2_450_000,
    items: [
      { name: "mpot1", q: 80 },
      { name: "hpot1", q: 120 },
      { name: "shoes", level: 7, q: 1 },
      { name: "helmet", level: 6, q: 1 },
      { name: "leather", q: 40 },
      { name: "fire", q: 12 },
      { name: "gloves", level: 4, q: 1 },
      { name: "pants", level: 5, q: 1 },
      { name: "scroll0", q: 30 },
      { name: "sword", level: 3, q: 1 },
      { name: "staff", level: 2, q: 1 },
      { name: "gem0", q: 2 },
      { name: "coat", level: 4, q: 1 },
      { name: "hpbelt", level: 5, q: 1 },
      { name: "cscroll0", q: 9 },
      { name: "scroll1", q: 18 },
      { name: "crabclaw", q: 14 },
      { name: "frogt", q: 6 },
      { name: "feather", q: 33 },
      { name: "wbook0", level: 2, q: 1 },
      { name: "strring", level: 3, q: 1 },
      null,
      { name: "intearring", level: 2, q: 1 },
      { name: "bow", level: 6, q: 1 },
      { name: "shield", level: 5, q: 1 },
      { name: "gem1", q: 1 },
      { name: "hpamulet", level: 3, q: 1 },
      { name: "mpamulet", level: 2, q: 1 },
      { name: "ringsj", level: 4, q: 1 },
      { name: "vitearring", level: 1, q: 1 },
      { name: "dexring", level: 2, q: 1 },
      { name: "orbofstr", level: 1, q: 1 },
      { name: "sshield", level: 3, q: 1 },
      { name: "basher", level: 5, q: 1 },
      { name: "fireblade", level: 4, q: 1 },
    ],
    __ecuBagSyncedAt: Date.now(),
  } as PreviewPlayer;
}

export function makePreviewParty(): PreviewPlayer[] {
  return [
    {
      id: "Brick",
      name: "Brick",
      type: "character",
      player: true,
      ctype: "warrior",
      level: 78,
      hp: 14000,
      max_hp: 16000,
      mp: 400,
      max_mp: 800,
      visible: true,
      dead: false,
      map: "main",
      in: "main",
      x: -40,
      y: 12,
      real_x: -40,
      real_y: 12,
      skin: "mwarrior",
      party: PREVIEW_PARTY,
    },
    {
      id: "Ember",
      name: "Ember",
      type: "character",
      player: true,
      ctype: "mage",
      level: 81,
      hp: 5200,
      max_hp: 6400,
      mp: 4800,
      max_mp: 6200,
      visible: true,
      dead: false,
      map: "main",
      in: "main",
      x: 36,
      y: 8,
      real_x: 36,
      real_y: 8,
      skin: "wmage",
      party: PREVIEW_PARTY,
    },
  ];
}

export function installPreviewHost(): {
  player: PreviewPlayer;
  party: PreviewPlayer[];
} {
  markOverlayHost();
  seedPreviewSettings();

  const player = makePreviewPlayer();
  const party = makePreviewParty();
  (window as any).is_comm = true;
  (window as any).user_id = "ecu-overlay-preview";
  (window as any).user_auth = "ecu-overlay-preview";
  window.character = null;
  // Phone overlay shots: keep Spike target frame off the map / sheets.
  (window as { __ecuFreezeTarget?: boolean }).__ecuFreezeTarget = true;
  window.server_region = "EU";
  window.server_identifier = "I";
  if (!window.S) window.S = {};
  // Stock game.js owns entities/map/observing after boot — don't wipe sprites.
  if (!isStockHostReady()) {
    window.observing = player;
    window.entities = { [player.id]: player };
    window.xtarget = null;
    window.current_map = "main";
    window.current_in = "main";
    setHostMapName("main");
  }
  // Inventory painter so Bag panel shows real item sprites in overlay.
  if (typeof window.render_inventory !== "function") {
    window.render_inventory = function previewRenderInventory() {
      const host =
        document.getElementById("bottomleftcorner") ||
        document.getElementById("comm-bag-mount");
      if (!host) return;
      const items = Array.isArray((window.observing as any)?.items)
        ? ((window.observing as any).items as Array<{
            name?: string;
            q?: number;
            level?: number;
          } | null>)
        : [];
      const G = (window as any).G;
      const itemContainer =
        typeof (window as any).item_container === "function"
          ? ((window as any).item_container as (
              item: any,
              actual?: any,
            ) => string)
          : null;
      let html =
        '<div class="ecu-preview-bag" style="display:grid;grid-template-columns:repeat(7,minmax(48px,1fr));gap:5px;padding:6px">';
      for (let i = 0; i < Math.max(42, items.length); i++) {
        const it = items[i];
        if (!it || !it.name) {
          html +=
            '<div style="min-height:52px;border:1px solid #333;background:#111;border-radius:6px"></div>';
          continue;
        }
        const name = String(it.name);
        const def = G && G.items ? G.items[name] : null;
        const skin =
          (def && (def.skin_a || def.skin)) ||
          (G && G.positions && G.positions[name] ? name : null) ||
          name;
        const title =
          name +
          (it.level != null ? " +" + it.level : "") +
          (it.q != null && it.q > 1 ? " ×" + it.q : "");
        let inner = "";
        if (itemContainer) {
          try {
            inner = itemContainer(
              {
                skin,
                size: 40,
                level: it.level,
                q: it.q,
                onclick: "pcs(event)",
              },
              it,
            );
          } catch {
            inner = "";
          }
        }
        if (!inner) {
          const short = name.length > 7 ? name.slice(0, 6) + "…" : name;
          const meta =
            (it.level != null ? "+" + it.level : "") +
            (it.q != null && it.q > 1 ? "×" + it.q : "");
          inner =
            '<span style="font-size:11px;line-height:1.15;color:#eee;text-align:center">' +
            short +
            (meta ? " " + meta : "") +
            "</span>";
        }
        // Stock item_container already paints qty/level — skip extra badges.
        html +=
          '<div title="' +
          title.replace(/"/g, "") +
          '" style="position:relative;min-height:52px;border:1px solid #555;background:#1a1a1a;border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center">' +
          inner +
          "</div>";
      }
      html += "</div>";
      host.innerHTML = html;
      window.inventory = true;
    };
  }
  window.X = {
    characters: [
      {
        name: player.name,
        id: player.id,
        type: player.ctype,
        skin: player.skin,
        level: player.level,
        online: true,
        server: "EU_I",
        rip: false,
      },
    ],
    servers: [
      {
        key: "EU_I",
        region: "EU",
        name: "I",
        players: 18,
        address: "127.0.0.1",
        path: "",
      },
      {
        key: "EU_II",
        region: "EU",
        name: "II",
        players: 42,
        address: "127.0.0.1",
        path: "",
      },
      {
        key: "US_I",
        region: "US",
        name: "I",
        players: 31,
        address: "127.0.0.1",
        path: "",
      },
    ],
    unread: 1,
  };
  (window as any).server_to_ui = function (key: string) {
    if (key === "EU_I") return "EU I";
    if (key === "EU_II") return "EU II";
    if (key === "US_I") return "US I";
    return key || "";
  };
  window.socket = {
    id: "ecu-overlay-preview",
    on: function () {},
    emit: function () {},
  };
  (window as any).pings = [38, 42, 40, 45, 41];
  if (typeof window.simple_distance !== "function") {
    window.simple_distance = function (a: any, b: any) {
      const ax = a?.real_x ?? a?.x ?? 0;
      const ay = a?.real_y ?? a?.y ?? 0;
      const bx = b?.real_x ?? b?.x ?? 0;
      const by = b?.real_y ?? b?.y ?? 0;
      const dx = ax - bx;
      const dy = ay - by;
      return Math.sqrt(dx * dx + dy * dy);
    };
  }
  if (typeof window.calculate_difficulty !== "function") {
    window.calculate_difficulty = function () {
      return 0;
    };
  }

  return { player, party };
}
