import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLOSABLE_PANEL_IDS,
  PANEL_CATALOG,
  PANEL_IDS,
  panelDef,
  panelFillsFrame,
} from "../src/lib/panelCatalog";

describe("panel catalog", () => {
  it("has a def for every PanelId", () => {
    for (let i = 0; i < PANEL_IDS.length; i++) {
      const id = PANEL_IDS[i];
      assert.equal(PANEL_CATALOG[id].label, panelDef(id).label, id);
    }
  });

  it("lists exactly the closable ids", () => {
    for (let i = 0; i < PANEL_IDS.length; i++) {
      const id = PANEL_IDS[i];
      const listed = CLOSABLE_PANEL_IDS.indexOf(id) >= 0;
      assert.equal(listed, panelDef(id).closable, id);
    }
  });

  it("marks instance / timeline / mail / threat as fill shells", () => {
    assert.equal(panelFillsFrame("instance"), true);
    assert.equal(panelFillsFrame("instanceRun"), true);
    assert.equal(panelFillsFrame("abilityTimeline"), true);
    assert.equal(panelFillsFrame("mail"), true);
    assert.equal(panelFillsFrame("threat"), true);
    assert.equal(panelFillsFrame("minimap"), true);
    assert.equal(panelFillsFrame("players"), false);
    assert.equal(panelFillsFrame("bag"), false);
    assert.equal(panelFillsFrame("command"), false);
  });

  it("defaults Command to autosize on", () => {
    assert.equal(panelDef("command").autoSize, "default-on");
  });

  it("defaults Kills to autosize on so arrange chrome is not frame-clipped", () => {
    assert.equal(panelDef("kills").autoSize, "default-on");
    assert.equal(panelDef("kills").closable, true);
  });
});
