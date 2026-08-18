/**
 * Per-map instance HUD configs (crypt / spider / tomb / winter).
 * Tracker + cards read these; keys match G.maps / current_map.
 */

export type InstanceSection = {
  label: string;
  mtypes: string[];
};

export type InstanceProgressMode = "count" | "phase" | "adds";

/** How boss cards are laid out in the instance panel. */
export type InstanceCardLayout = "flow" | "compass";

export type InstanceConfig = {
  map: string;
  /** Fallback title when G.maps[map].name is missing. */
  title: string;
  bossMtypes: string[];
  trackedMtypes: string[];
  sections: InstanceSection[];
  /**
   * count — bosses cleared / total (crypt, tomb, spider queens)
   * phase — ordered respawn chain (winter)
   * adds — visible adds vs pack size (spider spiders)
   */
  progressMode: InstanceProgressMode;
  /** Card grid presentation (tomb compass is presentation-only). */
  cardLayout?: InstanceCardLayout;
  /** Optional accent border colors keyed by mtype (tomb protectors). */
  accentBorders?: Record<string, string>;
  /** Winter ordered mtypes for progressMode "phase". */
  phaseOrder?: string[];
  /** Short phase names for pills (winter). */
  phaseNames?: Record<string, string>;
  /** Spider: add mtype + expected pack size for progressMode "adds". */
  addMtype?: string;
  addPackSize?: number;
  /** Spider: side queens that block the red queen passage. */
  gateSideMtypes?: string[];
  gateBossMtype?: string;
};

export const INSTANCE_CONFIGS: Record<string, InstanceConfig> = {
  crypt: {
    map: "crypt",
    title: "The Crypt",
    bossMtypes: ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8"],
    trackedMtypes: [
      "a1",
      "a2",
      "a3",
      "a4",
      "a5",
      "a6",
      "a7",
      "a8",
      "vbat",
      "nerfedbat",
    ],
    sections: [
      {
        label: "Bosses",
        mtypes: ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8"],
      },
      { label: "Bats", mtypes: ["vbat", "nerfedbat"] },
    ],
    progressMode: "count",
  },
  spider_instance: {
    map: "spider_instance",
    title: "The Spider Den",
    bossMtypes: ["spiderbl", "spiderbr", "spiderr"],
    trackedMtypes: ["spiderbl", "spiderbr", "spiderr", "spider"],
    sections: [
      {
        label: "Bosses",
        mtypes: ["spiderbl", "spiderbr", "spiderr"],
      },
    ],
    progressMode: "adds",
    addMtype: "spider",
    addPackSize: 6,
    gateSideMtypes: ["spiderbl", "spiderbr"],
    gateBossMtype: "spiderr",
  },
  tomb: {
    map: "tomb",
    title: "The Tomb",
    bossMtypes: ["gredpro", "ggreenpro", "gbluepro", "gpurplepro"],
    trackedMtypes: ["gredpro", "ggreenpro", "gbluepro", "gpurplepro"],
    sections: [
      {
        label: "Guardians",
        mtypes: ["gredpro", "ggreenpro", "gbluepro", "gpurplepro"],
      },
    ],
    progressMode: "count",
    cardLayout: "compass",
    accentBorders: {
      gredpro: "#a44",
      ggreenpro: "#4a4",
      gbluepro: "#48a",
      gpurplepro: "#a4a",
    },
  },
  winter_instance: {
    map: "winter_instance",
    title: "Lair of the Dark Mage",
    bossMtypes: ["xmagefz", "xmagefi", "xmagen", "xmagex"],
    trackedMtypes: ["xmagefz", "xmagefi", "xmagen", "xmagex"],
    sections: [
      {
        label: "Dark Mage",
        mtypes: ["xmagefz", "xmagefi", "xmagen", "xmagex"],
      },
    ],
    progressMode: "phase",
    phaseOrder: ["xmagefz", "xmagefi", "xmagen", "xmagex"],
    phaseNames: {
      xmagefz: "Frozen",
      xmagefi: "Fire",
      xmagen: "Nature",
      xmagex: "Dark",
    },
  },
};

export function getInstanceConfig(
  map: string | undefined,
): InstanceConfig | null {
  if (!map) return null;
  return INSTANCE_CONFIGS[map] || null;
}

export function isTrackedInstanceMap(map: string | undefined): boolean {
  return !!getInstanceConfig(map);
}

/** All boss mtypes across configs (hub kill luckm / fade logic). */
export function allInstanceBossMtypes(): Set<string> {
  const out = new Set<string>();
  const keys = Object.keys(INSTANCE_CONFIGS);
  for (let i = 0; i < keys.length; i++) {
    const bosses = INSTANCE_CONFIGS[keys[i]].bossMtypes;
    for (let j = 0; j < bosses.length; j++) out.add(bosses[j]);
  }
  return out;
}
