import type { EntityLike } from "./globals";

type InspectHost = Window & {
  ui_inspect?: (entity: unknown) => void;
  btc?: (event: Event, type?: string) => void;
};

/** Stock game inspect modal — `show_json(game_stringify(entity))`. */
export function uiInspectEntity(entity: EntityLike | null | undefined): boolean {
  if (!entity) return false;
  const host = window as InspectHost;
  if (typeof host.ui_inspect !== "function") return false;
  host.ui_inspect(entity);
  return true;
}

/** Match stock unit-frame inspect click (stop propagation + btc). */
export function uiInspectClick(
  event: Event,
  entity: EntityLike | null | undefined,
): boolean {
  event.stopPropagation();
  const host = window as InspectHost;
  if (typeof host.btc === "function") host.btc(event);
  return uiInspectEntity(entity);
}
