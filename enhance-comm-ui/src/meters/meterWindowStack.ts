/**
 * Meter-typed wrappers over shared window stacking.
 * Shared stack primitives live only in lib/windowStack.
 */

import {
  WINDOW_STACK_BASE,
  maxPeerStackZ,
  nextWindowFrontZ,
  type NextFrontOpts,
} from "../lib/windowStack";
import type { MeterInstance } from "./meterTypes";

/**
 * New window defaults: unlocked (unless caller set locked), top of stack.
 * Does not mutate existing peers except when stack must renormalize.
 */
export function prepareNewMeterWindow(
  inst: MeterInstance,
  peers: MeterInstance[],
): { inst: MeterInstance; peers: MeterInstance[] } {
  const { zIndex, peers: nextPeers } = nextWindowFrontZ(peers, {});
  return {
    peers: nextPeers,
    inst: {
      ...inst,
      locked: typeof inst.locked === "boolean" ? inst.locked : false,
      zIndex,
    },
  };
}

/**
 * Raise an existing instance without changing lock. No-op if already top of
 * meters and above `floorZ` (typically max HUD ephemeral z).
 */
export function bringMeterToFront(
  peers: MeterInstance[],
  id: string,
  floorZ = 0,
): MeterInstance[] {
  let target: MeterInstance | null = null;
  for (let i = 0; i < peers.length; i++) {
    if (peers[i].id === id) {
      target = peers[i];
      break;
    }
  }
  if (!target) return peers;
  const max = maxPeerStackZ(peers);
  if (
    typeof target.zIndex === "number" &&
    target.zIndex === max &&
    target.zIndex > floorZ &&
    max >= WINDOW_STACK_BASE
  ) {
    return peers;
  }
  const opts: NextFrontOpts = {
    floorZ: floorZ > 0 ? floorZ : undefined,
  };
  const { zIndex, peers: base } = nextWindowFrontZ(peers, opts);
  return base.map((m) => (m.id === id ? { ...m, zIndex } : m));
}
