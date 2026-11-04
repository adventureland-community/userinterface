import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { auditPhoneTourCoverage } from "../src/lib/phoneTourCoverage";
import { GUIDED_TOURS } from "../src/ui/frames/comm/guidedTour/tourCatalog";

describe("phoneTourCoverage", () => {
  it("registers every guided tour", () => {
    assert.ok(GUIDED_TOURS.length >= 8);
  });

  it("has no desktop-only chrome steps without phone fallbacks", () => {
    const issues = auditPhoneTourCoverage();
    assert.deepEqual(
      issues,
      [],
      issues
        .map(
          (i) =>
            `${i.tourId}#${i.stepIndex} ${i.title}: ${i.reason} → ${i.target}`,
        )
        .join("\n"),
    );
  });
});
