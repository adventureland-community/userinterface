import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  panelCloseKind,
  panelHasChromeClose,
} from "../src/lib/panelClose";
import { CLOSABLE_PANEL_IDS } from "../src/lib/panelCatalog";

function deps(over: Partial<Parameters<typeof panelCloseKind>[1]> = {}) {
  return {
    setVisible: () => {},
    selectedEntity: undefined as string | undefined,
    closePaperdoll: () => {},
    buffInfoOpen: false,
    itemInfoOpen: false,
    ...over,
  };
}

describe("panel chrome close", () => {
  it("uses visibility close for catalog-closable panels", () => {
    for (let i = 0; i < CLOSABLE_PANEL_IDS.length; i++) {
      const id = CLOSABLE_PANEL_IDS[i];
      assert.equal(panelCloseKind(id, deps()), "visibility", id);
    }
  });

  it("uses content close for open paperdoll / buff / item tips", () => {
    assert.equal(
      panelCloseKind("paperdoll", deps({ selectedEntity: "abc" })),
      "content-paperdoll",
    );
    assert.equal(
      panelCloseKind("buffInfo", deps({ buffInfoOpen: true })),
      "content-buff",
    );
    assert.equal(
      panelCloseKind("itemInfo", deps({ itemInfoOpen: true })),
      "content-item",
    );
  });

  it("has no chrome close when content panels are idle", () => {
    assert.equal(panelCloseKind("paperdoll", deps()), "none");
    assert.equal(panelCloseKind("buffInfo", deps()), "none");
    assert.equal(panelCloseKind("itemInfo", deps()), "none");
    assert.equal(panelHasChromeClose("players", deps()), false);
  });

  it("player and target frames are visibility-closable", () => {
    assert.equal(panelCloseKind("playerFrame", deps()), "visibility");
    assert.equal(panelCloseKind("targetFrame", deps()), "visibility");
  });
});
