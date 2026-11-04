import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import {
  isPageFullscreen,
  isPageFullscreenSupported,
} from "../src/host/pageFullscreen";

describe("pageFullscreen", () => {
  afterEach(() => {
    delete (globalThis as { document?: unknown }).document;
  });

  it("reports unsupported without a document", () => {
    delete (globalThis as { document?: unknown }).document;
    assert.equal(isPageFullscreenSupported(), false);
    assert.equal(isPageFullscreen(), false);
  });

  it("reads fullscreenEnabled / fullscreenElement", () => {
    (globalThis as { document?: Record<string, unknown> }).document = {
      fullscreenEnabled: true,
      fullscreenElement: null,
    };
    assert.equal(isPageFullscreenSupported(), true);
    assert.equal(isPageFullscreen(), false);
    (globalThis as { document: Record<string, unknown> }).document
      .fullscreenElement = {};
    assert.equal(isPageFullscreen(), true);
  });
});
