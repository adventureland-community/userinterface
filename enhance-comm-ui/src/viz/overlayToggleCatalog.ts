/**
 * Overlay toggle catalog for Settings → Drawings / Comm HUD (labels + tags only).
 * Persistence remains in vizSettings.
 */

import type { VizSettingKey } from "./vizSettings";

export type OverlayToggleDef = {
  key: VizSettingKey;
  label: string;
  tag?: "static" | "debug";
  help?: string;
};

export type OverlayPaneId = "drawings" | "commHud";

export type OverlayToggleSection = {
  id: string;
  title: string;
  pane: OverlayPaneId;
  defs: readonly OverlayToggleDef[];
};

export const OVERLAY_TOGGLE_SECTIONS: readonly OverlayToggleSection[] = [
  {
    id: "rings",
    title: "Rings & ranges",
    pane: "drawings",
    defs: [
      {
        key: "world.attackRange",
        label: "Attack range",
        tag: "static",
        help: "entity.range ring",
      },
      {
        key: "world.abilityImminent",
        label: "Ability rings when imminent",
        help: "Under 15% remaining cooldown",
      },
      {
        key: "world.abilityGhost",
        label: "Ghost rings mid-CD",
        tag: "static",
      },
      { key: "world.auraRing", label: "Aura radius", tag: "static" },
      {
        key: "world.highlightAtRisk",
        label: "Highlight players in ability radius",
      },
    ],
  },
  {
    id: "labels",
    title: "Ring labels",
    pane: "drawings",
    defs: [
      {
        key: "entity.abilityName",
        label: "Ability names on rings",
        help: "Default for all skills; override per ability below",
      },
    ],
  },
  {
    id: "lines",
    title: "Entity lines",
    pane: "drawings",
    defs: [
      { key: "lines.aggroTarget", label: "Monster aggro → target" },
      {
        key: "lines.moveDest",
        label: "Move destination",
        tag: "debug",
        help: "going_x / going_y for mobs and players",
      },
      {
        key: "lines.attackTarget",
        label: "Player attack → target",
        tag: "debug",
        help: "Line from player to their target mob",
      },
      {
        key: "lines.filter.focusOnly",
        label: "Focus boss only",
        help: "Only draw lines for the focused entity",
      },
    ],
  },
  {
    id: "debug",
    title: "Debug overlays",
    pane: "drawings",
    defs: [
      {
        key: "world.quirkHitboxes",
        label: "Map quirk hover outline",
        tag: "debug",
        help: "Outline the sign/shrine/lever under the cursor (not all of them)",
      },
      {
        key: "world.spawnPoints",
        label: "Design spawn points",
        tag: "debug",
        help: "From G.maps",
      },
      {
        key: "entity.cdLabel",
        label: "CD ms labels on focus boss",
        tag: "debug",
      },
      {
        key: "debug.entityIds",
        label: "Entity id + mtype on focus",
        tag: "debug",
      },
      {
        key: "debug.gridCoords",
        label: "Map geometry corner coords",
        tag: "debug",
      },
    ],
  },
  {
    id: "comm",
    title: "Comm HUD panels",
    pane: "commHud",
    defs: [
      { key: "comm.mechanicChips", label: "Mechanic chips on instance card" },
      { key: "comm.spawnAlert", label: "Spawn alert chip (imminent only)" },
      {
        key: "comm.hpThresholds",
        label: "HP threshold markers (event bosses)",
      },
    ],
  },
];

export function overlayToggleSectionsForPane(
  pane: OverlayPaneId,
): readonly OverlayToggleSection[] {
  const out: OverlayToggleSection[] = [];
  for (let i = 0; i < OVERLAY_TOGGLE_SECTIONS.length; i++) {
    const section = OVERLAY_TOGGLE_SECTIONS[i];
    if (section.pane === pane) out.push(section);
  }
  return out;
}
