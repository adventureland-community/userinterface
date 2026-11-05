import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { resolveNameplateCtype } from "../src/host/nameplateSharpness";
import { classColors } from "../src/lib/colors";

describe("resolveNameplateCtype", () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("uses entity.ctype as player class", () => {
    (globalThis as { window?: Record<string, unknown> }).window = {
      entities: {},
      X: { characters: [] },
    };
    assert.equal(
      resolveNameplateCtype({
        id: "1",
        name: "A",
        ctype: "mage",
        type: "character",
      }),
      "mage",
    );
  });

  it("never treats entity.type kind as class", () => {
    (globalThis as { window?: Record<string, unknown> }).window = {
      entities: {},
      X: { characters: [] },
    };
    assert.equal(
      resolveNameplateCtype({ id: "2", name: "B", type: "character" }),
      undefined,
    );
    assert.equal(
      resolveNameplateCtype({
        id: "3",
        name: "Kane",
        type: "npc",
        ctype: "fullstatic",
      }),
      undefined,
    );
    assert.equal(
      resolveNameplateCtype({
        id: "4",
        name: "Goo",
        type: "monster",
        mtype: "goo",
      }),
      undefined,
    );
  });

  it("falls back to X.characters[].type (roster class field)", () => {
    (globalThis as { window?: Record<string, unknown> }).window = {
      entities: {},
      X: {
        characters: [{ id: "p1", name: "Hero", type: "warrior" }],
      },
    };
    assert.equal(
      resolveNameplateCtype({ id: "p1", name: "Hero", type: "character" }),
      "warrior",
    );
    assert.equal(classColors.warrior, "#f07f2f");
  });
});
