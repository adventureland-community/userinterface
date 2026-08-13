/**
 * Time Line — player rows × elapsed time axis.
 *
 * Live camera (not Details post-combat fit-to-width):
 * - Stable px/sec so past events never compress as the fight grows.
 * - 00:00 is the left of the *content* (fight start), not the viewport.
 * - While following, “now” stays pinned to the right of the visible track;
 *   new time extends the content and the past recedes left (rAF, no snap).
 * - Scroll left unlocks follow; scroll back to the live head re-locks.
 * - New Current fight (new segment id / startedAt, observer swap onto
 *   another combat) re-locks follow and jumps to now — do not keep the
 *   old scrollLeft on a track that no longer has those events.
 * - Shift held over the track freezes follow (same as scrolling back) so
 *   a hover does not slide out; release resumes if the camera was not
 *   moved. A new fight snaps to now, then freeze again if Shift is still
 *   down. Window key listeners stay bound across fight swaps.
 * - Fight end keeps the same scale (no fit-to-width crush).
 *
 * Modes: All (AL-only overlay) | Cooldowns | Debuffs | Buffs | Gear. Details
 * has exclusive tabs only (Cooldowns / Debuffs / Enemy Cast / Enemy Spells) —
 * no combined “All”. All stacks per-kind sub-lanes when a player has ≥2
 * categories. Blocks sit at true time × pps; cooltip primary is the
 * topmost *icon* under the cursor, else the bar you entered (Details
 * `block_on_enter` per spell frame). A 5–20s duration bar must not steal
 * later icons. Nearby *other* skills on the same row whose icons are in
 * the scroll viewport cluster around that primary (~1 icon / ~2s, cap
 * ±8s). Empty row chrome greys the lane only — never a whole-lane dump.
 * Tips are lean: player + time once, dense rows with a color pill
 * (CD/Bf/Db/Dt).
 * Visual bar width uses the 5–20s clamp as a *max*. Same-skill casts
 * (attack spam, shared CD) clip to the next identical cast so bars do
 * not fuse into one highway. Deaths are thin pins; gear is icon-only.
 *
 * Bar colors: green = buff, blue = cooldown/cast, red = debuff,
 * amber = gear. Player name colors are class colors, not bars.
 * Dual axis: fight elapsed (primary) + wall clock at the same X,
 * from segment origin; meta + cooltip still show both.
 *
 * Perf: keep all events in memory (8000-cast cap) but only *mount*
 * icons/bars in the scroll viewport ± buffer (DOM virtualization).
 * Before: O(n) React nodes per tick for the whole fight (~50k DOM at
 * 10 min × 6 players × ~1.5 Hz). After: O(visible seconds × players)
 * nodes (~80–200), independent of fight length.
 */

import { getReact, e } from "../../../host/react";
import { PIXEL_TEXT } from "../../../lib/typeScale";
import type { PartyFocus } from "../../../lib/settingsFocus";
import { resolveSegment } from "../../../meters/meterEngine";
import type {
  DeathSnapshot,
  MeterResult,
  SegmentRef,
} from "../../../meters/meterTypes";
import { injectMeterChromeCss } from "../meterChromeCss";
import type {
  TimelineBlock,
  TimelineLane,
  TlFilter,
} from "./timeline/timelineModel";
import {
  TL_FOLLOW_SLACK,
  TL_PPS_BASE,
  TL_PPS_MAX,
  TL_PPS_MIN,
  TL_VIEW_BUF_PX,
  TL_VIEW_OPEN,
  TL_VIEW_SNAP_PX,
  TL_ZOOM_STEP,
} from "./timeline/timelineModel";
import { fmtClock, fmtWall } from "./timeline/timelineFormat";
import { hideBlockTip } from "./timeline/timelineTips";
import {
  buildActorMaps,
  buildLanes,
  conditionsEndedCount,
  eventsInScope,
  laneDataSig,
  rosterSigNow,
  timelineFightKey,
  timelineOriginMs,
} from "./timeline/timelineLanes";
import {
  axisTickNodes,
  buildTicks,
  estimateViewRange,
  isViewUnmeasured,
  tickStepSec,
  type TlTick,
} from "./timeline/timelineVirtualize";
import {
  TimelineEventInner,
  timelineEventEqual,
} from "./timeline/TimelineEvent";
import {
  TL_FILTER_TABS,
  timelineEmptyMsg,
  timelineGutterLane,
  timelineLegend,
  timelineLegendItems,
  timelineTrackLane,
} from "./timeline/timelineChrome";

type TimelineViewInnerProps = {
  result: MeterResult;
  segmentRef?: SegmentRef;
  partyFocus?: PartyFocus;
  rosterSig: string;
  deathCount: number;
  combatLive: boolean;
  fightKey: string;
};

function timelineInnerEqual(
  prev: TimelineViewInnerProps,
  next: TimelineViewInnerProps,
): boolean {
  if (prev.fightKey !== next.fightKey) return false;
  if (prev.segmentRef !== next.segmentRef) return false;
  if (prev.partyFocus !== next.partyFocus) return false;
  if (prev.rosterSig !== next.rosterSig) return false;
  if (prev.deathCount !== next.deathCount) return false;
  if (prev.combatLive !== next.combatLive) return false;
  const a = prev.result;
  const b = next.result;
  if (a.kind !== b.kind) return false;
  if (a.kind !== "timeline" || b.kind !== "timeline") return true;
  if (a.casts.length !== b.casts.length) return false;
  if (a.conditions.length !== b.conditions.length) return false;
  const ga = a.gearSwaps || [];
  const gb = b.gearSwaps || [];
  if (ga.length !== gb.length) return false;
  if (a.casts.length) {
    if (a.casts[0].at !== b.casts[0].at) return false;
    if (a.casts[a.casts.length - 1].at !== b.casts[b.casts.length - 1].at) {
      return false;
    }
  }
  if (a.conditions.length) {
    if (a.conditions[0].startedAt !== b.conditions[0].startedAt) return false;
    if (
      a.conditions[a.conditions.length - 1].startedAt !==
      b.conditions[b.conditions.length - 1].startedAt
    ) {
      return false;
    }
    if (
      conditionsEndedCount(a.conditions) !== conditionsEndedCount(b.conditions)
    ) {
      return false;
    }
  }
  if (ga.length && ga[ga.length - 1].at !== gb[gb.length - 1].at) return false;
  return true;
}

let TimelineEvent: any = null;
let MeterTimelineMemo: any = null;

function MeterTimelineViewInner(props: TimelineViewInnerProps): any {
  const React = getReact();
  if (!TimelineEvent) {
    TimelineEvent = React.memo(TimelineEventInner, timelineEventEqual);
  }
  // Default All — show cooldowns + buffs + debuffs together.
  const [filter, setFilter] = React.useState("all" as TlFilter);
  const [selectedId, setSelectedId] = React.useState(null as string | null);
  const [zoom, setZoom] = React.useState(1);
  const [rulerTicks, setRulerTicks] = React.useState([] as TlTick[]);
  const [viewRange, setViewRange] = React.useState(TL_VIEW_OPEN);
  const [trackFrozen, setTrackFrozen] = React.useState(false);
  const viewSnapRef = React.useRef("");
  const rootRef = React.useRef(null as HTMLDivElement | null);
  const scrollRef = React.useRef(null as HTMLDivElement | null);
  const gutterRef = React.useRef(null as HTMLDivElement | null);
  const gutterRowsRef = React.useRef(null as HTMLDivElement | null);
  const followRef = React.useRef(true);
  /** Shift-hold freeze: keep `--tl-pad` so unlocking does not jump the axis. */
  const freezePadRef = React.useRef(null as number | null);
  /** Resume follow on Shift-up only if we froze a following camera. */
  const freezeResumeRef = React.useRef(false);
  const freezeScrollLeftRef = React.useRef(0);
  const pointerOnTrackRef = React.useRef(false);
  const shiftHeldRef = React.useRef(false);
  /** After a manual scroll during this Shift hold, do not re-freeze. */
  const shiftFreezeOkRef = React.useRef(true);
  const applyingScrollRef = React.useRef(false);
  const isLiveRef = React.useRef(false);
  const startRef = React.useRef(0);
  const durSecRef = React.useRef(1);
  const tickSigRef = React.useRef("");
  const layoutCacheRef = React.useRef({
    contentW: -1,
    pad: -1,
    trackW: -1,
    pps: -1,
    clock: null as Element | null,
    wall: null as Element | null,
    scale: null as Element | null,
    clockText: "",
    wallText: "",
    scaleText: "",
  });
  const laneCacheRef = React.useRef({
    sig: "",
    lanes: [] as TimelineLane[],
  });
  const laneBlocksRef = React.useRef({} as Record<string, TimelineBlock[]>);
  const originPinRef = React.useRef(null as number | null);
  const fightKeyRef = React.useRef("");
  const pps = TL_PPS_BASE * zoom;
  const ppsRef = React.useRef(pps);
  ppsRef.current = pps;

  const tl = props.result.kind === "timeline" ? props.result : null;
  const isTimeline = !!tl;
  const seg = resolveSegment(props.segmentRef);
  const fightKey = props.fightKey;
  // New Current / observer fight: drop the old origin and re-lock follow
  // before layout, or scrollLeft stays on an empty stretch of the new track.
  if (fightKeyRef.current !== fightKey) {
    fightKeyRef.current = fightKey;
    originPinRef.current = null;
    followRef.current = true;
    freezePadRef.current = null;
    freezeResumeRef.current = false;
    shiftFreezeOkRef.current = true;
  }
  const isLive = !!(isTimeline && props.combatLive);
  const durationMs = tl ? tl.durationMs : 0;
  const casts = tl ? tl.casts : [];
  const conditions = tl ? tl.conditions : [];
  const deaths = eventsInScope(
    seg ? seg.deaths : [],
    (d: DeathSnapshot) => d.id,
    seg,
    props.partyFocus,
  );
  const gearSwaps = tl ? tl.gearSwaps || [] : [];
  const now = seg && seg.endedAt ? seg.endedAt : Date.now();
  // Skip O(n) origin scan once the fight start is pinned (same fight only).
  const rawStart = !isTimeline
    ? now
    : originPinRef.current != null
      ? originPinRef.current
      : timelineOriginMs(seg, casts, conditions, deaths, gearSwaps, now);
  if (isTimeline) {
    const hasAnchor =
      !!(seg && seg.startedAt) ||
      casts.length > 0 ||
      conditions.length > 0 ||
      deaths.length > 0 ||
      gearSwaps.length > 0;
    if (hasAnchor && originPinRef.current == null) {
      originPinRef.current = rawStart;
    }
  }
  const start =
    isTimeline && originPinRef.current != null
      ? originPinRef.current
      : rawStart;
  const durSec = isLive
    ? Math.max((now - start) / 1000, 1 / pps)
    : Math.max(durationMs / 1000, 1 / pps);

  isLiveRef.current = isLive;
  startRef.current = start;
  durSecRef.current = durSec;

  const syncGutterY = React.useCallback(() => {
    const rows = gutterRowsRef.current;
    const scroll = scrollRef.current;
    if (!rows || !scroll) return;
    const y = Math.round(scroll.scrollTop);
    rows.style.transform = y ? `translate3d(0, ${-y}px, 0)` : "";
  }, []);

  const publishViewRange = React.useCallback(() => {
    const scroll = scrollRef.current;
    if (!scroll || scroll.clientWidth <= 0) return;
    const pad = layoutCacheRef.current.pad > 0 ? layoutCacheRef.current.pad : 0;
    const left = scroll.scrollLeft - pad;
    const right = left + scroll.clientWidth;
    const snap = TL_VIEW_SNAP_PX;
    const buf = TL_VIEW_BUF_PX;
    const qLeft = Math.floor((left - buf) / snap) * snap;
    const qRight = Math.ceil((right + buf) / snap) * snap;
    const sig = `${qLeft}:${qRight}`;
    if (sig === viewSnapRef.current) return;
    viewSnapRef.current = sig;
    setViewRange({ left: qLeft, right: qRight });
  }, []);

  const applyLayout = React.useCallback(() => {
    const root = rootRef.current;
    const scroll = scrollRef.current;
    if (!root || !scroll) return;
    const ppsNow = ppsRef.current;
    const cache = layoutCacheRef.current;
    if (cache.pps !== ppsNow) {
      cache.pps = ppsNow;
      root.style.setProperty("--tl-pps", String(ppsNow));
    }
    const viewTrackW = Math.max(120, scroll.clientWidth);
    const elapsed = isLiveRef.current
      ? Math.max((Date.now() - startRef.current) / 1000, 1 / ppsNow)
      : Math.max(durSecRef.current, 1 / ppsNow);
    const contentWR = Math.ceil(elapsed * ppsNow);
    const padR =
      freezePadRef.current != null
        ? freezePadRef.current
        : followRef.current
          ? Math.max(0, viewTrackW - contentWR)
          : 0;
    const trackWR = padR + contentWR;
    if (
      cache.contentW !== contentWR ||
      cache.pad !== padR ||
      cache.trackW !== trackWR
    ) {
      cache.contentW = contentWR;
      cache.pad = padR;
      cache.trackW = trackWR;
      root.style.setProperty("--tl-pad", `${padR}px`);
      root.style.setProperty("--tl-content-w", `${contentWR}px`);
      root.style.setProperty("--tl-track-w", `${trackWR}px`);
    }
    if (!cache.clock || !root.contains(cache.clock)) {
      cache.clock = root.querySelector("[data-tl-clock]");
      cache.wall = root.querySelector("[data-tl-wall]");
      cache.scale = root.querySelector("[data-tl-scale]");
    }
    const clockText = fmtClock(elapsed);
    if (cache.clock && cache.clockText !== clockText) {
      cache.clockText = clockText;
      cache.clock.textContent = clockText;
    }
    const wallText = fmtWall(startRef.current + elapsed * 1000);
    if (cache.wall && cache.wallText !== wallText) {
      cache.wallText = wallText;
      cache.wall.textContent = wallText;
    }
    const scaleText = `${Math.round(ppsNow)} px/s`;
    if (cache.scale && cache.scaleText !== scaleText) {
      cache.scaleText = scaleText;
      cache.scale.textContent = scaleText;
    }
    // Grow the ruler only when the discrete step list changes (not every frame).
    const step = tickStepSec(ppsNow);
    const last = Math.max(0, Math.floor(elapsed + 1e-9));
    const includeEnd = !isLiveRef.current;
    const lastStep = Math.floor(last / step) * step;
    const sig = `${ppsNow}:${step}:${lastStep}:${includeEnd ? last : 0}`;
    if (sig !== tickSigRef.current) {
      tickSigRef.current = sig;
      setRulerTicks(buildTicks(ppsNow, elapsed, includeEnd));
    }
    if (followRef.current) {
      // Pin “now” to the right edge as content grows — only nudge scroll
      // when the target moves >0.5px to avoid subpixel shimmer.
      const held = applyingScrollRef.current;
      applyingScrollRef.current = true;
      const target = Math.max(0, scroll.scrollWidth - scroll.clientWidth);
      if (Math.abs(scroll.scrollLeft - target) > 0.5) {
        scroll.scrollLeft = target;
      }
      if (!held) applyingScrollRef.current = false;
    }
    syncGutterY();
    publishViewRange();
  }, [publishViewRange, syncGutterY]);
  const applyLayoutRef = React.useRef(applyLayout);
  applyLayoutRef.current = applyLayout;

  const beginModFreeze = React.useCallback(() => {
    if (!isLiveRef.current) return;
    if (!shiftFreezeOkRef.current) return;
    if (freezePadRef.current != null) return;
    const scroll = scrollRef.current;
    if (!scroll) return;
    freezeScrollLeftRef.current = scroll.scrollLeft;
    freezeResumeRef.current = followRef.current;
    freezePadRef.current =
      layoutCacheRef.current.pad >= 0 ? layoutCacheRef.current.pad : 0;
    followRef.current = false;
    setTrackFrozen(true);
  }, []);

  const endModFreeze = React.useCallback(() => {
    const scroll = scrollRef.current;
    const hadFreeze = freezePadRef.current != null;
    const wantResume = freezeResumeRef.current;
    const scrolled =
      !!scroll &&
      Math.abs(scroll.scrollLeft - freezeScrollLeftRef.current) >
        TL_FOLLOW_SLACK;
    freezePadRef.current = null;
    freezeResumeRef.current = false;
    setTrackFrozen(false);
    if (!hadFreeze && !wantResume) return;
    if (wantResume && !scrolled) {
      followRef.current = true;
    }
    applyLayoutRef.current();
  }, []);

  React.useEffect(() => {
    injectMeterChromeCss();
    return () => hideBlockTip();
  }, []);

  React.useLayoutEffect(() => {
    applyingScrollRef.current = true;
    followRef.current = true;
    freezePadRef.current = null;
    freezeResumeRef.current = false;
    setTrackFrozen(false);
    layoutCacheRef.current = {
      contentW: -1,
      pad: -1,
      trackW: -1,
      pps: -1,
      clock: null,
      wall: null,
      scale: null,
      clockText: "",
      wallText: "",
      scaleText: "",
    };
    tickSigRef.current = "";
    viewSnapRef.current = "";
    applyLayoutRef.current();
    // Snap to the new now, then freeze there if Shift is still held so the
    // new fight does not keep sliding under the cursor.
    if (shiftHeldRef.current && isLiveRef.current) {
      shiftFreezeOkRef.current = true;
      beginModFreeze();
    }
    applyingScrollRef.current = false;
  }, [beginModFreeze, fightKey]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      syncGutterY();
      publishViewRange();
      if (applyingScrollRef.current) return;
      if (freezePadRef.current != null) {
        const maxNow = Math.max(0, el.scrollWidth - el.clientWidth);
        // Pin-to-now after a fight jump is not a user camera move.
        if (
          maxNow > TL_FOLLOW_SLACK &&
          el.scrollLeft < maxNow - TL_FOLLOW_SLACK
        ) {
          freezeResumeRef.current = false;
          freezePadRef.current = null;
          shiftFreezeOkRef.current = false;
          setTrackFrozen(false);
        } else {
          return;
        }
      }
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      if (max <= TL_FOLLOW_SLACK) {
        followRef.current = true;
        return;
      }
      followRef.current = el.scrollLeft >= max - TL_FOLLOW_SLACK;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isTimeline, publishViewRange, syncGutterY]);

  React.useEffect(() => {
    const gutter = gutterRef.current;
    const scroll = scrollRef.current;
    if (!gutter || !scroll) return;
    const onWheel = (ev: WheelEvent) => {
      scroll.scrollTop += ev.deltaY;
      scroll.scrollLeft += ev.deltaX;
      ev.preventDefault();
    };
    gutter.addEventListener("wheel", onWheel, { passive: false });
    return () => gutter.removeEventListener("wheel", onWheel);
  }, [isTimeline]);

  React.useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const onWheel = (ev: WheelEvent) => {
      if (!ev.ctrlKey) return;
      ev.preventDefault();
      const factor = ev.deltaY < 0 ? TL_ZOOM_STEP : 1 / TL_ZOOM_STEP;
      setZoom((z) => {
        const minZ = TL_PPS_MIN / TL_PPS_BASE;
        const maxZ = TL_PPS_MAX / TL_PPS_BASE;
        return Math.max(minZ, Math.min(maxZ, z * factor));
      });
    };
    scroll.addEventListener("wheel", onWheel, { passive: false });
    return () => scroll.removeEventListener("wheel", onWheel);
  }, [isTimeline]);

  React.useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key !== "Shift") return;
      shiftHeldRef.current = true;
      if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
      // After a fight jump, Shift is still down so the next event is a
      // repeat — still re-arm freeze (only skip if already frozen).
      if (ev.repeat && freezePadRef.current != null) return;
      shiftFreezeOkRef.current = true;
      const scroll = scrollRef.current;
      if (scroll && scroll.matches(":hover")) pointerOnTrackRef.current = true;
      if (!pointerOnTrackRef.current) return;
      beginModFreeze();
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      if (ev.key !== "Shift") return;
      shiftHeldRef.current = false;
      shiftFreezeOkRef.current = true;
      endModFreeze();
    };
    const onBlur = () => {
      shiftHeldRef.current = false;
      endModFreeze();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [beginModFreeze, endModFreeze]);

  React.useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const onPointerEnter = () => {
      pointerOnTrackRef.current = true;
      if (shiftHeldRef.current) beginModFreeze();
    };
    const onPointerMove = (ev: PointerEvent) => {
      pointerOnTrackRef.current = true;
      if (ev.shiftKey) shiftHeldRef.current = true;
      if (ev.shiftKey && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
        beginModFreeze();
      }
    };
    const onPointerLeave = () => {
      pointerOnTrackRef.current = false;
    };
    scroll.addEventListener("pointerenter", onPointerEnter);
    scroll.addEventListener("pointermove", onPointerMove);
    scroll.addEventListener("pointerleave", onPointerLeave);
    return () => {
      scroll.removeEventListener("pointerenter", onPointerEnter);
      scroll.removeEventListener("pointermove", onPointerMove);
      scroll.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [beginModFreeze, isTimeline]);

  React.useLayoutEffect(() => {
    applyLayout();
    const scroll = scrollRef.current;
    const ro =
      scroll && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => applyLayout())
        : null;
    if (scroll && ro) ro.observe(scroll);
    if (!isLive) return () => ro && ro.disconnect();
    let raf = 0;
    const loop = () => {
      if (!(typeof document !== "undefined" && document.hidden)) {
        applyLayout();
      }
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => {
      window.cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
    };
  }, [applyLayout, isLive, isTimeline, start, zoom, fightKey]);

  if (!isTimeline) {
    return e(
      "div",
      { style: { padding: "8px", color: "#888", ...PIXEL_TEXT } },
      "No timeline",
    );
  }

  const { names, ctypes } = buildActorMaps(props.segmentRef);
  const nextLaneSig = isTimeline
    ? laneDataSig(
        casts,
        conditions,
        gearSwaps,
        filter,
        start,
        props.rosterSig,
        props.deathCount,
      )
    : "";
  if (isTimeline && laneCacheRef.current.sig !== nextLaneSig) {
    laneCacheRef.current = {
      sig: nextLaneSig,
      lanes: buildLanes(
        casts,
        conditions,
        deaths,
        gearSwaps,
        start,
        filter,
        names,
        ctypes,
        seg,
        props.partyFocus,
      ),
    };
  }
  const lanes = isTimeline ? laneCacheRef.current.lanes : [];
  const laneBlocksMap: Record<string, TimelineBlock[]> = {};
  for (let i = 0; i < lanes.length; i++) {
    laneBlocksMap[lanes[i].id] = lanes[i].blocks;
  }
  laneBlocksRef.current = laneBlocksMap;
  // Prefer rAF-synced ruler ticks; fall back for first paint / ended fights.
  const ticks =
    rulerTicks.length > 0 ? rulerTicks : buildTicks(pps, durSec, !isLive);
  const renderRange = isViewUnmeasured(viewRange)
    ? estimateViewRange(durSec, pps, followRef.current)
    : viewRange;

  const selectLane = (laneId: string) => {
    setSelectedId(selectedId === laneId ? null : laneId);
  };

  const gutterLane = (lane: TimelineLane, li: number) =>
    timelineGutterLane(lane, li, selectedId, selectLane);

  const trackLane = (lane: TimelineLane, li: number) =>
    timelineTrackLane(lane, li, {
      selectedId,
      selectLane,
      renderRange,
      pps,
      ticks,
      TimelineEvent,
      laneBlocksRef,
      start,
    });

  const filterTabs = TL_FILTER_TABS;

  const legendItems = timelineLegendItems(filter);

  const emptyMsg = timelineEmptyMsg(filter);

  return e(
    "div",
    {
      className: "ecu-meter-timeline" + (trackFrozen ? " is-tl-frozen" : ""),
      ref: rootRef,
      style: { ...PIXEL_TEXT },
    },
    e(
      "div",
      { className: "ecu-meter-timeline-hd" },
      e("div", { className: "ecu-meter-timeline-mark" }, "Time Line"),
      e(
        "div",
        { className: "ecu-meter-timeline-tools" },
        ...filterTabs.map((f) =>
          e(
            "button",
            {
              key: f.id,
              type: "button",
              className:
                "ecu-meter-tl-mode" + (filter === f.id ? " is-active" : ""),
              onClick: () => setFilter(f.id),
            },
            f.label,
          ),
        ),
        e(
          "span",
          { className: "ecu-meter-timeline-meta" },
          e(
            "span",
            {
              "data-tl-clock": "",
              title: "Fight elapsed (from pull start)",
            },
            fmtClock(durSec),
          ),
          " · ",
          e(
            "span",
            {
              "data-tl-wall": "",
              title: "Wall-clock time",
            },
            fmtWall(start + durSec * 1000),
          ),
          e("span", { "data-tl-scale": "" }, `${Math.round(pps)} px/s`),
          isLive ? " · in combat" : "",
          deaths.length ? ` · ${deaths.length} deaths` : "",
          ` · ${lanes.length} players`,
          " · Ctrl+wheel zoom",
          isLive ? " · Shift hold freeze" : "",
        ),
      ),
      timelineLegend(legendItems),
    ),
    e(
      "div",
      { className: "ecu-meter-tl-body" },
      e(
        "div",
        { className: "ecu-meter-tl-gutter", ref: gutterRef },
        e(
          "div",
          { className: "ecu-meter-tl-gutter-ruler", "aria-hidden": true },
          e(
            "span",
            { className: "ecu-meter-tl-gutter-axis-lab is-fight" },
            "Fight",
          ),
          e(
            "span",
            { className: "ecu-meter-tl-gutter-axis-lab is-clock" },
            "Clock",
          ),
        ),
        e(
          "div",
          { className: "ecu-meter-tl-gutter-rows", ref: gutterRowsRef },
          lanes.length === 0
            ? e("div", { className: "ecu-meter-tl-gutter-empty" })
            : lanes.map(gutterLane),
        ),
      ),
      e(
        "div",
        { className: "ecu-meter-tl-scroll", ref: scrollRef },
        e(
          "div",
          { className: "ecu-meter-tl-canvas" },
          // Live playhead at true “now” X (right edge while follow-pinned).
          // Omit post-combat — end-of-content would read as a permanent
          // gold right-edge chrome bar / fake scrollbar.
          isLive
            ? e("div", { className: "ecu-meter-tl-now", "aria-hidden": true })
            : null,
          e(
            "div",
            { className: "ecu-meter-tl-ruler" },
            e(
              "div",
              { className: "ecu-meter-tl-ruler-track" },
              e(
                "div",
                { className: "ecu-meter-tl-axis is-fight" },
                ...axisTickNodes(
                  ticks,
                  "fight",
                  start,
                  renderRange.left,
                  renderRange.right,
                ),
              ),
              e(
                "div",
                { className: "ecu-meter-tl-axis is-wall" },
                ...axisTickNodes(
                  ticks,
                  "wall",
                  start,
                  renderRange.left,
                  renderRange.right,
                ),
              ),
            ),
          ),
          lanes.length === 0
            ? e("div", { className: "ecu-meter-tl-empty" }, emptyMsg)
            : e(
                "div",
                { className: "ecu-meter-tl-lanes" },
                ...lanes.map(trackLane),
              ),
        ),
      ),
    ),
  );
}

export function MeterTimelineView(props: {
  result: MeterResult;
  segmentRef?: SegmentRef;
  partyFocus?: PartyFocus;
}): any {
  const React = getReact();
  if (!MeterTimelineMemo) {
    MeterTimelineMemo = React.memo(MeterTimelineViewInner, timelineInnerEqual);
  }
  const seg = resolveSegment(props.segmentRef);
  return e(MeterTimelineMemo, {
    result: props.result,
    segmentRef: props.segmentRef,
    partyFocus: props.partyFocus,
    rosterSig: rosterSigNow(),
    deathCount: seg ? seg.deaths.length : 0,
    combatLive: !!(seg && seg.endedAt == null),
    fightKey: timelineFightKey(props.segmentRef, seg),
  });
}
