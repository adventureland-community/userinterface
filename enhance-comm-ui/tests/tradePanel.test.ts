import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveInspectedEntity,
  resolveOwnTradeEntity,
  resolveTradePanelEntity,
  tradePanelHasContent,
} from "../src/ui/frames/TradePanel";

describe("trade panel entity", () => {
  const observing = {
    id: "self1",
    name: "Me",
    slots: { helmet: { name: "helmet" } },
  };
  const merchant = {
    id: "m1",
    name: "Shop",
    slots: { trade1: { name: "hpot0", price: 100, rid: "r1" } },
    stand: "x",
  };

  it("defaults to observing when no foreign selection", () => {
    const r = resolveTradePanelEntity([observing], undefined, observing, null);
    assert.equal(r.entity?.id, "self1");
    assert.equal(r.stale, false);
  });

  it("shows selected other player trade", () => {
    const r = resolveTradePanelEntity(
      [observing, merchant],
      "m1",
      observing,
      null,
    );
    assert.equal(r.entity?.id, "m1");
    assert.equal(r.stale, false);
  });

  it("uses cache when foreign entity leaves vision", () => {
    const cached = { id: "m1", name: "Shop", slots: {} };
    const r = resolveTradePanelEntity([observing], "m1", observing, cached);
    assert.equal(r.entity?.id, "m1");
    assert.equal(r.stale, true);
  });

  it("resolveInspectedEntity returns null when selecting self", () => {
    const r = resolveInspectedEntity([observing], "self1", observing, null);
    assert.equal(r.entity, null);
  });

  it("resolveOwnTradeEntity prefers live entity", () => {
    const live = { id: "self1", slots: { trade1: { name: "x" } } };
    const r = resolveOwnTradeEntity([live], observing);
    assert.equal(r?.id, "self1");
    assert.equal(r?.slots?.trade1?.name, "x");
  });

  it("detects trade content", () => {
    assert.equal(tradePanelHasContent(observing, true), true);
    assert.equal(tradePanelHasContent(merchant, false), true);
    assert.equal(
      tradePanelHasContent(
        { id: "x", slots: { helmet: { name: "h" } } },
        false,
      ),
      false,
    );
  });
});
