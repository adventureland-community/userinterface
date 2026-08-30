import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  itemTitleBorderColor,
  shouldShowTitleBorder,
  wrapHtmlWithTitleBorder,
} from "../src/lib/itemTitleBorder";

describe("itemTitleBorderColor", () => {
  it("maps known title keys to market-tracker colors", () => {
    assert.equal(itemTitleBorderColor("gooped"), "#64B867");
    assert.equal(itemTitleBorderColor("festive"), "#79ff7e");
    assert.equal(itemTitleBorderColor("lucky"), "#00f3ff");
  });

  it("returns undefined for missing or unknown titles", () => {
    assert.equal(itemTitleBorderColor(undefined), undefined);
    assert.equal(itemTitleBorderColor("sniper"), undefined);
  });

  it("recolors item_container borders without an outer wrapper", () => {
    const html =
      '<div style="border: 2px solid gray; width:46px">' +
      '<div class="rclick" style="border: 2px solid gray">x</div></div>';
    const out = wrapHtmlWithTitleBorder(html, "gooped");
    assert.doesNotMatch(out, /ecu-item-title-border/);
    assert.match(out, /border: 2px solid #64B867/g);
    assert.equal((out.match(/border: 2px solid #64B867/g) || []).length, 2);
  });

  it("shouldShowTitleBorder mirrors color lookup", () => {
    assert.equal(shouldShowTitleBorder("legacy"), true);
    assert.equal(shouldShowTitleBorder("abtesting"), false);
  });
});
