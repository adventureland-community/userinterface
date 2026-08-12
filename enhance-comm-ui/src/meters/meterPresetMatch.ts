/**
 * Match meter instances to catalog presets — canonical duplicate check.
 */

import { presetById, type MeterPresetDef } from "./meterCatalog";
import type { MeterInstance, MeterQuery } from "./meterTypes";

function queriesMatch(a: MeterQuery, b: MeterQuery): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "snapshot":
      return b.kind === "snapshot" && a.mode === b.mode;
    case "players":
      return b.kind === "players" && a.metric === b.metric;
    case "rolling":
    case "realtime":
      return b.kind === a.kind;
    case "death_log":
    case "history":
    case "encounter_summary":
    case "timeline":
      return true;
    case "channel":
      return b.kind === "channel" && a.channel === b.channel;
    case "details":
      return b.kind === "details" && a.actorId === b.actorId;
    default: {
      const _exhaustive: never = a;
      return _exhaustive;
    }
  }
}

export function hasMeterForPreset(
  instances: MeterInstance[],
  preset: MeterPresetDef,
): boolean {
  for (let i = 0; i < instances.length; i++) {
    if (queriesMatch(instances[i].query, preset.query)) return true;
  }
  return false;
}

export function hasMeterForPresetId(
  instances: MeterInstance[],
  presetId: string,
): boolean {
  const preset = presetById(presetId);
  if (!preset) return false;
  return hasMeterForPreset(instances, preset);
}
