/**
 * Red-capable: wheel over a portaled Attach caps list must not count as
 * world FOV zoom even when the pointer sits over the canvas rect.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allowsDesktopWorldWheelZoom,
  isInteractiveChromeTarget,
  isUiChromeTarget,
} from "../src/host/worldZoom";

type ClosestFn = (selector: string) => unknown;

function fakeEl(closest: ClosestFn): EventTarget {
  return { closest } as unknown as EventTarget;
}

function matchOne(...ids: string[]): ClosestFn {
  return (selector: string) => {
    for (let i = 0; i < ids.length; i++) {
      if (selector === ids[i] || selector.includes(ids[i])) return {};
    }
    return null;
  };
}

describe("desktop world wheel vs UI chrome", () => {
  it("blocks wheel zoom for portaled Attach caps list (over canvas)", () => {
    const list = fakeEl(matchOne("[data-ecu-comm-modal-portal]"));
    assert.equal(isInteractiveChromeTarget(list), true);
    assert.equal(
      allowsDesktopWorldWheelZoom({
        target: list,
        // Bug: pointer was over the canvas rect while target was the modal.
        targetOnCanvas: false,
      }),
      false,
    );
  });

  it("blocks wheel zoom for panel chrome and trade backdrops", () => {
    const panel = fakeEl(matchOne("[data-panel]"));
    const trade = fakeEl(matchOne(".ecu-trade-prompt-backdrop"));
    assert.equal(isUiChromeTarget(panel), true);
    assert.equal(isInteractiveChromeTarget(trade), true);
    assert.equal(
      allowsDesktopWorldWheelZoom({ target: panel, targetOnCanvas: false }),
      false,
    );
  });

  it("allows wheel zoom only when the target is the world canvas", () => {
    const canvas = fakeEl(() => null);
    assert.equal(
      allowsDesktopWorldWheelZoom({
        target: canvas,
        targetOnCanvas: true,
      }),
      true,
    );
    assert.equal(
      allowsDesktopWorldWheelZoom({
        target: canvas,
        targetOnCanvas: false,
      }),
      false,
    );
  });

  it("does not treat point-over-canvas alone as enough (regression)", () => {
    // Pre-fix: non-chrome target + pointOverCanvas true zoomed the world.
    const strayOverlay = fakeEl(() => null);
    assert.equal(
      allowsDesktopWorldWheelZoom({
        target: strayOverlay,
        targetOnCanvas: false,
      }),
      false,
    );
  });
});
