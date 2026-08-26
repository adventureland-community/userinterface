import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  latestDeployNotes,
  normalizeUpdateNotes,
  groupUpdateNotesByStamp,
  updateNoteAccent,
  updateNoteKind,
} from "../src/host/updateNotes";

describe("normalizeUpdateNotes", () => {
  it("accepts structured notes", () => {
    const notes = normalizeUpdateNotes([
      { deployed: "[24/08/26]", date: "[24/08/26]", note: "Steam macOS" },
      { deployed: "[24/07/26]", date: "[24/07/26]", note: "US Server" },
    ]);
    assert.equal(notes.length, 2);
    assert.equal(notes[0].note, "Steam macOS");
    assert.equal(notes[1].deployed, "[24/07/26]");
  });

  it("accepts legacy string notes", () => {
    const notes = normalizeUpdateNotes([
      "Last Update [Jul 24th]",
      "New, more capable US Server",
    ]);
    assert.equal(notes.length, 2);
    assert.equal(notes[0].deployed, "");
    assert.equal(notes[1].note, "New, more capable US Server");
  });

  it("drops empty / invalid entries", () => {
    assert.deepEqual(normalizeUpdateNotes([null, "", { note: "  " }, 3]), []);
  });
});

describe("latestDeployNotes", () => {
  it("filters to the newest deploy stamp", () => {
    const notes = normalizeUpdateNotes([
      { deployed: "[24/08/26]", date: "[24/08/26]", note: "A" },
      { deployed: "[24/08/26]", date: "[24/08/26]", note: "B" },
      { deployed: "[24/07/26]", date: "[24/07/26]", note: "C" },
    ]);
    const latest = latestDeployNotes(notes, "[24/08/26]");
    assert.equal(latest.lastDeploy, "[24/08/26]");
    assert.equal(latest.notes.length, 2);
    assert.equal(latest.pending, false);
  });

  it("flags pending when notes lead the last_deploy stamp", () => {
    const notes = normalizeUpdateNotes([
      { deployed: "[24/08/26]", date: "[24/08/26]", note: "A" },
      { deployed: "[24/07/26]", date: "[24/07/26]", note: "B" },
    ]);
    const latest = latestDeployNotes(notes, "[24/07/26]");
    assert.equal(latest.pending, true);
    assert.equal(latest.notes.length, 1);
  });
});

describe("updateNoteAccent", () => {
  it("colors seasonal notes like stock", () => {
    assert.equal(updateNoteAccent("Happy Halloween"), "#DE6E37");
    assert.equal(updateNoteAccent("Regular patch"), "#c8c0b4");
  });
});

describe("groupUpdateNotesByStamp", () => {
  it("collapses same-day notes under one stamp", () => {
    const notes = normalizeUpdateNotes([
      { deployed: "[24/08/26]", date: "[24/08/26]", note: "A" },
      { deployed: "[24/08/26]", date: "[24/08/26]", note: "B" },
      { deployed: "[24/07/26]", date: "[24/07/26]", note: "C" },
    ]);
    const groups = groupUpdateNotesByStamp(notes);
    assert.equal(groups.length, 2);
    assert.equal(groups[0].stamp, "[24/08/26]");
    assert.equal(groups[0].notes.length, 2);
    assert.equal(groups[1].notes[0].note, "C");
  });
});

describe("updateNoteKind", () => {
  it("tags CODE before generic event wording", () => {
    assert.equal(
      updateNoteKind(
        "CODE now exposes live server events, schedules, special monsters",
      ),
      "code",
    );
  });

  it("tags items, fixes, client, and events", () => {
    assert.equal(updateNoteKind("Added 40 new items"), "items");
    assert.equal(updateNoteKind("Fixed unlocking of free bank slots"), "fix");
    assert.equal(updateNoteKind("New Steam client for macOS."), "client");
    assert.equal(
      updateNoteKind("Coming Soon: Adventure Land's 10th year anniversary event!"),
      "event",
    );
  });
});
