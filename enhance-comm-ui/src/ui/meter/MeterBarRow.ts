/**
 * Imperative ranked bar list — one native scroller.
 * Always-show-me: pinned clone below the list when self is off-screen.
 */

import { getReact, e } from "../../host/react";
import type { PartyFocus } from "../../lib/settingsFocus";
import { classColors } from "../../lib/colors";
import {
  patchRankedRows,
  renderRankedRows,
  type BarPoolRow,
  type BarPoolOpts,
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
import { METER_BAR_ROW_H } from "../../meters/meterBarViewport";

function toPoolRows(
  rows: RankedRow[],
  highlightId?: string,
  selectedRowId?: string,
  youId?: string,
): BarPoolRow[] {
  return rows.map((r, i) => ({
    ...r,
    you: r.you || (!!youId && r.id === youId) || r.id === highlightId,
    selected: selectedRowId ? r.id === selectedRowId : !!r.selected,
    color: classColors[r.ctype || ""] || undefined,
    rank: r.rank != null ? r.rank : i + 1,
  }));
}

function rowInScrollView(scrollEl: HTMLElement, rowEl: HTMLElement): boolean {
  const sr = scrollEl.getBoundingClientRect();
  const rr = rowEl.getBoundingClientRect();
  return rr.bottom > sr.top + 1 && rr.top < sr.bottom - 1;
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
  /** Per-panel override; undefined follows global setting. */
  alwaysShowSelf?: boolean;
  onRowClick?: (row: RankedRow, ev: any) => void;
  onRowContextMenu?: (row: RankedRow, ev: any) => void;
};

export function MeterBarsView(props: MeterBarsViewProps): any {
  const React = getReact();
  const hostRef = React.useRef(null as HTMLDivElement | null);
  const scrollRef = React.useRef(null as HTMLDivElement | null);
  const pinRef = React.useRef(null as HTMLDivElement | null);
  const propsRef = React.useRef(props);
  const selfRowRef = React.useRef(null as BarPoolRow | null);
  const barOptsRef = React.useRef(null as BarPoolOpts | null);
  propsRef.current = props;

  const syncPin = React.useCallback(() => {
    const scrollEl = scrollRef.current;
    const pinEl = pinRef.current;
    if (!scrollEl || !pinEl) return;
    const p = propsRef.current;
    const showSelf =
      p.alwaysShowSelf != null
        ? p.alwaysShowSelf
        : getSettings().meterAlwaysShowSelf !== false;
    const selfRow = selfRowRef.current;
    const opts = barOptsRef.current;
    if (!showSelf || !selfRow || !opts) {
      pinEl.hidden = true;
      pinEl.replaceChildren();
      delete (pinEl as any)._barOpts;
      return;
    }
    const youEl = scrollEl.querySelector(
      ".ecu-meter-row.you",
    ) as HTMLElement | null;
    const needPin = !youEl || !rowInScrollView(scrollEl, youEl);
    if (!needPin) {
      pinEl.hidden = true;
      return;
    }
    pinEl.hidden = false;
    if (!(pinEl as any)._barOpts) {
      renderRankedRows(pinEl, [selfRow], opts);
    } else {
      patchRankedRows(pinEl, [selfRow], opts);
    }
  }, []);

  const paint = React.useCallback(
    (full: boolean) => {
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
        selfRowRef.current = null;
        barOptsRef.current = null;
        syncPin();
        return;
      }
      const followLive = p.live === true;
      const youId = followLive ? getYouId() : undefined;
      const pinId = followLive ? youId || p.highlightId : p.highlightId;
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
      const wantTotal = app.showTotalBar && isPlayerRoot;
      const rows = toPoolRows(sorted, pinId, p.selectedRowId, youId);
      if (wantTotal && rows.length) {
        const topBarMax =
          sorted[0]?.barMax || (ratePrimary ? totalRate : totalVal) || 1;
        rows.unshift({
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
      let selfRow: BarPoolRow | null = null;
      if (pinId) {
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].id === pinId) {
            selfRow = rows[i];
            break;
          }
        }
      }
      selfRowRef.current = selfRow;
      const metric =
        p.metric ||
        (p.query.kind === "players"
          ? p.query.metric
          : p.query.kind === "abilities" ||
              p.query.kind === "ability_targets" ||
              p.query.kind === "targets"
            ? p.query.metric
            : undefined);
      const wantSkillIcons =
        p.query.kind === "abilities" ||
        p.query.kind === "ability_targets" ||
        p.query.kind === "targets" ||
        p.query.kind === "taken_by_spell" ||
        p.query.kind === "enemy_damage";
      const opts: BarPoolOpts = {
        rank: app.showRankNumbers,
        pct: true,
        metric,
        icons: wantSkillIcons,
        classIcons: !!app.showSpecIcons,
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
      barOptsRef.current = opts;
      if (full || !(listHost as any)._barOpts) {
        renderRankedRows(listHost, rows, opts);
      } else {
        patchRankedRows(listHost, rows, opts);
      }
      syncPin();
    },
    [syncPin],
  );

  React.useEffect(() => {
    injectMeterChromeCss();
    paint(true);
    const p = propsRef.current;
    const live =
      p.live === true &&
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
    const scrollEl = scrollRef.current;
    const onScroll = () => syncPin();
    if (scrollEl) scrollEl.addEventListener("scroll", onScroll, { passive: true });
    let ro: ResizeObserver | null = null;
    if (scrollEl && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => syncPin());
      ro.observe(scrollEl);
    }
    if (!live) {
      return () => {
        offAppearance();
        if (scrollEl) scrollEl.removeEventListener("scroll", onScroll);
        if (ro) ro.disconnect();
      };
    }
    const offTick = subscribeMeterTick(() => {
      if (!hostRef.current || !hostRef.current.isConnected) return;
      if (propsRef.current.live !== true) return;
      paint(false);
    });
    return () => {
      offAppearance();
      offTick();
      if (scrollEl) scrollEl.removeEventListener("scroll", onScroll);
      if (ro) ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    paint,
    syncPin,
    props.live,
    props.segmentRef,
    props.partyFocus,
    props.highlightId,
    props.selectedRowId,
    props.alwaysShowSelf,
    JSON.stringify(props.query),
  ]);

  return e(
    "div",
    {
      ref: hostRef,
      className: "ecu-meter-bar-host",
      style: {
        fontSize: `${Math.round(getMeterAppearance().windowScale * 100)}%`,
        ["--meter-bar-row-h" as string]: `${METER_BAR_ROW_H}px`,
      },
    },
    e("div", {
      ref: scrollRef,
      className: "ecu-meter-bar-scroll ecu-meter-bar-list",
    }),
    e("div", {
      ref: pinRef,
      className: "ecu-meter-bar-pin ecu-meter-bar-list",
      hidden: true,
    }),
  );
}
