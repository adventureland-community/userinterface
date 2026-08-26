import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyEdgePanelsToState,
  applyFrameSizeToCommWindows,
  commWindowDragMove,
  commWindowPeerLayout,
  commWindowPeerSnapAxes,
  finishCommWindowDragDrop,
  raiseCommWindow,
  windowsToEdgePanels,
  type CommWindowGraphState,
} from "../src/lib/commWindowGroup";
import type { PanelId, PanelPos } from "../src/lib/layout";
import type { MeterInstance } from "../src/meters/meterTypes";

function hudLayout(id: PanelId, pos: PanelPos): CommWindowGraphState["layout"] {
  return { [id]: pos } as CommWindowGraphState["layout"];
}

function meter(id: string, zIndex: number, x = 20): MeterInstance {
  return {
    id,
    label: id,
    pos: { x, y: 30, anchor: "tl" },
    query: { kind: "ranked", metric: "damage", primary: "rate" },
    presentation: "ranked",
    zIndex,
    visible: true,
    partyFocus: "watched",
    selectedset: "current",
  };
}

describe("commWindowPeerLayout", () => {
  it("merges HUD layout and meter positions", () => {
    const state: CommWindowGraphState = {
      layout: hudLayout("bag", { x: 10, y: 20, anchor: "tl" }),
      meters: [meter("m1", 55, 40)],
    };
    const peers = commWindowPeerLayout(state);
    assert.equal(peers.bag.x, 10);
    assert.equal(peers.m1.x, 40);
  });
});

describe("raiseCommWindow", () => {
  it("HUD raise sets ephemeral hudZs and renormalizes meters without persist flag", () => {
    const state: CommWindowGraphState = {
      layout: hudLayout("command", { x: 50, y: 50, anchor: "tl" }),
      meters: [meter("m1", 52), meter("m2", 53)],
    };
    const { state: next, persistMeters } = raiseCommWindow(state, "command");
    assert.equal(persistMeters, false);
    assert.equal(typeof next.hudZs?.command, "number");
    assert.ok(next.meters.length === 2);
  });

  it("meter raise persists zIndex", () => {
    const state: CommWindowGraphState = {
      layout: {} as CommWindowGraphState["layout"],
      meters: [meter("m1", 52), meter("m2", 53)],
      hudZs: { command: 60 },
    };
    const { state: next, persistMeters } = raiseCommWindow(state, "m2");
    assert.equal(persistMeters, true);
    const top = next.meters.find((m) => m.id === "m2");
    assert.ok(top && typeof top.zIndex === "number");
    assert.ok(top.zIndex! > 53);
  });

  it("alternating HUD/meter raises keep the last raise strictly on top", () => {
    let state: CommWindowGraphState = {
      layout: hudLayout("mail", { x: 50, y: 50, anchor: "tl" }),
      meters: [meter("m1", 64)],
      hudZs: {},
    };
    let r = raiseCommWindow(state, "mail");
    state = r.state;
    assert.ok((state.hudZs?.mail || 0) > (state.meters[0].zIndex || 0));
    r = raiseCommWindow(state, "m1");
    state = r.state;
    assert.ok((state.meters[0].zIndex || 0) > (state.hudZs?.mail || 0));
    r = raiseCommWindow(state, "mail");
    state = r.state;
    assert.ok((state.hudZs?.mail || 0) > (state.meters[0].zIndex || 0));
  });
});

describe("hudZs survive geometry commits", () => {
  it("applyEdgePanelsToState keeps ephemeral HUD raise z", () => {
    const raised = raiseCommWindow(
      {
        layout: hudLayout("mail", {
          x: 50,
          y: 50,
          anchor: "tl",
          frameW: 400,
          frameH: 300,
        }),
        meters: [meter("m1", 64)],
      },
      "mail",
    ).state;
    assert.equal(typeof raised.hudZs?.mail, "number");
    const next = applyEdgePanelsToState(
      raised,
      windowsToEdgePanels(raised),
    );
    assert.equal(next.hudZs?.mail, raised.hudZs?.mail);
  });
});

describe("commWindowDragMove + finishCommWindowDragDrop", () => {
  it("snaps drag to fine grid on drop when not free", () => {
    const state: CommWindowGraphState = {
      layout: hudLayout("party", { x: 10.3, y: 20.7, anchor: "tl" }),
      meters: [],
    };
    const moved = commWindowDragMove({
      rawX: 10.3,
      rawY: 20.7,
      clientX: 0,
      clientY: 0,
      start: { clientX: 0, clientY: 0, posX: 10, posY: 20 },
      visual: null,
      free: false,
      gridStep: 5,
      rootWidth: 1000,
      rootHeight: 800,
      peerXs: [],
      peerYs: [],
    });
    assert.ok(moved.x !== 10.3 || moved.y !== 20.7);
    const finished = finishCommWindowDragDrop({
      id: "party",
      pos: { x: moved.x, y: moved.y, anchor: "tl" },
      state,
      softAvoid: false,
      freePlacement: false,
      gridStep: 5,
      rootWidth: 1000,
      rootHeight: 800,
    });
    assert.equal(finished.x, moved.x);
  });

  it("collects peer axes from graph state", () => {
    const state: CommWindowGraphState = {
      layout: hudLayout("party", { x: 10, y: 20, anchor: "tl" }),
      meters: [meter("m1", 50, 40)],
    };
    const axes = commWindowPeerSnapAxes(state, "party", (id) => id === "m1");
    assert.deepEqual(axes.xs, [40]);
    assert.deepEqual(axes.ys, [30]);
  });
});

describe("applyFrameSizeToCommWindows meter path", () => {
  it("applies frame size through graph without bypassing group logic", () => {
    const state: CommWindowGraphState = {
      layout: {} as CommWindowGraphState["layout"],
      meters: [
        {
          ...meter("m1", 52),
          frameW: 200,
          frameH: 120,
        },
      ],
    };
    const next = applyFrameSizeToCommWindows(
      state,
      "m1",
      {
        frameW: 240,
        frameH: 140,
      },
      { rootW: 1000, rootH: 800 },
    );
    assert.equal(next.meters[0].frameW, 240);
    assert.equal(next.meters[0].frameH, 140);
  });
});
