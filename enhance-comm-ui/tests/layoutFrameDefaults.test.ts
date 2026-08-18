import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeLayout as mergeLayoutRaw } from "../src/lib/layout";
import {
  PLAYERS_FRAME_DEFAULT,
  THREAT_FRAME_DEFAULT,
  UNIT_FRAME_DEFAULT,
  ABILITY_TIMELINE_FRAME_DEFAULT,
  BOSS_BAR_FRAME_DEFAULT,
  INSTANCE_FRAME_DEFAULT,
} from "../src/lib/frameSizes";

function mergeLayout(
  partial: Parameters<typeof mergeLayoutRaw>[0],
  profile: Parameters<typeof mergeLayoutRaw>[1] = "desktop",
) {
  return mergeLayoutRaw(partial, profile, { migrateFrames: true });
}

describe("mergeLayout frame migrations", () => {
  it("shrinks legacy wide party shells and drops fixed height", () => {
    const layout = mergeLayout(
      {
        players: {
          x: 0.4,
          y: 0.4,
          anchor: "tl",
          frameW: 522,
          frameH: 65.25,
        },
      },
      "desktop",
    );
    assert.equal(layout.players.frameW, PLAYERS_FRAME_DEFAULT.frameW);
    assert.equal(layout.players.frameH, undefined);
  });

  it("widens interim narrow party default", () => {
    const layout = mergeLayout(
      {
        players: { x: 0.4, y: 0.4, anchor: "tl", frameW: 360 },
      },
      "desktop",
    );
    assert.equal(layout.players.frameW, PLAYERS_FRAME_DEFAULT.frameW);
  });

  it("keeps user-resized party width in the middle range", () => {
    const layout = mergeLayout(
      {
        players: { x: 0.4, y: 0.4, anchor: "tl", frameW: 440 },
      },
      "desktop",
    );
    assert.equal(layout.players.frameW, 440);
  });

  it("shrinks legacy wide threat shells and lengthens short fixed height", () => {
    const layout = mergeLayout(
      {
        threat: {
          x: 99,
          y: 68,
          anchor: "br",
          frameW: 326.25,
          frameH: 117.45,
        },
      },
      "desktop",
    );
    assert.equal(layout.threat.frameW, THREAT_FRAME_DEFAULT.frameW);
    assert.equal(layout.threat.frameH, THREAT_FRAME_DEFAULT.frameH);
  });

  it("keeps tall user-resized threat height", () => {
    const layout = mergeLayout(
      {
        threat: {
          x: 50,
          y: 50,
          anchor: "center",
          frameW: 300,
          frameH: 220,
        },
      },
      "desktop",
    );
    assert.equal(layout.threat.frameH, 220);
  });

  it("lengthens the shipped 300×240 threat default", () => {
    const layout = mergeLayout(
      {
        threat: {
          x: 99.669,
          y: 68,
          anchor: "br",
          frameW: 300,
          frameH: 240,
        },
      },
      "desktop",
    );
    assert.equal(layout.threat.frameW, THREAT_FRAME_DEFAULT.frameW);
    assert.equal(layout.threat.frameH, THREAT_FRAME_DEFAULT.frameH);
  });

  it("widens and lengthens legacy compact instance shells", () => {
    const layout = mergeLayout(
      {
        instance: {
          x: 50,
          y: 26,
          anchor: "tc",
          frameW: 360,
          frameH: 288,
        },
      },
      "desktop",
    );
    assert.equal(layout.instance.frameW, INSTANCE_FRAME_DEFAULT.frameW);
    assert.equal(layout.instance.frameH, INSTANCE_FRAME_DEFAULT.frameH);
  });

  it("keeps user-resized instance dimensions", () => {
    const layout = mergeLayout(
      {
        instance: {
          x: 50,
          y: 26,
          anchor: "tc",
          frameW: 640,
          frameH: 480,
        },
      },
      "desktop",
    );
    assert.equal(layout.instance.frameW, 640);
    assert.equal(layout.instance.frameH, 480);
  });

  it("lengthens the shipped 560×400 instance default", () => {
    const layout = mergeLayout(
      {
        instance: {
          x: 50,
          y: 26,
          anchor: "tc",
          frameW: 560,
          frameH: 400,
        },
      },
      "desktop",
    );
    assert.equal(layout.instance.frameW, INSTANCE_FRAME_DEFAULT.frameW);
    assert.equal(layout.instance.frameH, INSTANCE_FRAME_DEFAULT.frameH);
  });

  it("lengthens legacy short boss bar shells", () => {
    const layout = mergeLayout(
      {
        bossBar: {
          x: 50,
          y: 10,
          anchor: "tc",
          frameW: 480,
          frameH: 100,
        },
      },
      "desktop",
    );
    assert.equal(layout.bossBar.frameH, BOSS_BAR_FRAME_DEFAULT.frameH);
    assert.equal(layout.bossBar.frameW, 480);
  });

  it("keeps user-resized tall boss bar height", () => {
    const layout = mergeLayout(
      {
        bossBar: {
          x: 50,
          y: 10,
          anchor: "tc",
          frameW: 480,
          frameH: 240,
        },
      },
      "desktop",
    );
    assert.equal(layout.bossBar.frameH, 240);
  });

  it("shrinks legacy wide ability timeline shells", () => {
    const layout = mergeLayout(
      {
        abilityTimeline: {
          x: 99.5,
          y: 10,
          anchor: "tr",
          frameW: 220,
          frameH: 200,
        },
      },
      "desktop",
    );
    assert.equal(
      layout.abilityTimeline.frameW,
      ABILITY_TIMELINE_FRAME_DEFAULT.frameW,
    );
    assert.equal(
      layout.abilityTimeline.frameH,
      ABILITY_TIMELINE_FRAME_DEFAULT.frameH,
    );
  });

  it("lengthens legacy short ability timeline shells", () => {
    const layout = mergeLayout(
      {
        abilityTimeline: {
          x: 99.5,
          y: 10,
          anchor: "tr",
          frameW: 44,
          frameH: 240,
        },
      },
      "desktop",
    );
    assert.equal(
      layout.abilityTimeline.frameW,
      ABILITY_TIMELINE_FRAME_DEFAULT.frameW,
    );
    assert.equal(
      layout.abilityTimeline.frameH,
      ABILITY_TIMELINE_FRAME_DEFAULT.frameH,
    );
  });

  it("keeps user-resized ability timeline width between legacy and wide shells", () => {
    const layout = mergeLayout(
      {
        abilityTimeline: {
          x: 99.5,
          y: 10,
          anchor: "tr",
          frameW: 60,
          frameH: 500,
        },
      },
      "desktop",
    );
    assert.equal(layout.abilityTimeline.frameW, 60);
    assert.equal(layout.abilityTimeline.frameH, 500);
  });

  it("keeps user-resized ability timeline width past the old wide-shell cutoff", () => {
    const layout = mergeLayout(
      {
        abilityTimeline: {
          x: 99.5,
          y: 10,
          anchor: "tr",
          frameW: 120,
          frameH: 400,
        },
      },
      "desktop",
    );
    assert.equal(layout.abilityTimeline.frameW, 120);
    assert.equal(layout.abilityTimeline.frameH, 400);
  });

  it("keeps user-resized wide threat shells", () => {
    const layout = mergeLayout(
      {
        threat: {
          x: 99,
          y: 68,
          anchor: "br",
          frameW: 400,
          frameH: 240,
        },
      },
      "desktop",
    );
    assert.equal(layout.threat.frameW, 400);
    assert.equal(layout.threat.frameH, 240);
  });

  it("keeps current default ability timeline width without re-migrating", () => {
    const layout = mergeLayout(
      {
        abilityTimeline: {
          x: 99.5,
          y: 10,
          anchor: "tr",
          frameW: ABILITY_TIMELINE_FRAME_DEFAULT.frameW,
          frameH: ABILITY_TIMELINE_FRAME_DEFAULT.frameH,
        },
      },
      "desktop",
    );
    assert.equal(
      layout.abilityTimeline.frameW,
      ABILITY_TIMELINE_FRAME_DEFAULT.frameW,
    );
    assert.equal(
      layout.abilityTimeline.frameH,
      ABILITY_TIMELINE_FRAME_DEFAULT.frameH,
    );
  });

  it("drops fixed frame size from server/map HUD chips", () => {
    const layout = mergeLayout(
      {
        serverInfo: {
          x: 50,
          y: 0.4,
          anchor: "tc",
          frameW: 180,
          frameH: 40,
        },
        mapInfo: {
          x: 50,
          y: 4.8,
          anchor: "tc",
          frameW: 160,
          frameH: 48,
        },
      },
      "desktop",
    );
    assert.equal(layout.serverInfo.frameW, undefined);
    assert.equal(layout.serverInfo.frameH, undefined);
    assert.equal(layout.mapInfo.frameW, undefined);
    assert.equal(layout.mapInfo.frameH, undefined);
  });

  it("keeps user-resized compact mail shells", () => {
    const layout = mergeLayout(
      {
        mail: {
          x: 50,
          y: 48,
          anchor: "center",
          frameW: 720,
          frameH: 480,
        },
      },
      "desktop",
    );
    assert.equal(layout.mail.frameW, 720);
    assert.equal(layout.mail.frameH, 480);
  });

  it("normalizes legacy unit frame footprints", () => {
    const layout = mergeLayout(
      {
        playerFrame: {
          x: 35,
          y: 86,
          anchor: "bc",
          frameW: 320,
          frameH: 143.55,
        },
        targetFrame: {
          x: 65,
          y: 86,
          anchor: "bc",
          frameW: 320,
          frameH: 143.55,
        },
      },
      "desktop",
    );
    assert.equal(layout.playerFrame.frameW, UNIT_FRAME_DEFAULT.frameW);
    assert.equal(layout.playerFrame.frameH, UNIT_FRAME_DEFAULT.frameH);
    assert.equal(layout.targetFrame.frameH, UNIT_FRAME_DEFAULT.frameH);
  });
});
