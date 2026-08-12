import { e } from "../../host/react";
import type { EntityLike } from "../../host/globals";
import type { PartyFocus } from "../../lib/settingsFocus";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import { metricFromModeQuery } from "../../meters/meterCatalog";
import { runMeterQuery } from "../../meters/meterQuery";
import type {
  MeterInstance,
  MeterPresentation,
  MeterQuery,
  MeterResult,
  RankedRow,
  SegmentRef,
} from "../../meters/meterTypes";
import { MeterBarsView } from "./MeterBarRow";
import { rootQuery } from "./meterShellHelpers";
import {
  MeterDeathView,
  MeterDetailsView,
  MeterEncounterView,
  MeterTimelineView,
} from "./views/MeterMiscViews";
import {
  MeterHistoryChart,
  MeterPieView,
  MeterSeriesView,
} from "./views/MeterChartViews";
import { MeterTableView } from "./views/MeterTableView";

export type MeterShellBodyProps = {
  pres: MeterPresentation;
  result: MeterResult;
  selectedset: SegmentRef;
  instance: MeterInstance;
  entities: EntityLike[];
  highlightId?: string;
  layoutEdit?: boolean;
  activeQuery: MeterQuery;
  barsProps: {
    query: MeterQuery;
    segmentRef: SegmentRef;
    partyFocus: PartyFocus | undefined;
    entities: EntityLike[];
    highlightId?: string;
    live: boolean;
    frameH?: number;
    alwaysShowSelf?: boolean;
    onRowClick: (row: RankedRow, ev?: any) => void;
    onRowContextMenu: (row: RankedRow, ev: any) => void;
  };
  onPatchInstance: (partial: Partial<MeterInstance>) => void;
  patchInspectorAbility: (ability: string | null) => void;
  onFocusInspector?: (actorId: string, name: string) => void;
};

export function renderMeterShellBody(props: MeterShellBodyProps): any {
  const {
    pres,
    result,
    selectedset,
    instance,
    entities,
    highlightId,
    activeQuery,
    barsProps,
    onPatchInstance,
    patchInspectorAbility,
    onFocusInspector,
  } = props;
  if (pres === "details" || result.kind === "details") {
    let det = result;
    if (
      result.kind === "empty" ||
      (result.kind === "details" && !result.actorId)
    ) {
      return e(
        "div",
        null,
        e(
          "div",
          {
            style: {
              padding: "4px 8px",
              color: "#888",
              fontSize: "11px",
              ...PIXEL_TEXT,
            },
          },
          "Click a player on Damage / Encounter, or pick below",
        ),
        e(MeterBarsView, {
          query: { kind: "players", metric: "damage" },
          segmentRef: selectedset,
          partyFocus: instance.partyFocus,
          entities,
          highlightId,
          live: false,
          onRowClick: (row: RankedRow) => {
            onPatchInstance({
              query: { kind: "details", actorId: row.id },
              label: `Inspector · ${row.name}`,
            });
          },
        }),
      );
    }
    const selectedAbility =
      instance.query.kind === "details"
        ? instance.query.ability || null
        : null;
    return e(MeterDetailsView, {
      result: det,
      segmentRef: selectedset,
      partyFocus: instance.partyFocus,
      selectedAbility,
      onSelectAbility: (ability: string) => patchInspectorAbility(ability),
    });
  }
  if (pres === "death_log" || result.kind === "death_log") {
    return e(MeterDeathView, { result });
  }
  if (pres === "encounter" || result.kind === "encounter") {
    return e(MeterEncounterView, {
      result,
      segmentRef: selectedset,
      partyFocus: instance.partyFocus,
      onOpenPlayer: (id: string, name: string) => {
        if (onFocusInspector) onFocusInspector(id, name);
        else {
          onPatchInstance({
            query: { kind: "details", actorId: id },
            presentation: "details",
            label: `Inspector · ${name}`,
          });
        }
      },
    });
  }
  if (pres === "timeline" || result.kind === "timeline") {
    return e(MeterTimelineView, { result, segmentRef: selectedset });
  }
  if (pres === "realtime" || pres === "compare" || pres === "series") {
    const hist =
      result.kind === "history"
        ? result
        : runMeterQuery(
            { kind: "history" },
            {
              segmentRef: selectedset,
              partyFocus: instance.partyFocus,
            },
          );
    return e(MeterSeriesView, {
      result: hist,
      instance,
      segmentRef: selectedset,
      partyFocus: instance.partyFocus,
      onPatch: onPatchInstance,
    });
  }
  if (pres === "line" || result.kind === "history") {
    const hist =
      result.kind === "history"
        ? result
        : runMeterQuery(
            { kind: "history" },
            {
              segmentRef: selectedset,
              partyFocus: instance.partyFocus,
            },
          );
    return e(MeterHistoryChart, { result: hist, height: 120 });
  }
  if (pres === "pie" || result.kind === "pie") {
    const metric = metricFromModeQuery(rootQuery(instance));
    const pieMetric =
      metric === "heal" || metric === "healing_required"
        ? "heal"
        : metric === "taken"
          ? "taken"
          : "damage";
    const pie =
      result.kind === "pie"
        ? result
        : runMeterQuery(
            { kind: "pie", metric: pieMetric },
            {
              segmentRef: selectedset,
              partyFocus: instance.partyFocus,
            },
          );
    return e(MeterPieView, { result: pie });
  }
  if (pres === "table") {
    if (result.kind === "summary" || result.kind === "ranked") {
      return e(MeterTableView, { result });
    }
    const ranked = runMeterQuery(rootQuery(instance), {
      segmentRef: selectedset,
      partyFocus: instance.partyFocus,
      entities,
    });
    return e(MeterTableView, { result: ranked });
  }
  if (result.kind === "summary") {
    return e(MeterTableView, { result });
  }
  if (
    result.kind === "ranked" ||
    activeQuery.kind === "players" ||
    activeQuery.kind === "abilities" ||
    activeQuery.kind === "ability_targets" ||
    activeQuery.kind === "targets" ||
    activeQuery.kind === "channel" ||
    activeQuery.kind === "snapshot" ||
    activeQuery.kind === "rolling" ||
    activeQuery.kind === "realtime" ||
    activeQuery.kind === "avoidance"
  ) {
    return e(MeterBarsView, barsProps);
  }
  if (result.kind === "empty") {
    return e(
      "div",
      {
        style: {
          padding: "8px",
          color: "#888",
          fontSize: TYPE.body,
          ...PIXEL_TEXT,
        },
      },
      props.layoutEdit ? "No contributors yet" : "No data",
    );
  }
  return e(MeterTableView, { result });
}
