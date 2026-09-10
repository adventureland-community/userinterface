import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveTradePanelEntity,
  resolveOwnTradeEntity,
  tradePanelHasContent,
} from "../src/lib/tradeEntityResolve";

describe("trade panel entity", () => {
  const observing = {
    id: "self1",
    name: "Self",
    slots: { trade1: { name: "hpot0", price: 100, rid: "r1" } },
  };
  const merchant = {
    id: "m1",
    name: "Merch",
    slots: { trade1: { name: "hpot0", price: 100, rid: "r1" } },
  };

  it("defaults to own character", () => {
    const r = resolveTradePanelEntity([observing], undefined, observing, null);
    assert.equal(r.entity?.id, "self1");
    assert.equal(r.stale, false);
  });

  it("shows selected other player trade", () => {
    const cached = { id: "m1", name: "Merch", slots: {} };
    const r = resolveTradePanelEntity(
      [observing, merchant],
      "m1",
      observing,
      cached,
    );
    assert.equal(r.entity?.id, "m1");
    assert.equal(r.stale, false);
  });

  it("keeps stale cache when merchant leaves", () => {
    const cached = {
      id: "m1",
      name: "Merch",
      slots: { trade1: { name: "hpot0" } },
    };
    const r = resolveTradePanelEntity([observing], "m1", observing, cached);
    assert.equal(r.entity?.id, "m1");
    assert.equal(r.stale, true);
  });

  it("resolves own from entities", () => {
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
        { id: "x", slots: { helmet: { name: "helmet" } } },
        false,
      ),
      false,
    );
  });
});
