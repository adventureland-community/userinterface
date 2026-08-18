import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { uiInspectClick, uiInspectEntity } from "../src/host/uiInspect";
import type { EntityLike } from "../src/host/globals";

describe("uiInspect", () => {
  const entity: EntityLike = {
    id: "test",
    type: "character",
    name: "Test",
  };

  let calls: unknown[];
  let original: ((e: unknown) => void) | undefined;

  beforeEach(() => {
    calls = [];
    original = (globalThis as any).window?.ui_inspect;
    (globalThis as any).window = globalThis;
    (globalThis as any).ui_inspect = (e: unknown) => {
      calls.push(e);
    };
    (globalThis as any).btc = () => {};
  });

  afterEach(() => {
    if (original === undefined) delete (globalThis as any).ui_inspect;
    else (globalThis as any).ui_inspect = original;
    delete (globalThis as any).btc;
  });

  it("calls stock ui_inspect with the entity", () => {
    assert.equal(uiInspectEntity(entity), true);
    assert.deepEqual(calls, [entity]);
  });

  it("returns false when ui_inspect is missing", () => {
    delete (globalThis as any).ui_inspect;
    assert.equal(uiInspectEntity(entity), false);
  });

  it("stopPropagation on inspect click", () => {
    let stopped = false;
    const ev = {
      stopPropagation: () => {
        stopped = true;
      },
    } as Event;
    assert.equal(uiInspectClick(ev, entity), true);
    assert.equal(stopped, true);
    assert.deepEqual(calls, [entity]);
  });
});
