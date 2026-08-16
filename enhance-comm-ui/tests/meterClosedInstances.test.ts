/**
 * Closed-meter reopen list: unique ids, capped history.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendClosedMeterInstance,
  MAX_METER_CLOSED_INSTANCES,
  normalizeMeterClosedInstances,
  normalizeMeterInstances,
} from "../src/meters/meterPresets";
import type { MeterInstance } from "../src/meters/meterTypes";

function stub(id: string, label: string): MeterInstance {
  return {
    id,
    label,
    query: { kind: "players", metric: "damage", primary: "rate" },
    presentation: "bars",
    selectedset: "current",
    partyFocus: "watched",
    pos: { x: 50, y: 50, anchor: "center" },
  };
}

describe("normalizeMeterClosedInstances", () => {
  it("dedupes by id keeping the last entry", () => {
    const out = normalizeMeterClosedInstances([
      stub("a", "DPS"),
      stub("b", "DPS"),
      stub("a", "DPS again"),
    ]);
    assert.equal(out.length, 2);
    assert.equal(out.find((m) => m.id === "a")?.label, "DPS again");
    assert.equal(out.find((m) => m.id === "b")?.label, "DPS");
  });

  it("caps history length", () => {
    const raw: MeterInstance[] = [];
    for (let i = 0; i < MAX_METER_CLOSED_INSTANCES + 5; i++) {
      raw.push(stub(`m${i}`, "DPS"));
    }
    const out = normalizeMeterClosedInstances(raw);
    assert.equal(out.length, MAX_METER_CLOSED_INSTANCES);
    assert.equal(out[0].id, "m5");
  });
});

describe("appendClosedMeterInstance", () => {
  it("replaces an existing id instead of duplicating", () => {
    const out = appendClosedMeterInstance(
      [stub("a", "old"), stub("b", "DPS")],
      stub("a", "new"),
    );
    assert.equal(out.length, 2);
    assert.equal(out[out.length - 1].id, "a");
    assert.equal(out[out.length - 1].label, "new");
  });
});

describe("normalizeMeterInstances closedIds", () => {
  it("does not backfill a closed default DPS", () => {
    const out = normalizeMeterInstances([stub("meter-heal", "HPS")], {
      closedIds: ["meter-damage"],
    });
    assert.equal(
      out.some((m) => m.id === "meter-damage"),
      false,
    );
    assert.equal(
      out.some((m) => m.id === "meter-heal"),
      true,
    );
  });

  it("keeps empty open list empty when defaults are closed", () => {
    const out = normalizeMeterInstances([], {
      closedIds: ["meter-damage", "meter-heal"],
    });
    assert.equal(out.length, 0);
  });

  it("dedupes duplicate ids in raw", () => {
    const out = normalizeMeterInstances([
      stub("meter-damage", "DPS"),
      stub("meter-damage", "DPS copy"),
      stub("meter-heal", "HPS"),
    ]);
    const dmg = out.filter((m) => m.id === "meter-damage");
    assert.equal(dmg.length, 1);
    assert.equal(dmg[0].label, "DPS");
  });
});
