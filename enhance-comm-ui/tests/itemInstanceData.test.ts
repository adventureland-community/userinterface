import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getItemData,
  itemStackIdentityKey,
} from "../src/lib/itemInstanceData";

describe("itemInstanceData", () => {
  it("reads trimmed string data", () => {
    assert.equal(getItemData({ data: " breyes " }), "breyes");
    assert.equal(getItemData({ data: "" }), undefined);
    assert.equal(getItemData({ data: 1 }), undefined);
    assert.equal(getItemData(null), undefined);
  });

  it("keeps stack keys stable when data is absent", () => {
    assert.equal(
      itemStackIdentityKey({ name: "hpot0" }),
      "hpot0\0" + "\0",
    );
    assert.equal(
      itemStackIdentityKey({ name: "firestaff", level: 7, p: "shiny" }),
      "firestaff\0" + "7" + "\0" + "shiny",
    );
  });

  it("appends data only when present", () => {
    assert.equal(
      itemStackIdentityKey({ name: "cxjar", data: "breyes" }),
      "cxjar\0" + "\0" + "\0" + "breyes",
    );
    assert.notEqual(
      itemStackIdentityKey({ name: "cxjar", data: "breyes" }),
      itemStackIdentityKey({ name: "cxjar", data: "bathat" }),
    );
  });
});
