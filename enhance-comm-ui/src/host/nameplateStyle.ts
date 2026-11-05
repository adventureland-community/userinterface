/**
 * Ghost-plate nameplate chrome — restyle stock add_name_tag Graphics + Text.
 *
 * Stock draws a gray border + black fill 9px bar (plus HP/MP/stand into the
 * same Graphics). We drop the border, tint the ghost band with class color,
 * and keep the name white; bars stay crisp.
 */

import { resolveClassColor } from "../lib/colors";

export const STOCK_NAME_BORDER = 0x716d6c;
export const STOCK_NAME_FILL = 0x201f1f;

/**
 * Preferred nameplate faces (Consolas first). PIXI must get a single concrete
 * family name — a comma stack is treated as one missing font and falls back to
 * stock `pixel` (m5x7), which is what made live tags look unlike the previews.
 */
export const NAMEPLATE_FONT_FAMILIES: string[] = [
  "Consolas",
  "Menlo",
  "Monaco",
  "Courier New",
  "monospace",
];

/** @deprecated Use {@link resolveNameplateFontFamily} — kept as Consolas label. */
export const NAMEPLATE_FONT_FAMILY = "Consolas";

/** Pick the first installed face from {@link NAMEPLATE_FONT_FAMILIES}. */
export function resolveNameplateFontFamily(): string {
  const faces = NAMEPLATE_FONT_FAMILIES;
  const fonts =
    typeof document !== "undefined"
      ? (document as Document & { fonts?: { check?: (f: string) => boolean } })
          .fonts
      : undefined;
  if (fonts && typeof fonts.check === "function") {
    for (let i = 0; i < faces.length; i++) {
      const face = faces[i];
      try {
        if (fonts.check('12px "' + face + '"') || fonts.check("12px " + face)) {
          return face;
        }
      } catch {
        /* ignore */
      }
    }
  }
  return faces[0] || "Consolas";
}

export type SoftFill = { color: number; alpha: number };

/** Relative luminance 0–1 for a #rrggbb (or rrggbb) color. */
export function hexLuminance(hex: string): number {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex || "").trim());
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLin((n >> 16) & 255);
  const g = toLin((n >> 8) & 255);
  const b = toLin(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Mix `#rrggbb` toward black by `t` (0–1). */
export function mixHexTowardBlack(hex: string, t: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex || "").trim());
  if (!m) return "#0a0c12";
  const n = parseInt(m[1], 16);
  const amt = Math.max(0, Math.min(1, t));
  const shade = (c: number) => Math.round(c * (1 - amt));
  const r = shade((n >> 16) & 255);
  const g = shade((n >> 8) & 255);
  const b = shade(n & 255);
  const h = ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
  return "#" + h;
}

/**
 * Class-tinted ghost plate for white name text.
 * Light wash (~28%) so town art stays primary; class hue is a hint only.
 * Light hues darken a touch for white-text contrast. NPC / unknown → charcoal.
 */
export function ghostPlateForClassColor(classHex?: string): SoftFill {
  const raw = String(classHex || "").trim() || "#ffffff";
  const key = raw.charAt(0) === "#" ? raw : "#" + raw;
  if (key.toLowerCase() === "#ffffff" || hexLuminance(key) > 0.85) {
    return { color: 0x0a0c12, alpha: 0.28 };
  }
  const L = hexLuminance(key);
  // Shade just enough for white text; keep class hue under a light ghost.
  const darken = L > 0.4 ? 0.42 : L > 0.3 ? 0.16 : L > 0.2 ? 0.08 : 0.04;
  const mixed = mixHexTowardBlack(key, darken);
  const n = parseInt(mixed.slice(1), 16);
  return { color: n >>> 0, alpha: 0.28 };
}

/**
 * Thin darker-class rim — very soft so plates don't read as solid UI.
 * NPC / unknown → charcoal rim.
 */
export function ghostPlateRimForClassColor(classHex?: string): SoftFill {
  const raw = String(classHex || "").trim() || "#ffffff";
  const key = raw.charAt(0) === "#" ? raw : "#" + raw;
  if (key.toLowerCase() === "#ffffff" || hexLuminance(key) > 0.85) {
    return { color: 0x020304, alpha: 0.35 };
  }
  const mixed = mixHexTowardBlack(key, 0.62);
  const n = parseInt(mixed.slice(1), 16);
  return { color: n >>> 0, alpha: 0.4 };
}

/** @deprecated Prefer {@link ghostPlateForClassColor}. */
export function ghostPlateForTextColor(textFill?: string): SoftFill {
  return ghostPlateForClassColor(textFill);
}

/**
 * Map stock name-band fills to a single ghost plate.
 * Border → thin darker-class rim. Fill → class-tinted band.
 */
export function softPlateFill(
  stockColor: number,
  classHex?: string,
): SoftFill | null {
  const c = stockColor >>> 0;
  if (c === STOCK_NAME_BORDER) return ghostPlateRimForClassColor(classHex);
  if (c === STOCK_NAME_FILL) return ghostPlateForClassColor(classHex);
  return null;
}

/**
 * Name-band shapes sit at y ∈ [0, 8). HP is above (y &lt; 0), MP at y ≥ 8,
 * stand slots around y = -13.
 */
export function isNameBandShape(y: number, height: number): boolean {
  if (!(height > 0) || !(height <= 10)) return false;
  return y >= 0 && y < 8;
}

export type GraphicsDataLike = {
  fillColor?: number;
  fillAlpha?: number;
  fill?: boolean | { color?: number; alpha?: number };
  shape?: { y?: number; height?: number; x?: number; width?: number };
  lineColor?: number;
  lineAlpha?: number;
};

export type GraphicsLike = {
  graphicsData?: GraphicsDataLike[];
  geometry?: { graphicsData?: GraphicsDataLike[] };
  dirty?: number;
  clearDirty?: number;
  _invalidate?: () => void;
};

export type TextStyleLike = {
  fontFamily?: string | string[];
  fill?: string | number | Array<string | number>;
  stroke?: string | number;
  strokeThickness?: number;
  dropShadow?: boolean;
  dropShadowColor?: string | number;
  dropShadowDistance?: number;
  dropShadowBlur?: number;
  dropShadowAlpha?: number;
  dropShadowAngle?: number;
};

export type TextNodeLike = {
  style?: TextStyleLike | null;
  text?: unknown;
  resolution?: number;
  updateText?: () => void;
  dirty?: boolean;
  children?: TextNodeLike[];
};

/**
 * Name text fill — always white. Class identity lives on the ghost plate
 * ({@link ghostPlateForClassColor}). NPCs / unknown also white on charcoal.
 */
export function nameplateFillForClass(_ctype?: string | null): string {
  return "#ffffff";
}

/** Class hex for the ghost plate, or white (→ charcoal plate). */
export function nameplatePlateClassColor(ctype?: string | null): string {
  return resolveClassColor(ctype, "#ffffff");
}

/**
 * Stroke for stock 64px Text (scaled ~0.125). System mono face, white fill,
 * black edge for crowded overlaps. No drop-shadow.
 */
export function softTextStylePatch(fillColor?: string): TextStyleLike {
  return {
    fontFamily: resolveNameplateFontFamily(),
    fill: fillColor || "#ffffff",
    stroke: "#000000",
    strokeThickness: 4,
    dropShadow: false,
  };
}

export function getGraphicsData(
  gfx: GraphicsLike | null | undefined,
): GraphicsDataLike[] | null {
  if (!gfx) return null;
  if (gfx.graphicsData && gfx.graphicsData.length) return gfx.graphicsData;
  const geo = gfx.geometry;
  if (geo && geo.graphicsData && geo.graphicsData.length) {
    return geo.graphicsData;
  }
  return null;
}

function readFillColor(d: GraphicsDataLike): number | null {
  if (typeof d.fillColor === "number") return d.fillColor >>> 0;
  const f = d.fill;
  if (f && typeof f === "object" && typeof f.color === "number") {
    return f.color >>> 0;
  }
  return null;
}

function writeFill(d: GraphicsDataLike, soft: SoftFill): void {
  if (typeof d.fillColor === "number") {
    d.fillColor = soft.color;
    d.fillAlpha = soft.alpha;
  }
  const f = d.fill;
  if (f && typeof f === "object") {
    f.color = soft.color;
    f.alpha = soft.alpha;
  }
  // Kill stock line strokes — they read as a soft muddy halo when scaled.
  if (typeof d.lineAlpha === "number") d.lineAlpha = 0;
}

/** Ghost name-band fills in-place (border cleared). Returns count changed. */
export function softenNameBandGraphics(
  gfx: GraphicsLike,
  classHex?: string,
): number {
  const data = getGraphicsData(gfx);
  if (!data) return 0;
  let changed = 0;
  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const shape = d.shape;
    if (!shape) continue;
    const y = typeof shape.y === "number" ? shape.y : 0;
    const h = typeof shape.height === "number" ? shape.height : 0;
    if (!isNameBandShape(y, h)) continue;
    const fill = readFillColor(d);
    if (fill == null) continue;
    const soft = softPlateFill(fill, classHex);
    if (!soft) continue;
    writeFill(d, soft);
    changed++;
  }
  if (changed) {
    if (typeof gfx.dirty === "number") gfx.dirty++;
    if (typeof gfx.clearDirty === "number") gfx.clearDirty++;
    if (typeof gfx._invalidate === "function") {
      try {
        gfx._invalidate();
      } catch {
        /* older PIXI */
      }
    }
  }
  return changed;
}

export function applySoftTextStyle(
  node: TextNodeLike,
  fillColor?: string,
): boolean {
  const style = node.style;
  if (!style || typeof style !== "object") return false;
  const patch = softTextStylePatch(fillColor);
  const wantFont = String(patch.fontFamily || "Consolas");
  const curFont = style.fontFamily;
  const fontOk =
    curFont === wantFont ||
    (Array.isArray(curFont) && curFont[0] === wantFont);
  const already = !!(style as { __ecuSoft?: boolean }).__ecuSoft;
  // Always (re)assert the concrete face — early tags may have been soft-styled
  // while still on stock `pixel` / a failed comma stack.
  if (already && fontOk) return false;
  style.fontFamily = wantFont;
  style.fill = patch.fill;
  style.stroke = patch.stroke;
  style.strokeThickness = patch.strokeThickness;
  style.dropShadow = patch.dropShadow;
  style.dropShadowColor = patch.dropShadowColor;
  style.dropShadowDistance = patch.dropShadowDistance;
  style.dropShadowBlur = patch.dropShadowBlur;
  style.dropShadowAlpha = patch.dropShadowAlpha;
  style.dropShadowAngle = patch.dropShadowAngle;
  (style as { __ecuSoft?: boolean }).__ecuSoft = true;
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

function looksLikeText(node: TextNodeLike): boolean {
  return (
    (typeof node.text === "string" && node.style != null) ||
    typeof node.updateText === "function" ||
    typeof node.resolution === "number"
  );
}

function looksLikeGraphics(node: unknown): node is GraphicsLike {
  if (!node || typeof node !== "object") return false;
  const n = node as GraphicsLike;
  return !!(
    (n.graphicsData && n.graphicsData.length) ||
    (n.geometry && n.geometry.graphicsData && n.geometry.graphicsData.length)
  );
}

/** Even padding (local px) between name glyphs and the ghost fill edge. */
export const NAMEPLATE_BAND_PAD = 1.5;

/** Hard cap — never tower the plate if height metrics are wrong. */
export const NAMEPLATE_BAND_GROW_MAX = 4;

/** How much to grow the fill upward so `textH` fits with {@link NAMEPLATE_BAND_PAD}. */
export function nameBandGrowUp(
  fillH: number,
  textH: number,
  pad = NAMEPLATE_BAND_PAD,
): number {
  const need = textH + 2 * pad;
  if (!(fillH > 0) || !(textH > 0)) return 0;
  // Reject absurd glyph boxes (unscaled 64px Text bounds) so we never grow
  // the band into a screen-tall tower.
  if (textH > fillH + NAMEPLATE_BAND_GROW_MAX + 2) return 0;
  return Math.min(
    NAMEPLATE_BAND_GROW_MAX,
    Math.max(0, Math.ceil(need - fillH)),
  );
}

/** Top-anchored text `y` centered in a fill band. */
export function nameBandTextY(
  fillY: number,
  fillH: number,
  textH: number,
): number {
  return fillY + (fillH - textH) / 2;
}

type PadTextNode = TextNodeLike & {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  scale?: { x?: number; y?: number };
  getLocalBounds?: () => { height?: number };
};

type PadPlateNode = GraphicsLike & {
  __ecuNamepad?: boolean;
  children?: PadTextNode[];
};

/**
 * On-screen glyph height for stock name Text (64px × scale 0.125).
 * `getLocalBounds()` is unscaled — must multiply by scale.y or we grow the
 * plate by ~60px and get the tall towers.
 */
export function textVisualHeight(node: PadTextNode): number {
  const scaleY = Math.abs(
    node.scale && typeof node.scale.y === "number" ? node.scale.y : 0,
  );
  // PIXI.DisplayObject.height usually includes scale and is the safe read.
  if (typeof node.height === "number" && node.height > 0 && node.height <= 20) {
    return node.height;
  }
  if (typeof node.getLocalBounds === "function") {
    try {
      const b = node.getLocalBounds();
      if (b && typeof b.height === "number" && b.height > 0) {
        const local = b.height;
        const sy = scaleY > 0 ? scaleY : 0.125;
        // Unscaled 64px face → apply scale; already-small local → trust it.
        return local > 20 ? local * sy : local;
      }
    } catch {
      /* older PIXI */
    }
  }
  if (typeof node.height === "number" && node.height > 0) {
    const sy = scaleY > 0 ? scaleY : 0.125;
    return node.height > 20 ? node.height * sy : node.height;
  }
  return 0;
}

/** True when a Graphics shape is part of the name band (not HP/MP/stand). */
function isNameBandGeom(y: number, height: number): boolean {
  if (!(height > 0) || height > 14) return false;
  const bottom = y + height;
  // Stock: y∈[0,8) h≤10. After grow-up, y may be slightly negative.
  return bottom > 0 && bottom <= 12 && y < 8;
}

/**
 * Grow the name band upward if needed and center name/level/class text so
 * Consolas (taller than m5x7) has even padding inside the ghost fill.
 */
export function fitNameTextInGhostBand(plate: PadPlateNode): boolean {
  if (!plate || plate.__ecuNamepad) return false;
  const data = getGraphicsData(plate);
  if (!data) return false;

  let tallestH = 0;
  for (let i = 0; i < data.length; i++) {
    const shape = data[i].shape;
    if (!shape) continue;
    const y = typeof shape.y === "number" ? shape.y : 0;
    const h = typeof shape.height === "number" ? shape.height : 0;
    if (!isNameBandGeom(y, h)) continue;
    if (h > tallestH) tallestH = h;
  }
  // Inset fill: shorter than the outer frame (stock y=1 h=7 vs y=0 h=9).
  let fill: GraphicsDataLike | null = null;
  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const shape = d.shape;
    if (!shape) continue;
    const y = typeof shape.y === "number" ? shape.y : 0;
    const h = typeof shape.height === "number" ? shape.height : 0;
    if (!isNameBandGeom(y, h)) continue;
    if (tallestH > 0 && h >= tallestH) continue;
    if (h < 5) continue;
    fill = d;
    break;
  }
  if (!fill || !fill.shape) return false;

  const kids = plate.children || [];
  let maxTextH = 0;
  const texts: PadTextNode[] = [];
  for (let i = 0; i < kids.length; i++) {
    const kid = kids[i];
    if (!looksLikeText(kid)) continue;
    // Name / level / class labels sit near the band (stock y≈1.5).
    const ky = typeof kid.y === "number" ? kid.y : 0;
    if (ky < -2 || ky > 6) continue;
    const th = textVisualHeight(kid);
    if (th > maxTextH) maxTextH = th;
    texts.push(kid);
  }
  if (!texts.length || !(maxTextH > 0)) return false;

  const fillY0 = typeof fill.shape.y === "number" ? fill.shape.y : 1;
  const fillH0 = typeof fill.shape.height === "number" ? fill.shape.height : 7;
  const grow = nameBandGrowUp(fillH0, maxTextH);
  if (grow > 0) {
    for (let i = 0; i < data.length; i++) {
      const shape = data[i].shape;
      if (!shape) continue;
      const y = typeof shape.y === "number" ? shape.y : 0;
      const h = typeof shape.height === "number" ? shape.height : 0;
      if (!isNameBandGeom(y, h)) continue;
      shape.y = y - grow;
      shape.height = h + grow;
    }
    if (typeof plate.dirty === "number") plate.dirty++;
    if (typeof plate.clearDirty === "number") plate.clearDirty++;
    if (typeof plate._invalidate === "function") {
      try {
        plate._invalidate();
      } catch {
        /* older PIXI */
      }
    }
  }

  const fillY = typeof fill.shape.y === "number" ? fill.shape.y : fillY0 - grow;
  const fillH =
    typeof fill.shape.height === "number" ? fill.shape.height : fillH0 + grow;
  for (let i = 0; i < texts.length; i++) {
    const th = textVisualHeight(texts[i]);
    if (!(th > 0)) continue;
    texts[i].y = nameBandTextY(fillY, fillH, th);
  }
  plate.__ecuNamepad = true;
  return true;
}

/**
 * Soften one stock name_tag tree.
 * Plate chrome is idempotent via `__ecuNameplateStyled`; text font is re-checked
 * every pass so a bad first face can be corrected to Consolas.
 */
export function beautifyNameTag(
  root:
    | (TextNodeLike & {
        __ecuNameplateStyled?: boolean;
        children?: TextNodeLike[];
      })
    | null
    | undefined,
  options?: { ctype?: string | null },
): void {
  if (!root) return;
  const plateClass = nameplatePlateClassColor(options && options.ctype);
  const textFill = nameplateFillForClass(options && options.ctype);
  const plateDone = !!root.__ecuNameplateStyled;
  root.__ecuNameplateStyled = true;

  const visit = (node: TextNodeLike | null | undefined) => {
    if (!node) return;
    if (!plateDone && looksLikeGraphics(node)) {
      softenNameBandGraphics(node, plateClass);
    }
    if (looksLikeText(node)) applySoftTextStyle(node, textFill);
    if (looksLikeGraphics(node)) {
      fitNameTextInGhostBand(node as PadPlateNode);
    }
    const kids = node.children;
    if (!kids || !kids.length) return;
    for (let i = 0; i < kids.length; i++) visit(kids[i]);
  };
  visit(root);
}
