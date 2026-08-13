import { getReact, e } from "../../../host/react";
import { formatCompactNumber } from "../../../lib/format";
import type { PartyFocus } from "../../../lib/settingsFocus";
import { PIXEL_TEXT, TYPE } from "../../../lib/typeScale";
import { resolveSegment } from "../../../meters/meterSession";
import { runMeterQuery } from "../../../meters/meterQuery";
import type {
  MeterResult,
  RankedRow,
  SegmentRef,
} from "../../../meters/meterTypes";
import { injectMeterChromeCss } from "../meterChromeCss";
import { MeterBarsView } from "../MeterBarRow";

const pad = {
  padding: "8px",
  color: "#888",
  fontSize: TYPE.body,
  ...PIXEL_TEXT,
};

export function MeterEncounterView(props: {
  result: MeterResult;
  segmentRef: SegmentRef;
  partyFocus?: PartyFocus;
  onOpenPlayer?: (id: string, name: string) => void;
}): any {
  const React = getReact();
  React.useEffect(() => {
    injectMeterChromeCss();
  }, []);

  if (props.result.kind !== "encounter") {
    return e("div", { style: pad }, "No encounter");
  }
  const r = props.result;
  const sec = Math.max(r.durationMs / 1000, 1);
  const seg = resolveSegment(props.segmentRef);
  const fightLabel = seg?.label || "Current fight";

  const openPlayer = props.onOpenPlayer
    ? (row: RankedRow) => {
        if (row.kind === "player" || !row.kind) {
          props.onOpenPlayer!(row.id, row.name);
        }
      }
    : undefined;

  const panes: Array<{
    key: string;
    title: string;
    tone: string;
    query?: any;
    deathLog?: boolean;
  }> = [
    {
      key: "taken",
      title: "Damage Taken per Player",
      tone: "tone-taken",
      query: { kind: "players", metric: "taken", primary: "total" },
    },
    {
      key: "spell",
      title: "Damage Taken by Spell",
      tone: "tone-spell",
      query: { kind: "taken_by_spell" },
    },
    {
      key: "adds",
      title: "Adds",
      tone: "tone-dmg",
      query: { kind: "enemy_damage" },
    },
    {
      key: "dispels",
      title: "Dispels",
      tone: "tone-heal",
      query: { kind: "misc", metric: "dispels" },
    },
    {
      key: "interrupts",
      title: "Interrupts",
      tone: "tone-av",
      query: { kind: "misc", metric: "interrupts" },
    },
    {
      key: "deaths",
      title: "Death Log",
      tone: "tone-death",
      deathLog: true,
    },
  ];

  const deathResult = runMeterQuery(
    { kind: "death_log" },
    {
      segmentRef: props.segmentRef,
      partyFocus: props.partyFocus,
    },
  );

  return e(
    "div",
    { className: "ecu-meter-encounter", style: { ...PIXEL_TEXT } },
    e(
      "div",
      { className: "ecu-meter-enc-head" },
      e(
        "div",
        { className: "ecu-meter-enc-title" },
        e("b", null, "Encounter Details"),
        " · ",
        fightLabel,
      ),
      e(
        "div",
        { className: "ecu-meter-enc-stats" },
        e("span", null, e("b", null, `${sec.toFixed(0)}s`)),
        e(
          "span",
          { className: r.deaths > 0 ? "is-bad" : undefined },
          e("b", null, String(r.deaths)),
          " deaths",
        ),
        e(
          "span",
          null,
          "Dmg ",
          e("b", null, formatCompactNumber(r.totalDamage)),
        ),
        e(
          "span",
          null,
          "DPS ",
          e("b", null, `${formatCompactNumber(r.totalDamage / sec)}/s`),
        ),
        e(
          "span",
          null,
          "Heal ",
          e("b", null, formatCompactNumber(r.totalHeal)),
        ),
        r.topDps ? e("span", null, "Top ", e("b", null, r.topDps.name)) : null,
      ),
    ),
    e(
      "div",
      { className: "ecu-meter-enc-grid" },
      ...panes.map((pane) =>
        e(
          "div",
          {
            key: pane.key,
            className: `ecu-meter-enc-widget ${pane.tone}`,
          },
          e("div", { className: "ecu-meter-enc-widget-hd" }, pane.title),
          e(
            "div",
            { className: "ecu-meter-enc-widget-body" },
            pane.deathLog
              ? deathResult.kind === "death_log" && deathResult.deaths.length
                ? e(
                    "div",
                    { className: "ecu-meter-enc-deathlist" },
                    ...deathResult.deaths.map((d, i) =>
                      e(
                        "div",
                        {
                          key: `${d.id}-${d.at}`,
                          className: "ecu-meter-enc-deathrow",
                        },
                        e(
                          "span",
                          { className: "ecu-meter-enc-deathname" },
                          d.name,
                        ),
                        e(
                          "span",
                          { className: "ecu-meter-enc-deathtime" },
                          new Date(d.at).toLocaleTimeString(),
                        ),
                        e(
                          "span",
                          { className: "ecu-meter-enc-deathnum" },
                          `#${i + 1}`,
                        ),
                      ),
                    ),
                  )
                : e("div", { className: "ecu-meter-enc-empty" }, "No deaths")
              : e(MeterBarsView, {
                  query: pane.query,
                  segmentRef: props.segmentRef,
                  partyFocus: props.partyFocus,
                  live: false,
                  onRowContextMenu: openPlayer,
                  onRowClick: openPlayer,
                }),
          ),
        ),
      ),
    ),
  );
}
