import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { EntityLike } from "../src/host/globals";
import {
  filterPartiesForShow,
  nextPartyRosterShow,
  normalizePartyRosterShow,
  partitionPartyGroups,
  partyRosterShowLabel,
  type PartyGroup,
} from "../src/lib/partyRosterShow";

function player(
  id: string,
  party: string | undefined,
): EntityLike {
  return {
    id,
    name: id,
    type: "character",
    player: true,
    party,
  };
}

describe("normalizePartyRosterShow", () => {
  it("accepts all/party and defaults unknown to all", () => {
    assert.equal(normalizePartyRosterShow("party"), "party");
    assert.equal(normalizePartyRosterShow("all"), "all");
    assert.equal(normalizePartyRosterShow("nope"), "all");
    assert.equal(normalizePartyRosterShow(undefined), "all");
  });
});

describe("nextPartyRosterShow", () => {
  it("toggles all ↔ party", () => {
    assert.equal(nextPartyRosterShow("all"), "party");
    assert.equal(nextPartyRosterShow("party"), "all");
  });
});

describe("partyRosterShowLabel", () => {
  it("labels modes for the chrome chip", () => {
    assert.equal(partyRosterShowLabel("all"), "All");
    assert.equal(partyRosterShowLabel("party"), "Party");
  });
});

describe("filterPartiesForShow", () => {
  const parties: PartyGroup[] = [
    ["Alpha", [player("a1", "Alpha"), player("a2", "Alpha")]],
    ["Beta", [player("b1", "Beta")]],
    ["", [player("solo1", undefined), player("solo2", undefined)]],
  ];

  it("all keeps every group", () => {
    const out = filterPartiesForShow({
      parties,
      show: "all",
      observing: player("a1", "Alpha"),
    });
    assert.equal(out.length, 3);
  });

  it("party keeps only the observed party name", () => {
    const out = filterPartiesForShow({
      parties,
      show: "party",
      observing: player("a1", "Alpha"),
    });
    assert.equal(out.length, 1);
    assert.equal(out[0][0], "Alpha");
    assert.equal(out[0][1].length, 2);
  });

  it("party with no party keeps only the observed character", () => {
    const out = filterPartiesForShow({
      parties,
      show: "party",
      observing: player("solo2", undefined),
    });
    assert.equal(out.length, 1);
    assert.equal(out[0][0], "");
    assert.deepEqual(
      out[0][1].map((p) => p.id),
      ["solo2"],
    );
  });

  it("party with missing observing yields empty", () => {
    const out = filterPartiesForShow({
      parties,
      show: "party",
      observing: null,
    });
    assert.equal(out.length, 0);
  });
});

describe("partitionPartyGroups", () => {
  it("splits multi-member groups from singles", () => {
    const parties: PartyGroup[] = [
      ["Alpha", [player("a1", "Alpha"), player("a2", "Alpha")]],
      ["Beta", [player("b1", "Beta")]],
      ["Gamma", [player("g1", "Gamma")]],
    ];
    const { multi, singles } = partitionPartyGroups(parties);
    assert.equal(multi.length, 1);
    assert.equal(multi[0][0], "Alpha");
    assert.equal(singles.length, 2);
    assert.deepEqual(
      singles.map((p) => p[0]),
      ["Beta", "Gamma"],
    );
  });
});
