/**
 * Resolve observer/character focus + map/`in` keys for the minimap camera.
 * Shared by paint + ◎ recenter so snap gates stay in one place.
 */

import {
  getCharacter,
  getCurrentIn,
  getCurrentMap,
  getEntitiesList,
  getObserving,
  getObservingId,
} from "../../host/al";
import {
  resolveMapGeometry,
  resolveMinimapFocusSet,
  type MapGeometry,
  type MinimapFocusEnt,
} from "./mapExtent";

export type MinimapScene = {
  observing: MinimapFocusEnt | null | undefined;
  character: MinimapFocusEnt | null | undefined;
  entities: MinimapFocusEnt[];
  observingId: string;
  resolved: ReturnType<typeof resolveMinimapFocusSet>;
  mapKey: string | undefined;
  inKey: string;
  geo: MapGeometry;
};

export function readMinimapScene(): MinimapScene {
  const observing = getObserving() as MinimapFocusEnt | null | undefined;
  const character = getCharacter() as MinimapFocusEnt | null | undefined;
  const observingId =
    observing?.id != null ? String(observing.id) : getObservingId() || "";
  const entities = getEntitiesList() as MinimapFocusEnt[];
  const resolved = resolveMinimapFocusSet(entities, observing, character);
  const primary = resolved.primary;
  const mapKey =
    (observing && observing.map) ||
    (primary && primary.map) ||
    (character && character.map) ||
    getCurrentMap() ||
    undefined;
  const inKey =
    (observing && observing.in != null && String(observing.in)) ||
    (primary && primary.in != null && String(primary.in)) ||
    (character && character.in != null && String(character.in)) ||
    getCurrentIn() ||
    "";
  const geo = resolveMapGeometry(mapKey);
  return {
    observing,
    character,
    entities,
    observingId,
    resolved,
    mapKey,
    inKey,
    geo,
  };
}
