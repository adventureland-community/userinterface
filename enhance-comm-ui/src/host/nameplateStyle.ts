/**
 * Soft nameplate chrome — restyle stock add_name_tag Graphics + Text.
 *
 * Stock draws a chunky gray/black 9px bar (plus HP/MP/stand into the same
 * Graphics). We only soften the name band (y in [0, 8)); bars stay crisp.
 */

export const STOCK_NAME_BORDER = 0x716d6c;
export const STOCK_NAME_FILL = 0x201f1f;

export type SoftFill = { color: number; alpha: number };

/** Map stock name-band fills to a softer translucent plate. */
export function softPlateFill(stockColor: number): SoftFill | null {
  const c = stockColor >>> 0;
  if (c === STOCK_NAME_BORDER) return { color: 0x16181c, alpha: 0.42 };
  if (c === STOCK_NAME_FILL) return { color: 0x07080a, alpha: 0.72 };
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
 * Stroke for stock 64px Text (scaled ~0.125). No drop-shadow — soft halos +
 * FOV CSS sampling turned plates into white noise on phone zoom-in.
 */
export function softTextStylePatch(): TextStyleLike {
  return {
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
}

/** Soften name-band gray/black fills in-place. Returns count changed. */
export function softenNameBandGraphics(gfx: GraphicsLike): number {
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
    const soft = softPlateFill(fill);
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

export function applySoftTextStyle(node: TextNodeLike): boolean {
  const style = node.style;
  if (!style || typeof style !== "object") return false;
  if ((style as { __ecuSoft?: boolean }).__ecuSoft) return false;
  const patch = softTextStylePatch();
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

/**
 * Soften one stock name_tag tree. Idempotent via `__ecuNameplateStyled`.
 */
export function beautifyNameTag(
  root:
    | (TextNodeLike & {
        __ecuNameplateStyled?: boolean;
        children?: TextNodeLike[];
      })
    | null
    | undefined,
): void {
  if (!root || root.__ecuNameplateStyled) return;
  root.__ecuNameplateStyled = true;

  const visit = (node: TextNodeLike | null | undefined) => {
    if (!node) return;
    if (looksLikeGraphics(node)) softenNameBandGraphics(node);
    if (looksLikeText(node)) applySoftTextStyle(node);
    const kids = node.children;
    if (!kids || !kids.length) return;
    for (let i = 0; i < kids.length; i++) visit(kids[i]);
  };
  visit(root);
}
