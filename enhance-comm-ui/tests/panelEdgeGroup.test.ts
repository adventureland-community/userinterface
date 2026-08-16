import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyGroupFrameSize,
  findEdgeSnapCandidate,
  moveEdgeGroup,
  nudgePosByPixels,
  type EdgeGroupPanel,
} from "../src/lib/panelEdgeGroup";

describe("nudgePosByPixels", () => {
  it("moves left%/top% screen-right for every anchor", () => {
    const tr = nudgePosByPixels(
      { x: 20, y: 10, anchor: "tr" },
      100,
      0,
      1000,
      1000,
    );
    assert.equal(tr.x, 30);
    const bl = nudgePosByPixels(
      { x: 10, y: 80, anchor: "bl" },
      0,
      50,
      1000,
      1000,
    );
    assert.equal(bl.y, 85);
  });
});

describe("moveEdgeGroup", () => {
  it("applies the same % delta to every snap-group member", () => {
    const panels: EdgeGroupPanel[] = [
      {
        id: "a",
        pos: { x: 10, y: 20, anchor: "tl" },
        snap: { 3: "b" },
        horizontalSnap: true,
      },
      {
        id: "b",
        pos: { x: 40, y: 20, anchor: "tr" },
        snap: { 1: "a" },
        horizontalSnap: true,
      },
    ];
    const next = moveEdgeGroup(panels, "a", {
      x: 15,
      y: 25,
      anchor: "tl",
    });
    assert.equal(next.find((p) => p.id === "a")!.pos.x, 15);
    assert.equal(next.find((p) => p.id === "b")!.pos.x, 45);
    assert.equal(next.find((p) => p.id === "b")!.pos.y, 25);
  });
});

describe("applyGroupFrameSize", () => {
  it("shares height and nudges br anchors so tops stay flush", () => {
    const panels: EdgeGroupPanel[] = [
      {
        id: "a",
        pos: { x: 10, y: 80, anchor: "br" },
        snap: { 3: "b" },
        horizontalSnap: true,
        frameW: 200,
        frameH: 100,
      },
      {
        id: "b",
        pos: { x: 40, y: 80, anchor: "br" },
        snap: { 1: "a" },
        horizontalSnap: true,
        frameW: 200,
        frameH: 100,
      },
    ];
    const next = applyGroupFrameSize(
      panels,
      "a",
      { frameH: 200 },
      { rootW: 1000, rootH: 1000 },
    );
    const a = next.find((p) => p.id === "a")!;
    const b = next.find((p) => p.id === "b")!;
    assert.equal(a.frameH, 200);
    assert.equal(b.frameH, 200);
    // br grows upward; keep-top nudge pushes y down by dH/rootH*100.
    assert.equal(a.pos.y, 90);
    assert.equal(b.pos.y, 90);
  });

  it("shares height without moving pos when root is omitted (Stretch ↕)", () => {
    const panels: EdgeGroupPanel[] = [
      {
        id: "a",
        pos: { x: 10, y: 80, anchor: "br" },
        snap: { 3: "b" },
        horizontalSnap: true,
        frameW: 200,
        frameH: 100,
      },
      {
        id: "b",
        pos: { x: 40, y: 80, anchor: "br" },
        snap: { 1: "a" },
        horizontalSnap: true,
        frameW: 200,
        frameH: 100,
      },
    ];
    const next = applyGroupFrameSize(panels, "a", { frameH: 200 });
    assert.equal(next.find((p) => p.id === "a")!.frameH, 200);
    assert.equal(next.find((p) => p.id === "b")!.frameH, 200);
    assert.equal(next.find((p) => p.id === "a")!.pos.y, 80);
    assert.equal(next.find((p) => p.id === "b")!.pos.y, 80);
  });

  it("skips source nudge when frameH was already applied (callers must pass pristine sizes)", () => {
    // If the source is pre-sized, oldH===newH and only peers move — group splits.
    // CommMeterPanels must call applyGroupFrameSize on the list before merging.
    const panels: EdgeGroupPanel[] = [
      {
        id: "a",
        pos: { x: 10, y: 80, anchor: "br" },
        snap: { 3: "b" },
        horizontalSnap: true,
        frameW: 200,
        frameH: 200, // already new — wrong call order
      },
      {
        id: "b",
        pos: { x: 40, y: 80, anchor: "br" },
        snap: { 1: "a" },
        horizontalSnap: true,
        frameW: 200,
        frameH: 100,
      },
    ];
    const next = applyGroupFrameSize(
      panels,
      "a",
      { frameH: 200 },
      { rootW: 1000, rootH: 1000 },
    );
    assert.equal(next.find((p) => p.id === "a")!.pos.y, 80); // no nudge
    assert.equal(next.find((p) => p.id === "b")!.pos.y, 90); // peer nudged
  });
});

describe("findEdgeSnapCandidate", () => {
  it("picks the natural right attach when self is left of other", () => {
    const self = { left: 0, right: 100, top: 0, bottom: 80 };
    const other = {
      id: "o",
      rect: { left: 102, right: 202, top: 0, bottom: 80 },
    };
    const cand = findEdgeSnapCandidate("self", self, [other]);
    assert.ok(cand);
    assert.equal(cand!.sideOnSelf, 3);
  });

  it("picks the natural left attach when self is right of other", () => {
    const self = { left: 202, right: 302, top: 0, bottom: 80 };
    const other = {
      id: "o",
      rect: { left: 0, right: 200, top: 0, bottom: 80 },
    };
    const cand = findEdgeSnapCandidate("self", self, [other]);
    assert.ok(cand);
    assert.equal(cand!.sideOnSelf, 1);
  });
});
