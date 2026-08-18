/**
 * Tiny PIXI stand-in for overlay preview — Graphics/Container/Text only.
 * Live /comm uses the real game.js PIXI; this file must not ship in the userscript.
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

export type FakeDisplayObject = {
  parent: FakeContainer | null;
  children?: FakeDisplayObject[];
  cmds?: GfxCmd[];
  text?: string;
  x?: number;
  y?: number;
  style?: Record<string, unknown>;
  anchor?: { x: number; y: number; set: (x: number, y?: number) => void };
  destroy?: (opts?: { children?: boolean }) => void;
};

export class FakeContainer {
  parent: FakeContainer | null = null;
  children: FakeDisplayObject[] = [];
  map_name?: string;

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

export class FakeGraphics extends FakeContainer {
  cmds: GfxCmd[] = [];

  clear(): void {
    this.cmds = [];
  }

  lineStyle(
    width: number,
    color: number,
    alpha?: number,
    _alignment?: number,
    _native?: boolean,
  ): void {
    this.cmds.push({
      t: "lineStyle",
      width: width || 0,
      color: color || 0,
      alpha: alpha == null ? 1 : alpha,
    });
  }

  beginFill(color: number, alpha?: number): void {
    this.cmds.push({
      t: "beginFill",
      color: color || 0,
      alpha: alpha == null ? 1 : alpha,
    });
  }

  endFill(): void {
    this.cmds.push({ t: "endFill" });
  }

  drawCircle(x: number, y: number, radius: number): void {
    this.cmds.push({ t: "drawCircle", x, y, r: radius });
  }

  drawRect(x: number, y: number, w: number, h: number): void {
    this.cmds.push({ t: "drawRect", x, y, w, h });
  }

  moveTo(x: number, y: number): void {
    this.cmds.push({ t: "moveTo", x, y });
  }

  lineTo(x: number, y: number): void {
    this.cmds.push({ t: "lineTo", x, y });
  }
}

export class FakeText {
  parent: FakeContainer | null = null;
  text: string;
  x = 0;
  y = 0;
  style: Record<string, unknown>;
  anchor = {
    x: 0,
    y: 0,
    set: (ax: number, ay?: number) => {
      this.anchor.x = ax;
      this.anchor.y = ay == null ? ax : ay;
    },
  };

  constructor(text: string, style?: Record<string, unknown>) {
    this.text = text;
    this.style = style || {};
  }

  destroy(): void {
    if (this.parent) this.parent.removeChild(this);
    this.parent = null;
  }
}

export const FakePIXI = {
  Graphics: FakeGraphics,
  Container: FakeContainer,
  Text: FakeText,
};

/** Keep map_name when a PIXI-like map already exists (do not replace addChild). */
export function setHostMapName(name: string): void {
  const existing = window.map as
    | { map_name?: string; addChild?: unknown }
    | undefined;
  if (existing && typeof existing.addChild === "function") {
    existing.map_name = name;
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
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  const a = Number.isFinite(alpha) ? alpha : 1;
  return `rgba(${r},${g},${b},${a})`;
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

function drawText(ctx: CanvasRenderingContext2D, node: FakeText): void {
  const fontSize =
    typeof node.style.fontSize === "number" ? node.style.fontSize : 11;
  const fill =
    typeof node.style.fill === "number" ? node.style.fill : 0xcccccc;
  const ax = node.anchor.x;
  const ay = node.anchor.y;
  ctx.font = `${fontSize}px pixel, ui-sans-serif, monospace`;
  ctx.fillStyle = cssRgba(fill, 1);
  ctx.textAlign = ax > 0.66 ? "right" : ax > 0.33 ? "center" : "left";
  ctx.textBaseline = ay > 0.66 ? "bottom" : ay > 0.33 ? "middle" : "top";
  ctx.fillText(node.text, node.x, node.y);
}

function renderNode(
  ctx: CanvasRenderingContext2D,
  node: FakeDisplayObject,
): void {
  if (node.cmds && node.cmds.length) replayGraphics(ctx, node.cmds);
  if (typeof node.text === "string") drawText(ctx, node as FakeText);
  const kids = node.children;
  if (!kids || !kids.length) return;
  for (let i = 0; i < kids.length; i++) renderNode(ctx, kids[i]);
}

/** Replay window.map children in the current canvas transform (world space). */
export function renderFakePixiTree(ctx: CanvasRenderingContext2D): void {
  const map = window.map as FakeContainer | undefined;
  if (!map || !map.children) return;
  for (let i = 0; i < map.children.length; i++) {
    renderNode(ctx, map.children[i]);
  }
}
