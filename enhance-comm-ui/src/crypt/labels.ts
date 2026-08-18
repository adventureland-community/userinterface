/** Display names from adventureland/design/monsters.py (crypt section). */
export const CRYPT_MOB_LABELS: Record<string, string> = {
  a1: "Spike",
  a2: "Bill",
  a3: "Lestat",
  a4: "Orlok",
  a5: "Elena",
  a6: "Marceline",
  a7: "Lucinda",
  a8: "Angel",
  vbat: "Vampireling",
  nerfedbat: "Bat",
};

export function getCryptMobLabel(mtype: string): string {
  return CRYPT_MOB_LABELS[mtype] || mtype;
}

/** @deprecated Prefer getInstanceMobLabel from instance/labels. */
export { getInstanceMobLabel } from "../instance/labels";
