/**
 * Shared HUD + meter window stacking (Details-like bring-to-front).
 * Lives in lib so mail/bag/threat raise does not belong to the meters package.
 * Z range sits above idle HUD Absolute panels (panelStyle 20/40) and below
 * layout chrome (80) / Add dialog (90) / toggles (100) / guide overlay.
 */

/** Floor for window stack — above typical idle HUD Absolute panels. */
export const WINDOW_STACK_BASE = 50;
/** Soft ceiling before renormalize — below layout-edit chrome (80). */
export const WINDOW_STACK_MAX = 79;
/**
 * Snap guide balls + window-id badges. Above window stack (≤79) and toggles (100);
 * pointer-events: none so drag/resize still hit panels underneath.
 */
export const LAYOUT_GUIDE_OVERLAY_Z = 110;

export type StackPeer = { id: string; zIndex?: number };

export function maxPeerStackZ(peers: StackPeer[]): number {
  let max = WINDOW_STACK_BASE - 1;
  for (let i = 0; i < peers.length; i++) {
    const z = peers[i].zIndex;
    if (typeof z === "number" && z > max) max = z;
  }
  return max;
}

/** Highest z among a sparse id→z map (HUD bring-to-front). */
export function maxRecordStackZ(
  zs: Record<string, number | undefined> | null | undefined,
): number {
  if (!zs) return WINDOW_STACK_BASE - 1;
  let max = WINDOW_STACK_BASE - 1;
  const keys = Object.keys(zs);
  for (let i = 0; i < keys.length; i++) {
    const z = zs[keys[i]];
    if (typeof z === "number" && z > max) max = z;
  }
  return max;
}

export type NextFrontOpts = {
  /** Ephemeral HUD panel z map. */
  hudZs?: Record<string, number | undefined>;
  /** Explicit floor (e.g. max HUD z when raising a meter over mail). */
  floorZ?: number;
};

/**
 * Next front z above peers + HUD zs + optional floor. Compresses peers when
 * the shared ceiling is hit so mail/bag/threat can still rise over meters.
 */
export function nextWindowFrontZ<T extends StackPeer>(
  peers: T[],
  opts?: NextFrontOpts,
): { zIndex: number; peers: T[] } {
  const hudZs = opts?.hudZs || {};
  const floorZ =
    typeof opts?.floorZ === "number" ? opts.floorZ : WINDOW_STACK_BASE - 1;
  const floor = Math.max(maxPeerStackZ(peers), maxRecordStackZ(hudZs), floorZ);
  if (floor < WINDOW_STACK_MAX) {
    return { zIndex: floor + 1, peers };
  }
  const ranked = peers
    .map((m, i) => ({
      i,
      z: typeof m.zIndex === "number" ? m.zIndex : WINDOW_STACK_BASE - 1,
    }))
    .sort((a, b) => a.z - b.z || a.i - b.i);
  const next = peers.slice();
  for (let r = 0; r < ranked.length; r++) {
    const row = next[ranked[r].i];
    next[ranked[r].i] = { ...row, zIndex: WINDOW_STACK_BASE + r };
  }
  return {
    zIndex: Math.min(WINDOW_STACK_BASE + ranked.length, WINDOW_STACK_MAX),
    peers: next,
  };
}
