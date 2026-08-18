/**
 * Preview-only sprite + item_container fallback when the cached client-kit
 * did not load. Not shipped in the userscript — CommUI calls window.sprite.
 */

export const ASSET_ORIGIN = "https://adventure.land";

type Iid = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  string,
  string,
];

const iid: Record<string, Iid> = {};
const spriteType: Record<string, string> = {};
const spriteSize: Record<string, string> = {};
let iidReady = false;

function inList(val: string | undefined, list: string[]): boolean {
  if (!val) return false;
  for (let i = 0; i < list.length; i++) {
    if (list[i] === val) return true;
  }
  return false;
}

export function cdnUrl(file: string | undefined): string {
  if (!file) return "";
  if (/^https?:\/\//i.test(file)) return file;
  if (file.charAt(0) === "/") return ASSET_ORIGIN + file;
  return ASSET_ORIGIN + "/" + file;
}

function prefixFiles(G: any): void {
  if (!G) return;
  const sets = G.imagesets;
  if (sets) {
    const keys = Object.keys(sets);
    for (let i = 0; i < keys.length; i++) {
      const pack = sets[keys[i]];
      if (pack && pack.file) pack.file = cdnUrl(pack.file);
    }
  }
  const sprites = G.sprites;
  if (sprites) {
    const keys = Object.keys(sprites);
    for (let i = 0; i < keys.length; i++) {
      const def = sprites[keys[i]];
      if (def && def.file) def.file = cdnUrl(def.file);
    }
  }
}

function attachMapData(G: any): void {
  if (!G || !G.maps) return;
  const keys = Object.keys(G.maps);
  for (let i = 0; i < keys.length; i++) {
    const name = keys[i];
    const map = G.maps[name];
    if (!map || map.ignore) continue;
    if (!map.data && G.geometry && G.geometry[name]) {
      map.data = G.geometry[name];
    }
  }
}

function imageSize(G: any, file: string, axis: "width" | "height", fallback: number): number {
  const key = String(file || "").split("?")[0];
  const info = G && G.images && G.images[key];
  if (info && typeof info[axis] === "number") return info[axis];
  return fallback;
}

export function buildSpriteIndex(G: any): void {
  iidReady = false;
  const names = Object.keys(iid);
  for (let i = 0; i < names.length; i++) delete iid[names[i]];
  if (!G || !G.sprites) return;

  const ANIM = ["animation"];
  const TAIL = ["tail"];
  const COL1 = ["v_animation", "head", "hair", "hat", "s_wings", "face", "makeup", "beard"];
  const COL3 = ["a_makeup", "a_hat"];
  const STYPE = ["wings", "body", "armor", "skin", "character"];
  const EMBLEM = ["emblem", "gravestone"];

  const sheets = Object.keys(G.sprites);
  for (let s = 0; s < sheets.length; s++) {
    const sDef = G.sprites[sheets[s]];
    if (!sDef || sDef.skip) continue;
    const matrix = sDef.matrix;
    if (!matrix) continue;
    let rowNum = 4;
    let colNum = 3;
    let sType = "full";
    if (inList(sDef.type, ANIM)) {
      rowNum = 1;
      sType = sDef.type;
    }
    if (inList(sDef.type, TAIL)) {
      colNum = 4;
      sType = sDef.type;
    }
    if (inList(sDef.type, COL1)) {
      colNum = 1;
      sType = sDef.type;
    }
    if (inList(sDef.type, COL3)) {
      colNum = 3;
      sType = sDef.type;
    }
    if (inList(sDef.type, STYPE)) sType = sDef.type;
    if (inList(sDef.type, EMBLEM)) {
      rowNum = 1;
      colNum = 1;
      sType = sDef.type;
    }
    const file = cdnUrl(sDef.file);
    const width = imageSize(G, sDef.file, "width", sDef.width || 312);
    const height = imageSize(G, sDef.file, "height", sDef.height || 288);
    const cols = sDef.columns || 1;
    const rows = sDef.rows || 1;
    for (let i = 0; i < matrix.length; i++) {
      const row = matrix[i];
      if (!row) continue;
      for (let j = 0; j < row.length; j++) {
        const name = row[j];
        if (!name) continue;
        const cell: Iid = [
          width,
          height,
          j * width / cols,
          i * height / rows,
          width / (cols * colNum),
          height / (rows * rowNum),
          colNum,
          file,
          sType,
        ];
        if (G.dimensions && G.dimensions[name] && G.dimensions[name][2]) {
          cell[2] = cell[2] + (G.dimensions[name][2] || 0);
        }
        iid[name] = cell;
        spriteType[name] = sDef.type || "full";
        spriteSize[name] = sDef.size || "normal";
      }
    }
  }
  iidReady = true;
}

function spriteImage(name: string, args: any): string {
  if (!iidReady) buildSpriteIndex(window.G);
  const opts = args || {};
  const p = opts.p || 0;
  const rheight = opts.rheight || 0;
  const key = iid[name] ? name : "naked";
  const row = iid[key];
  if (!row) return "";
  const G = window.G as any;
  const scale = opts.scale || 1;
  let width = row[4];
  let height = row[5];
  if (G && G.dimensions && G.dimensions[key]) {
    width = G.dimensions[key][0];
    height = G.dimensions[key][1];
  }
  let lDisp = 0;
  if (opts.cwidth) lDisp = (opts.cwidth - width * scale) / 2;
  let wDisp = 0;
  if (row[6] === 1) wDisp = width;
  const j = opts.j || 0;
  const css = opts.opacity && opts.opacity !== 1 ? `opacity:${opts.opacity};` : "";
  const ml =
    (-row[2] - row[4] + wDisp - (row[4] - width + (opts.x_disp || 0)) / 2) *
    scale;
  const mt = (-row[3] - row[5] - row[5] * j + height) * scale;
  return (
    `<div style="display:inline-block;width:${width * scale}px;height:${(height - rheight) * scale}px;overflow:hidden;position:absolute;left:${lDisp}px;bottom:${(p + rheight) * scale}px;${css}">` +
    `<img alt="" draggable="false" style="margin-left:${ml}px;margin-top:${mt}px;width:${row[0] * scale}px;height:${row[1] * scale}px;image-rendering:pixelated" src="${row[7]}"/>` +
    `</div>`
  );
}

function itemContainer(item: any, actual?: any): string {
  const G = window.G as any;
  if (!G || !G.positions || !G.imagesets) return "";
  const size = (item && item.size) || 20;
  const space = 3;
  let skin = item && item.skin;
  if (!skin && actual && actual.name) skin = actual.name;
  if (!skin || !G.positions[skin]) skin = "placeholder";
  const pos = G.positions[skin];
  if (!pos) return "";
  const pack = G.imagesets[pos[0] || "pack_20"];
  if (!pack || !pack.file) return "";
  const x = pos[1];
  const y = pos[2];
  const scale = size / pack.size;
  const src = cdnUrl(pack.file);
  const box = size + 2 * space;
  return (
    `<div style="position:relative;display:inline-block;margin:2px;border:2px solid gray;height:${box}px;width:${box}px;background:black;vertical-align:top">` +
    `<div style="overflow:hidden;height:${size}px;width:${size}px;margin:${space}px">` +
    `<img alt="" draggable="false" style="width:${pack.columns * pack.size * scale}px;height:${pack.rows * pack.size * scale}px;margin-top:-${y * size}px;margin-left:-${x * size}px;image-rendering:pixelated" src="${src}"/>` +
    `</div></div>`
  );
}

function sprite(name: string, args?: any): string {
  const G = window.G as any;
  if (!iidReady) buildSpriteIndex(G);
  let opts = args || {};
  if (typeof opts === "string") opts = { cx: opts };
  if (!opts.cx) opts.cx = {};
  if (!opts.scale) opts.scale = 1.5;
  if (G && G.monsters && G.monsters[name] && G.monsters[name].size) {
    opts.scale -= 1 - G.monsters[name].size;
  }
  if (!iid[name] && G && G.items && G.items[name]) {
    return itemContainer({ skin: name, bcolor: "black", size: opts.width || 20 });
  }
  let skinName = name;
  if (G && G.monsters && G.monsters[name] && G.monsters[name].skin) {
    skinName = G.monsters[name].skin;
  }
  if (!opts.width) opts.width = 40;
  if (!opts.height) opts.height = 50;
  let rxDisp = 0;
  if (G && G.dimensions && G.dimensions[skinName] && G.dimensions[skinName][3]) {
    rxDisp = -G.dimensions[skinName][3] * opts.scale;
  }
  const overflow = opts.overflow ? "visible" : "hidden";
  let html =
    `<div style="height:${opts.height}px;width:${opts.width}px;position:relative;text-align:center;overflow:${overflow};display:inline-block">`;
  const cx = opts.cx || {};
  const bodyType = spriteType[skinName] || "full";
  if (opts.rip) {
    html += spriteImage(cx.gravestone || "gravestone", {
      cwidth: opts.width,
      scale: opts.scale,
    });
    return html + "</div>";
  }
  const j = opts.j || 0;
  let layerSkin: string | null = null;
  if (cx.head && G && G.cosmetics && G.cosmetics.head && G.cosmetics.head[cx.head]) {
    const sizes = G.cosmetics.head[cx.head];
    const ss = spriteSize[skinName] || "normal";
    if (ss === "small") layerSkin = sizes[0] || "sskin1a";
    else if (ss === "large") layerSkin = sizes[2] || "lskin1a";
    else layerSkin = sizes[1] || "mskin1a";
  }
  const cosmetics = G && G.cosmetics;
  const headY = (cosmetics && cosmetics.default_head_place) || 0;
  const hairY = (cosmetics && cosmetics.default_hair_place) || 0;
  const hatY = (cosmetics && cosmetics.default_hat_place) || 0;
  if (layerSkin) {
    html += spriteImage(layerSkin, {
      cwidth: opts.width,
      scale: opts.scale,
      j,
    });
  }
  const xDisp = !(iid[skinName] && iid[skinName][4] % 2) ? rxDisp + -0.5 : rxDisp;
  html += spriteImage(skinName, {
    cwidth: opts.width,
    scale: opts.scale,
    j,
    x_disp: xDisp,
  });
  if (cx.head && bodyType !== "full") {
    html += spriteImage(cx.head, {
      p: headY,
      cwidth: opts.width,
      scale: opts.scale,
      j,
    });
  }
  if (cx.hair) {
    html += spriteImage(cx.hair, {
      p: hairY,
      cwidth: opts.width,
      scale: opts.scale,
      j,
    });
  }
  if (cx.hat) {
    html += spriteImage(cx.hat, {
      p: hatY,
      cwidth: opts.width,
      scale: opts.scale,
      j,
    });
  }
  html += "</div>";
  return html;
}

export type GameDataSource = "live" | "stub";

export function prepareGameData(G: any): void {
  prefixFiles(G);
  attachMapData(G);
  buildSpriteIndex(G);
}

export function installSpriteApis(): void {
  window.sprite = sprite;
  window.item_container = itemContainer;
}

/** Stock html.js sprite/item_container from the overlay client-kit cache. */
export function hasStockClientKit(): boolean {
  return (
    !!(window as any).__ecuClientKit &&
    typeof window.sprite === "function" &&
    typeof window.item_container === "function"
  );
}

/** Prefer process_game_data from common_functions.js; else attach map.data. */
export function adoptLiveGameData(): void {
  const proc = (window as any).process_game_data;
  if (typeof proc === "function") {
    proc();
    return;
  }
  attachMapData(window.G);
}

/** Keep stock sprite() when the client-kit loaded; otherwise install our fallback. */
export function ensureSpriteApis(): void {
  if (
    typeof window.sprite === "function" &&
    typeof window.item_container === "function"
  ) {
    return;
  }
  prepareGameData(window.G);
  installSpriteApis();
}

export function hasLiveG(): boolean {
  const G = window.G as any;
  return !!(G && G.monsters && G.positions && G.sprites && G.imagesets);
}
