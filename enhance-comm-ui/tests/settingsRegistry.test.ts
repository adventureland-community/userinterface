import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultSettingsPaneId,
  getSettingsPane,
  settingsPaneMatchCounts,
  SETTINGS_PANES,
} from "../src/ui/frames/settings/settingsRegistry";

describe("settingsRegistry", () => {
  it("exposes the live pane registry", () => {
    assert.equal(defaultSettingsPaneId(), "commUi");
    assert.equal(SETTINGS_PANES.length, 5);
    assert.equal(getSettingsPane("commUi").label, "Comm UI");
    assert.equal(getSettingsPane("bag").label, "Bag");
    assert.equal(getSettingsPane("drawings").label, "Drawings");
    assert.equal(getSettingsPane("commHud").label, "Comm HUD");
  });

  it("returns pane-specific counts for matching queries", () => {
    const introCounts = settingsPaneMatchCounts("intro");
    assert.ok(introCounts.commUi > 0);
    assert.equal(introCounts.abilityTimeline, 0);
    assert.equal(introCounts.drawings, 0);
    assert.equal(introCounts.commHud, 0);
    assert.equal(introCounts.bag, 0);

    const sortCounts = settingsPaneMatchCounts("sort bag");
    assert.ok(sortCounts.bag > 0);

    const iconCounts = settingsPaneMatchCounts("icon");
    assert.equal(iconCounts.commUi, 0);
    assert.ok(iconCounts.abilityTimeline > 0);
    assert.equal(iconCounts.drawings, 0);
    assert.equal(iconCounts.commHud, 0);

    const chipCounts = settingsPaneMatchCounts("chip");
    assert.equal(chipCounts.commUi, 0);
    assert.equal(chipCounts.abilityTimeline, 0);
    assert.equal(chipCounts.drawings, 0);
    assert.ok(chipCounts.commHud > 0);

    const ringCounts = settingsPaneMatchCounts("ring");
    assert.equal(ringCounts.abilityTimeline, 0);
    assert.ok(ringCounts.drawings > 0);
    assert.equal(ringCounts.commHud, 0);

    const appearanceCounts = settingsPaneMatchCounts("appearance");
    assert.equal(appearanceCounts.abilityTimeline, 0);
    assert.ok(appearanceCounts.drawings > 0);
    assert.equal(appearanceCounts.commHud, 0);
  });

  it("returns zero counts when nothing matches", () => {
    const counts = settingsPaneMatchCounts("zzznomatchzzz");
    assert.equal(counts.abilityTimeline, 0);
    assert.equal(counts.drawings, 0);
    assert.equal(counts.commHud, 0);
    assert.equal(counts.bag, 0);
  });
});
