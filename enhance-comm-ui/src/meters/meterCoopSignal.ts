/**
 * Cheap coop-data signal for contextual tours — avoids full query dispatch in CommUI.
 */

import type { MeterInstance } from "./meterTypes";

/** True when a visible coop meter instance exists. */
export function hasVisibleCoopMeter(instances: MeterInstance[]): boolean {
  for (let i = 0; i < instances.length; i++) {
    const inst = instances[i];
    if (inst.visible === false) continue;
    const q = inst.query;
    if (q.kind !== "snapshot") continue;
    if (q.mode === "coop_v1" || q.mode === "coop_v2") return true;
  }
  return false;
}
