/**
 * Auto-follow observe across server hops.
 * Red when: sticky watch + roster says another realm → must request follow.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createObserveFollowState,
  decideObserveFollow,
  noteClearedObserve,
  noteObservingName,
  tickObserveFollow,
} from "../src/host/commChrome/observeFollow";

describe("decideObserveFollow", () => {
  it("follows when sticky char roster server differs from observer realm", () => {
    // User symptom: observing Alice on EU I; Alice hops to US I; Comm stays on EU.
    const decision = decideObserveFollow({
      stickyName: "Alice",
      currentServerKey: "SR_EUI",
      char: { name: "Alice", online: true, server: "SR_USI" },
      followInFlight: false,
    });
    assert.deepEqual(decision, { action: "follow", name: "Alice" });
  });

  it("does not follow when already on the character's realm", () => {
    assert.deepEqual(
      decideObserveFollow({
        stickyName: "Alice",
        currentServerKey: "SR_EUI",
        char: { name: "Alice", online: true, server: "SR_EUI" },
        followInFlight: false,
      }),
      { action: "none" },
    );
  });

  it("does not follow while a reconnect is in flight", () => {
    assert.deepEqual(
      decideObserveFollow({
        stickyName: "Alice",
        currentServerKey: "SR_EUI",
        char: { name: "Alice", online: true, server: "SR_USI" },
        followInFlight: true,
      }),
      { action: "none" },
    );
  });

  it("does not follow offline or missing roster rows", () => {
    assert.deepEqual(
      decideObserveFollow({
        stickyName: "Alice",
        currentServerKey: "SR_EUI",
        char: { name: "Alice", online: false, server: "SR_USI" },
        followInFlight: false,
      }),
      { action: "none" },
    );
    assert.deepEqual(
      decideObserveFollow({
        stickyName: "Alice",
        currentServerKey: "SR_EUI",
        char: null,
        followInFlight: false,
      }),
      { action: "none" },
    );
  });

  it("does not follow without sticky or realm key", () => {
    assert.deepEqual(
      decideObserveFollow({
        stickyName: null,
        currentServerKey: "SR_EUI",
        char: { name: "Alice", online: true, server: "SR_USI" },
        followInFlight: false,
      }),
      { action: "none" },
    );
    assert.deepEqual(
      decideObserveFollow({
        stickyName: "Alice",
        currentServerKey: "",
        char: { name: "Alice", online: true, server: "SR_USI" },
        followInFlight: false,
      }),
      { action: "none" },
    );
  });
});

describe("tickObserveFollow", () => {
  it("requests follow after observed char hops servers (even if observing dropped)", () => {
    let state = createObserveFollowState();
    state = noteObservingName(state, "Alice", 1000);
    assert.equal(state.stickyName, "Alice");

    // Hop: live observing gone; roster now says US.
    const hopped = tickObserveFollow(state, {
      now: 2000,
      observingName: null,
      currentServerKey: "SR_EUI",
      findChar: (name) =>
        name === "Alice"
          ? { name: "Alice", online: true, server: "SR_USI" }
          : null,
    });
    assert.equal(hopped.followName, "Alice");
    assert.equal(hopped.state.followInFlight, true);

    // In-flight: do not spam.
    const again = tickObserveFollow(hopped.state, {
      now: 2500,
      observingName: null,
      currentServerKey: "SR_EUI",
      findChar: (name) =>
        name === "Alice"
          ? { name: "Alice", online: true, server: "SR_USI" }
          : null,
    });
    assert.equal(again.followName, null);

    // Landed on new realm observing Alice — clear in-flight.
    const landed = tickObserveFollow(hopped.state, {
      now: 3000,
      observingName: "Alice",
      currentServerKey: "SR_USI",
      findChar: (name) =>
        name === "Alice"
          ? { name: "Alice", online: true, server: "SR_USI" }
          : null,
    });
    assert.equal(landed.followName, null);
    assert.equal(landed.state.followInFlight, false);
    assert.equal(landed.state.stickyName, "Alice");
  });

  it("stops following after clearObserve", () => {
    let state = noteObservingName(createObserveFollowState(), "Alice", 1);
    state = noteClearedObserve(state);
    const got = tickObserveFollow(state, {
      now: 2,
      observingName: null,
      currentServerKey: "SR_EUI",
      findChar: () => ({ name: "Alice", online: true, server: "SR_USI" }),
    });
    assert.equal(got.followName, null);
    assert.equal(got.state.stickyName, null);
  });
});
