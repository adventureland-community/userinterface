/**
 * Imperative ranked bar list view — pool + patch + rich tooltips.
 */

import { getReact, e } from "../../host/react";
import type { PartyFocus } from "../../lib/settingsFocus";
import { classColors } from "../../lib/colors";
import {
  patchRankedRows,
  renderRankedRows,
  type BarPoolRow,
} from "../../meters/meterBarPool";
import { getYouId } from "../../meters/meterEngine";
import { runMeterQuery } from "../../meters/meterQuery";
import { subscribeMeterTick } from "../../meters/meterUiTick";
import type {
  MeterQuery,
  RankedRow,
  SegmentRef,
} from "../../meters/meterTypes";
import {
  maxRowsForFrameHeight,
  pinAlwaysShowSelf,
} from "../../meters/meterWindowGroup";
import {
  abilityBarTooltipHtml,
  hideMeterTooltip,
  playerBarTooltipHtml,
  showMeterTooltip,
  showMeterTooltipLive,
  targetBarTooltipHtml,
} from "../../meters/meterTooltip";
import { injectMeterChromeCss } from "./meterChromeCss";
import { getSettings } from "../../lib/settings";
import {
  getMeterAppearance,
  subscribeMeterAppearance,
} from "../../meters/meterAppearance";
import { meterTestBarResult } from "../../meters/meterTestBars";

function toPoolRows(
  rows: RankedRow[],
  highlightId?: string,
  selectedRowId?: string,
): BarPoolRow[] {
  const you = getYouId();
  return rows.map((r) => ({
    ...r,
    you: r.you || (!!you && r.id === you) || r.id === highlightId,
    selected: selectedRowId ? r.id === selectedRowId : !!r.selected,
    color: classColors[r.ctype || ""] || undefined,
    rank: r.rank,
  }));
}

export type MeterBarsViewProps = {
  query: MeterQuery;
  segmentRef: SegmentRef;
  partyFocus?: PartyFocus;
  entities?: any[];
  highlightId?: string;
  /** Highlight a spell/row as selected (Inspector). */
  selectedRowId?: string;
  metric?: string;
  live?: boolean;
  /** Outer frame height — used for Always-show-me row cap. */
  frameH?: number;
  /** Per-panel override; undefined follows global setting. */
  alwaysShowSelf?: boolean;
  onRowClick?: (row: RankedRow, ev: any) => void;
  onRowContextMenu?: (row: RankedRow, ev: any) => void;
};

export function MeterBarsView(props: MeterBarsViewProps): any {
  const React = getReact();
  const hostRef = React.useRef(null as HTMLDivElement | null);
  const scrollRef = React.useRef(null as HTMLDivElement | null);
  const propsRef = React.useRef(props);
  const scrollOffRef = React.useRef(0);
  propsRef.current = props;

  const paint = React.useCallback((full: boolean) => {
    const host = hostRef.current;
    const scrollEl = scrollRef.current;
    const listHost = scrollEl || host;
    if (!listHost) return;
    const p = propsRef.current;
    const app = getMeterAppearance();
    const useTestBars =
      app.testBars &&
      (p.query.kind === "players" ||
        p.query.kind === "channel" ||
        p.query.kind === "avoidance");
    let result = runMeterQuery(p.query, {
      segmentRef: p.segmentRef,
      partyFocus: p.partyFocus,
      entities: p.entities,
      now: Date.now(),
    });

    if (useTestBars && p.query.kind === "players") {
      result = meterTestBarResult();
    } else if (useTestBars && result.kind === "ranked" && !result.rows.length) {
      result = meterTestBarResult();
    }

    if (result.kind !== "ranked" || !result.rows.length) {
      listHost.innerHTML =
        '<div style="padding:8px;color:#888;font-size:12px">No data</div>';
      delete (listHost as any)._barOpts;
      return;
    }
    const youId = getYouId();
    const showSelf =
      p.alwaysShowSelf != null
        ? p.alwaysShowSelf
        : getSettings().meterAlwaysShowSelf !== false;
    const isPlayerRoot =
      p.query.kind === "players" ||
      p.query.kind === "avoidance" ||
      p.query.kind === "rolling" ||
      p.query.kind === "snapshot" ||
      p.query.kind === "channel";
    const rankedAmt = (r: RankedRow) =>
      r.barValue != null ? r.barValue : r.value;
    const sorted = result.rows
      .slice()
      .sort((a, b) => rankedAmt(b) - rankedAmt(a));
    let totalVal = 0;
    let totalRate = 0;
    let ratePrimary = false;
    for (let i = 0; i < sorted.length; i++) {
      totalVal += sorted[i].value;
      if (sorted[i].rate != null) totalRate += sorted[i].rate!;
      if (sorted[i].primary === "rate") ratePrimary = true;
    }
    const capped = isPlayerRoot
      ? pinAlwaysShowSelf(
          sorted,
          maxRowsForFrameHeight(p.frameH) + scrollOffRef.current,
          youId || p.highlightId,
          showSelf,
        )
      : sorted.slice(
          scrollOffRef.current,
          scrollOffRef.current + maxRowsForFrameHeight(p.frameH),
        );
    const rows = toPoolRows(capped, p.highlightId, p.selectedRowId);
    if (app.showTotalBar && isPlayerRoot && rows.length) {
      const topBarMax =
        sorted[0]?.barMax || (ratePrimary ? totalRate : totalVal) || 1;
      rows.push({
        id: "__total__",
        name: "Total",
        value: totalVal,
        rate: totalRate || null,
        barValue: ratePrimary ? totalRate : totalVal,
        primary: ratePrimary ? "rate" : "total",
        pct: 1,
        barMax: topBarMax,
        label: "Total",
        kind: "player",
        color: "#888",
      });
    }
    const metric =
      p.metric ||
      (p.query.kind === "players"
        ? p.query.metric
        : p.query.kind === "abilities" ||
            p.query.kind === "ability_targets" ||
            p.query.kind === "targets"
          ? p.query.metric
          : undefined);
    const opts = {
      rank: app.showRankNumbers,
      pct: true,
      metric,
      icons: true,
      classIcons: app.showSpecIcons,
      animate: app.animateBars,
      detailsFormat: true,
      onClick: p.onRowClick
        ? (ev: MouseEvent, row: BarPoolRow) =>
            p.onRowClick!(row as RankedRow, ev)
        : undefined,
      onContextMenu: p.onRowContextMenu
        ? (ev: MouseEvent, row: BarPoolRow) =>
            p.onRowContextMenu!(row as RankedRow, ev)
        : undefined,
      tooltipHtml: (ev: MouseEvent, row: BarPoolRow) => {
        if (row.kind === "ability") {
          showMeterTooltip(ev, abilityBarTooltipHtml(row as RankedRow));
          return;
        }
        if (row.kind === "target") {
          showMeterTooltip(ev, targetBarTooltipHtml(row as RankedRow));
          return;
        }
        // Hover preview only — click still opens full Inspector (MeterPanelShell).
        showMeterTooltipLive(ev, (mods) =>
          playerBarTooltipHtml(
            {
              row: row as RankedRow,
              metric,
              segmentRef: p.segmentRef,
              partyFocus: p.partyFocus,
              entities: p.entities,
            },
            mods,
          ),
        );
      },
      onTooltipHide: hideMeterTooltip,
    };
    if (full || !(listHost as any)._barOpts) {
      renderRankedRows(listHost, rows, opts);
    } else {
      patchRankedRows(listHost, rows, opts);
    }
  }, []);

  React.useEffect(() => {
    injectMeterChromeCss();
    paint(true);
    const p = propsRef.current;
    const live =
      p.live !== false &&
      p.segmentRef === "current" &&
      (p.query.kind === "players" ||
        p.query.kind === "channel" ||
        p.query.kind === "avoidance" ||
        p.query.kind === "rolling" ||
        p.query.kind === "realtime" ||
        p.query.kind === "snapshot" ||
        p.query.kind === "abilities" ||
        p.query.kind === "ability_targets" ||
        p.query.kind === "targets");
    const offAppearance = subscribeMeterAppearance(() => paint(true));
    if (!live) {
      return offAppearance;
    }
    const offTick = subscribeMeterTick(() => {
      if (!hostRef.current || !hostRef.current.isConnected) return;
      if (propsRef.current.segmentRef !== "current") return;
      paint(false);
    });
    return () => {
      offAppearance();
      offTick();
    };
    // Rebind when query shape / segment / focus changes (not every tick).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    paint,
    props.live,
    props.segmentRef,
    props.partyFocus,
    props.highlightId,
    props.selectedRowId,
    JSON.stringify(props.query),
  ]);

  return e(
    "div",
    {
      ref: hostRef,
      className: "ecu-meter-bar-host",
      style: {
        fontSize: `${Math.round(getMeterAppearance().windowScale * 100)}%`,
      },
      onWheel: (ev: any) => {
        if (!scrollRef.current) return;
        ev.preventDefault();
        scrollOffRef.current = Math.max(
          0,
          scrollOffRef.current + (ev.deltaY > 0 ? 1 : -1),
        );
        paint(false);
      },
    },
    e("div", {
      ref: scrollRef,
      className: "ecu-meter-bar-scroll ecu-meter-bar-list",
    }),
  );
}

/** Legacy single-row export kept for any external import. */
export function MeterBarRow(): any {
  return null;
}
