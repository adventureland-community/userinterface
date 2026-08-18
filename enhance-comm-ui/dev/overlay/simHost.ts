/**
 * Push instance-sim entities onto the preview host (window.entities / map).
 * Live CommUI never imports this — tick just reads the host like /comm.
 */

import type { EntityLike } from "../../src/host/globals";
import {
  applyInstanceSim,
  getInstanceSimInstanceId,
  getInstanceSimMapOverride,
  isInstanceSimActive,
} from "../../src/debug/instanceSim";
import type { PreviewPlayer } from "./hostStub";
import { setHostMapName } from "./fakePixi";

const IDLE_MAP = "main";

export function syncSimToHost(
  player: PreviewPlayer,
  party: PreviewPlayer[],
): void {
  const now = Date.now();
  const simMap = getInstanceSimMapOverride();
  const simIn = getInstanceSimInstanceId();
  const map = simMap || IDLE_MAP;
  const instanceId = simIn || IDLE_MAP;

  player.map = map;
  player.in = instanceId;
  window.observing = player;
  window.current_map = map;
  window.current_in = instanceId;
  setHostMapName(map);

  const seed: EntityLike[] = [player];
  for (let i = 0; i < party.length; i++) {
    const mate = party[i];
    mate.map = map;
    mate.in = instanceId;
    seed.push(mate);
  }

  const rec: Record<string, EntityLike> = {};
  rec[String(player.id)] = player;

  if (isInstanceSimActive()) {
    const merged = applyInstanceSim({
      entities: seed,
      observing: player,
      observingId: String(player.id),
      target: undefined,
      S: window.S,
      serverRegion: window.server_region,
      serverIdentifier: window.server_identifier,
      now,
    });
    let focus: EntityLike | undefined;
    for (let i = 0; i < merged.entities.length; i++) {
      const ent = merged.entities[i];
      if (!ent || ent.id == null) continue;
      rec[String(ent.id)] = ent;
      if (
        !focus &&
        ent.type === "monster" &&
        ent.visible &&
        !ent.dead &&
        (ent.target === player.id || ent.cooperative)
      ) {
        focus = ent;
      }
    }
    if (focus) {
      player.target = focus.id;
      window.xtarget = focus;
    }
  } else {
    for (let i = 0; i < seed.length; i++) {
      const ent = seed[i];
      rec[String(ent.id)] = ent;
    }
    player.target = undefined;
    window.xtarget = null;
  }

  window.entities = rec;
}
