import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAutoCraftScript,
  buildDismantleScript,
  buildEnsureStationJs,
  buildExchangeScript,
} from "../src/host/stationCommands";

describe("station command scripts", () => {
  it("auto_craft script awaits auto_craft and may travel", () => {
    const script = buildAutoCraftScript("bow", {
      map: "main",
      x: 100,
      y: 200,
      id: "craftsman",
    });
    assert.match(script, /await auto_craft\("bow"\)/);
    assert.match(script, /smart_move/);
    assert.match(script, /computer/);
  });

  it("exchange / dismantle resolve inventory slot", () => {
    const fp = { slot: 2, name: "leather", q: 1 };
    const ex = buildExchangeScript(fp, {
      map: "main",
      x: 50,
      y: 50,
      id: "exchange",
    });
    assert.match(ex, /await exchange\(__slot\)/);
    const ds = buildDismantleScript(fp, {
      map: "main",
      x: 100,
      y: 200,
      id: "craftsman",
    });
    assert.match(ds, /await dismantle\(__slot\)/);
  });

  it("ensure station skips travel when computer present", () => {
    const js = buildEnsureStationJs({
      map: "main",
      x: 1,
      y: 2,
      id: "craftsman",
    });
    assert.match(js, /__hasComp/);
    assert.match(js, /smart_move/);
  });
});
