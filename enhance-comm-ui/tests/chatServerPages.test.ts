import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  listServerChatKeys,
  serverPageIndex,
  stepServerPage,
} from "../src/lib/chatServerPages";

describe("listServerChatKeys", () => {
  it("orders by X.servers keys then leftovers", () => {
    const keys = listServerChatKeys(
      [
        { key: "server:B", type: "server", server: "B" },
        { key: "server:A", type: "server", server: "A" },
        { key: "party", type: "party" },
        { key: "server:C", type: "server", server: "C" },
      ],
      ["A", "C"],
    );
    assert.deepEqual(keys, ["server:A", "server:C", "server:B"]);
  });

  it("ignores non-server conversations", () => {
    const keys = listServerChatKeys([
      { key: "pm:x", type: "private" },
      { key: "server:A", type: "server", server: "A" },
    ]);
    assert.deepEqual(keys, ["server:A"]);
  });
});

describe("stepServerPage", () => {
  const keys = ["s0", "s1", "s2"];

  it("clamps at ends", () => {
    assert.equal(stepServerPage(keys, "s0", -1), "s0");
    assert.equal(stepServerPage(keys, "s2", 1), "s2");
  });

  it("steps prev and next", () => {
    assert.equal(stepServerPage(keys, "s1", -1), "s0");
    assert.equal(stepServerPage(keys, "s1", 1), "s2");
  });

  it("jumps to fallback when not on a server page", () => {
    assert.equal(stepServerPage(keys, "party", 1, "s1"), "s1");
    assert.equal(stepServerPage(keys, "pm:x", -1, null), "s0");
  });
});

describe("serverPageIndex", () => {
  it("returns -1 when inactive", () => {
    assert.equal(serverPageIndex(["a", "b"], null), -1);
    assert.equal(serverPageIndex(["a", "b"], "party"), -1);
    assert.equal(serverPageIndex(["a", "b"], "b"), 1);
  });
});
