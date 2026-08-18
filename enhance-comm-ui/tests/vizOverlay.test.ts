/**
 * Viz ability phase + debug line gating.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  abilityCdPhase,
  imminentOpacity,
  IMMINENT_RATIO,
  noteAbilityMsForFlash,
  resetAbilityFlashWatches,
} from "../src/viz/abilityPhase";
import { lineEnabled } from "../src/viz/lineRules";
import type { EntityLike } from "../src/host/globals";
import {
  DEFAULT_VIZ_SETTINGS,
  getVizSettings,
  patchVizSettings,
  VIZ_SETTINGS_KEY,
  vizCommFlag,
  type VizSettings,
} from "../src/viz/vizSettings";
import { OVERLAY_TOGGLE_SECTIONS } from "../src/viz/overlayToggleCatalog";
import { paintWorldOverlay } from "../src/viz/paintWorldOverlay";
import type { OverlayHandle } from "../src/viz/mapHost";
import {
  FakeContainer,
  FakePIXI,
  FakeSprite,
  setHostMapName,
} from "./support/fakePixi";
import {
  activateWorldQuirk,
  commNoticeFromQuirk,
  findQuirkAtMapPoint,
  getCurrentWorldQuirks,
  getHoveredWorldQuirk,
  quirkContainsMapPoint,
  resetWorldQuirkHotspotCache,
} from "../src/viz/worldQuirks";

afterEach(() => {
  resetAbilityFlashWatches();
});

describe("abilityCdPhase", () => {
  it("marks imminent under 15% remaining", () => {
    const cd = 10000;
    assert.equal(
      abilityCdPhase(cd * IMMINENT_RATIO - 1, cd, {
        imminent: true,
        ghost: false,
      }),
      "imminent",
    );
    assert.equal(
      abilityCdPhase(cd * 0.5, cd, { imminent: true, ghost: false }),
      "hidden",
    );
  });

  it("shows ghost mid-CD when enabled", () => {
    assert.equal(
      abilityCdPhase(5000, 10000, { imminent: true, ghost: true }),
      "ghost",
    );
  });

  it("hides when ms or cooldown invalid", () => {
    assert.equal(
      abilityCdPhase(0, 10000, { imminent: true, ghost: true }),
      "hidden",
    );
    assert.equal(
      abilityCdPhase(100, 0, { imminent: true, ghost: true }),
      "hidden",
    );
  });

  it("pulses imminent opacity toward 1", () => {
    const cd = 10000;
    const mid = imminentOpacity(cd * IMMINENT_RATIO * 0.5, cd);
    const late = imminentOpacity(1, cd);
    assert.ok(mid >= 0.5 && mid <= 1);
    assert.ok(late > mid);
  });

  it("flashes briefly after a CD reset", () => {
    const cd = 10000;
    assert.equal(noteAbilityMsForFlash("e1:anger", 100, cd), false);
    assert.equal(noteAbilityMsForFlash("e1:anger", 9000, cd), true);
    assert.equal(
      abilityCdPhase(9000, cd, { imminent: true, ghost: false, flash: true }),
      "flash",
    );
  });
});

describe("lineEnabled", () => {
  const base: VizSettings = {
    ...DEFAULT_VIZ_SETTINGS,
    "lines.moveDest": true,
    "lines.aggroTarget": true,
    "lines.attackTarget": true,
    "lines.filter.monsters": true,
    "lines.filter.players": true,
    "lines.filter.focusOnly": false,
  };

  const boss: EntityLike = {
    id: "b1",
    type: "monster",
    mtype: "gpurplepro",
    visible: true,
  };
  const player: EntityLike = {
    id: "p1",
    type: "character",
    player: true,
    name: "Alice",
    visible: true,
  };

  it("respects global line toggles", () => {
    const off = { ...base, "lines.aggroTarget": false };
    assert.equal(lineEnabled(boss, "aggroTarget", off, {}), false);
    assert.equal(lineEnabled(boss, "aggroTarget", base, {}), true);
  });

  it("applies kind filters", () => {
    const noMon = { ...base, "lines.filter.monsters": false };
    assert.equal(lineEnabled(boss, "moveDest", noMon, {}), false);
    assert.equal(lineEnabled(player, "moveDest", noMon, {}), true);
  });

  it("focusOnly gates non-focus entities", () => {
    const focus = { ...base, "lines.filter.focusOnly": true };
    assert.equal(lineEnabled(boss, "aggroTarget", focus, {}, "b1"), true);
    assert.equal(lineEnabled(boss, "aggroTarget", focus, {}, "other"), false);
  });

  it("merges per-mtype overrides", () => {
    assert.equal(
      lineEnabled(boss, "moveDest", base, {
        gpurplepro: { moveDest: false },
      }),
      false,
    );
    assert.equal(
      lineEnabled(player, "attackTarget", base, {
        "p:Alice": { attackTarget: false },
      }),
      false,
    );
  });

  it("honors legacy world.targetLine when lines.aggroTarget is off", () => {
    const legacy = {
      ...base,
      "lines.aggroTarget": false,
      "world.targetLine": true,
    };
    assert.equal(lineEnabled(boss, "aggroTarget", legacy, {}), true);
    assert.equal(lineEnabled(boss, "aggroTarget", legacy, {}, "other"), true);
    const focusOnly = { ...legacy, "lines.filter.focusOnly": true };
    assert.equal(lineEnabled(boss, "aggroTarget", focusOnly, {}, "b1"), true);
    assert.equal(
      lineEnabled(boss, "aggroTarget", focusOnly, {}, "other"),
      false,
    );
    assert.equal(lineEnabled(player, "aggroTarget", legacy, {}), false);
  });
});

type Win = typeof globalThis & {
  window: Record<string, unknown>;
  localStorage?: Storage;
};

function installWindow(extra: Record<string, unknown> = {}): void {
  const map = new FakeContainer();
  map.map_name = "main";
  (globalThis as Win).window = {
    map,
    PIXI: FakePIXI,
    ...extra,
  };
}

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

describe("vizSettings", () => {
  afterEach(() => {
    delete (globalThis as Win).localStorage;
    delete (globalThis as Win).window;
  });

  it("merges saved toggles with defaults", () => {
    installLocalStorage();
    installWindow();
    (globalThis as Win).localStorage!.setItem(
      VIZ_SETTINGS_KEY,
      JSON.stringify({ "world.attackRange": true, "lines.aggroTarget": false }),
    );
    const s = getVizSettings();
    assert.equal(s["world.attackRange"], true);
    assert.equal(s["lines.aggroTarget"], false);
    assert.equal(s["world.abilityImminent"], true);
  });

  it("patchVizSettings persists and vizCommFlag reads comm keys", () => {
    installLocalStorage();
    installWindow();
    patchVizSettings({ "comm.hpThresholds": false });
    assert.equal(vizCommFlag("comm.hpThresholds"), false);
    const raw = (globalThis as Win).localStorage!.getItem(VIZ_SETTINGS_KEY);
    assert.ok(raw && raw.includes("comm.hpThresholds"));
  });
});

describe("overlayToggleCatalog", () => {
  it("only references known VizSettingKey values", () => {
    const keys = new Set(Object.keys(DEFAULT_VIZ_SETTINGS));
    for (let s = 0; s < OVERLAY_TOGGLE_SECTIONS.length; s++) {
      const sec = OVERLAY_TOGGLE_SECTIONS[s];
      for (let i = 0; i < sec.defs.length; i++) {
        assert.ok(keys.has(sec.defs[i].key), sec.defs[i].key);
      }
    }
  });
});

describe("paintWorldOverlay", () => {
  afterEach(() => {
    resetWorldQuirkHotspotCache();
    delete (globalThis as Win).localStorage;
    delete (globalThis as Win).window;
  });

  it("records aggro line commands on fake PIXI", () => {
    installLocalStorage();
    installWindow({
      G: {
        monsters: {
          a1: { range: 120, abilities: {} },
        },
      },
    });
    setHostMapName("main");
    patchVizSettings({
      "lines.aggroTarget": true,
      "lines.filter.monsters": true,
      "world.abilityImminent": false,
    });
    const map = window.map as FakeContainer;
    const root = new FakeContainer();
    const gfx = new FakePIXI.Graphics();
    const hotspots = new FakeContainer();
    const labels = new FakeContainer();
    root.addChild(gfx);
    root.addChild(hotspots);
    root.addChild(labels);
    map.addChild(root);
    const handle = { root, gfx, hotspots, labels } as OverlayHandle;
    const boss: EntityLike = {
      id: "b1",
      type: "monster",
      mtype: "a1",
      visible: true,
      x: 0,
      y: 0,
      real_x: 0,
      real_y: 0,
      target: "p1",
    };
    const player: EntityLike = {
      id: "p1",
      type: "character",
      player: true,
      name: "Alice",
      visible: true,
      x: 40,
      y: 0,
      real_x: 40,
      real_y: 0,
    };
    paintWorldOverlay(handle, { entities: [boss, player], focus: boss });
    assert.ok(gfx.cmds.length > 0);
    let sawLine = false;
    for (let i = 0; i < gfx.cmds.length; i++) {
      if (gfx.cmds[i].t === "lineTo") {
        sawLine = true;
        break;
      }
    }
    assert.equal(sawLine, true);
  });

  it("builds quirk hotspots for supported map quirks", () => {
    installLocalStorage();
    installWindow({
      G: {
        maps: {
          main: {
            quirks: [
              [100, 200, 32, 48, "sign", "hello"],
              [200, 240, 20, 20, "info", "ignored"],
            ],
          },
        },
        monsters: {
          a1: { range: 120, abilities: {} },
        },
      },
    });
    setHostMapName("main");
    const map = window.map as FakeContainer;
    const root = new FakeContainer();
    const gfx = new FakePIXI.Graphics();
    const hotspots = new FakeContainer();
    const labels = new FakeContainer();
    root.addChild(gfx);
    root.addChild(labels);
    root.addChild(hotspots);
    map.addChild(root);
    const handle = { root, gfx, hotspots, labels } as OverlayHandle;
    paintWorldOverlay(handle, { entities: [], focus: null });
    assert.equal(getCurrentWorldQuirks().length, 1);
    assert.equal(hotspots.children.length, 1);
    paintWorldOverlay(handle, { entities: [], focus: null });
    assert.equal(hotspots.children.length, 1);
    const sprite = hotspots.children[0] as FakeSprite;
    assert.equal(sprite.cursor, "help");
    sprite.emit?.("mouseover", { clientX: 40, clientY: 80 });
    assert.equal(getHoveredWorldQuirk()?.[5], "hello");
  });

  it("only hit-tests the quirk under a map point", () => {
    installLocalStorage();
    installWindow({
      G: {
        maps: {
          main: {
            quirks: [[100, 200, 32, 48, "sign", "hello"]],
          },
        },
      },
    });
    setHostMapName("main");
    const quirk = getCurrentWorldQuirks()[0];
    assert.equal(quirkContainsMapPoint(quirk, 100, 180), true);
    assert.equal(quirkContainsMapPoint(quirk, 0, 0), false);
    assert.equal(findQuirkAtMapPoint(100, 180)?.[5], "hello");
    assert.equal(findQuirkAtMapPoint(0, 0), null);
  });
});

describe("activateWorldQuirk", () => {
  afterEach(() => {
    delete (globalThis as Win).window;
  });

  it("dispatches sign and shrine actions", () => {
    let upgradeCalls = 0;
    installWindow({
      render_upgrade_shrine: (explicit?: number) => {
        assert.equal(explicit, 1);
        upgradeCalls += 1;
      },
      socket: {
        on: () => {},
      },
    });
    const notice = commNoticeFromQuirk([0, 0, 32, 32, "sign", "Beware!"]);
    assert.equal(notice?.title, "Sign");
    assert.equal(notice?.body, "Beware!");
    assert.equal(activateWorldQuirk([0, 0, 32, 32, "sign", "Beware!"]), true);
    assert.equal(activateWorldQuirk([0, 0, 32, 32, "upgrade"]), true);
    assert.equal(upgradeCalls, 1);
  });
});
