import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scaleMax, type BarPoolRow } from "../src/meters/meterBarPool";

describe("scaleMax", () => {
  it("keeps #1 at 100% when Total grows (ignores Total as scale)", () => {
    const early: BarPoolRow[] = [
      { id: "a", name: "A", value: 1000, pct: 1, barValue: 1000, barMax: 1000 },
      {
        id: "__total__",
        name: "Total",
        value: 1000,
        pct: 1,
        barValue: 1000,
        barMax: 1000,
      },
    ];
    const late: BarPoolRow[] = [
      { id: "a", name: "A", value: 1000, pct: 1, barValue: 1000, barMax: 1000 },
      { id: "b", name: "B", value: 500, pct: 0.5, barValue: 500, barMax: 1000 },
      {
        id: "__total__",
        name: "Total",
        value: 1500,
        pct: 1,
        barValue: 1500,
        barMax: 1000,
      },
    ];

    const earlyPct = (1000 / scaleMax(early)) * 100;
    const latePct = (1000 / scaleMax(late)) * 100;
    assert.ok(Math.abs(earlyPct - 100) < 0.01);
    assert.ok(Math.abs(latePct - 100) < 0.01);
  });
});
