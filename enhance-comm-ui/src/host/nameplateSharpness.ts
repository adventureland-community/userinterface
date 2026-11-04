/**
 * Keep FOV zoom from mushing / shrinking nameplates on screen.
 *
 * CSS-fit FOV downscales the whole canvas. Sprites stay nearest-crisp; PIXI.Text
 * went mushy and tiny. After stock builds a name_tag we:
 *   1. Counter-scale the plate by FOV so screen size stays ~constant
 *   2. Pivot at the plate's bottom (head attachment) so scale grows upward —
 *      stock places the Graphics at y=-(barH+aheight) inside a (0,0) container;
 *      scaling that container without a bottom pivot floats tags off heads
 *   3. Raise Text.resolution × FOV×DPR and force NEAREST
 *   4. Bust caches on FOV change so tags re-rasterize
 */

import {
  nameplateTextResolution,
  onWorldFovApplied,
  readAppliedWorldFov,
} from "../lib/worldFov";

type PixiLike = {
  SCALE_MODES?: { NEAREST?: number; LINEAR?: number };
  Point?: new (x: number, y: number) => { x: number; y: number };
};

type SpriteLike = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  scale?:
    | { x?: number; y?: number; set?: (x: number, y: number) => void }
    | { x: number; y: number };
  pivot?:
    | { x?: number; y?: number; set?: (x: number, y: number) => void }
    | { x: number; y: number };
  texture?: {
    baseTexture?: {
      scaleMode?: number;
    };
  };
  roundPixels?: boolean;
  resolution?: number;
  dirty?: boolean;
  text?: unknown;
  style?: unknown;
  updateText?: () => void;
  updateTransform?: () => void;
  getLocalBounds?: () => { x: number; y: number; width: number; height: number };
  children?: SpriteLike[];
  name_tag?: SpriteLike | null;
  ntag_cache?: string | null;
  __ecuNameplateFov?: number;
  /** Stock `name_tag` x/y before our FOV counter-scale (usually 0,0). */
  __ecuNameplateStockX?: number;
  __ecuNameplateStockY?: number;
};

function nearestMode(): number | null {
  const PIXI = (window as Window & { PIXI?: PixiLike }).PIXI;
  if (!PIXI || !PIXI.SCALE_MODES) return null;
  const n = PIXI.SCALE_MODES.NEAREST;
  return typeof n === "number" ? n : null;
}

function looksLikePixiText(node: SpriteLike): boolean {
  return (
    typeof node.resolution === "number" ||
    (typeof node.text === "string" && node.style != null) ||
    typeof node.updateText === "function"
  );
}

function setNodeScale(node: SpriteLike, sx: number, sy: number): void {
  const sc = node.scale as
    | { x?: number; y?: number; set?: (x: number, y: number) => void }
    | undefined;
  if (!sc) {
    const PIXI = (window as Window & { PIXI?: PixiLike }).PIXI;
    if (PIXI && typeof PIXI.Point === "function") {
      node.scale = new PIXI.Point(sx, sy);
    } else {
      node.scale = { x: sx, y: sy };
    }
    return;
  }
  if (typeof sc.set === "function") {
    sc.set(sx, sy);
    return;
  }
  sc.x = sx;
  sc.y = sy;
}

function setNodePivot(node: SpriteLike, px: number, py: number): void {
  const pv = node.pivot as
    | { x?: number; y?: number; set?: (x: number, y: number) => void }
    | undefined;
  if (!pv) {
    const PIXI = (window as Window & { PIXI?: PixiLike }).PIXI;
    if (PIXI && typeof PIXI.Point === "function") {
      node.pivot = new PIXI.Point(px, py);
    } else {
      node.pivot = { x: px, y: py };
    }
    return;
  }
  if (typeof pv.set === "function") {
    pv.set(px, py);
    return;
  }
  pv.x = px;
  pv.y = py;
}

/**
 * Screen-compensated FOV for nameplate size. At fov=1 leave stock.
 * Cap so extreme zoom-out does not flood the view with huge tags.
 */
export function nameplateScreenScale(fov?: number): number {
  const f =
    typeof fov === "number" && fov > 0 ? fov : readAppliedWorldFov() || 1;
  if (!(f > 1)) return 1;
  // Match CSS downscale so glyphs stay ~same CSS pixels; soft-cap at 3×.
  return Math.min(3, f);
}

/**
 * Attachment point for counter-scale: bottom-center of the plate in local space
 * (nearest the character head). Pure — tested.
 */
export function nameplateAttachPoint(bounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}): { x: number; y: number } {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height,
  };
}

/**
 * Position that keeps `attach` fixed in parent space after setting pivot=attach.
 * Stock name_tag is at (0,0) with pivot (0,0); plate child sits above.
 */
export function nameplatePivotPosition(
  stockX: number,
  stockY: number,
  attachX: number,
  attachY: number,
): { x: number; y: number } {
  return { x: stockX + attachX, y: stockY + attachY };
}

/**
 * Stock builds `name_tag` as an empty Sprite whose first child is the plate
 * Graphics at y=-(bar+aheight). Prefer that child's bounds — parent
 * getLocalBounds is often empty until the first render, which used to leave
 * tags scaled from (0,0) and floating off heads.
 */
function readLocalBounds(root: SpriteLike): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  if (typeof root.updateTransform === "function") {
    try {
      root.updateTransform();
    } catch {
      /* ignore */
    }
  }
  const kids = root.children;
  if (kids && kids.length) {
    const c = kids[0];
    const cx = typeof c.x === "number" ? c.x : 0;
    const cy = typeof c.y === "number" ? c.y : 0;
    let bx = 0;
    let by = 0;
    let bw = 32;
    let bh = 9;
    if (typeof c.getLocalBounds === "function") {
      try {
        if (typeof c.updateTransform === "function") c.updateTransform();
        const b = c.getLocalBounds();
        if (b && Number.isFinite(b.height) && b.height > 0) {
          bx = b.x;
          by = b.y;
          bw = b.width;
          bh = b.height;
          return { x: cx + bx, y: cy + by, width: bw, height: bh };
        }
      } catch {
        /* fall through */
      }
    }
    if (typeof c.height === "number" && c.height > 0) {
      bw = typeof c.width === "number" && c.width > 0 ? c.width : bw;
      bh = c.height;
    }
    // Even without measured height, child.y is the stock top offset — assume
    // the classic 9px name bar so the bottom still glues near the head.
    return { x: cx + bx, y: cy + by, width: bw, height: bh };
  }
  if (typeof root.getLocalBounds === "function") {
    try {
      const b = root.getLocalBounds();
      if (
        b &&
        Number.isFinite(b.y) &&
        Number.isFinite(b.height) &&
        b.height > 0
      ) {
        return b;
      }
    } catch {
      /* older / empty */
    }
  }
  return null;
}

/**
 * @returns false when FOV scale was requested but attach bounds were missing
 * (caller must not freeze `__ecuNameplateFov` so a later pass can retry).
 */
function applyNameplateScreenScale(root: SpriteLike, screen: number): boolean {
  const stockX =
    typeof root.__ecuNameplateStockX === "number"
      ? root.__ecuNameplateStockX
      : typeof root.x === "number"
        ? root.x
        : 0;
  const stockY =
    typeof root.__ecuNameplateStockY === "number"
      ? root.__ecuNameplateStockY
      : typeof root.y === "number"
        ? root.y
        : 0;
  root.__ecuNameplateStockX = stockX;
  root.__ecuNameplateStockY = stockY;

  // Neutral transform so bounds / attach are in stock local space.
  setNodeScale(root, 1, 1);
  setNodePivot(root, 0, 0);
  root.x = stockX;
  root.y = stockY;

  if (!(screen > 1)) return true;

  const bounds = readLocalBounds(root);
  if (!bounds) {
    // Do not scale from (0,0) — that is the float-off-head bug.
    return false;
  }
  const attach = nameplateAttachPoint(bounds);
  const pos = nameplatePivotPosition(stockX, stockY, attach.x, attach.y);
  setNodePivot(root, attach.x, attach.y);
  root.x = pos.x;
  root.y = pos.y;
  setNodeScale(root, screen, screen);
  return true;
}

/** Walk a name_tag tree: counter-scale + NEAREST + FOV Text.resolution. */
export function sharpenNameTagTextures(
  root: SpriteLike | null | undefined,
  fov?: number,
): void {
  if (!root) return;
  const appliedFov =
    typeof fov === "number" && fov > 0 ? fov : readAppliedWorldFov();
  const screen = nameplateScreenScale(appliedFov);
  const nearest = nearestMode();
  const res = nameplateTextResolution(appliedFov);

  // Counter-scale + bottom-pivot. Always re-apply when FOV wants scale>1 so a
  // first pass that lacked bounds can recover on the next draw.
  if (root.__ecuNameplateFov !== appliedFov || screen > 1) {
    const ok = applyNameplateScreenScale(root, screen);
    if (ok) root.__ecuNameplateFov = appliedFov;
  }

  const visit = (node: SpriteLike | null | undefined) => {
    if (!node) return;
    if (typeof node.roundPixels !== "undefined") node.roundPixels = true;
    const bt = node.texture && node.texture.baseTexture;
    if (bt && nearest != null) bt.scaleMode = nearest;
    if (looksLikePixiText(node)) {
      if (typeof node.resolution === "number" && node.resolution !== res) {
        node.resolution = res;
        if (typeof node.updateText === "function") {
          try {
            node.updateText();
          } catch {
            node.dirty = true;
          }
        } else {
          node.dirty = true;
        }
      } else if (typeof node.resolution !== "number") {
        try {
          (node as { resolution: number }).resolution = res;
          if (typeof node.updateText === "function") node.updateText();
          else node.dirty = true;
        } catch {
          /* older PIXI */
        }
      }
      const bt2 = node.texture && node.texture.baseTexture;
      if (bt2 && nearest != null) bt2.scaleMode = nearest;
    }
    const kids = node.children;
    if (!kids || !kids.length) return;
    for (let i = 0; i < kids.length; i++) visit(kids[i]);
  };
  visit(root);
}

/** Force name tags to rebuild on next draw (after FOV / scale changes). */
export function bustNameTagCaches(): void {
  const bump = (ent: SpriteLike | null | undefined) => {
    if (!ent) return;
    ent.ntag_cache = null;
    if (ent.name_tag) {
      // Undo prior counter-scale before resync / rebuild.
      if (typeof ent.name_tag.__ecuNameplateStockY === "number") {
        setNodeScale(ent.name_tag, 1, 1);
        setNodePivot(ent.name_tag, 0, 0);
        ent.name_tag.x =
          typeof ent.name_tag.__ecuNameplateStockX === "number"
            ? ent.name_tag.__ecuNameplateStockX
            : 0;
        ent.name_tag.y = ent.name_tag.__ecuNameplateStockY;
      }
      ent.name_tag.__ecuNameplateFov = undefined;
      ent.name_tag.__ecuNameplateStockX = undefined;
      ent.name_tag.__ecuNameplateStockY = undefined;
    }
  };
  const w = window as Window & {
    character?: SpriteLike | null;
    observing?: SpriteLike | null;
    entities?: Record<string, SpriteLike | null | undefined>;
  };
  bump(w.character);
  bump(w.observing);
  const ents = w.entities;
  if (!ents) return;
  for (const id in ents) {
    if (!Object.prototype.hasOwnProperty.call(ents, id)) continue;
    bump(ents[id]);
  }
}

/**
 * Live pass: re-apply counter-scale on existing tags when FOV changes without
 * waiting for ntag rebuild (keeps labels readable immediately).
 */
export function resyncNameplateScales(fov?: number): void {
  const f =
    typeof fov === "number" && fov > 0 ? fov : readAppliedWorldFov();
  const touch = (ent: SpriteLike | null | undefined) => {
    if (!ent || !ent.name_tag) return;
    sharpenNameTagTextures(ent.name_tag, f);
  };
  const w = window as Window & {
    character?: SpriteLike | null;
    observing?: SpriteLike | null;
    entities?: Record<string, SpriteLike | null | undefined>;
  };
  touch(w.character);
  touch(w.observing);
  const ents = w.entities;
  if (!ents) return;
  for (const id in ents) {
    if (!Object.prototype.hasOwnProperty.call(ents, id)) continue;
    touch(ents[id]);
  }
}

function wrapAddNameTag(): boolean {
  const w = window as Window & {
    add_name_tag?: (element: SpriteLike) => void;
    __ecuAddNameTag?: (element: SpriteLike) => void;
  };
  if (typeof w.__ecuAddNameTag === "function") return true;
  if (typeof w.add_name_tag !== "function") return false;
  const orig = w.add_name_tag;
  const wrapped = function (this: unknown, element: SpriteLike) {
    orig.call(this, element);
    if (element && element.name_tag) sharpenNameTagTextures(element.name_tag);
  };
  w.__ecuAddNameTag = wrapped;
  w.add_name_tag = wrapped;
  return true;
}

let installed = false;

/** Install once; polls briefly until stock add_name_tag exists. */
export function installNameplateSharpness(): void {
  if (installed) return;
  installed = true;
  (window as Window & { __ecuBustNameTags?: () => void }).__ecuBustNameTags =
    bustNameTagCaches;
  onWorldFovApplied((fov) => {
    bustNameTagCaches();
    resyncNameplateScales(fov);
  });
  if (wrapAddNameTag()) return;
  const started = Date.now();
  const id = window.setInterval(() => {
    if (wrapAddNameTag() || Date.now() - started > 30000) {
      window.clearInterval(id);
    }
  }, 250);
}
