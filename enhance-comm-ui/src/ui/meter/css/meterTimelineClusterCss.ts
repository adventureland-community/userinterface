/** Time Line cluster tips. */
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
.ecu-meter-tt-more {
  padding: var(--meter-tt-row-pad-y) var(--meter-tt-row-pad-x);
  color: #8b9bb4;
  font-size: var(--meter-tt-foot);
}
.ecu-meter-tt-foot {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: #8b9bb4;
  font-size: var(--meter-tt-foot);
}
`;
