/** Time Line cluster tips + track. */
export const METER_TIMELINE_CLUSTER_CSS = `
/* Time Line cooltip: primary = icon under cursor (else bar), + nearby cluster.
   Compact chrome shared by gear + CD/buff/debuff/death. */
.ecu-meter-tt.is-tl-cluster,
.ecu-meter-tt.is-gear-tip,
.ecu-meter-tt.is-tl-ev-tip {
  padding: 10px 12px;
  line-height: 1.3;
}
.ecu-meter-tt.is-gear-tip {
  min-width: 360px;
  max-width: 520px;
}
.ecu-meter-tt.is-tl-ev-tip {
  min-width: 260px;
  max-width: 380px;
}
.ecu-meter-tt-tl-cat {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #c9b878;
  margin-bottom: 2px;
}
.ecu-meter-tt-tl-cat.is-gear {
  color: #e8b84a;
  margin-bottom: 4px;
}
.ecu-meter-tt-cluster-meta,
.ecu-meter-tt-gear-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  font-size: var(--meter-tt-body);
}
.ecu-meter-tt-cluster-who,
.ecu-meter-tt-gear-who {
  color: #fff;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-meter-tt-cluster-when,
.ecu-meter-tt-gear-when {
  flex: 0 0 auto;
  color: #c8d0dc;
  white-space: nowrap;
  font-size: var(--meter-tt-sec);
}
.ecu-meter-tt-gear {
  --meter-tt-icon: 40px;
}
.ecu-meter-tt-gear-list,
.ecu-meter-tt-evs-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.ecu-meter-tt-gear-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: 8px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}
.ecu-meter-tt-gear-row:first-child {
  border-top: none;
  padding-top: 2px;
}
.ecu-meter-tt-gear-row.is-muted,
.ecu-meter-tt-ev-row.is-muted {
  opacity: 0.78;
}
.ecu-meter-tt-gear-row-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}
.ecu-meter-tt-gear-slot {
  font-size: 11px;
  letter-spacing: 0.04em;
  color: #e8b84a;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ecu-meter-tt-gear-swap {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18px minmax(0, 1fr);
  align-items: center;
  column-gap: 8px;
  min-width: 0;
}
.ecu-meter-tt-gear-side {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.ecu-meter-tt-gear-side.is-empty {
  opacity: 0.72;
}
.ecu-meter-tt-gear-ico {
  flex: 0 0 auto;
  line-height: 0;
}
.ecu-meter-tt-gear-ico .ecu-item-instance,
.ecu-meter-tt-gear-ico .ecu-item-instance > * {
  margin: 0 !important;
  vertical-align: top;
}
.ecu-meter-tt-gear-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.ecu-meter-tt-gear-name {
  color: #fff;
  font-size: var(--meter-tt-sec);
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ecu-meter-tt-gear-key {
  color: #8b9bb4;
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ecu-meter-tt-gear-item {
  color: #fff;
  font-size: var(--meter-tt-sec);
  line-height: 1.2;
  white-space: nowrap;
}
.ecu-meter-tt-gear-arrow {
  flex: 0 0 auto;
  color: #e8b84a;
  font-size: 15px;
  line-height: 1;
  text-align: center;
}
.ecu-meter-tt-gear-row-at {
  font-size: 11px;
  color: #8b9bb4;
  flex: 0 0 auto;
  white-space: nowrap;
}
.ecu-meter-tt-gear-empty {
  display: inline-block;
  box-sizing: border-box;
  border: 1px dashed rgba(255, 255, 255, 0.28);
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.25);
  vertical-align: middle;
  flex: 0 0 auto;
}
.ecu-meter-tt-gear-row.is-muted .ecu-meter-tt-gear-slot,
.ecu-meter-tt-gear-row.is-muted .ecu-meter-tt-gear-arrow {
  color: #c9b878;
}
/* Dense CD / buff / debuff / death rows — pill + icon + name, not stacked cards. */
.ecu-meter-tt-ev-row {
  display: grid;
  grid-template-columns: 22px var(--meter-tt-icon) minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 6px;
  padding: 4px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}
.ecu-meter-tt-ev-row:first-child {
  border-top: none;
  padding-top: 2px;
}
.ecu-meter-tt-ev-row.is-primary {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
  margin: 0 -4px;
  padding-left: 4px;
  padding-right: 4px;
}
.ecu-meter-tt-ev-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 14px;
  border-radius: 2px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 1;
  text-transform: uppercase;
  flex: 0 0 auto;
}
.ecu-meter-tt-ev-pill.is-cd {
  background: rgba(60, 180, 255, 0.88);
  color: #061018;
}
.ecu-meter-tt-ev-pill.is-buff {
  background: rgba(48, 196, 72, 0.88);
  color: #061008;
}
.ecu-meter-tt-ev-pill.is-debuff {
  background: rgba(230, 72, 72, 0.92);
  color: #140808;
}
.ecu-meter-tt-ev-pill.is-death {
  background: rgba(210, 210, 220, 0.78);
  color: #1a1214;
}
.ecu-meter-tt-ev-pill.is-gear {
  background: rgba(232, 184, 74, 0.9);
  color: #1a1408;
}
.ecu-meter-tt-ev-main {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}
.ecu-meter-tt-ev-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  color: #fff;
  font-size: var(--meter-tt-sec);
}
.ecu-meter-tt-ev-elapsed {
  flex: 0 0 auto;
  color: #8b9bb4;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-tt-ev-at {
  flex: 0 0 auto;
  color: #8b9bb4;
  font-size: 11px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-tt-div {
  height: 1px;
  margin: 10px 0;
  background: rgba(255, 255, 255, 0.12);
}
.ecu-meter-tt-sec {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 4px 0 6px;
  padding: var(--meter-tt-row-pad-y) var(--meter-tt-row-pad-x);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 2px;
}
.ecu-meter-tt-sec.is-max {
  background: rgba(201, 162, 39, 0.18);
}
.ecu-meter-tt-sec-l {
  display: inline-flex;
  align-items: center;
  gap: var(--meter-tt-gap);
  min-width: 0;
}
.ecu-meter-tt-sec-ico {
  font-size: var(--meter-tt-sec);
  line-height: 1;
  opacity: 0.9;
}
.ecu-meter-tt-sec-t {
  color: #ffe08a;
  font-size: var(--meter-tt-sec);
  font-weight: normal;
}
.ecu-meter-tt-kbd {
  flex-shrink: 0;
  font-size: var(--meter-tt-kbd);
  color: #a8b0bc;
  background: rgba(80, 88, 100, 0.55);
  border: 1px solid rgba(160, 168, 180, 0.35);
  border-radius: 999px;
  padding: 3px 10px;
  letter-spacing: 0.02em;
}
.ecu-meter-tt-sec.is-max .ecu-meter-tt-kbd {
  color: #1a1a1a;
  background: #ffe08a;
  border-color: #c9a227;
}
.ecu-meter-tt-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: var(--meter-tt-row-pad-y) var(--meter-tt-row-pad-x);
  border-radius: 1px;
  font-size: var(--meter-tt-body);
}
.ecu-meter-tt-row.is-alt {
  background: rgba(255, 255, 255, 0.045);
}
.ecu-meter-tt-row-l {
  display: inline-flex;
  align-items: center;
  gap: var(--meter-tt-gap);
  min-width: 0;
  flex: 1;
}
.ecu-meter-tt-name {
  color: #f2f4f8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ecu-meter-tt-amt {
  flex-shrink: 0;
  color: #ffe08a;
  font-weight: normal;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.ecu-meter-tt-empty {
  padding: var(--meter-tt-row-pad-y) var(--meter-tt-row-pad-x);
  color: #7a8494;
  font-size: var(--meter-tt-sec);
}
.ecu-meter-tt-foot {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: #8b9bb4;
  font-size: var(--meter-tt-foot);
}
`;

/** Time Line track, legend, back-compat aliases. */
export const METER_TIMELINE_TRACK_CSS = `
/* Legacy encounter nested-tab chrome — Summary panes live in meterViewsCss. */
.ecu-meter-encounter-tabs {
  display: none;
}
.ecu-meter-timeline {
  /* Details CONST_ROW_HEIGHT=18 / icon~14; AL sprites need more room. */
  --tl-row: 36px;
  --tl-icon: 28px;
  /* All multi-lane: ~TL_SUB_ROW (26) minus padding — keep readable. */
  --tl-icon-sub: 20px;
  --tl-class: 20px;
  --tl-name-w: 132px;
  --tl-ruler-h: 38px;
  --tl-pad: 0px;
  --tl-content-w: 100%;
  --tl-track-w: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding: 0;
  font-size: 14px;
  line-height: 1.2;
  background: #101218;
  color: #cfd8dc;
  cursor: default;
}
.ecu-meter-timeline-hd {
  flex-shrink: 0;
  padding: 8px 10px 6px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.55);
  background: linear-gradient(180deg, rgba(36, 30, 28, 0.95) 0%, rgba(18, 16, 18, 0.98) 100%);
}
.ecu-meter-timeline-mark {
  font-size: 14px;
  letter-spacing: 0.03em;
  color: rgb(227, 186, 4);
  margin-bottom: 6px;
  user-select: none;
}
.ecu-meter-timeline-tools {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}
.ecu-meter-tl-mode {
  cursor: pointer;
  border: 1px solid rgba(80, 70, 55, 0.7);
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.35);
  color: #b0a890;
  font-size: 13px;
  padding: 4px 10px;
}
.ecu-meter-tl-mode:hover {
  color: #fff;
  border-color: rgba(201, 162, 39, 0.5);
}
.ecu-meter-tl-mode.is-active {
  color: #ffe08a;
  background: rgba(201, 162, 39, 0.18);
  border-color: rgba(201, 162, 39, 0.65);
}
.ecu-meter-timeline-meta {
  color: #8b9bb4;
  margin-left: 6px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-timeline-meta [data-tl-wall] {
  color: #6d7a92;
}
.ecu-meter-timeline-meta [data-tl-scale] {
  margin-left: 8px;
  color: #6d7a92;
}
/* Bar color legend — AL: green=buff, blue=CD, red=debuff. */
.ecu-meter-tl-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  margin-top: 6px;
  font-size: 12px;
  color: #8b9bb4;
  user-select: none;
}
.ecu-meter-tl-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.ecu-meter-tl-legend-swatch {
  width: 14px;
  height: 8px;
  border-radius: 1px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.45);
  flex-shrink: 0;
}
.ecu-meter-tl-legend-item.is-cd .ecu-meter-tl-legend-swatch {
  background: rgba(60, 180, 255, 0.45);
}
.ecu-meter-tl-legend-item.is-buff .ecu-meter-tl-legend-swatch {
  background: rgba(0, 255, 0, 0.35);
}
.ecu-meter-tl-legend-item.is-debuff .ecu-meter-tl-legend-swatch {
  background: rgba(255, 0, 0, 0.35);
}
.ecu-meter-tl-legend-item.is-gear .ecu-meter-tl-legend-swatch {
  background: rgba(255, 176, 32, 0.85);
}
.ecu-meter-tl-legend-item.is-death .ecu-meter-tl-legend-swatch {
  width: 4px;
  height: 10px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(220, 40, 40, 0.85);
  box-shadow: 0 0 3px rgba(229, 57, 53, 0.5);
}
.ecu-meter-tl-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
}
.ecu-meter-tl-gutter {
  flex: 0 0 var(--tl-name-w);
  width: var(--tl-name-w);
  min-width: var(--tl-name-w);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid #2a3140;
  background: rgba(10, 10, 12, 0.96);
  z-index: 4;
}
.ecu-meter-tl-gutter-ruler {
  flex-shrink: 0;
  height: var(--tl-ruler-h);
  min-height: var(--tl-ruler-h);
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  padding: 0 8px;
  border-bottom: 1px solid #2a3140;
  background: #12141a;
  user-select: none;
}
.ecu-meter-tl-gutter-axis-lab {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  min-width: 0;
  font-size: 9px;
  line-height: 1;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #a8b4c8;
}
.ecu-meter-tl-gutter-axis-lab.is-clock {
  color: #6d7a92;
}
/* Quiet strip chip — matches Fight/Clock labels, not filter-tab chrome. */
.ecu-meter-tl-now-btn {
  cursor: pointer;
  flex: 0 0 auto;
  margin: 0;
  border: none;
  border-radius: 1px;
  background: transparent;
  color: #c9b878;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1;
  padding: 1px 3px;
}
.ecu-meter-tl-now-btn:hover {
  color: #ffe08a;
  background: rgba(201, 162, 39, 0.14);
}
.ecu-meter-tl-gutter-rows {
  flex: 1;
  will-change: transform;
  transform: translateZ(0);
}
.ecu-meter-tl-gutter-lane {
  display: flex;
  align-items: center;
  gap: 6px;
  height: var(--tl-row);
  min-height: var(--tl-row);
  max-height: var(--tl-row);
  padding: 0 8px;
  overflow: hidden;
  border-bottom: 1px solid rgba(42, 49, 64, 0.55);
  cursor: pointer;
  font-size: 13px;
  line-height: 1.15;
  background: rgba(10, 10, 12, 0.92);
}
.ecu-meter-tl-gutter-lane.is-alt {
  background: rgba(16, 18, 24, 0.96);
}
.ecu-meter-tl-gutter-lane:hover {
  background: rgba(36, 38, 44, 0.96);
}
.ecu-meter-tl-gutter-lane.is-selected {
  background: rgba(40, 34, 18, 0.96);
}
.ecu-meter-tl-gutter-empty {
  height: var(--tl-row);
}
.ecu-meter-tl-scroll {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-x: auto;
  overflow-y: auto;
  max-height: none;
  overscroll-behavior-x: contain;
  scroll-behavior: auto;
}
/* Track canvas — pad + content; follow-now pins “now” on the right. */
.ecu-meter-tl-canvas {
  position: relative;
  width: var(--tl-track-w);
  min-width: 100%;
  max-width: none;
  box-sizing: border-box;
}
/* Live-only playhead at content “now” (may sit at viewport right while
   following). Not rendered post-combat — see MeterTimelineView. */
.ecu-meter-tl-now {
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(var(--tl-pad) + var(--tl-content-w));
  width: 2px;
  margin-left: -1px;
  background: rgba(227, 186, 4, 0.9);
  box-shadow: 0 0 6px rgba(227, 186, 4, 0.45);
  pointer-events: none;
  z-index: 5;
}
.ecu-meter-timeline.is-tl-frozen .ecu-meter-tl-now {
  opacity: 0.5;
}
.ecu-meter-tl-ruler {
  display: flex;
  align-items: stretch;
  position: sticky;
  top: 0;
  z-index: 3;
  background: #12141a;
  border-bottom: 1px solid #2a3140;
  min-height: var(--tl-ruler-h);
}
.ecu-meter-tl-ruler-track {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  width: var(--tl-track-w);
  min-height: var(--tl-ruler-h);
  overflow: hidden;
}
.ecu-meter-tl-axis {
  position: relative;
  margin-left: var(--tl-pad);
  width: var(--tl-content-w);
  min-width: var(--tl-content-w);
  height: 100%;
  min-height: inherit;
  /* Icons + bar hits share this context so later icons beat earlier bars. */
  isolation: isolate;
}
.ecu-meter-tl-ruler .ecu-meter-tl-axis {
  flex: 1 1 0;
  height: auto;
  min-height: 0;
}
.ecu-meter-tl-tick {
  position: absolute;
  top: 50%;
  /* Fixed-width box centered on the tick — digit changes must not shift X. */
  width: 5ch;
  margin-left: 0;
  transform: translate(-50%, -50%);
  box-sizing: border-box;
  text-align: center;
  font-family: Consolas, Monaco, ui-monospace, monospace;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: #a8b4c8;
  white-space: nowrap;
  pointer-events: none;
}
.ecu-meter-tl-tick.is-wall {
  width: 8ch;
  font-size: 10px;
  color: #6d7a92;
}
/* Only 00:00 / true end marker — never applied to live step ticks. */
.ecu-meter-tl-tick.is-first {
  transform: translate(0, -50%);
  text-align: left;
}
.ecu-meter-tl-tick.is-last {
  transform: translate(-100%, -50%);
  text-align: right;
}
.ecu-meter-tl-lanes {
  display: flex;
  flex-direction: column;
  width: var(--tl-track-w);
  min-width: var(--tl-track-w);
}
.ecu-meter-tl-lane {
  display: flex;
  align-items: stretch;
  /* Explicit width — do not shrink-wrap to the scrollport. */
  width: var(--tl-track-w);
  min-width: var(--tl-track-w);
  height: var(--tl-row);
  min-height: var(--tl-row);
  max-height: var(--tl-row);
  /* visible+hidden computes to auto+hidden (CSS overflow), which puts a
     gold h-scrollbar on every player row. clip clips without a scrollport;
     both axes stay clip/visible so neither becomes auto. hidden on this
     wide strip also makes Chromium drop history tiles when the parent
     pane scrolls left — do not use overflow-x:hidden/auto here. */
  overflow: visible;
  overflow-x: clip;
  scrollbar-width: none !important;
  line-height: 1.15;
  border-bottom: 1px solid rgba(42, 49, 64, 0.55);
  box-shadow: inset 0 1px 0 transparent, inset 0 -1px 0 transparent;
  cursor: pointer;
}
.ecu-meter-tl-lane::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}
.ecu-meter-tl-lane.is-alt {
  background: rgba(255, 255, 255, 0.025);
}
.ecu-meter-tl-lane:hover {
  background: rgba(200, 200, 200, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(255, 255, 255, 0.35);
}
.ecu-meter-tl-lane.is-selected {
  background: rgba(201, 162, 39, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 224, 138, 0.55), inset 0 -1px 0 rgba(255, 224, 138, 0.55);
}
.ecu-meter-tl-lane.is-selected:hover {
  background: rgba(201, 162, 39, 0.18);
}
.ecu-meter-tl-name-txt {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.15;
}
.ecu-meter-tl-track {
  position: relative;
  flex: 0 0 auto;
  width: var(--tl-track-w);
  min-width: var(--tl-track-w);
  height: 100%;
  min-height: 100%;
  /* Same as lane: no per-row scrollport; parent .ecu-meter-tl-scroll is
     the only overflow-x:auto. */
  overflow: visible;
  overflow-x: clip;
  scrollbar-width: none !important;
}
.ecu-meter-tl-track::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}
.ecu-meter-tl-class {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
}
.ecu-meter-tl-gridline {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(80, 90, 110, 0.4);
  pointer-events: none;
  z-index: 0;
}
.ecu-meter-tl-block {
  position: absolute;
  top: 3px;
  bottom: 3px;
  height: auto;
  /* z-index:auto — do not create a stacking context. Icons and bar-hits
     compete in the axis so a later icon beats an earlier 5–20s bar. */
  z-index: auto;
  display: flex;
  align-items: center;
  cursor: pointer;
  min-width: var(--tl-icon);
  /* No translateZ — promoted layers on a 30k+ px track get culled when scrolling. */
  pointer-events: none;
}
.ecu-meter-tl-block.is-sub {
  /* Stack only present kinds; row height grows with cat count (see laneRowPx). */
  top: calc(var(--tl-sub-i) * 100% / var(--tl-subs) + 1px);
  height: calc(100% / var(--tl-subs) - 2px);
  bottom: auto;
  min-width: var(--tl-icon-sub);
}
.ecu-meter-tl-block.is-no-bar .ecu-meter-tl-block-bar {
  display: none;
}
.ecu-meter-tl-block-ico {
  position: relative;
  /* Icon band (inline z-index adds stackIndex). Beats every bar hit. */
  z-index: 10000;
  flex-shrink: 0;
  display: inline-flex;
  width: var(--tl-icon);
  height: var(--tl-icon);
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.95));
  pointer-events: auto;
  cursor: pointer;
}
/* Global .ecu-meter-icon is 14px !important (meter bars). Timeline must win. */
.ecu-meter-timeline .ecu-meter-tl-block-ico .ecu-meter-icon,
.ecu-meter-timeline .ecu-meter-tl-block-ico .ecu-meter-icon-clip {
  width: var(--tl-icon) !important;
  height: var(--tl-icon) !important;
}
.ecu-meter-tl-block.is-sub .ecu-meter-tl-block-ico {
  width: var(--tl-icon-sub);
  height: var(--tl-icon-sub);
}
.ecu-meter-timeline .ecu-meter-tl-block.is-sub .ecu-meter-tl-block-ico .ecu-meter-icon,
.ecu-meter-timeline .ecu-meter-tl-block.is-sub .ecu-meter-tl-block-ico .ecu-meter-icon-clip {
  width: var(--tl-icon-sub) !important;
  height: var(--tl-icon-sub) !important;
}
.ecu-meter-timeline .ecu-meter-tl-class .ecu-meter-icon {
  width: var(--tl-class) !important;
  height: var(--tl-class) !important;
  font-size: 13px !important;
  line-height: var(--tl-class) !important;
}
.ecu-meter-tl-block-bar {
  position: absolute;
  left: calc(var(--tl-icon) / 2);
  right: 0;
  top: 1px;
  bottom: 1px;
  border-radius: 1px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.4);
  z-index: 1;
  pointer-events: none;
}
.ecu-meter-tl-block.is-sub .ecu-meter-tl-block-bar {
  left: calc(var(--tl-icon-sub) / 2);
}
/* Bar-only hit (below the icon band). Easy bar hover when not on an icon.
   ±2px x-pad only — empty row gaps still miss. */
.ecu-meter-tl-block-hit {
  position: absolute;
  left: -2px;
  right: -2px;
  top: 0;
  bottom: 0;
  width: auto;
  height: auto;
  z-index: 1;
  pointer-events: auto;
  cursor: pointer;
}
/* AL Time Line: green = buffs, blue = cooldowns, red = debuffs. */
.ecu-meter-tl-block.is-cast .ecu-meter-tl-block-bar {
  background: rgba(60, 180, 255, 0.35);
  opacity: 0.9;
}
.ecu-meter-tl-block.is-buff .ecu-meter-tl-block-bar {
  background: rgba(0, 255, 0, 0.25);
}
.ecu-meter-tl-block.is-debuff .ecu-meter-tl-block-bar {
  background: rgba(255, 0, 0, 0.25);
}
.ecu-meter-tl-block.is-gear .ecu-meter-tl-block-ico {
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.95))
    drop-shadow(0 0 2px rgba(255, 176, 32, 0.95));
}
.ecu-meter-tl-block.is-gear .ecu-meter-tl-block-ico:hover {
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.95))
    drop-shadow(0 0 2px rgba(255, 176, 32, 0.95))
    drop-shadow(0 0 3px rgba(255, 255, 255, 0.35));
}
.ecu-meter-tl-block.is-no-bar .ecu-meter-tl-block-bar {
  display: none;
}
/* Do not lift the whole block — that trapped later icons under the first bar. */
.ecu-meter-tl-block:hover .ecu-meter-tl-block-bar {
  filter: brightness(1.25);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
}
.ecu-meter-tl-block-ico:hover {
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.95))
    drop-shadow(0 0 3px rgba(255, 255, 255, 0.45));
}
/* Details PlaceDeathPins: 4×14 white pin — keep thin, not a fat death icon. */
.ecu-meter-tl-death {
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: 4px;
  margin-left: -2px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(220, 40, 40, 0.85);
  cursor: pointer;
  box-shadow: 0 0 4px rgba(229, 57, 53, 0.65);
}
.ecu-meter-tl-death:hover {
  box-shadow: 0 0 6px rgba(229, 57, 53, 0.9);
}
.ecu-meter-tl-empty {
  padding: 20px 14px;
  color: #8b9bb4;
  font-size: 13px;
}
/* Back-compat aliases if anything still targets old class names */
.ecu-meter-timeline-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.ecu-meter-timeline-lane {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}
.ecu-meter-timeline-name {
  width: 64px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #aaa;
  flex-shrink: 0;
}
.ecu-meter-timeline-track {
  position: relative;
  flex: 1;
  height: 14px;
  background: #1a1a1a;
  border: 1px solid #333;
}
.ecu-meter-timeline-bar {
  position: absolute;
  top: 2px;
  bottom: 2px;
  border-radius: 1px;
  min-width: 2px;
}
.ecu-meter-timeline-death {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e53935;
  z-index: 2;
  pointer-events: none;
  box-shadow: 0 0 4px rgba(229, 57, 53, 0.6);
}
`;
