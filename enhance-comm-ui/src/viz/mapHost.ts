/**
 * Safe access to /comm host map + PIXI (game.js on observer page).
 * Does not use character CODE runner APIs (parent.map / drawings[]).
 */

type PixiLike = {
  Graphics: new () => GraphicsLike;
  Container?: new () => ContainerLike;
  Text?: new (text: string, style?: Record<string, unknown>) => TextLike;
  Sprite?: new () => SpriteLike;
  Rectangle?: new (x: number, y: number, w: number, h: number) => RectLike;
};

export type GraphicsLike = {
  clear: () => void;
  lineStyle: (
    width: number,
    color: number,
    alpha?: number,
    alignment?: number,
    native?: boolean,
  ) => void;
  beginFill: (color: number, alpha?: number) => void;
  endFill: () => void;
  drawCircle: (x: number, y: number, radius: number) => void;
  drawRect?: (x: number, y: number, w: number, h: number) => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  destroy?: (opts?: { children?: boolean }) => void;
  parent?: { removeChild?: (c: unknown) => void } | null;
};

export type TextLike = {
  text: string;
  x: number;
  y: number;
  anchor?: { set: (x: number, y?: number) => void };
  style?: Record<string, unknown>;
  destroy?: (opts?: { children?: boolean }) => void;
};

export type SpriteLike = {
  x: number;
  y: number;
  interactive?: boolean;
  interactiveChildren?: boolean;
  buttonMode?: boolean;
  cursor?: string;
  hitArea?: unknown;
  parentGroup?: unknown;
  displayGroup?: unknown;
  anchor?: { set: (x: number, y?: number) => void };
  on?: (event: string, cb: (...args: any[]) => void) => unknown;
  destroy?: (opts?: { children?: boolean }) => void;
  parent?: { removeChild?: (c: unknown) => void } | null;
};

export type RectLike = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ContainerLike = {
  addChild: (...c: unknown[]) => void;
  removeChild?: (...c: unknown[]) => void;
  removeChildren?: () => void;
  destroy?: (opts?: { children?: boolean }) => void;
  interactive?: boolean;
  interactiveChildren?: boolean;
  parentGroup?: unknown;
  displayGroup?: unknown;
  parent?: { removeChild?: (c: unknown) => void } | null;
  children?: unknown[];
};

export type OverlayHandle = {
  root: ContainerLike;
  gfx: GraphicsLike;
  hotspots: ContainerLike;
  labels: ContainerLike;
};

type MapLike = {
  addChild: (c: unknown) => void;
  removeChild?: (c: unknown) => void;
  map_name?: string;
  x?: number;
  y?: number;
  scale?: { x?: number; y?: number };
  toLocal?: (position: { x: number; y: number }) => { x: number; y: number };
};

export function getHostPixi(): PixiLike | null {
  const pixi = window.PIXI;
  if (!pixi || typeof pixi.Graphics !== "function") return null;
  return pixi as PixiLike;
}

export function getHostMap(): MapLike | null {
  const map = window.map;
  if (!map || typeof map.addChild !== "function") return null;
  return map as MapLike;
}

/** True when /comm has no usable map stage (no_graphics / not ready). */
export function mapOverlayBlocked(): boolean {
  if (window.no_graphics) return true;
  if (!getHostPixi()) return true;
  if (!getHostMap()) return true;
  return false;
}

function makeContainer(pixi: PixiLike): ContainerLike {
  if (typeof pixi.Container === "function") return new pixi.Container();
  // Fallback: Graphics doubles as a child host when Container is missing.
  return new pixi.Graphics() as unknown as ContainerLike;
}

function applyPlayerLayer(obj: {
  parentGroup?: unknown;
  displayGroup?: unknown;
}): void {
  const layer = window.player_layer;
  if (!layer) return;
  obj.parentGroup = layer;
  obj.displayGroup = layer;
}

export function ensureOverlayHandle(
  existing: OverlayHandle | null,
): OverlayHandle | null {
  if (mapOverlayBlocked()) return null;
  const map = getHostMap();
  const pixi = getHostPixi();
  if (!map || !pixi) return null;
  if (existing && existing.root.parent) return existing;

  const root = makeContainer(pixi);
  const gfx = new pixi.Graphics();
  const labels = makeContainer(pixi);
  const hotspots = makeContainer(pixi);
  applyPlayerLayer(root);
  applyPlayerLayer(hotspots);
  root.interactiveChildren = true;
  hotspots.interactive = true;
  hotspots.interactiveChildren = true;
  root.addChild(gfx);
  root.addChild(labels);
  root.addChild(hotspots);
  map.addChild(root);
  return { root, gfx, hotspots, labels };
}

export function clearOverlayLabels(labels: ContainerLike): void {
  if (typeof labels.removeChildren === "function") {
    const kids = labels.children ? labels.children.slice() : [];
    labels.removeChildren();
    for (let i = 0; i < kids.length; i++) {
      const kid = kids[i] as TextLike;
      try {
        if (kid && typeof kid.destroy === "function") kid.destroy();
      } catch {
        /* ignore */
      }
    }
    return;
  }
  if (typeof labels.removeChild === "function" && labels.children) {
    while (labels.children.length) {
      const kid = labels.children[0] as TextLike;
      labels.removeChild(kid);
      try {
        if (kid && typeof kid.destroy === "function") kid.destroy();
      } catch {
        /* ignore */
      }
    }
  }
}

export function addOverlayLabel(
  labels: ContainerLike,
  text: string,
  x: number,
  y: number,
  opts?: {
    fill?: number;
    fontSize?: number;
    anchorX?: number;
    anchorY?: number;
  },
): void {
  const pixi = getHostPixi();
  if (!pixi || typeof pixi.Text !== "function") return;
  const fill = opts?.fill ?? 0xcccccc;
  const fontSize = opts?.fontSize ?? 11;
  const label = new pixi.Text(text, {
    fontFamily: "monospace",
    fontSize,
    fill,
    align: "left",
  });
  if (label.anchor && typeof label.anchor.set === "function") {
    label.anchor.set(opts?.anchorX ?? 0, opts?.anchorY ?? 0);
  }
  label.x = x;
  label.y = y;
  labels.addChild(label);
}

export function destroyOverlayHandle(handle: OverlayHandle | null): void {
  if (!handle) return;
  try {
    clearOverlayLabels(handle.labels);
  } catch {
    /* ignore */
  }
  try {
    if (
      handle.root.parent &&
      typeof handle.root.parent.removeChild === "function"
    ) {
      handle.root.parent.removeChild(handle.root);
    }
  } catch {
    /* map may have been rebuilt */
  }
  try {
    if (typeof handle.root.destroy === "function") {
      handle.root.destroy({ children: true });
    }
  } catch {
    /* ignore */
  }
}
