/**
 * Shared Comm cooltip shell — same visual language as `.ecu-meter-tt`.
 * Injected with chrome CSS so tips work outside meter/timeline panels.
 */
export const COOLTIP_CSS = `
.ecu-cooltip {
  --ecu-tt-body: 16px;
  --ecu-tt-title: 17px;
  --ecu-tt-foot: 13px;
  --ecu-tt-icon: 22px;
  /* Stock sprite base 40×50 — keep readable on dark tip chrome. */
  --ecu-tt-monster-w: 40px;
  --ecu-tt-monster-h: 50px;
  --ecu-tt-pad-y: 12px;
  --ecu-tt-pad-x: 14px;
  --ecu-tt-gap: 8px;
  position: fixed;
  z-index: 10000;
  min-width: 220px;
  max-width: 460px;
  max-height: calc(100vh - 16px);
  overflow-x: hidden;
  overflow-y: auto;
  background: rgba(12, 14, 18, 0.94);
  border: 1px solid rgba(210, 210, 220, 0.28);
  border-radius: 2px;
  padding: var(--ecu-tt-pad-y) var(--ecu-tt-pad-x);
  box-shadow: 0 8px 28px rgba(0,0,0,0.55);
  pointer-events: none;
  font-size: var(--ecu-tt-body);
  color: #e8eef7;
  line-height: 1.45;
  font-weight: normal;
  text-shadow: none;
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
  display: none;
}
.ecu-cooltip.is-open {
  display: block;
}
.ecu-cooltip h4 {
  margin: 0 0 8px;
  font-size: var(--ecu-tt-title);
  color: #fff;
  font-weight: normal;
  display: flex;
  align-items: center;
  gap: var(--ecu-tt-gap);
}
.ecu-cooltip .ecu-meter-icon:not(.ecu-meter-icon-monster),
.ecu-cooltip .ecu-meter-icon-clip {
  width: var(--ecu-tt-icon) !important;
  height: var(--ecu-tt-icon) !important;
}
.ecu-cooltip .ecu-meter-icon-monster {
  width: var(--ecu-tt-monster-w) !important;
  height: var(--ecu-tt-monster-h) !important;
  overflow: visible !important;
  flex-shrink: 0;
}
.ecu-cooltip .line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  color: #c8d0dc;
  font-size: var(--ecu-tt-body);
}
.ecu-cooltip .line span { color: #ffe08a; }
.ecu-cooltip .line b { color: #fff; font-weight: normal; }
.ecu-cooltip .ecu-cooltip-target b {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.ecu-cooltip .ecu-cooltip-mob-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #ffe08a;
  min-width: 0;
}
.ecu-cooltip .ecu-cooltip-mob {
  min-height: var(--ecu-tt-monster-h);
  padding: 2px 0;
}
.ecu-cooltip .ecu-cooltip-lock {
  color: #ffcc66;
}
.ecu-cooltip .ecu-cooltip-over b {
  color: #ff9a9a;
}
.ecu-cooltip .ecu-meter-tt-foot,
.ecu-cooltip .ecu-cooltip-foot {
  margin: 0 0 8px;
  color: #c3c3c3;
  font-size: var(--ecu-tt-foot);
  line-height: 1.35;
}
/* Stock render_item card inside hover — drop double chrome. */
.ecu-cooltip.is-item-tip {
  min-width: 0;
  padding: 8px 10px;
}
.ecu-cooltip.is-item-tip .buyitem {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  margin: 0 !important;
  max-width: 280px;
  font-size: 16px !important;
  line-height: 20px !important;
  display: block !important;
}
.ecu-cooltip.is-item-tip .buyitem .cbold {
  font-size: 17px;
}
`;
