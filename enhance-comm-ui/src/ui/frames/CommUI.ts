import { getReact, e } from "../../host/react";
import type { GameSnapshot } from "../../tick";
import { RankMeter } from "../../meters/RankMeter";
import { buildPdpsRows } from "../../meters/strategies/pdps";
import { buildCoopV1Rows } from "../../meters/strategies/coopV1";
import { buildCoopV2Rows } from "../../meters/strategies/coopV2";
import { buildHitDpsRows } from "../../meters/strategies/hitDps";
import { updateSeenMtypes } from "../../kpi/sessionKills";
import { Players } from "./Players";
import { MapInfo } from "./MapInfo";
import { CryptProgress } from "./CryptProgress";
import { ServerInfo } from "./ServerInfo";
import { BossInfo } from "./BossInfo";
import { Enemies } from "./Enemies";
import { EntityInfo } from "./EntityInfo";
import { PlayerRow } from "./PlayerRow";
import { ThreatTable } from "./ThreatTable";
import { KillKpiPanel } from "./KillKpiPanel";

export type CommUIProps = {
  snap: GameSnapshot;
};

function toggleButton(
  label: string,
  visible: boolean,
  onClick: () => void,
  last?: boolean,
): any {
  return e(
    "button",
    {
      style: {
        cursor: "pointer",
        padding: "2px 4px",
        fontSize: "12px",
        margin: last ? "0 10px 5px 0" : "0 0 5px 0",
      },
      onClick,
    },
    `${label}: ${visible ? "HIDE" : "SHOW"}`,
  );
}

export function CommUI(props: CommUIProps): any {
  const React = getReact();
  const snap = props.snap;

  const [isVisiblePdps, setIsVisiblePdps] = React.useState(true);
  const [isVisibleCoopV1, setIsVisibleCoopV1] = React.useState(true);
  const [isVisibleCoopV2, setIsVisibleCoopV2] = React.useState(true);
  const [isVisibleHitDps, setIsVisibleHitDps] = React.useState(true);
  const [isVisibleThreat, setIsVisibleThreat] = React.useState(true);
  const [isVisibleKills, setIsVisibleKills] = React.useState(true);
  const [selectedEntity, setSelectedEntity] = React.useState(undefined);

  React.useEffect(() => {
    updateSeenMtypes(snap.entities);
  }, [snap.entities]);

  const pdpsRows = buildPdpsRows(snap.entities);
  const coopV1Rows = buildCoopV1Rows(snap.entities);
  const coopV2Rows = buildCoopV2Rows(snap.entities);
  const hitDpsRows = buildHitDpsRows(snap.entities, snap.now);

  return e(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
      },
    },
    e(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          flexGrow: 1,
        },
      },
      e(
        "div",
        { style: { width: "376px" } },
        e(Players, {
          entities: snap.entities,
          setSelectedEntity,
        }),
      ),
      e(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            flex: 1,
            padding: "4px 16px",
          },
        },
        e(ServerInfo, {
          S: snap.S,
          serverRegion: snap.serverRegion,
          serverIdentifier: snap.serverIdentifier,
        }),
        e(MapInfo, { entities: snap.entities }),
        e(CryptProgress, { entities: snap.entities }),
        e(BossInfo, {
          entities: snap.entities,
          setSelectedEntity,
        }),
      ),
      e(
        "div",
        {
          style: {
            width: "calc(376px - 134px)",
            textAlign: "right",
            paddingRight: "134px",
          },
        },
        e(Enemies, {
          entities: snap.entities,
          setSelectedEntity,
        }),
      ),
    ),
    e(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexGrow: 1,
        },
      },
      e(
        "div",
        {
          style: {
            width: "376px",
            paddingBottom: "28px",
          },
        },
        e(EntityInfo, {
          entities: snap.entities,
          selectedEntity,
        }),
        isVisibleKills ? e(KillKpiPanel) : null,
      ),
      e(
        "div",
        {
          style: {
            flex: "1 1 0%",
            padding: "4px 16px 168px",
          },
        },
        e(PlayerRow, {
          observing: snap.observing,
          target: snap.target,
          setSelectedEntity,
        }),
      ),
      isVisibleThreat
        ? e(
            "div",
            { style: { width: "200px", paddingBottom: "12px" } },
            e(ThreatTable, {
              entities: snap.entities,
              observingId: snap.observingId,
            }),
          )
        : null,
      isVisiblePdps
        ? e(
            "div",
            { style: { width: "200px", paddingBottom: "12px" } },
            e(RankMeter, {
              title: "PDPS",
              className: "PdpsMeter",
              rows: pdpsRows,
            }),
          )
        : null,
      isVisibleHitDps
        ? e(
            "div",
            { style: { width: "200px", paddingBottom: "12px" } },
            e(RankMeter, {
              title: "Hit DPS",
              className: "HitDpsMeter",
              rows: hitDpsRows,
            }),
          )
        : null,
      isVisibleCoopV1
        ? e(
            "div",
            { style: { width: "200px", paddingBottom: "12px" } },
            e(RankMeter, {
              title: "s.coop v1",
              rows: coopV1Rows,
            }),
          )
        : null,
      isVisibleCoopV2
        ? e(
            "div",
            { style: { width: "200px", paddingBottom: "12px" } },
            e(RankMeter, {
              title: "s.coop v2",
              className: "CoopContributionMeterV2",
              rows: coopV2Rows,
            }),
          )
        : null,
    ),
    e(
      "div",
      {
        style: {
          height: "30px",
          flexShrink: 0,
          flexGrow: 0,
          width: "100%",
          flexDirection: "row",
          justifyContent: "flex-end",
          display: "flex",
          gap: "8px",
        },
      },
      toggleButton("Pdps", isVisiblePdps, () =>
        setIsVisiblePdps(!isVisiblePdps),
      ),
      toggleButton("Hit DPS", isVisibleHitDps, () =>
        setIsVisibleHitDps(!isVisibleHitDps),
      ),
      toggleButton("Threat", isVisibleThreat, () =>
        setIsVisibleThreat(!isVisibleThreat),
      ),
      toggleButton("Kills", isVisibleKills, () =>
        setIsVisibleKills(!isVisibleKills),
      ),
      toggleButton("Coop V1", isVisibleCoopV1, () =>
        setIsVisibleCoopV1(!isVisibleCoopV1),
      ),
      toggleButton("Coop V2", isVisibleCoopV2, () =>
        setIsVisibleCoopV2(!isVisibleCoopV2),
      true),
    ),
  );
}
