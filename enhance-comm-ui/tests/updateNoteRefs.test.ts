import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildUpdateNoteLexicon,
  segmentUpdateNote,
  uniqueUpdateNoteRefs,
} from "../src/lib/updateNoteRefs";

const fakeG = {
  version: 1,
  items: {
    harbringer: { name: "Harbringer" },
    fcape: { name: "Fiery Cape" },
    wand: { name: "Wand" },
    bow: { name: "Bow" },
    staff4: { name: "T4 Staff" },
  },
  skills: {
    banofknives: { name: "Fan of Knives" },
  },
  monsters: {
    goo: { name: "Goo" },
  },
  classes: {
    priest: { name: "Priest" },
    rogue: { name: "Rogue" },
  },
  conditions: {
    stunned: { name: "Stunned" },
  },
};

describe("buildUpdateNoteLexicon", () => {
  it("keeps distinctive names and drops generic singles", () => {
    const lex = buildUpdateNoteLexicon(fakeG);
    const phrases = lex.map((e) => e.phrase);
    assert.ok(phrases.includes("harbringer"));
    assert.ok(phrases.includes("fan of knives"));
    assert.ok(phrases.includes("priest"));
    assert.ok(phrases.includes("fcape"));
    assert.ok(!phrases.includes("wand"));
    assert.ok(!phrases.includes("bow"));
  });
});

describe("segmentUpdateNote", () => {
  const lex = buildUpdateNoteLexicon(fakeG);

  it("inlines icons for items, skills, and classes", () => {
    const segs = segmentUpdateNote(
      "Priest-only staff from a Harbringer +8 and Fan of Knives for Rogue",
      lex,
    );
    const refs = segs.filter((s) => s.type === "ref");
    assert.deepEqual(
      refs.map((r) => (r.type === "ref" ? `${r.kind}:${r.id}` : "")),
      ["class:priest", "item:harbringer", "skill:banofknives", "class:rogue"],
    );
  });

  it("matches code-like item ids as whole words", () => {
    const segs = segmentUpdateNote("Tripled fcape drop rate.", lex);
    const refs = segs.filter((s) => s.type === "ref");
    assert.equal(refs.length, 1);
    assert.equal(refs[0].type === "ref" && refs[0].id, "fcape");
  });

  it("does not match Wand inside Cinder Wand when Wand is generic", () => {
    const segs = segmentUpdateNote(
      "Corrected Cinder Wand, Pollen Bow, and Harbringer",
      lex,
    );
    const refs = uniqueUpdateNoteRefs(
      "Corrected Cinder Wand, Pollen Bow, and Harbringer",
      lex,
    );
    assert.deepEqual(
      refs.map((r) => r.id),
      ["harbringer"],
    );
    assert.equal(segs.some((s) => s.type === "text" && s.text.includes("Cinder Wand")), true);
  });
});
