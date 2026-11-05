import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  FakeGraphics,
  FakePIXI,
  installFakePixi,
} from "../dev/overlay/fakePixi";
import {
  add_name_tag,
  installStockNameTagApis,
  name_logic,
} from "../dev/overlay/stockNameTag";
import {
  STOCK_NAME_FILL,
  beautifyNameTag,
  ghostPlateForClassColor,
  nameplatePlateClassColor,
} from "../src/host/nameplateStyle";

describe("overlay stock add_name_tag", () => {
  beforeEach(() => {
    (globalThis as { window?: Window }).window = {
      devicePixelRatio: 1,
    } as unknown as Window;
    installFakePixi();
    installStockNameTagApis();
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("builds Graphics+Text tree with stock fill colors", () => {
    const ent = {
      id: "Hero",
      name: "Hero",
      type: "character",
      ctype: "priest",
      aheight: 16,
      player: true,
    };
    add_name_tag(ent);
    assert.ok(ent.name_tag);
    assert.equal(ent.name_tag!.children!.length, 1);
    const plate = ent.name_tag!.children![0] as FakeGraphics;
    assert.ok(plate.graphicsData && plate.graphicsData.length >= 2);
    const fills = plate.graphicsData.map((d) => d.fillColor >>> 0);
    assert.ok(fills.includes(STOCK_NAME_FILL));
    const text = plate.children!.find(
      (c) => typeof (c as { text?: string }).text === "string",
    ) as { text: string; style: { fontSize: number }; scale: { x: number } };
    assert.equal(text.text, "Hero");
    assert.equal(text.style.fontSize, 64);
    assert.equal(text.scale.x, 0.125);
  });

  it("ECU beautify softens stock fills to class ghost plate", () => {
    const ent = {
      id: "Brick",
      name: "Brick",
      type: "character",
      ctype: "warrior",
      aheight: 16,
      player: true,
    };
    add_name_tag(ent);
    const plate = ent.name_tag!.children![0] as FakeGraphics;
    beautifyNameTag(ent.name_tag!, { ctype: "warrior" });
    const expected = ghostPlateForClassColor(nameplatePlateClassColor("warrior"));
    let found = false;
    for (let i = 0; i < plate.graphicsData.length; i++) {
      const d = plate.graphicsData[i];
      if ((d.fillColor >>> 0) === (expected.color >>> 0)) {
        found = true;
        assert.ok(Math.abs(d.fillAlpha - expected.alpha) < 0.05);
      }
    }
    assert.ok(found, "plate fill should match warrior ghost tint");
  });

  it("exposes window.add_name_tag for ECU wrap", () => {
    assert.equal(typeof (window as { add_name_tag?: unknown }).add_name_tag, "function");
    assert.equal(typeof window.PIXI.Point, "function");
    assert.equal(window.PIXI.Graphics, FakeGraphics);
    assert.ok(FakePIXI.SCALE_MODES.NEAREST);
  });

  it("name_logic calls window.add_name_tag so ECU can wrap it", () => {
    let hits = 0;
    (window as { add_name_tag: (el: unknown) => void }).add_name_tag = () => {
      hits += 1;
    };
    name_logic({ type: "character", name: "WrapMe" });
    assert.equal(hits, 1);
  });
});
