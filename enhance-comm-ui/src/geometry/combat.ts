import { calculateDifficulty, simpleDistance } from "../host/al";
import type { EntityLike } from "../host/globals";

export function distance(
  a: EntityLike | null | undefined,
  b: EntityLike | null | undefined,
): number | undefined {
  if (!a || !b) return undefined;
  return simpleDistance(a, b);
}

export function outOfRange(
  observer: EntityLike | null | undefined,
  target: EntityLike | null | undefined,
): boolean | undefined {
  if (!observer || !target) return undefined;
  const range = observer.range;
  if (range == null) return undefined;
  const d = distance(observer, target);
  if (d == null) return undefined;
  return d > range;
}

export function difficultyBadge(
  monster: EntityLike | null | undefined,
): { level: number; label: string; color: string } | undefined {
  if (!monster || monster.type !== "monster") return undefined;
  const level = calculateDifficulty(monster);
  if (level >= 2) return { level, label: "Hard", color: "#ff4444" };
  if (level === 1) return { level, label: "Med", color: "#ffaa00" };
  return { level, label: "Easy", color: "#66cc66" };
}
