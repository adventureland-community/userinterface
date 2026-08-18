/**
 * Debug entity-line enable rules (global toggles → kind filter → focus → mtype).
 */

import type { EntityLike } from "../host/globals";
import { isFocusablePlayer } from "../queries/entities";
import {
  DEFAULT_LINE_BY_KIND,
  type VizLineKind,
  type VizLineRule,
  type VizSettings,
} from "./vizSettings";

export function entityLineKind(
  entity: EntityLike,
): "monster" | "player" | null {
  if (entity.type === "monster") return "monster";
  if (isFocusablePlayer(entity)) return "player";
  return null;
}

export function resolveLineRule(
  entity: EntityLike,
  mtypeRules: Record<string, Partial<VizLineRule>>,
): VizLineRule | null {
  const kind = entityLineKind(entity);
  if (!kind) return null;
  const preset = DEFAULT_LINE_BY_KIND[kind];
  const mtype =
    kind === "monster" && entity.mtype
      ? entity.mtype
      : kind === "player"
        ? "player"
        : "";
  const idKey = entity.id != null ? String(entity.id) : "";
  const nameKey = kind === "player" && entity.name ? `p:${entity.name}` : "";
  const override =
    (mtype && mtypeRules[mtype]) ||
    (nameKey && mtypeRules[nameKey]) ||
    (idKey && mtypeRules[idKey]) ||
    undefined;
  return override ? { ...preset, ...override } : { ...preset };
}

export function lineEnabled(
  entity: EntityLike,
  lineType: VizLineKind,
  settings: VizSettings,
  mtypeRules: Record<string, Partial<VizLineRule>>,
  focusId?: string | null,
): boolean {
  if (lineType === "aggroTarget") {
    if (settings["lines.aggroTarget"]) {
      /* fall through to shared filters + per-kind rules */
    } else if (settings["world.targetLine"]) {
      if (entity.type !== "monster") return false;
      if (settings["lines.filter.focusOnly"]) {
        if (!focusId || String(entity.id) !== String(focusId)) return false;
      }
      return true;
    } else {
      return false;
    }
  } else if (!settings[`lines.${lineType}`]) {
    return false;
  }
  const kind = entityLineKind(entity);
  if (!kind) return false;
  if (kind === "player" && !settings["lines.filter.players"]) return false;
  if (kind === "monster" && !settings["lines.filter.monsters"]) return false;
  if (settings["lines.filter.focusOnly"]) {
    if (!focusId || String(entity.id) !== String(focusId)) return false;
  }
  const rule = resolveLineRule(entity, mtypeRules);
  if (!rule) return false;
  return !!rule[lineType];
}

export function entityIsMoving(entity: EntityLike): boolean {
  const x = entity.real_x ?? entity.x;
  const y = entity.real_y ?? entity.y;
  const gx = entity.going_x;
  const gy = entity.going_y;
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof gx !== "number" ||
    typeof gy !== "number"
  ) {
    return false;
  }
  const dx = gx - x;
  const dy = gy - y;
  return Math.sqrt(dx * dx + dy * dy) > 0.75;
}
