import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { resolveCommPhoneUi } from "../src/lib/viewport";

describe("resolveCommPhoneUi", () => {
  afterEach(() => {
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { window?: unknown }).window;
  });

  it("honors an explicit Comm viewportProfile over window size", () => {
    (globalThis as { window?: unknown }).window = {
      innerWidth: 390,
      innerHeight: 844,
    };
    assert.equal(resolveCommPhoneUi("desktop"), false);
    assert.equal(resolveCommPhoneUi("phone"), true);
  });

  it("falls back to #comm-ui data-viewport when profile is omitted", () => {
    (globalThis as { document?: unknown }).document = {
      getElementById(id: string) {
        if (id !== "comm-ui") return null;
        return {
          getAttribute(name: string) {
            return name === "data-viewport" ? "desktop" : null;
          },
        };
      },
    };
    (globalThis as { window?: unknown }).window = {
      innerWidth: 390,
      innerHeight: 844,
    };
    assert.equal(resolveCommPhoneUi(), false);
  });
});
