import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  itemTitleBorderColor,
  shouldShowTitleBorder,
  wrapHtmlWithTitleBorder,
} from "../src/lib/itemTitleBorder";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
};

afterEach(() => {
  delete (globalThis as Win).window;
});

describe("itemTitleBorderColor", () => {
  it("maps known title keys to market-tracker colors", () => {
    assert.equal(itemTitleBorderColor("gooped"), "#64B867");
    assert.equal(itemTitleBorderColor("festive"), "#79ff7e");
    assert.equal(itemTitleBorderColor("lucky"), "#00f3ff");
    assert.equal(itemTitleBorderColor("sniper"), "#8ab4f8");
  });

  it("returns undefined for missing or unknown titles without G", () => {
    assert.equal(itemTitleBorderColor(undefined), undefined);
    assert.equal(itemTitleBorderColor("not_a_real_title"), undefined);
  });

  it("falls back for G.titles keys without a palette entry", () => {
    (globalThis as Win).window = {
      G: { titles: { obscure_title: { title: "Obscure" } } },
    };
    assert.equal(itemTitleBorderColor("obscure_title"), "#c9a227");
    assert.equal(shouldShowTitleBorder("obscure_title"), true);
  });

  it("recolors item_container borders without an outer wrapper", () => {
    const html =
      '<div style="border: 2px solid gray; width:46px">' +
      '<div class="rclick" style="border: 2px solid gray">x</div></div>';
    const out = wrapHtmlWithTitleBorder(html, "gooped");
    assert.doesNotMatch(out, /ecu-item-title-frame/);
    assert.match(out, /border: 2px solid #64B867/g);
    assert.equal((out.match(/border: 2px solid #64B867/g) || []).length, 2);
  });

  it("wraps sheet fallbacks that have no stock border", () => {
    const sheet = '<span class="ecu-meter-icon">x</span>';
    const out = wrapHtmlWithTitleBorder(sheet, "lucky");
    assert.match(out, /ecu-item-title-frame/);
    assert.match(out, /border:2px solid #00f3ff/);
    assert.match(out, /ecu-meter-icon/);
  });

  it("shouldShowTitleBorder mirrors color lookup", () => {
    assert.equal(shouldShowTitleBorder("legacy"), true);
    assert.equal(shouldShowTitleBorder("nope"), false);
  });
});
