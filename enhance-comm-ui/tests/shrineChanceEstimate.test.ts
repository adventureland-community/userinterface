import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateShrineChance,
  formatApproxChancePct,
} from "../src/lib/shrineChanceEstimate";

describe("estimateShrineChance", () => {
  it("anchors upgrade +3→+4 near Discord sample (~70%)", () => {
    const p = estimateShrineChance({
      mode: "upgrade",
      level: 3,
      itemGrade: 0,
      scrollGrade: 0,
    });
    assert.ok(p > 0.55 && p < 0.85, String(p));
    assert.match(formatApproxChancePct(p), /^~\d+%$/);
  });

  it("anchors compound +0→+1 near 99% and +1→+2 near 75%", () => {
    const p0 = estimateShrineChance({
      mode: "compound",
      level: 0,
      itemGrade: 0,
      scrollGrade: 0,
    });
    const p1 = estimateShrineChance({
      mode: "compound",
      level: 1,
      itemGrade: 0,
      scrollGrade: 0,
    });
    assert.ok(p0 > 0.9, String(p0));
    assert.ok(p1 > 0.6 && p1 < 0.9, String(p1));
  });

  it("boosts when scroll grade beats item grade", () => {
    const base = estimateShrineChance({
      mode: "upgrade",
      level: 6,
      itemGrade: 0,
      scrollGrade: 0,
    });
    const hi = estimateShrineChance({
      mode: "upgrade",
      level: 6,
      itemGrade: 0,
      scrollGrade: 1,
    });
    assert.ok(hi > base, `${hi} > ${base}`);
  });
});
