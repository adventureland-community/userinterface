/**
 * Overlay host stub for Adventure Land `add_name_tag` / `name_logic`.
 * Builds the same Graphics + Text tree stock uses so live ECU
 * `installNameplateSharpness` / `beautifyNameTag` restyle real plates.
 */

import {
  FakeContainer,
  FakeGraphics,
  FakeText,
  FakePoint,
  FakeSprite,
} from "./fakePixi";
import {
  STOCK_NAME_BORDER,
  STOCK_NAME_FILL,
} from "../../src/host/nameplateStyle";

type NameTagEntity = {
  id?: string | number;
  name?: string;
  type?: string;
  ctype?: string;
  level?: number;
  hp?: number;
  max_hp?: number;
  mp?: number;
  max_mp?: number;
  afk?: boolean;
  moving?: boolean;
  me?: boolean;
  npc?: unknown;
  aheight?: number;
  height?: number;
  width?: number;
  name_tag?: FakeSprite | null;
  ntag_cache?: string | null;
  children?: unknown[];
  addChild?: (...nodes: unknown[]) => void;
  removeChild?: (...nodes: unknown[]) => void;
};

function round(n: number): number {
  return Math.round(n);
}

function isPlayer(element: NameTagEntity): boolean {
  return element.type === "character" || !!(element as { player?: boolean }).player;
}

function ensureEntityDisplay(element: NameTagEntity): void {
  if (typeof element.addChild === "function") return;
  const kids: unknown[] = Array.isArray(element.children) ? element.children : [];
  element.children = kids;
  element.addChild = function (...nodes: unknown[]) {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!n) continue;
      kids.push(n);
      (n as { parent?: unknown }).parent = element;
    }
  };
  element.removeChild = function (...nodes: unknown[]) {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const idx = kids.indexOf(n);
      if (idx >= 0) kids.splice(idx, 1);
      if (n && (n as { parent?: unknown }).parent === element) {
        (n as { parent?: unknown }).parent = null;
      }
    }
  };
}

function destroySprite(sprite: FakeSprite | null | undefined): void {
  if (!sprite) return;
  const parent = sprite.parent as NameTagEntity | FakeContainer | null;
  if (parent && typeof parent.removeChild === "function") {
    parent.removeChild(sprite);
  }
  sprite.destroy({ children: true });
}

/**
 * Stock-faithful name plate (name band only — always_names path).
 * Structure: empty Sprite → Graphics plate + PIXI.Text children.
 */
export function add_name_tag(element: NameTagEntity): void {
  if (!element || (element.type !== "character" && element.type !== "npc")) {
    return;
  }
  const w = window as Window & {
    PIXI?: { Graphics?: unknown };
    SZ?: { font?: string };
    options?: { show_names?: boolean; always_names?: boolean; always_hpn?: boolean };
    xtarget?: unknown;
    ctarget?: unknown;
    mtarget?: unknown;
  };
  if (!w.PIXI) return;

  const bar = {
    color: "white",
    online: !!(isPlayer(element) && !element.afk),
  };
  const ntag_cache =
    String(element.name || "") + "|" + bar.color + "|" + bar.online;
  if (element.name_tag) {
    if (element.ntag_cache === ntag_cache) return;
    destroySprite(element.name_tag);
    element.name_tag = null;
  }
  element.ntag_cache = ntag_cache;

  const height = 9;
  const fontFamily = (w.SZ && w.SZ.font) || "pixel";
  const roundPixels = !element.moving || !!element.me;

  const name = new FakeText(String(element.name || element.id || "?"), {
    fontFamily,
    fontSize: 64,
    fill: bar.color,
    align: "center",
  });
  name.scale = new FakePoint(0.125, 0.125);
  name.anchor.set(0.5, 0);
  name.roundPixels = roundPixels;
  name.resolution = 1;
  name.remeasure();

  const width = round(name.width + 8);
  const plate = new FakeGraphics();
  plate.roundPixels = roundPixels;

  plate.beginFill(STOCK_NAME_BORDER);
  plate.drawRect(0, 0, width, height);
  plate.endFill();

  plate.beginFill(STOCK_NAME_FILL);
  plate.drawRect(1, 1, width - 2, height - 2);
  plate.endFill();

  if (bar.online) {
    plate.beginFill(0x6ec344);
    plate.drawRect(1, 1, 1, height - 2);
    plate.endFill();
    plate.beginFill(0x6ec344);
    plate.drawRect(width - 2, 1, 1, height - 2);
    plate.endFill();
  }

  const aheight =
    typeof element.aheight === "number" && element.aheight > 0
      ? element.aheight
      : typeof element.height === "number" && element.height > 0
        ? element.height
        : 16;
  plate.x = -round(width / 2);
  plate.y = -height - aheight;

  name.x = round(width / 2);
  name.y = 1.5;
  plate.addChild(name);

  const container = new FakeSprite();
  container.addChild(plate);
  element.name_tag = container;
  ensureEntityDisplay(element);
  element.addChild!(container);
}

export function name_logic(element: NameTagEntity): void {
  const opts = (window as Window & { options?: Record<string, unknown> }).options;
  const show =
    !!(opts && (opts.show_names || opts.always_names || opts.always_hpn)) ||
    (window as Window & { xtarget?: unknown }).xtarget === element ||
    (window as Window & { ctarget?: unknown }).ctarget === element ||
    (window as Window & { mtarget?: unknown }).mtarget === element;
  if (element.type !== "character" && element.type !== "npc") return;
  if (!show) {
    if (element.name_tag) {
      destroySprite(element.name_tag);
      element.name_tag = null;
      element.ntag_cache = null;
    }
    return;
  }
  // Must go through window so ECU's wrapAddNameTag (sharpen/beautify) runs.
  const w = window as Window & {
    add_name_tag?: (el: NameTagEntity) => void;
  };
  if (typeof w.add_name_tag === "function") w.add_name_tag(element);
  else add_name_tag(element);
}

/** Install stock name-tag APIs before ECU wraps `add_name_tag`. */
export function installStockNameTagApis(): void {
  const w = window as Window & {
    SZ?: { font?: string };
    options?: Record<string, unknown>;
    add_name_tag?: (el: NameTagEntity) => void;
    name_logic?: (el: NameTagEntity) => void;
    start_name_tag?: (el: NameTagEntity) => void;
    stop_name_tag?: (el: NameTagEntity) => void;
    destroy_sprite?: (sprite: FakeSprite, mode?: string) => void;
    is_player?: (el: NameTagEntity) => boolean;
    __ecuStockNameTag?: boolean;
  };
  if (w.__ecuStockNameTag) return;
  w.__ecuStockNameTag = true;

  if (!w.SZ) w.SZ = { font: "pixel" };
  else if (!w.SZ.font) w.SZ.font = "pixel";

  if (!w.options) w.options = {};
  // Match live "always show names" so harness plates stay visible without targeting.
  if (w.options.always_names == null) w.options.always_names = true;
  if (w.options.show_names == null) w.options.show_names = true;

  w.add_name_tag = add_name_tag;
  w.name_logic = name_logic;
  w.start_name_tag = function () {};
  w.stop_name_tag = function () {};
  w.destroy_sprite = function (sprite, mode) {
    if (mode === "children" && sprite) {
      destroySprite(sprite);
      return;
    }
    destroySprite(sprite as FakeSprite);
  };
  w.is_player = isPlayer;
}
