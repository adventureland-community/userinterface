import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PANEL_IDS } from "../src/lib/layout";
import {
  inTrackedInstance,
  panelIsContextEmpty,
  type PanelContext,
} from "../src/lib/panelCatalog";

const idle: PanelContext = {
  map: "desert",
  hasEnemies: false,
  hasBosses: false,
  hasAbilityCasters: false,
  hasThreat: false,
};

describe("panelContext", () => {
  it("treats crypt / spider / tomb / winter as tracked instances", () => {
    assert.equal(inTrackedInstance("crypt"), true);
    assert.equal(inTrackedInstance("spider_instance"), true);
    assert.equal(inTrackedInstance("tomb"), true);
    assert.equal(inTrackedInstance("winter_instance"), true);
    assert.equal(inTrackedInstance("desert"), false);
    assert.equal(inTrackedInstance("main"), false);
    assert.equal(inTrackedInstance(undefined), false);
  });

  it("empty-hides instance shells off a tracked map", () => {
    assert.equal(panelIsContextEmpty("instance", idle), true);
    assert.equal(panelIsContextEmpty("instanceRun", idle), true);
    assert.equal(
      panelIsContextEmpty("instance", { ...idle, map: "crypt" }),
      false,
    );
    assert.equal(
      panelIsContextEmpty("instanceRun", { ...idle, map: "crypt" }),
      false,
    );
  });

  it("empty-hides combat panels without aggro / bosses", () => {
    assert.equal(panelIsContextEmpty("enemies", idle), true);
    assert.equal(panelIsContextEmpty("bossBar", idle), true);
    assert.equal(panelIsContextEmpty("abilityTimeline", idle), true);
    assert.equal(panelIsContextEmpty("abilityTimelineBigIcon", idle), true);
    assert.equal(panelIsContextEmpty("abilityTimelineHighlight", idle), true);
    assert.equal(panelIsContextEmpty("threat", idle), true);
    assert.equal(
      panelIsContextEmpty("enemies", { ...idle, hasEnemies: true }),
      false,
    );
    assert.equal(
      panelIsContextEmpty("bossBar", { ...idle, hasBosses: true }),
      false,
    );
    assert.equal(
      panelIsContextEmpty("abilityTimeline", { ...idle, hasBosses: true }),
      true,
    );
    assert.equal(
      panelIsContextEmpty("abilityTimeline", {
        ...idle,
        hasAbilityCasters: true,
      }),
      false,
    );
    assert.equal(
      panelIsContextEmpty("abilityTimelineBigIcon", {
        ...idle,
        hasAbilityCasters: true,
      }),
      false,
    );
    assert.equal(
      panelIsContextEmpty("abilityTimelineHighlight", {
        ...idle,
        hasAbilityCasters: true,
      }),
      false,
    );
    assert.equal(
      panelIsContextEmpty("threat", { ...idle, hasThreat: true }),
      false,
    );
  });

  it("keeps always-on chrome mounted (party, chips, minimap)", () => {
    assert.equal(panelIsContextEmpty("players", idle), false);
    assert.equal(panelIsContextEmpty("mapInfo", idle), false);
    assert.equal(panelIsContextEmpty("serverInfo", idle), false);
    assert.equal(panelIsContextEmpty("minimap", idle), false);
    assert.equal(panelIsContextEmpty("toggles", idle), false);
  });

  it("covers every PanelId (exhaustive helper)", () => {
    for (let i = 0; i < PANEL_IDS.length; i++) {
      const id = PANEL_IDS[i];
      const empty = panelIsContextEmpty(id, idle);
      assert.equal(typeof empty, "boolean", id);
    }
  });
});
