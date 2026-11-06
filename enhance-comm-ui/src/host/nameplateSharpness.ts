/**
 * Keep FOV zoom from mushing / shrinking nameplates on screen.
 *
 * CSS-fit FOV downscales the whole canvas. Sprites stay nearest-crisp; PIXI.Text
 * went mushy and tiny. After stock builds a name_tag we:
 *   1. Counter-scale the plate by FOV so screen size stays ~constant
 *   2. Pivot at the plate's bottom (head attachment) so scale grows upward —
 *      stock places the Graphics at y=-(barH+aheight) inside a (0,0) container;
 *      scaling that container without a bottom pivot floats tags off heads
 *   3. Densify glyphs via fontSize↑ / scale↓ (AL PIXI stomps Text.resolution
 *      back to renderer.resolution every render — resolution bumps never stick)
 *   4. NEAREST on plate sprites only; Text stays LINEAR so soft stroke does not
 *      become salt-and-pepper
 *   5. Bust caches on FOV change so tags re-rasterize
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
 * Readability first: near-full cancel of CSS FOV shrink. Phone also has a
 * hard min scale (see {@link NAMEPLATE_PHONE_MIN_SCALE}) so FOV 1× / 1.25×
 * on a 390px handset stay glance-readable under phone world-cover CSS.
 */
export function nameplatePhoneBoost(profile?: ViewportProfile): number {
  const p =
    profile ||
    (typeof window !== "undefined" ? detectViewportProfile() : "desktop");
  // Phone: no extra boost — cover CSS already enlarges the canvas; a boost
  // stacked on MIN_SCALE made plates dominate sprites in party clusters.
  if (p === "phone") return 1;
  if (p === "tablet") return 1.1;
  return 0.95;
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
  /** Owner entity id — phone stagger so party plates don't stack. */
  __ecuNameplateOwnerId?: string;
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
 * Soft-curve exponents kept for tests / callers that still reference them.
 * Live sizing uses linear FOV cancel ({@link nameplateScreenScale}) — the
 * shallow curves left mid-FOV labels unreadable mush under CSS fit.
 */
export const NAMEPLATE_DESKTOP_ZOOM_OUT_EXP = 1;
export const NAMEPLATE_PHONE_ZOOM_OUT_EXP = 1;

/**
 * Phone FOV≥1 floor — integer 2× under integer cover 2× (crisp Pixel pack).
 */
export const NAMEPLATE_PHONE_MIN_SCALE = 2;
/** Phone zoom-in (FOV&lt;1) — CSS enlarge softens stock 8px Pixel harder. */
export const NAMEPLATE_PHONE_ZOOM_IN_MIN_SCALE = 2;
export const NAMEPLATE_PHONE_MAX_SCALE = 5;
/** Desktop mid zoom-out floor. */
export const NAMEPLATE_DESKTOP_MIN_ZOOM_OUT_SCALE = 1;
/** Desktop extreme FOV still grows plates — do not cap the zoom-out range. */
export const NAMEPLATE_DESKTOP_MAX_SCALE = 4;
/**
 * Desktop FOV→plate curve (before snap).
 * Targets: FOV 2 ≈ 1.5×, FOV 3 ≈ 2.5×; flatten past 3 (FOV 4 was oversized).
 */
export function desktopNameplateZoomOutRaw(fov: number, boost: number): number {
  const f = fov > 0 && Number.isFinite(fov) ? fov : 1;
  const b = boost > 0 && Number.isFinite(boost) ? boost : 1;
  // Through FOV 2: 0.75× cancel → FOV 2 * 0.75 ≈ 1.5.
  if (f <= 2) return Math.max(1 / 3, f * 0.75 * b);
  // FOV 2→3: climb to ~2.5.
  if (f <= 3) return Math.max(1 / 3, (1.5 + (f - 2) * 1.05) * b);
  // Past FOV 3: soft climb — FOV 4 at full prior slope hit ~3.5× (too big).
  return Math.max(1 / 3, (2.55 + (f - 3) * 0.2) * b);
}

/** Stock add_name_tag face size before our denseness multiply. */
export const NAMEPLATE_STOCK_FONT_SIZE = 64;
/** Stock PIXI.Text scale (64 × 0.125 → 8px on the plate). */
export const NAMEPLATE_STOCK_TEXT_SCALE = 0.125;

/**
 * Snap a raw screen scale.
 * Phone: integers (fractional softens Pixel under cover CSS).
 * Desktop/tablet: half-steps so FOV 2 can sit at 1.5× (between tiny 1 and huge 2).
 */
export function snapNameplateScreenScale(
  raw: number,
  profile?: ViewportProfile,
): number {
  if (!(typeof raw === "number") || !Number.isFinite(raw)) return 1;
  const p =
    profile ||
    (typeof window !== "undefined" ? detectViewportProfile() : "desktop");
  if (p === "phone") {
    return Math.max(1, Math.min(8, Math.round(raw)));
  }
  return Math.max(1, Math.min(8, Math.round(raw * 2) / 2));
}

/**
 * Screen-compensated FOV for nameplate size.
 * Zoom-in: grow with 1/f so CSS enlarge doesn't leave 8px mush.
 * Zoom-out: cancel CSS shrink, easing past 2× so FOV 5 doesn't glue plates.
 * Phone floors at 2× on FOV≥1.
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

  if (f < 1) {
    const grow = snapNameplateScreenScale(1 / f, p);
    if (p === "phone") {
      // Cover CSS already enlarges on zoom-in — keep plate at 1× so labels
      // don’t become full-width banners over the fight.
      return 1;
    }
    return Math.min(3, Math.max(1, grow));
  }

  if (p === "phone") {
    const eased = f <= 2 ? f : 2 + (f - 2) * 0.55;
    let s = snapNameplateScreenScale(
      Math.max(1 / 3, Math.min(8, eased * boost)),
      p,
    );
    s = Math.max(NAMEPLATE_PHONE_MIN_SCALE, s);
    // Through FOV 2× keep ≤2× under integer cover.
    if (f <= 2) s = Math.min(NAMEPLATE_PHONE_MIN_SCALE, s);
    return Math.min(NAMEPLATE_PHONE_MAX_SCALE, s);
  }
  if (p === "tablet") {
    const eased = f <= 2 ? f : 2 + (f - 2) * 0.55;
    let s = snapNameplateScreenScale(
      Math.max(1 / 3, Math.min(8, eased * boost)),
      p,
    );
    if (f >= 1.25) s = Math.max(2, s);
    return Math.min(4, s);
  }
  // Desktop: tuned curve (FOV 2 ≈ 1.5×, FOV 3 ≈ 2.5×) — not a zoom-range cap.
  let s = snapNameplateScreenScale(desktopNameplateZoomOutRaw(f, boost), p);
  if (f >= 1.5) s = Math.max(NAMEPLATE_DESKTOP_MIN_ZOOM_OUT_SCALE, s);
  return Math.min(NAMEPLATE_DESKTOP_MAX_SCALE, s);
}

/**
 * Bake denser glyphs without Text.resolution (AL PIXI resets that every render).
 * fontSize × d and scale ÷ d keep layout size while CSS FOV shrink stays sharp.
 */
export function applyNameplateGlyphDenseness(
  node: SpriteLike,
  dense: number,
): boolean {
  const d = Math.max(1, Math.min(6, Math.round(dense)));
  const style = node.style as
    | {
        fontSize?: number;
        __ecuDense?: number;
        __ecuSoft?: boolean;
      }
    | undefined
    | null;
  if (!style || typeof style !== "object") return false;
  const wantFont = NAMEPLATE_STOCK_FONT_SIZE * d;
  const wantScale = NAMEPLATE_STOCK_TEXT_SCALE / d;
  if (style.__ecuDense === d && style.fontSize === wantFont) {
    return false;
  }
  style.fontSize = wantFont;
  style.__ecuDense = d;
  // Stroke weight is denseness-scaled in softTextStylePatch — force re-assert.
  if (style.__ecuSoft) style.__ecuSoft = false;
  setNodeScale(node, wantScale, wantScale);
  if (typeof node.updateText === "function") {
    try {
      node.updateText();
    } catch {
      node.dirty = true;
    }
  } else {
    node.dirty = true;
  }
  return true;
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

/** Stable party order so Preview / Brick / Ember always fan apart. */
const PHONE_PLATE_ORDER = ["Preview", "Brick", "Ember"];

function phonePlateIndex(ownerId?: string): number {
  if (!ownerId) return 0;
  const i = PHONE_PLATE_ORDER.indexOf(ownerId);
  if (i >= 0) return i;
  let h = 0;
  for (let n = 0; n < ownerId.length; n++) {
    h = (h + ownerId.charCodeAt(n) * (n + 1)) % 3;
  }
  return h;
}

/**
 * Fan party plates on phone (Y only). Preview up, Ember mild down —
 * X fan and large Ember +Y clipped edges or buried labels in the sprite.
 */
export function nameplatePhoneStaggerY(ownerId?: string): number {
  const i = phonePlateIndex(ownerId);
  if (i === 0) return -18; // Preview
  if (i === 1) return 0; // Brick
  return 6; // Ember
}

/** No X fan — any nonzero offset clipped Ember/Brick on directional pans. */
export function nameplatePhoneStaggerX(_ownerId?: string): number {
  return 0;
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

  const phone =
    typeof window !== "undefined" && detectViewportProfile() === "phone";
  // Parent-space offsets (not ÷screen) — position is not multiplied by scale.
  const staggerY = phone
    ? nameplatePhoneStaggerY(root.__ecuNameplateOwnerId)
    : 0;
  const staggerX = phone
    ? nameplatePhoneStaggerX(root.__ecuNameplateOwnerId)
    : 0;

  if (screen === 1) {
    root.x = stockX + staggerX;
    root.y = stockY + staggerY;
    return true;
  }

  const bounds = readLocalBounds(root);
  if (!bounds) {
    // Do not scale from (0,0) — that is the float-off-head bug.
    return false;
  }
  const attach = nameplateAttachPoint(bounds);
  const pos = nameplatePivotPosition(stockX, stockY, attach.x, attach.y);
  setNodePivot(root, attach.x, attach.y);
  root.x = pos.x + staggerX;
  root.y = pos.y + staggerY;
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

  const profile = detectViewportProfile();
  const phonePixel = profile === "phone";
  const curSx =
    root.scale && typeof root.scale.x === "number" ? root.scale.x : NaN;
  // Counter-scale + bottom-pivot. Re-apply when FOV changes, phone stagger
  // needs a refresh, or the live scale no longer matches the formula (e.g.
  // desktop half-cancel dropped FOV 2 from 2×→1× without an FOV bump).
  if (
    phonePixel ||
    root.__ecuNameplateFov !== appliedFov ||
    !(curSx === screen)
  ) {
    const ok = applyNameplateScreenScale(root, screen);
    if (ok) root.__ecuNameplateFov = appliedFov;
  }
  const visit = (node: SpriteLike | null | undefined) => {
    if (!node) return;
    const isText = looksLikePixiText(node);
    // Phone Pixel → NEAREST. Desktop Consolas stroke stays LINEAR.
    if (typeof node.roundPixels !== "undefined") {
      node.roundPixels = phonePixel ? true : !isText;
    }
    const bt = node.texture && node.texture.baseTexture;
    if (bt) {
      if (isText) {
        const mode = phonePixel ? modes.nearest : modes.linear;
        if (mode != null) bt.scaleMode = mode;
      } else if (modes.nearest != null) {
        bt.scaleMode = modes.nearest;
      }
    }
    if (isText) {
      if (typeof node.resolution === "number" && node.resolution !== res) {
        node.resolution = res;
      } else if (typeof node.resolution !== "number") {
        try {
          (node as { resolution: number }).resolution = res;
        } catch {
          /* older PIXI */
        }
      }
      // Denseness garbs Pixel into mush — phone stays stock size × FOV scale.
      if (!phonePixel) applyNameplateGlyphDenseness(node, res);
      const bt2 = node.texture && node.texture.baseTexture;
      if (bt2) {
        const mode = phonePixel ? modes.nearest : modes.linear;
        if (mode != null) bt2.scaleMode = mode;
      }
    }
    const kids = node.children;
    if (!kids || !kids.length) return;
    for (let i = 0; i < kids.length; i++) visit(kids[i]);
  };
  visit(root);
  beautifyNameTag(root, { ctype: root.__ecuNameplateCtype || ctype });
  // beautify resets atlas to LINEAR; phone Pixel must be NEAREST again.
  if (phonePixel && modes.nearest != null) {
    const forceNearest = (node: SpriteLike | null | undefined) => {
      if (!node) return;
      if (looksLikePixiText(node)) {
        const bt = node.texture && node.texture.baseTexture;
        if (bt) bt.scaleMode = modes.nearest!;
        if (typeof node.roundPixels !== "undefined") node.roundPixels = true;
      }
      const kids = node.children;
      if (!kids) return;
      for (let i = 0; i < kids.length; i++) forceNearest(kids[i]);
    };
    forceNearest(root);
  }
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
    const oid =
      ent.id != null && String(ent.id)
        ? String(ent.id)
        : ent.name != null && String(ent.name)
          ? String(ent.name)
          : undefined;
    if (oid) ent.name_tag.__ecuNameplateOwnerId = oid;
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
      const oid =
        element.id != null && String(element.id)
          ? String(element.id)
          : element.name != null && String(element.name)
            ? String(element.name)
            : undefined;
      if (oid) element.name_tag.__ecuNameplateOwnerId = oid;
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
  // FOV drag can fire many applies per gesture — coalesce to one bust/resync.
  let fovResyncRaf: number | null = null;
  let pendingFov: number | undefined;
  onWorldFovApplied((fov) => {
    pendingFov = fov;
    if (fovResyncRaf != null) return;
    fovResyncRaf = window.requestAnimationFrame(() => {
      fovResyncRaf = null;
      const f = pendingFov;
      pendingFov = undefined;
      bustNameTagCaches();
      resyncNameplateScales(f);
    });
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
