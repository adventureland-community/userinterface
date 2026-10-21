import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GLike } from "../src/host/globals";
import { resolveServerChipOpen } from "../src/ui/frames/serverInfoOpen";

const G = {
  events: {
    halloween: {
      name: "Halloween",
      type: "seasonal",
      modal: "event-halloween",
      sprite: "candy0",
    },
    goobrawl: {
      name: "Goo Brawl",
      type: "daily",
    },
    anniversary: {
      name: "Ten Years",
      type: "seasonal",
      modal: "event-anniversary",
    },
  },
  monsters: {
    mrpumpkin: { name: "Mr. Pumpkin" },
    mrgreen: { name: "Mr. Green" },
    slenderman: { name: "Slenderman" },
  },
} as unknown as GLike;

describe("resolveServerChipOpen", () => {
  it("clock opens the events window", () => {
    assert.deepEqual(resolveServerChipOpen("clock", G), {
      kind: "events_window",
    });
  });

  it("blessing opens the Events & Home guide (shells / bless)", () => {
    const action = resolveServerChipOpen("blessing", G);
    assert.equal(action.kind, "guide");
    if (action.kind === "guide") {
      assert.equal(action.modal, "events-and-home");
    }
  });

  it("seasonals with G.events.modal use announcement/guide modal", () => {
    const action = resolveServerChipOpen("halloween", G);
    assert.equal(action.kind, "announcement");
    if (action.kind === "announcement") {
      assert.equal(action.modal, "event-halloween");
      assert.equal(action.id, "halloween");
    }
  });

  it("world bosses use emonster_click without hardcoding names", () => {
    assert.deepEqual(resolveServerChipOpen("mrpumpkin", G), {
      kind: "emonster",
      id: "mrpumpkin",
    });
    assert.deepEqual(resolveServerChipOpen("slenderman", G), {
      kind: "emonster",
      id: "slenderman",
    });
    assert.deepEqual(resolveServerChipOpen("mrgreen", G), {
      kind: "emonster",
      id: "mrgreen",
    });
  });

  it("joinable G.events without modal use event-<id> guide", () => {
    const action = resolveServerChipOpen("goobrawl", G);
    assert.equal(action.kind, "guide");
    if (action.kind === "guide") {
      assert.equal(action.modal, "event-goobrawl");
      assert.equal(action.docsUrl, "/docs/ref/event-goobrawl");
    }
  });

  it("unknown future S keys still get a conventional event guide", () => {
    const action = resolveServerChipOpen("brand_new_event", G);
    assert.equal(action.kind, "guide");
    if (action.kind === "guide") {
      assert.equal(action.modal, "event-brand_new_event");
    }
  });
});
