import { getG } from "../host/al";
import { CRYPT_MOB_LABELS } from "../crypt/labels";

/**
 * Winter phase chain — G.monsters names are mostly "Mage"; mockup / HUD
 * need phase-specific labels (Frozen → Fire → Nature → Dark Mage).
 */
const WINTER_PHASE_LABELS: Record<string, string> = {
  xmagefz: "Mage · Frozen",
  xmagefi: "Mage · Fire",
  xmagen: "Mage · Nature",
  xmagex: "Dark Mage",
};

/** Extra static labels when G is not ready yet. */
const EXTRA_LABELS: Record<string, string> = {
  spiderbl: "Black Spider Queen",
  spiderbr: "Brown Spider Queen",
  spiderr: "Red Spider Queen",
  spider: "Spider",
  gredpro: "Protector of Fire",
  ggreenpro: "Protector of Nature",
  gbluepro: "Protector of Frost",
  gpurplepro: "Protector of Darkness",
  xmagefz: "Mage · Frozen",
  xmagefi: "Mage · Fire",
  xmagen: "Mage · Nature",
  xmagex: "Dark Mage",
};

export function getInstanceMobLabel(mtype: string): string {
  if (WINTER_PHASE_LABELS[mtype]) return WINTER_PHASE_LABELS[mtype];
  if (CRYPT_MOB_LABELS[mtype]) return CRYPT_MOB_LABELS[mtype];
  if (EXTRA_LABELS[mtype]) return EXTRA_LABELS[mtype];
  try {
    const gName = getG()?.monsters?.[mtype]?.name;
    if (typeof gName === "string" && gName) return gName;
  } catch {
    /* no browser / G */
  }
  return mtype;
}
