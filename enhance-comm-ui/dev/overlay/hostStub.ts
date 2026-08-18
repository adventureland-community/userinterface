/**
 * Minimal Adventure.land /comm host so CommUI can mount without the game client.
 */

import { latestChangelogId } from "../../src/lib/changelog";
import type { EntityLike } from "../../src/host/globals";
import { buildPreviewG } from "./gStub";
import { setHostMapName } from "./fakePixi";
import {
  adoptLiveGameData,
  ensureSpriteApis,
  hasLiveG,
  prepareGameData,
  type GameDataSource,
} from "./spriteApis";

export const PREVIEW_PLAYER_ID = "ecu-sim-player";
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
  };
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
  window.character = null;
  window.observing = player;
  window.entities = { [player.id]: player };
  window.xtarget = null;
  window.current_map = "main";
  window.current_in = "main";
  setHostMapName("main");
  window.server_region = "EU";
  window.server_identifier = "I";
  window.S = {};
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
    ],
    unread: 0,
  };
  window.socket = {
    id: "ecu-overlay-preview",
    on: function () {},
    emit: function () {},
  };
  (window as any).pings = [38, 42, 40, 45, 41];
  (window as any).server_to_ui = function (key: string) {
    if (key === "EU_I") return "EU I";
    return key || "";
  };
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
