/** Built-in panel positions per viewport profile. */

import type { ViewportProfile } from "./viewport";
import type { PanelId, PanelPos } from "./layout";
import {
  ENEMIES_FRAME_DEFAULT,
  PLAYERS_FRAME_DEFAULT,
  THREAT_FRAME_DEFAULT,
  UNIT_FRAME_DEFAULT,
  ABILITY_TIMELINE_FRAME_DEFAULT,
  ABILITY_TIMELINE_BIGICON_FRAME_DEFAULT,
  ABILITY_TIMELINE_HIGHLIGHT_FRAME_DEFAULT,
  BOSS_BAR_FRAME_DEFAULT,
  INSTANCE_FRAME_DEFAULT,
} from "./frameSizes";

/**
 * Desktop defaults — core HUD from playtested export; new context panels
 * placed so they do not stack on serverInfo / each other.
 *
 * Zones (empty-hide keeps most context panels off-screen until relevant):
 * - Top center: serverInfo → mapInfo → bossBar|eventScore → instanceRun → instance|eventRoster
 * - Left: events under party; minimap above bag
 * - Right: abilityTimeline under enemies (clear of threat BR); BigIcon beside it
 * - Center: abilityTimelineHighlight
 *
 * Saved layouts need Layout → Reset positions to pick these up; mergeLayout
 * only seeds missing panel ids from these defaults.
 */
export const DEFAULT_LAYOUT_DESKTOP: Record<PanelId, PanelPos> = {
  players: {
    x: 0.4,
    y: 0.4,
    anchor: "tl",
    locked: true,
    frameW: PLAYERS_FRAME_DEFAULT.frameW,
    autoSize: true,
  },
  enemies: {
    x: 99.6,
    y: 0.4,
    anchor: "tr",
    frameW: ENEMIES_FRAME_DEFAULT.frameW,
    frameH: ENEMIES_FRAME_DEFAULT.frameH,
  },
  serverInfo: { x: 50, y: 0.4, anchor: "tc" },
  mapInfo: { x: 50, y: 4.8, anchor: "tc" },
  paperdoll: { x: 0.5, y: 30, anchor: "tl", frameW: 274, frameH: 535 },
  buffInfo: {
    x: 0.8,
    y: 10,
    anchor: "tl",
    frameW: 196,
    frameH: 248,
    autoSize: true,
  },
  itemInfo: {
    x: 16.8,
    y: 10,
    anchor: "tl",
    frameW: 196,
    frameH: 248,
    autoSize: true,
  },
  kills: { x: 27, y: 99.2, anchor: "br", frameW: 280, frameH: 180 },
  playerFrame: {
    x: 35,
    y: 86,
    anchor: "bc",
    frameW: UNIT_FRAME_DEFAULT.frameW,
    frameH: UNIT_FRAME_DEFAULT.frameH,
  },
  targetFrame: {
    x: 65,
    y: 86,
    anchor: "bc",
    frameW: UNIT_FRAME_DEFAULT.frameW,
    frameH: UNIT_FRAME_DEFAULT.frameH,
  },
  // Shares the mid-top band with eventScore (mutually empty-hidden).
  bossBar: {
    x: 50,
    y: 10,
    anchor: "tc",
    frameW: BOSS_BAR_FRAME_DEFAULT.frameW,
    frameH: BOSS_BAR_FRAME_DEFAULT.frameH,
  },
  instanceRun: { x: 50, y: 18, anchor: "tc", frameW: 220, frameH: 70 },
  instance: {
    x: 50,
    y: 26,
    anchor: "tc",
    frameW: INSTANCE_FRAME_DEFAULT.frameW,
    frameH: INSTANCE_FRAME_DEFAULT.frameH,
  },
  // Live events list — content-hugging floor (was 300×220 empty black slab).
  events: { x: 0.5, y: 10, anchor: "tl", frameW: 260, frameH: 72 },
  // AB score: same band as bossBar (exclusive). Roster stacked under score.
  eventScore: { x: 50, y: 10, anchor: "tc", frameW: 360, frameH: 80 },
  eventRoster: { x: 50, y: 20, anchor: "tc", frameW: 280, frameH: 200 },
  abilityTimeline: {
    x: 99.5,
    y: 10,
    anchor: "tr",
    frameW: ABILITY_TIMELINE_FRAME_DEFAULT.frameW,
    frameH: ABILITY_TIMELINE_FRAME_DEFAULT.frameH,
  },
  abilityTimelineBigIcon: {
    x: 96,
    y: 10,
    anchor: "tr",
    frameW: ABILITY_TIMELINE_BIGICON_FRAME_DEFAULT.frameW,
    frameH: ABILITY_TIMELINE_BIGICON_FRAME_DEFAULT.frameH,
  },
  abilityTimelineHighlight: {
    x: 50,
    y: 48,
    anchor: "center",
    frameW: ABILITY_TIMELINE_HIGHLIGHT_FRAME_DEFAULT.frameW,
    frameH: ABILITY_TIMELINE_HIGHLIGHT_FRAME_DEFAULT.frameH,
  },
  minimap: { x: 0.5, y: 70, anchor: "bl", frameW: 220, frameH: 240 },
  threat: {
    x: 99.669,
    y: 68,
    anchor: "br",
    frameW: THREAT_FRAME_DEFAULT.frameW,
    frameH: THREAT_FRAME_DEFAULT.frameH,
  },
  command: { x: 50, y: 42, anchor: "center", frameW: 560, frameH: 300 },
  // Content-sized: fixed frameW/H shrinks #bottomleftcorner and wraps the
  // stock 7-col float inventory into broken rows (see BagPanel / ea1515d).
  bag: { x: 0.5, y: 99.2, anchor: "bl" },
  mail: { x: 50, y: 48, anchor: "center", frameW: 1100, frameH: 700 },
  toggles: { x: 99.5, y: 99.2, anchor: "br" },
};

/**
 * Landscape tablet — same zone logic as desktop, tighter vertical gaps.
 */
export const DEFAULT_LAYOUT_TABLET: Record<PanelId, PanelPos> = {
  players: {
    x: 0.5,
    y: 0.5,
    anchor: "tl",
    frameW: PLAYERS_FRAME_DEFAULT.frameW,
    autoSize: true,
  },
  enemies: {
    x: 99.5,
    y: 0.5,
    anchor: "tr",
    frameW: ENEMIES_FRAME_DEFAULT.frameW,
    frameH: ENEMIES_FRAME_DEFAULT.frameH,
  },
  serverInfo: { x: 50, y: 0.5, anchor: "tc" },
  mapInfo: { x: 50, y: 5, anchor: "tc" },
  paperdoll: { x: 1, y: 28, anchor: "tl" },
  buffInfo: { x: 1, y: 12, anchor: "tl", autoSize: true },
  itemInfo: { x: 17, y: 12, anchor: "tl", autoSize: true },
  kills: { x: 99.2, y: 72, anchor: "tr" },
  playerFrame: { x: 32, y: 78, anchor: "bc", ...UNIT_FRAME_DEFAULT },
  targetFrame: { x: 68, y: 78, anchor: "bc", ...UNIT_FRAME_DEFAULT },
  bossBar: { x: 50, y: 10, anchor: "tc", ...BOSS_BAR_FRAME_DEFAULT },
  instanceRun: { x: 50, y: 18, anchor: "tc" },
  instance: { x: 50, y: 26, anchor: "tc", ...INSTANCE_FRAME_DEFAULT },
  events: { x: 0.5, y: 10, anchor: "tl" },
  eventScore: { x: 50, y: 10, anchor: "tc" },
  eventRoster: { x: 50, y: 20, anchor: "tc" },
  abilityTimeline: {
    x: 99.5,
    y: 10,
    anchor: "tr",
    ...ABILITY_TIMELINE_FRAME_DEFAULT,
  },
  abilityTimelineBigIcon: {
    x: 96,
    y: 10,
    anchor: "tr",
    ...ABILITY_TIMELINE_BIGICON_FRAME_DEFAULT,
  },
  abilityTimelineHighlight: {
    x: 50,
    y: 46,
    anchor: "center",
    ...ABILITY_TIMELINE_HIGHLIGHT_FRAME_DEFAULT,
  },
  minimap: { x: 0.8, y: 70, anchor: "bl", frameW: 200, frameH: 220 },
  threat: { x: 99.2, y: 40, anchor: "tr", ...THREAT_FRAME_DEFAULT },
  command: { x: 50, y: 44, anchor: "center" },
  bag: { x: 0.8, y: 78, anchor: "bl" },
  mail: { x: 50, y: 46, anchor: "center", frameW: 980, frameH: 640 },
  toggles: { x: 99.2, y: 98.5, anchor: "br" },
};

/**
 * Portrait phone — top stack + left events; timeline top-right; minimap
 * above frames (avoids bag/sheet collision).
 */
export const DEFAULT_LAYOUT_PHONE: Record<PanelId, PanelPos> = {
  players: { x: 0.5, y: 0.5, anchor: "tl", frameW: 480, autoSize: true },
  enemies: { x: 99.5, y: 0.5, anchor: "tr" },
  serverInfo: { x: 50, y: 0.4, anchor: "tc" },
  mapInfo: { x: 50, y: 4.5, anchor: "tc" },
  paperdoll: { x: 50, y: 36, anchor: "center" },
  buffInfo: { x: 2, y: 14, anchor: "tl", autoSize: true },
  itemInfo: { x: 2, y: 36, anchor: "tl", autoSize: true },
  kills: { x: 98, y: 58, anchor: "br" },
  playerFrame: { x: 28, y: 62, anchor: "bc", ...UNIT_FRAME_DEFAULT },
  targetFrame: { x: 72, y: 62, anchor: "bc", ...UNIT_FRAME_DEFAULT },
  bossBar: { x: 50, y: 9, anchor: "tc" },
  instanceRun: { x: 50, y: 16, anchor: "tc" },
  instance: {
    x: 50,
    y: 22,
    anchor: "tc",
    frameW: 480,
    frameH: 360,
  },
  events: { x: 1, y: 10, anchor: "tl" },
  eventScore: { x: 50, y: 9, anchor: "tc" },
  eventRoster: { x: 50, y: 18, anchor: "tc" },
  abilityTimeline: { x: 98, y: 9, anchor: "tr", frameW: 50, frameH: 400 },
  abilityTimelineBigIcon: {
    x: 90,
    y: 9,
    anchor: "tr",
    ...ABILITY_TIMELINE_BIGICON_FRAME_DEFAULT,
  },
  abilityTimelineHighlight: {
    x: 50,
    y: 42,
    anchor: "center",
    ...ABILITY_TIMELINE_HIGHLIGHT_FRAME_DEFAULT,
  },
  minimap: { x: 2, y: 48, anchor: "tl", frameW: 160, frameH: 180 },
  threat: { x: 50, y: 52, anchor: "tc", frameW: 280, frameH: 280 },
  command: { x: 50, y: 42, anchor: "center" },
  bag: { x: 50, y: 88, anchor: "bc" },
  mail: { x: 50, y: 44, anchor: "center", frameW: 380, frameH: 560 },
  toggles: { x: 98, y: 98, anchor: "br" },
};

/** @deprecated alias — prefer DEFAULT_LAYOUT_DESKTOP / defaultLayoutFor */
export const DEFAULT_LAYOUT = DEFAULT_LAYOUT_DESKTOP;

export function defaultLayoutFor(
  profile: ViewportProfile,
): Record<PanelId, PanelPos> {
  switch (profile) {
    case "desktop":
      return DEFAULT_LAYOUT_DESKTOP;
    case "tablet":
      return DEFAULT_LAYOUT_TABLET;
    case "phone":
      return DEFAULT_LAYOUT_PHONE;
    default: {
      const _exhaustive: never = profile;
      return _exhaustive;
    }
  }
}
