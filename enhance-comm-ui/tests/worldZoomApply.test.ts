/**
 * Red-capable: applying the same zoom must not invalidate map tile bounds.
 * Wheel/trackpad floods would otherwise rebuild the whole tile map every event
 * and freeze the tab.
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  applyWorldZoom,
  WORLD_ZOOM_DEFAULT,
  WORLD_ZOOM_STEP,
} from "../src/lib/worldZoom";

describe("applyWorldZoom freeze guard", () => {
  const prev = {
    scale: (globalThis as any).window?.scale,
    map: (globalThis as any).window?.map,
  };

  beforeEach(() => {
    (globalThis as any).window = (globalThis as any).window || globalThis;
    (window as any).scale = WORLD_ZOOM_DEFAULT;
    (window as any).map = {
      scale: { x: WORLD_ZOOM_DEFAULT, y: WORLD_ZOOM_DEFAULT, set(x: number, y: number) {
        this.x = x;
        this.y = y;
      } },
      last_max_y: 1234,
      last_max_x: 5678,
    };
  });

  afterEach(() => {
    if (prev.scale !== undefined) (window as any).scale = prev.scale;
    else delete (window as any).scale;
    if (prev.map !== undefined) (window as any).map = prev.map;
    else delete (window as any).map;
  });

  it("does not clear last_max_y when zoom is unchanged", () => {
    applyWorldZoom(WORLD_ZOOM_DEFAULT);
    assert.equal((window as any).map.last_max_y, 1234);
    assert.equal((window as any).map.last_max_x, 5678);
  });

  it("clears last_max_y only when zoom actually changes", () => {
    applyWorldZoom(WORLD_ZOOM_DEFAULT - WORLD_ZOOM_STEP);
    assert.equal((window as any).map.last_max_y, undefined);
  });
});

