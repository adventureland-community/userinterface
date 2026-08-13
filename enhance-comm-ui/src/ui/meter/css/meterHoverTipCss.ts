/** Shared hover tip (.ecu-meter-tt) for bars + Spells/Targets. */
export const METER_HOVER_TIP_CSS = `
/* Details GameCooltip-ish hover tip (bars, timeline, Spells/Targets).
 * Shared --meter-tt-* vars: body ≥16px, icons 22px (see METER_TT_ICON). */
.ecu-meter-tt {
  --meter-tt-body: 16px;
  --meter-tt-title: 17px;
  --meter-tt-sec: 15px;
  --meter-tt-kbd: 13px;
  --meter-tt-foot: 13px;
  --meter-tt-icon: 22px;
  --meter-tt-pad-y: 12px;
  --meter-tt-pad-x: 14px;
  --meter-tt-row-pad-y: 4px;
  --meter-tt-row-pad-x: 8px;
  --meter-tt-gap: 8px;
  position: fixed;
  z-index: 10000;
  min-width: 300px;
  max-width: 460px;
  background: rgba(12, 14, 18, 0.94);
  border: 1px solid rgba(210, 210, 220, 0.28);
  border-radius: 2px;
  padding: var(--meter-tt-pad-y) var(--meter-tt-pad-x);
  box-shadow: 0 8px 28px rgba(0,0,0,0.55);
  pointer-events: none;
  font-size: var(--meter-tt-body);
  color: #e8eef7;
  line-height: 1.45;
  font-weight: normal;
  text-shadow: none;
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
}
.ecu-meter-tt h4 {
  margin: 0 0 8px;
  font-size: var(--meter-tt-title);
  color: #fff;
  font-weight: normal;
  display: flex;
  align-items: center;
  gap: var(--meter-tt-gap);
}
/* Beat global .ecu-meter-icon { 14px !important } — bar rows stay 14px. */
.ecu-meter-tt .ecu-meter-icon,
.ecu-meter-tt .ecu-meter-icon-clip {
  width: var(--meter-tt-icon) !important;
  height: var(--meter-tt-icon) !important;
}
.ecu-meter-tt .ecu-meter-icon {
  font-size: 13px;
  line-height: var(--meter-tt-icon) !important;
}
.ecu-meter-tt .ecu-meter-icon-class {
  font-size: 12px;
  font-weight: 700;
}
.ecu-meter-tt .line {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  color: #c8d0dc;
  font-size: var(--meter-tt-body);
}
.ecu-meter-tt .line span { color: #ffe08a; }
.ecu-meter-tt .line b { color: #fff; font-weight: normal; }
.ecu-meter-tt .sec {
  margin-top: 10px;
  color: #8b9bb4;
  font-size: var(--meter-tt-sec);
  text-transform: uppercase;
}
.ecu-meter-tt ul { margin: 4px 0 0; padding: 0; list-style: none; }
.ecu-meter-tt li { display: flex; justify-content: space-between; gap: 14px; }
`;
