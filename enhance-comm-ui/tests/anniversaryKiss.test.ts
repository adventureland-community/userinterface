/**
 * Anniversary kiss-range ring + hearts idle FX.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { EntityLike } from "../src/host/globals";
import {
  ANNIVERSARY_KISS_RANGE_FALLBACK,
  findAnniversaryTarget,
  kissRangePx,
  paintAnniversaryKiss,
  readAnniversaryLive,
  resetAnniversaryKissFx,
} from "../src/viz/anniversaryKiss";
import type { OverlayHandle } from "../src/viz/mapHost";
import {
  DEFAULT_VIZ_SETTINGS,
  patchVizSettings,
} from "../src/viz/vizSettings";
import {
  FakeContainer,
  FakePIXI,
  setHostMapName,
} from "./support/fakePixi";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
  localStorage?: Storage;
};

function installLocalStorage(): void {
  const store = new Map<string, string>();
  (globalThis as Win).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
}

function installWindow(extra: Record<string, unknown> = {}): void {
  const map = new FakeContainer();
  map.map_name = "main";
  (globalThis as Win).window = {
    map,
    current_map: "main",
    PIXI: FakePIXI,
    ...extra,
  };
}

function makeHandle() {
  const map = window.map as FakeContainer;
  const root = new FakeContainer();
  const gfx = new FakePIXI.Graphics();
  const hotspots = new FakeContainer();
  const labels = new FakeContainer();
  root.addChild(gfx);
  root.addChild(hotspots);
  root.addChild(labels);
  map.addChild(root);
  return { root, gfx, hotspots, labels } as OverlayHandle;
}

afterEach(() => {
  resetAnniversaryKissFx();
  delete (globalThis as Win).localStorage;
  delete (globalThis as Win).window;
});

describe("anniversaryKiss helpers", () => {
  it("reads live anniversary status and kiss range", () => {
    installWindow({
      S: {
        anniversary: {
          active: true,
          live: true,
          target: "Bob",
          id: "42",
          map: "main",
          x: 10,
          y: 20,
        },
      },
      G: { skills: { ikissyou: { range: 80 } } },
    });
    const live = readAnniversaryLive();
    assert.ok(live);
    assert.equal(live!.target, "Bob");
    assert.equal(kissRangePx(), 80);
    assert.equal(ANNIVERSARY_KISS_RANGE_FALLBACK, 80);
  });

  it("falls back to 80 when skill range missing", () => {
    installWindow({ G: { skills: {} } });
    assert.equal(kissRangePx(), 80);
  });

  it("finds featured player by name or id", () => {
    const bob: EntityLike = {
      id: "42",
      type: "character",
      player: true,
      name: "Bob",
      visible: true,
      real_x: 100,
      real_y: 200,
      animations: {},
    } as EntityLike & { animations: Record<string, unknown> };
    assert.equal(
      findAnniversaryTarget([bob], {
        live: true,
        target: "Bob",
        id: "42",
      })?.id,
      "42",
    );
    assert.equal(
      findAnniversaryTarget([bob], { live: true, target: "Bob" })?.name,
      "Bob",
    );
  });
});

describe("paintAnniversaryKiss", () => {
  it("draws a gold dashed ring around the featured player", () => {
    installLocalStorage();
    const heartCalls: string[] = [];
    installWindow({
      current_map: "main",
      S: {
        anniversary: {
          active: true,
          live: true,
          target: "Bob",
          map: "main",
          x: 100,
          y: 200,
        },
      },
      G: { skills: { ikissyou: { range: 80 } } },
      start_animation: (sprite: { name?: string }, name: string) => {
        heartCalls.push(`${sprite.name}:${name}`);
      },
    });
    setHostMapName("main");
    patchVizSettings({ "world.anniversaryKiss": true });
    const handle = makeHandle();
    const bob = {
      id: "42",
      type: "character",
      player: true,
      name: "Bob",
      visible: true,
      real_x: 100,
      real_y: 200,
      animations: {},
    } as EntityLike & { animations: Record<string, unknown> };

    paintAnniversaryKiss(handle.gfx, [bob], {
      ...DEFAULT_VIZ_SETTINGS,
      "world.anniversaryKiss": true,
    });

    let sawGold = false;
    const cmds = (handle.gfx as FakePIXI.Graphics).cmds;
    for (let i = 0; i < cmds.length; i++) {
      const c = cmds[i];
      if (c.t === "lineStyle" && c.color === 0xf0b742) {
        sawGold = true;
        break;
      }
    }
    assert.equal(sawGold, true);
    assert.ok(cmds.some((c) => c.t === "moveTo" || c.t === "lineTo"));
    assert.deepEqual(heartCalls, ["Bob:hearts_single"]);
  });

  it("skips paint when the drawings toggle is off", () => {
    installLocalStorage();
    installWindow({
      current_map: "main",
      S: {
        anniversary: { active: true, live: true, target: "Bob", map: "main" },
      },
    });
    const handle = makeHandle();
    const bob: EntityLike = {
      id: "42",
      type: "character",
      player: true,
      name: "Bob",
      visible: true,
      real_x: 0,
      real_y: 0,
    };
    paintAnniversaryKiss(handle.gfx, [bob], {
      ...DEFAULT_VIZ_SETTINGS,
      "world.anniversaryKiss": false,
    });
    assert.equal((handle.gfx as FakePIXI.Graphics).cmds.length, 0);
  });

  it("uses a softer ring when you are the featured host", () => {
    installLocalStorage();
    installWindow({
      current_map: "main",
      observing: {
        id: "42",
        type: "character",
        player: true,
        name: "Bob",
        real_x: 0,
        real_y: 0,
      },
      S: {
        anniversary: {
          active: true,
          live: true,
          target: "Bob",
          id: "42",
          map: "main",
        },
      },
      G: { skills: { ikissyou: { range: 80 } } },
      start_animation: () => {},
    });
    const handle = makeHandle();
    const bob = {
      id: "42",
      type: "character",
      player: true,
      name: "Bob",
      visible: true,
      real_x: 0,
      real_y: 0,
      animations: {},
    } as EntityLike & { animations: Record<string, unknown> };

    paintAnniversaryKiss(handle.gfx, [bob], {
      ...DEFAULT_VIZ_SETTINGS,
      "world.anniversaryKiss": true,
    });

    let sawHost = false;
    const cmds = (handle.gfx as FakePIXI.Graphics).cmds;
    for (let i = 0; i < cmds.length; i++) {
      const c = cmds[i];
      if (c.t === "lineStyle" && c.color === 0xc9a227) {
        sawHost = true;
        break;
      }
    }
    assert.equal(sawHost, true);
  });

  it("fires a one-shot heart when entering kiss range", () => {
    installLocalStorage();
    const heartCalls: string[] = [];
    const viewer = {
      id: "me",
      type: "character",
      player: true,
      name: "Alice",
      real_x: 200,
      real_y: 0,
      animations: {},
    } as EntityLike & { animations: Record<string, unknown> };
    const bob = {
      id: "42",
      type: "character",
      player: true,
      name: "Bob",
      visible: true,
      real_x: 0,
      real_y: 0,
      animations: {},
    } as EntityLike & { animations: Record<string, unknown> };

    installWindow({
      current_map: "main",
      observing: viewer,
      S: {
        anniversary: {
          active: true,
          live: true,
          target: "Bob",
          map: "main",
        },
      },
      G: { skills: { ikissyou: { range: 80 } } },
      start_animation: (sprite: { name?: string }, name: string) => {
        heartCalls.push(`${sprite.name}:${name}`);
      },
    });

    const settings = {
      ...DEFAULT_VIZ_SETTINGS,
      "world.anniversaryKiss": true,
    };
    const handle = makeHandle();

    paintAnniversaryKiss(handle.gfx, [bob, viewer], settings, 1000);
    assert.deepEqual(heartCalls, ["Bob:hearts_single"]);

    viewer.real_x = 40;
    heartCalls.length = 0;
    paintAnniversaryKiss(handle.gfx, [bob, viewer], settings, 2000);
    assert.ok(heartCalls.indexOf("Alice:hearts_single") >= 0);
  });
});
