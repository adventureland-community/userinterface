/**
 * Tiny PIXI stand-in for overlay preview — Graphics/Container/Text/Sprite.
 * Live /comm uses the real game.js PIXI; this file must not ship in the userscript.
 *
 * FakeGraphics keeps `graphicsData` so ECU `beautifyNameTag` can soften stock
 * name bands the same way it does on live PIXI.Graphics.
 */

type LineStyle = { width: number; color: number; alpha: number };
type FillStyle = { color: number; alpha: number } | null;

type GfxCmd =
  | { t: "lineStyle"; width: number; color: number; alpha: number }
  | { t: "beginFill"; color: number; alpha: number }
  | { t: "endFill" }
  | { t: "drawCircle"; x: number; y: number; r: number }
  | { t: "drawRect"; x: number; y: number; w: number; h: number }
  | { t: "moveTo"; x: number; y: number }
  | { t: "lineTo"; x: number; y: number };

export type GraphicsDataEntry = {
  fillColor: number;
  fillAlpha: number;
  lineColor?: number;
  lineAlpha?: number;
  fill?: { color: number; alpha: number };
  shape: { x: number; y: number; width: number; height: number };
};

export type FakeDisplayObject = {
  parent: FakeContainer | null;
  children?: FakeDisplayObject[];
  cmds?: GfxCmd[];
  graphicsData?: GraphicsDataEntry[];
  text?: string;
  x?: number;
  y?: number;
  scale?: FakePoint;
  pivot?: FakePoint;
  style?: Record<string, unknown>;
  anchor?: { x: number; y: number; set: (x: number, y?: number) => void };
  destroy?: (opts?: { children?: boolean }) => void;
};

export class FakePoint {
  x: number;
  y: number;
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  set(x: number, y?: number): void {
    this.x = x;
    this.y = y == null ? x : y;
  }
}

export class FakeContainer {
  parent: FakeContainer | null = null;
  children: FakeDisplayObject[] = [];
  map_name?: string;
  x = 0;
  y = 0;
  scale = new FakePoint(1, 1);
  pivot = new FakePoint(0, 0);

  addChild(...nodes: FakeDisplayObject[]): void {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node) continue;
      if (node.parent && node.parent !== this) {
        node.parent.removeChild(node);
      }
      node.parent = this;
      let found = false;
      for (let j = 0; j < this.children.length; j++) {
        if (this.children[j] === node) {
          found = true;
          break;
        }
      }
      if (!found) this.children.push(node);
    }
  }

  removeChild(...nodes: FakeDisplayObject[]): void {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const idx = this.children.indexOf(node);
      if (idx >= 0) this.children.splice(idx, 1);
      if (node && node.parent === this) node.parent = null;
    }
  }

  removeChildren(): void {
    const kids = this.children.slice();
    this.children = [];
    for (let i = 0; i < kids.length; i++) {
      kids[i].parent = null;
    }
  }

  destroy(opts?: { children?: boolean }): void {
    if (opts?.children) {
      const kids = this.children.slice();
      this.removeChildren();
      for (let i = 0; i < kids.length; i++) {
        const kid = kids[i];
        if (kid && typeof kid.destroy === "function") kid.destroy(opts);
      }
    } else {
      this.removeChildren();
    }
    if (this.parent) this.parent.removeChild(this);
  }
}

/** Empty PIXI.Sprite stand-in — stock name_tag root. */
export class FakeSprite extends FakeContainer {
  roundPixels = false;
}

export class FakeGraphics extends FakeContainer {
  cmds: GfxCmd[] = [];
  graphicsData: GraphicsDataEntry[] = [];
  dirty = 0;
  clearDirty = 0;
  roundPixels = false;
  private _fill: FillStyle = null;
  private _stroke: LineStyle = { width: 0, color: 0, alpha: 1 };

  clear(): void {
    this.cmds = [];
    this.graphicsData = [];
    this._fill = null;
  }

  lineStyle(
    width: number,
    color: number,
    alpha?: number,
    _alignment?: number,
    _native?: boolean,
  ): void {
    this._stroke = {
      width: width || 0,
      color: color || 0,
      alpha: alpha == null ? 1 : alpha,
    };
    this.cmds.push({
      t: "lineStyle",
      width: this._stroke.width,
      color: this._stroke.color,
      alpha: this._stroke.alpha,
    });
  }

  beginFill(color: number, alpha?: number): void {
    this._fill = {
      color: color || 0,
      alpha: alpha == null ? 1 : alpha,
    };
    this.cmds.push({
      t: "beginFill",
      color: this._fill.color,
      alpha: this._fill.alpha,
    });
  }

  endFill(): void {
    this._fill = null;
    this.cmds.push({ t: "endFill" });
  }

  drawCircle(x: number, y: number, radius: number): void {
    this.cmds.push({ t: "drawCircle", x, y, r: radius });
  }

  drawRect(x: number, y: number, w: number, h: number): void {
    this.cmds.push({ t: "drawRect", x, y, w, h });
    if (this._fill) {
      this.graphicsData.push({
        fillColor: this._fill.color >>> 0,
        fillAlpha: this._fill.alpha,
        fill: { color: this._fill.color >>> 0, alpha: this._fill.alpha },
        lineColor: this._stroke.color,
        lineAlpha: this._stroke.width > 0 ? this._stroke.alpha : 0,
        shape: { x, y, width: w, height: h },
      });
    }
  }

  moveTo(x: number, y: number): void {
    this.cmds.push({ t: "moveTo", x, y });
  }

  lineTo(x: number, y: number): void {
    this.cmds.push({ t: "lineTo", x, y });
  }

  getLocalBounds(): { x: number; y: number; width: number; height: number } {
    let minX = 0;
    let minY = 0;
    let maxX = 0;
    let maxY = 0;
    let any = false;
    for (let i = 0; i < this.graphicsData.length; i++) {
      const s = this.graphicsData[i].shape;
      if (!any) {
        minX = s.x;
        minY = s.y;
        maxX = s.x + s.width;
        maxY = s.y + s.height;
        any = true;
      } else {
        minX = Math.min(minX, s.x);
        minY = Math.min(minY, s.y);
        maxX = Math.max(maxX, s.x + s.width);
        maxY = Math.max(maxY, s.y + s.height);
      }
    }
    if (!any) return { x: 0, y: 0, width: 0, height: 0 };
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  get width(): number {
    return this.getLocalBounds().width;
  }

  get height(): number {
    return this.getLocalBounds().height;
  }
}

let measureCtx: CanvasRenderingContext2D | null = null;

function measureFont(
  text: string,
  fontSize: number,
  fontFamily: string,
): { width: number; height: number } {
  if (typeof document !== "undefined") {
    if (!measureCtx) {
      const c = document.createElement("canvas");
      measureCtx = c.getContext("2d");
    }
    if (measureCtx) {
      measureCtx.font = fontSize + "px " + fontFamily;
      const m = measureCtx.measureText(text);
      return {
        width: m.width,
        height: fontSize,
      };
    }
  }
  return { width: text.length * fontSize * 0.55, height: fontSize };
}

export class FakeText {
  parent: FakeContainer | null = null;
  text: string;
  x = 0;
  y = 0;
  style: Record<string, unknown>;
  scale = new FakePoint(1, 1);
  resolution = 1;
  roundPixels = false;
  dirty = false;
  texture = { baseTexture: { scaleMode: 0 } };
  anchor = {
    x: 0,
    y: 0,
    set: (ax: number, ay?: number) => {
      this.anchor.x = ax;
      this.anchor.y = ay == null ? ax : ay;
    },
  };
  /** Unscaled glyph metrics (public for canvas draw). */
  _localW = 0;
  _localH = 0;

  constructor(text: string, style?: Record<string, unknown>) {
    this.text = text;
    this.style = style || {};
    this.remeasure();
  }

  remeasure(): void {
    const fontSize =
      typeof this.style.fontSize === "number" ? this.style.fontSize : 11;
    const fontFamily =
      typeof this.style.fontFamily === "string"
        ? this.style.fontFamily
        : "pixel";
    const m = measureFont(String(this.text), fontSize, fontFamily);
    this._localW = m.width;
    this._localH = m.height;
  }

  updateText(): void {
    this.remeasure();
    this.dirty = false;
  }

  getLocalBounds(): { x: number; y: number; width: number; height: number } {
    return { x: 0, y: 0, width: this._localW, height: this._localH };
  }

  /** PIXI.Text.width includes scale. */
  get width(): number {
    return this._localW * (this.scale.x || 1);
  }

  get height(): number {
    return this._localH * (this.scale.y || 1);
  }

  destroy(): void {
    if (this.parent) this.parent.removeChild(this as unknown as FakeDisplayObject);
    this.parent = null;
  }
}

export const FakePIXI = {
  Graphics: FakeGraphics,
  Container: FakeContainer,
  Sprite: FakeSprite,
  Text: FakeText,
  Point: FakePoint,
  SCALE_MODES: { NEAREST: 1, LINEAR: 0 },
};

/** Keep map_name when a FakePIXI map already exists (do not replace addChild).
 *  Stock game.js maps: create_map owns map_name — never rename in place. */
export function setHostMapName(name: string): void {
  const existing = window.map as
    | { map_name?: string; addChild?: unknown }
    | undefined;
  if (existing && typeof existing.addChild === "function") {
    const PIXI = window.PIXI as { Graphics?: unknown } | undefined;
    if (PIXI && PIXI.Graphics === FakeGraphics) {
      existing.map_name = name;
    }
    return;
  }
  window.map = { map_name: name };
}

export function installFakePixi(): FakeContainer {
  const prevName =
    typeof window.map?.map_name === "string" ? window.map.map_name : undefined;
  const existing = window.map as FakeContainer | undefined;
  if (
    existing &&
    typeof existing.addChild === "function" &&
    window.PIXI &&
    (window.PIXI as { Graphics?: unknown }).Graphics === FakeGraphics
  ) {
    if (prevName) existing.map_name = prevName;
    return existing;
  }
  const map = new FakeContainer();
  if (prevName) map.map_name = prevName;
  window.PIXI = FakePIXI as unknown as Window["PIXI"];
  window.map = map as unknown as Window["map"];
  return map;
}

function cssRgba(color: number, alpha: number): string {
  const c = color >>> 0;
  const r = (c >> 16) & 255;
  const g = (c >> 8) & 255;
  const b = c & 255;
  const a = Number.isFinite(alpha) ? alpha : 1;
  return "rgba(" + r + "," + g + "," + b + "," + a + ")";
}

function applyStroke(ctx: CanvasRenderingContext2D, stroke: LineStyle): void {
  ctx.lineWidth = stroke.width;
  ctx.strokeStyle = cssRgba(stroke.color, stroke.alpha);
}

function applyFill(ctx: CanvasRenderingContext2D, fill: FillStyle): void {
  if (!fill) return;
  ctx.fillStyle = cssRgba(fill.color, fill.alpha);
}

export function replayGraphics(
  ctx: CanvasRenderingContext2D,
  cmds: GfxCmd[],
): void {
  let stroke: LineStyle = { width: 0, color: 0, alpha: 1 };
  let fill: FillStyle = null;
  let penX = 0;
  let penY = 0;
  for (let i = 0; i < cmds.length; i++) {
    const cmd = cmds[i];
    switch (cmd.t) {
      case "lineStyle":
        stroke = { width: cmd.width, color: cmd.color, alpha: cmd.alpha };
        break;
      case "beginFill":
        fill = { color: cmd.color, alpha: cmd.alpha };
        break;
      case "endFill":
        fill = null;
        break;
      case "drawCircle":
        ctx.beginPath();
        ctx.arc(cmd.x, cmd.y, cmd.r, 0, Math.PI * 2);
        if (fill) {
          applyFill(ctx, fill);
          ctx.fill();
        }
        if (stroke.width > 0) {
          applyStroke(ctx, stroke);
          ctx.stroke();
        }
        break;
      case "drawRect":
        if (fill) {
          applyFill(ctx, fill);
          ctx.fillRect(cmd.x, cmd.y, cmd.w, cmd.h);
        }
        if (stroke.width > 0) {
          applyStroke(ctx, stroke);
          ctx.strokeRect(cmd.x, cmd.y, cmd.w, cmd.h);
        }
        break;
      case "moveTo":
        penX = cmd.x;
        penY = cmd.y;
        break;
      case "lineTo":
        if (stroke.width > 0) {
          ctx.beginPath();
          ctx.moveTo(penX, penY);
          ctx.lineTo(cmd.x, cmd.y);
          applyStroke(ctx, stroke);
          ctx.stroke();
        }
        penX = cmd.x;
        penY = cmd.y;
        break;
      default: {
        const _never: never = cmd;
        void _never;
        break;
      }
    }
  }
}

/** Prefer graphicsData (ECU-softened) over raw draw cmds. */
function replayGraphicsData(
  ctx: CanvasRenderingContext2D,
  data: GraphicsDataEntry[],
): void {
  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const s = d.shape;
    const alpha =
      typeof d.fillAlpha === "number"
        ? d.fillAlpha
        : d.fill && typeof d.fill.alpha === "number"
          ? d.fill.alpha
          : 1;
    const color =
      typeof d.fillColor === "number"
        ? d.fillColor
        : d.fill && typeof d.fill.color === "number"
          ? d.fill.color
          : 0;
    ctx.fillStyle = cssRgba(color, alpha);
    ctx.fillRect(s.x, s.y, s.width, s.height);
  }
}

function styleFillCss(fill: unknown): string {
  if (typeof fill === "string") return fill;
  if (typeof fill === "number") return cssRgba(fill, 1);
  return "#ffffff";
}

/**
 * Draw FakeText in local space. Caller (`renderNode`) already applied
 * x/y/scale/pivot — do not scale again (that crushed glyphs to a hairline).
 */
function drawText(ctx: CanvasRenderingContext2D, node: FakeText): void {
  const fontSize =
    typeof node.style.fontSize === "number" ? node.style.fontSize : 11;
  const fontFamily =
    typeof node.style.fontFamily === "string"
      ? node.style.fontFamily
      : "pixel, ui-sans-serif, monospace";
  ctx.font = "700 " + fontSize + "px " + fontFamily;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  if (node.dirty || !node._localW) node.remeasure();
  const tw = node._localW || measureFont(node.text, fontSize, fontFamily).width;
  const th = node._localH || fontSize;
  const ox = -node.anchor.x * tw;
  const oy = -node.anchor.y * th;
  const stroke =
    typeof node.style.strokeThickness === "number"
      ? node.style.strokeThickness
      : 0;
  if (stroke > 0) {
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke;
    ctx.strokeStyle =
      typeof node.style.stroke === "string" ? node.style.stroke : "#000000";
    ctx.strokeText(node.text, ox, oy);
  }
  ctx.fillStyle = styleFillCss(node.style.fill);
  ctx.fillText(node.text, ox, oy);
}

function applyNodeTransform(
  ctx: CanvasRenderingContext2D,
  node: FakeDisplayObject,
): void {
  const x = typeof node.x === "number" ? node.x : 0;
  const y = typeof node.y === "number" ? node.y : 0;
  const sx = node.scale && typeof node.scale.x === "number" ? node.scale.x : 1;
  const sy = node.scale && typeof node.scale.y === "number" ? node.scale.y : 1;
  const px = node.pivot && typeof node.pivot.x === "number" ? node.pivot.x : 0;
  const py = node.pivot && typeof node.pivot.y === "number" ? node.pivot.y : 0;
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  ctx.translate(-px, -py);
}

export function renderNode(
  ctx: CanvasRenderingContext2D,
  node: FakeDisplayObject,
): void {
  ctx.save();
  applyNodeTransform(ctx, node);
  const gfx = node as FakeGraphics;
  if (gfx.graphicsData && gfx.graphicsData.length) {
    replayGraphicsData(ctx, gfx.graphicsData);
  } else if (node.cmds && node.cmds.length) {
    replayGraphics(ctx, node.cmds);
  }
  if (typeof node.text === "string") drawText(ctx, node as FakeText);
  const kids = node.children;
  if (kids && kids.length) {
    for (let i = 0; i < kids.length; i++) renderNode(ctx, kids[i]);
  }
  ctx.restore();
}

/** Replay window.map children in the current canvas transform (world space). */
export function renderFakePixiTree(ctx: CanvasRenderingContext2D): void {
  const map = window.map as FakeContainer | undefined;
  if (!map || !map.children) return;
  for (let i = 0; i < map.children.length; i++) {
    renderNode(ctx, map.children[i]);
  }
}

/** Draw an entity's stock/ECU name_tag at world x/y. */
export function renderEntityNameTag(
  ctx: CanvasRenderingContext2D,
  nameTag: FakeDisplayObject,
  worldX: number,
  worldY: number,
): void {
  ctx.save();
  ctx.translate(worldX, worldY);
  renderNode(ctx, nameTag);
  ctx.restore();
}
