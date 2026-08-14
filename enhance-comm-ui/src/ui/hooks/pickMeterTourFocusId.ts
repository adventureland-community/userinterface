/**
 * Prefer newest / top-of-stack meter instance for tour spotlight.
 */

export function pickMeterTourFocusId(
  instances: Array<{ id: string; zIndex?: number }>,
): string | null {
  if (!instances.length) return null;
  let best = instances[0];
  let bestZ =
    typeof best.zIndex === "number" ? best.zIndex : Number.NEGATIVE_INFINITY;
  for (let i = 1; i < instances.length; i++) {
    const m = instances[i];
    const z =
      typeof m.zIndex === "number" ? m.zIndex : Number.NEGATIVE_INFINITY;
    if (z >= bestZ) {
      best = m;
      bestZ = z;
    }
  }
  return best.id;
}
