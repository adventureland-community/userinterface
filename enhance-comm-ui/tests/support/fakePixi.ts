/** Minimal PIXI stand-in for viz overlay unit tests — not the overlay preview harness. */

export class FakeContainer {
  parent: FakeContainer | null = null;
  children: FakeDisplayObject[] = [];
  map_name?: string;
  interactiveChildren?: boolean;

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
    this.removeChild(...kids);
  }
}

type GfxCmd =
  | { t: "lineStyle"; width: number; color: number; alpha: number }
  | { t: "beginFill"; color: number; alpha: number }
  | { t: "endFill" }
  | { t: "drawCircle"; x: number; y: number; r: number }
  | { t: "moveTo"; x: number; y: number }
  | { t: "lineTo"; x: number; y: number };

export type FakeDisplayObject = {
  parent: FakeContainer | null;
  children?: FakeDisplayObject[];
  cmds?: GfxCmd[];
  destroy?: (opts?: { children?: boolean }) => void;
};

export class FakeGraphics extends FakeContainer {
  cmds: GfxCmd[] = [];

  clear(): void {
    this.cmds = [];
  }

  lineStyle(width: number, color: number, alpha?: number): void {
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

  moveTo(x: number, y: number): void {
    this.cmds.push({ t: "moveTo", x, y });
  }

  lineTo(x: number, y: number): void {
    this.cmds.push({ t: "lineTo", x, y });
  }
}

export class FakeRectangle {
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
  ) {}
}

export class FakeSprite {
  parent: FakeContainer | null = null;
  x = 0;
  y = 0;
  interactive?: boolean;
  interactiveChildren?: boolean;
  buttonMode?: boolean;
  cursor?: string;
  hitArea?: unknown;
  anchor = {
    set: () => {},
  };
  handlers: Record<string, Array<(...args: any[]) => void>> = {};

  on(event: string, cb: (...args: any[]) => void): this {
    (this.handlers[event] ||= []).push(cb);
    return this;
  }

  emit(event: string, ...args: any[]): void {
    const list = this.handlers[event] || [];
    for (let i = 0; i < list.length; i++) list[i](...args);
  }

  destroy(): void {
    this.handlers = {};
    this.parent = null;
  }
}

export const FakePIXI = {
  Graphics: FakeGraphics,
  Container: FakeContainer,
  Sprite: FakeSprite,
  Rectangle: FakeRectangle,
};

export function setHostMapName(name: string): void {
  const existing = window.map as
    { map_name?: string; addChild?: unknown } | undefined;
  if (existing && typeof existing.addChild === "function") {
    existing.map_name = name;
    return;
  }
  window.map = { map_name: name };
}
