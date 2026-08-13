/**
 * Inspector focus / row-click wiring for MeterPanelShell.
 */

import { metricFromModeQuery } from "../../meters/meterCatalog";
import type { PartyFocus } from "../../lib/settingsFocus";
import type {
  MeterInstance,
  MeterQuery,
  PlayersMetric,
  PlayersPrimary,
  RankedRow,
} from "../../meters/meterTypes";
import type { FocusInspectorOpts } from "../hooks/useCommMeterInstances";
import { detailsWindowTitle, presentationFor, rootQuery } from "./meterShellHelpers";

export function patchInspectorAbilityQuery(
  instance: MeterInstance,
  ability: string | null,
): MeterQuery | null {
  const q = rootQuery(instance);
  if (q.kind !== "details") return null;
  const next: MeterQuery = {
    kind: "details",
    actorId: q.actorId,
    metric: q.metric,
    primary: q.primary,
  };
  if (ability) next.ability = ability;
  return next;
}

export function inspectorFocusOptsFor(
  instance: MeterInstance,
): FocusInspectorOpts {
  const q = rootQuery(instance);
  const metricRaw = metricFromModeQuery(q);
  const metric: PlayersMetric =
    metricRaw === "heal" ||
    metricRaw === "taken" ||
    metricRaw === "healing_required" ||
    metricRaw === "avoidance"
      ? metricRaw
      : "damage";
  const primary: PlayersPrimary =
    q.kind === "players" && q.primary === "rate" ? "rate" : "total";
  return {
    metric,
    primary,
    selectedset: instance.selectedset,
    partyFocus: instance.partyFocus as PartyFocus | undefined,
  };
}

export function openInspectorFromRow(args: {
  instance: MeterInstance;
  row: RankedRow;
  onFocusInspector?: (
    actorId: string,
    name: string,
    opts?: FocusInspectorOpts,
  ) => void;
  onPatchInstance: (partial: Partial<MeterInstance>) => void;
}): void {
  const opts = inspectorFocusOptsFor(args.instance);
  if (args.onFocusInspector) {
    args.onFocusInspector(args.row.id, args.row.name, opts);
    return;
  }
  if (presentationFor(args.instance) === "details") {
    args.onPatchInstance({
      query: {
        kind: "details",
        actorId: args.row.id,
        metric: opts.metric,
        primary: opts.primary,
      },
      label: detailsWindowTitle(args.row.name, opts.metric, opts.primary),
    });
  }
}

export function canInspectMeterRow(instance: MeterInstance): boolean {
  const q = rootQuery(instance);
  const pres = presentationFor(instance);
  return (
    q.kind === "players" ||
    q.kind === "avoidance" ||
    pres === "encounter" ||
    pres === "details"
  );
}

export function detailsActorPatch(
  instance: MeterInstance,
  actorId: string,
  name: string,
): Partial<MeterInstance> {
  const q = rootQuery(instance);
  const metric =
    q.kind === "details" && q.metric ? q.metric : ("damage" as PlayersMetric);
  const primary =
    q.kind === "details" && q.primary === "rate"
      ? ("rate" as PlayersPrimary)
      : ("total" as PlayersPrimary);
  return {
    query: { kind: "details", actorId, metric, primary },
    presentation: "details",
    label: detailsWindowTitle(name, metric, primary),
  };
}
