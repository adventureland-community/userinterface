/**
 * Keep FOV zoom from mushing / shrinking nameplates on screen.
 *
 * CSS-fit FOV downscales the whole canvas. Sprites stay nearest-crisp; PIXI.Text
 * went mushy and tiny. After stock builds a name_tag we:
 *   1. Counter-scale the plate by FOV so screen size stays ~constant
 *   2. Pivot at the plate's bottom (head attachment) so scale grows upward —
 *      stock places the Graphics at y=-(barH+aheight) inside a (0,0) container;
 *      scaling that container without a bottom pivot floats tags off heads
 *   3. Raise Text.resolution × FOV×DPR (capped); NEAREST on sprites only —
 *      Text stays LINEAR so soft stroke does not become salt-and-pepper
 *   4. Bust caches on FOV change so tags re-rasterize
 */

import {
  nameplateTextResolution,
  onWorldFovApplied,
  readAppliedWorldFov,
} from "../lib/worldFov";
import { isPlayerClass } from "../lib/colors";
import { detectViewportProfile, type ViewportProfile } from "../lib/viewport";
import { resolvePlayerCtype } from "./al";
import type { EntityLike } from "./globals";
import {
  beautifyNameTag,
  resolveNameplateFontFamily,
} from "./nameplateStyle";
import { installNameplateContrast } from "./nameplateContrast";

/**
 * Profile size multiplier on top of FOV counter-scale.
 * Phone/tablet still need a boost — stock tags are sized for desktop canvas
 * distance — but ghost plates stay a bit smaller than the old soft-plate
 * ×2.25 wall. Desktop shrinks slightly so town crowds feel less busy.
 */
export function nameplatePhoneBoost(profile?: ViewportProfile): number {
  const p =
    profile ||
    (typeof window !== "undefined" ? detectViewportProfile() : "desktop");
  if (p === "phone") return 1.85;
  if (p === "tablet") return 1.25;
  return 0.88;
}

type PixiLike = {
  SCALE_MODES?: { NEAREST?: number; LINEAR?: number };
  Point?: new (x: number, y: number) => { x: number; y: number };
};

type SpriteLike = {
  id?: string | number;
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  /**
   * Player class on character entities (`warrior` / `mage` / …).
   * Not the same as `type` (entity kind: `character` | `monster` | `npc`).
   */
  ctype?: string;
  /**
   * Entity kind on live sprites (`character` / `monster` / `npc`).
   * Never use this as class — roster `X.characters[].type` is class, entities are not.
   */
  type?: string;
  /** Monster template id — not a player class. */
  mtype?: string;
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
  /** Soft plate / text stroke already applied for this tag instance. */
  __ecuNameplateStyled?: boolean;
  /** Class tint applied with the soft plate pass. */
  __ecuNameplateCtype?: string;
};

/**
 * Player class for nameplate tint.
 *
 * Live entity fields (Adventure Land):
 * - `ctype` — player class (`warrior` / `mage` / …)
 * - `type` — entity kind (`character` | `monster` | `npc`) — never class
 * - `mtype` — monster template id — never class
 *
 * Roster `X.characters[].type` is class (different object shape); that is only
 * reached via {@link resolvePlayerCtype}, not by reading entity.type.
 */
export function resolveNameplateCtype(
  ent: SpriteLike | null | undefined,
): string | undefined {
  if (!ent) return undefined;
  const kind = ent.type != null ? String(ent.type).toLowerCase() : "";
  if (kind === "monster" || kind === "npc") return undefined;
  if (ent.mtype != null && String(ent.mtype) && kind !== "character") {
    if (!isPlayerClass(ent.ctype)) return undefined;
  }

  const id =
    ent.id != null && String(ent.id)
      ? String(ent.id)
      : ent.name != null && String(ent.name)
        ? String(ent.name)
        : undefined;

  if (id) {
    const probe: EntityLike = { id, ctype: ent.ctype };
    const resolved = resolvePlayerCtype(id, probe);
    if (resolved) return resolved;
  }

  return isPlayerClass(ent.ctype)
    ? String(ent.ctype).trim().toLowerCase()
    : undefined;
}

function scaleModes(): { nearest: number | null; linear: number | null } {
  const PIXI = (window as Window & { PIXI?: PixiLike }).PIXI;
  if (!PIXI || !PIXI.SCALE_MODES) return { nearest: null, linear: null };
  const nearest = PIXI.SCALE_MODES.NEAREST;
  const linear = PIXI.SCALE_MODES.LINEAR;
  return {
    nearest: typeof nearest === "number" ? nearest : null,
    linear: typeof linear === "number" ? linear : null,
  };
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
 * How hard desktop counter-scales on FOV zoom-out (f&gt;1).
 * 1 = full cancel (constant screen size — giants over tiny sprites at 5×).
 * ~0.45 keeps labels readable while they shrink with the map.
 */
export const NAMEPLATE_DESKTOP_ZOOM_OUT_EXP = 0.45;

/**
 * Screen-compensated FOV for nameplate size.
 * CSS fit shrinks/grows the canvas by 1/f; PIXI scale ≈ f × boost cancels that
 * so on-screen size stays ~boost × stock.
 * Desktop zoom-out uses a softer curve so plates do not stay HUD-huge at 5×
 * while characters shrink. Phone/tablet keep full cancel for thumb readability.
 * Floor 1/3 · cap 8.
 */
export function nameplateScreenScale(
  fov?: number,
  profile?: ViewportProfile,
): number {
  const f =
    typeof fov === "number" && fov > 0 ? fov : readAppliedWorldFov() || 1;
  const p =
    profile ||
    (typeof window !== "undefined" ? detectViewportProfile() : "desktop");
  const boost = nameplatePhoneBoost(p);
  const compensated =
    p === "desktop" && f > 1
      ? Math.pow(f, NAMEPLATE_DESKTOP_ZOOM_OUT_EXP) * boost
      : f * boost;
  return Math.max(1 / 3, Math.min(8, compensated));
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

  if (screen === 1) return true;

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

/** Walk a name_tag tree: soft plate + counter-scale + NEAREST + FOV Text.resolution. */
export function sharpenNameTagTextures(
  root: SpriteLike | null | undefined,
  fov?: number,
  ctype?: string | null,
): void {
  if (!root) return;
  const appliedFov =
    typeof fov === "number" && fov > 0 ? fov : readAppliedWorldFov();
  const screen = nameplateScreenScale(appliedFov);
  const modes = scaleModes();
  const res = nameplateTextResolution(appliedFov);
  if (ctype != null && String(ctype).trim()) {
    root.__ecuNameplateCtype = String(ctype);
  }

  // Counter-scale + bottom-pivot (zoom-out up / zoom-in down). Re-apply when
  // FOV wants scale≠1 so a first pass that lacked bounds can recover.
  if (root.__ecuNameplateFov !== appliedFov || screen !== 1) {
    const ok = applyNameplateScreenScale(root, screen);
    if (ok) root.__ecuNameplateFov = appliedFov;
  }

  const visit = (node: SpriteLike | null | undefined) => {
    if (!node) return;
    const isText = looksLikePixiText(node);
    // Sprites stay NEAREST; stroked PIXI.Text must stay LINEAR — NEAREST + soft
    // stroke + FOV CSS pixelated turns glyphs into white salt-and-pepper on phone.
    if (typeof node.roundPixels !== "undefined") {
      node.roundPixels = !isText;
    }
    const bt = node.texture && node.texture.baseTexture;
    if (bt) {
      if (isText) {
        if (modes.linear != null) bt.scaleMode = modes.linear;
      } else if (modes.nearest != null) {
        bt.scaleMode = modes.nearest;
      }
    }
    if (isText) {
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
      if (bt2 && modes.linear != null) bt2.scaleMode = modes.linear;
    }
    const kids = node.children;
    if (!kids || !kids.length) return;
    for (let i = 0; i < kids.length; i++) visit(kids[i]);
  };
  visit(root);
  // Soft plate after FOV Text.resolution so stroke rasterizes at the final DPI.
  beautifyNameTag(root, { ctype: root.__ecuNameplateCtype || ctype });
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
      ent.name_tag.__ecuNameplateStyled = undefined;
      ent.name_tag.__ecuNameplateCtype = undefined;
      // Clear pad flags on plate children so fitNameTextInGhostBand can re-run.
      const kids = ent.name_tag.children;
      if (kids) {
        for (let i = 0; i < kids.length; i++) {
          const k = kids[i] as { __ecuNamepad?: boolean; children?: unknown[] };
          if (k) k.__ecuNamepad = undefined;
        }
      }
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
    sharpenNameTagTextures(ent.name_tag, f, resolveNameplateCtype(ent));
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
    SZ?: { font?: string };
  };
  if (typeof w.__ecuAddNameTag === "function") return true;
  if (typeof w.add_name_tag !== "function") return false;
  const orig = w.add_name_tag;
  const wrapped = function (this: unknown, element: SpriteLike) {
    // Stock sizes the plate to PIXI.Text metrics — one concrete face only
    // (comma stacks make PIXI keep stock `pixel` / m5x7).
    const sz = w.SZ;
    const prevFont = sz && sz.font;
    if (sz) sz.font = resolveNameplateFontFamily();
    try {
      orig.call(this, element);
    } finally {
      if (sz) sz.font = prevFont;
    }
    if (element && element.name_tag) {
      sharpenNameTagTextures(
        element.name_tag,
        undefined,
        resolveNameplateCtype(element),
      );
    }
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
  installNameplateContrast();
  const kick = () => {
    if (!wrapAddNameTag()) return false;
    // Rebuild with system mono + phone scale on existing tags.
    bustNameTagCaches();
    resyncNameplateScales();
    return true;
  };
  if (kick()) return;
  const started = Date.now();
  const id = window.setInterval(() => {
    if (kick() || Date.now() - started > 30000) {
      window.clearInterval(id);
    }
  }, 250);
}
