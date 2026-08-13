/**
 * Smoke-check edge-group geometry contracts (pure, no DOM).
 * Run: node agentic/verify_panel_edge_group_math.mjs
 */
import assert from "node:assert/strict";

/** Mirrors fixed nudgePosByPixels — left%/top% always +x/+y = screen right/down. */
function nudge(pos, dxPx, dyPx, rootW, rootH) {
  const dxPct = rootW > 0 ? (dxPx / rootW) * 100 : 0;
  const dyPct = rootH > 0 ? (dyPx / rootH) * 100 : 0;
  return {
    ...pos,
    x: Math.max(0, Math.min(100, pos.x + dxPct)),
    y: Math.max(0, Math.min(100, pos.y + dyPct)),
  };
}

/** Mirrors fixed moveEdgeGroup — same % delta for every member. */
function moveGroup(panels, movedId, newPos) {
  const moved = panels.find((p) => p.id === movedId);
  const old = moved.pos;
  const dx = newPos.x - old.x;
  const dy = newPos.y - old.y;
  return panels.map((m) => {
    if (m.id === movedId) return { ...m, pos: { ...newPos } };
    return {
      ...m,
      pos: {
        ...m.pos,
        x: Math.max(0, Math.min(100, m.pos.x + dx)),
        y: Math.max(0, Math.min(100, m.pos.y + dy)),
      },
    };
  });
}

/** Mirrors fixed findEdgeSnapCandidate natural-side filter. */
function findCand(selfRect, others, thresholdPx = 36) {
  let best = null;
  let bestScore = Infinity;
  const selfCx = (selfRect.left + selfRect.right) / 2;
  const selfCy = (selfRect.top + selfRect.bottom) / 2;
  for (let i = 0; i < others.length; i++) {
    const o = others[i];
    const r = o.rect;
    const oCx = (r.left + r.right) / 2;
    const oCy = (r.top + r.bottom) / 2;
    const cands = [
      {
        side: 3,
        gap: Math.abs(selfRect.right - r.left),
        align: Math.abs(selfRect.top - r.top),
        natural: selfCx <= oCx,
      },
      {
        side: 1,
        gap: Math.abs(selfRect.left - r.right),
        align: Math.abs(selfRect.top - r.top),
        natural: selfCx >= oCx,
      },
      {
        side: 2,
        gap: Math.abs(selfRect.bottom - r.top),
        align: Math.abs(selfRect.left - r.left),
        natural: selfCy <= oCy,
      },
      {
        side: 4,
        gap: Math.abs(selfRect.top - r.bottom),
        align: Math.abs(selfRect.left - r.left),
        natural: selfCy >= oCy,
      },
    ];
    for (let c = 0; c < cands.length; c++) {
      const cand = cands[c];
      if (!cand.natural) continue;
      if (cand.gap > thresholdPx || cand.align > 80) continue;
      const score = cand.gap + cand.align * 0.25;
      if (score < bestScore) {
        bestScore = score;
        best = { otherId: o.id, sideOnSelf: cand.side };
      }
    }
  }
  return best;
}

{
  const tr = nudge({ x: 20, y: 10, anchor: "tr" }, 100, 0, 1000, 1000);
  assert.equal(tr.x, 30);
  const bl = nudge({ x: 10, y: 80, anchor: "bl" }, 0, 50, 1000, 1000);
  assert.equal(bl.y, 85);
}

{
  const panels = [
    { id: "a", pos: { x: 10, y: 20, anchor: "tl" } },
    { id: "b", pos: { x: 40, y: 20, anchor: "tr" } },
  ];
  const next = moveGroup(panels, "a", { x: 15, y: 25, anchor: "tl" });
  assert.equal(next.find((p) => p.id === "a").pos.x, 15);
  assert.equal(next.find((p) => p.id === "b").pos.x, 45);
  assert.equal(next.find((p) => p.id === "b").pos.y, 25);
}

{
  const self = { left: 0, right: 100, top: 0, bottom: 80 };
  const other = {
    id: "o",
    rect: { left: 102, right: 202, top: 0, bottom: 80 },
  };
  const cand = findCand(self, [other]);
  assert.equal(cand.sideOnSelf, 3);
}

{
  const self = { left: 202, right: 302, top: 0, bottom: 80 };
  const other = {
    id: "o",
    rect: { left: 0, right: 200, top: 0, bottom: 80 },
  };
  const cand = findCand(self, [other]);
  assert.equal(cand.sideOnSelf, 1);
}

console.log("verify_panel_edge_group_math: ok");
