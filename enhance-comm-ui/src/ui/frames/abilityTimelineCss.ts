/** Ability timeline — icon-scroll rail. */

import { METER_HOVER_TIP_CSS } from "../meter/css/meterHoverTipCss";

export const ABILITY_TIMELINE_CSS = `
#comm-ui .comm-pos-panel.comm-pos-abilityTimeline,
#comm-ui .comm-pos-panel.comm-pos-abilityTimeline .comm-pos-panel-body,
#comm-ui .comm-pos-panel.comm-pos-abilityTimelineBigIcon,
#comm-ui .comm-pos-panel.comm-pos-abilityTimelineBigIcon .comm-pos-panel-body,
#comm-ui .comm-pos-panel.comm-pos-abilityTimelineHighlight,
#comm-ui .comm-pos-panel.comm-pos-abilityTimelineHighlight .comm-pos-panel-body {
  background: transparent;
  height: 100%;
  overflow: visible !important;
}

.ecu-abil-panel {
  font-size: 13px;
  --ecu-abil-gold: #ffd28a;
  --ecu-abil-accent: #e8c96a;
  --abil-icon: 44px;
  --abil-icon-margin: 4px;
  --abil-rail-w: calc(var(--abil-icon) + 6px);
  --abil-static-ratio: 0.42;
  --abil-rail-tint: transparent;
  position: relative;
  min-width: 0;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.ecu-abil-sections {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ecu-abil-panel .ecu-abil-sections {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  width: 100%;
}

.ecu-abil-section + .ecu-abil-section {
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.ecu-abil-section-name {
  font-size: 13px;
  color: var(--ecu-abil-gold);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ecu-abil-panel .ecu-abil-section {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.ecu-abil-panel[data-orient="vertical"] .ecu-abil-section-name {
  max-width: var(--abil-rail-w);
  font-size: 13px;
  color: rgba(255, 210, 138, 0.72);
}

.ecu-abil-panel[data-orient="horizontal"] .ecu-abil-section-name {
  max-width: 100%;
  font-size: 13px;
  color: rgba(255, 210, 138, 0.72);
}

.ecu-abil-timeline {
  --abil-gap: 6px;
}

.ecu-abil-timeline[data-orient="vertical"] {
  display: flex;
  flex-direction: column;
  gap: var(--abil-gap);
}

.ecu-abil-timeline[data-orient="horizontal"] {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0;
  min-width: 0;
}

.ecu-abil-panel[data-orient="vertical"] .ecu-abil-timeline {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  gap: 0;
}

.ecu-abil-panel[data-orient="horizontal"] .ecu-abil-timeline {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  height: 100%;
  gap: 0;
}

.ecu-abil-zone {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.ecu-abil-zone-label {
  font-size: 13px;
  color: #888;
  letter-spacing: 0.04em;
}

.ecu-abil-icon {
  width: var(--abil-icon);
  height: var(--abil-icon);
  border: 2px solid rgba(255, 255, 255, 0.45);
  background: rgba(8, 8, 8, 0.85);
  border-radius: 3px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  overflow: hidden;
  box-sizing: border-box;
}

.ecu-abil-scroll-marker .ecu-abil-icon,
.ecu-abil-scroll-marker .ecu-game-icon,
.ecu-abil-bigicon .ecu-abil-icon,
.ecu-abil-bigicon .ecu-game-icon {
  pointer-events: none;
}

.ecu-abil-icon--imminent {
  border-color: var(--ecu-abil-gold);
  box-shadow: 0 0 10px rgba(232, 201, 106, 0.55);
}

.ecu-abil-scroll-marker--cast .ecu-abil-icon {
  animation: ecu-abil-flash 0.45s ease-out;
}

@keyframes ecu-abil-flash {
  0% {
    border-color: #fff;
    box-shadow: 0 0 14px rgba(255, 255, 255, 0.8);
  }
  100% {
    border-color: rgba(255, 255, 255, 0.45);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.55);
  }
}

.ecu-abil-icon img {
  image-rendering: pixelated;
}

.ecu-abil-icon .ecu-meter-icon,
.ecu-abil-icon .ecu-meter-icon-clip {
  width: 100% !important;
  height: 100% !important;
  max-width: none;
  max-height: none;
  box-sizing: border-box;
}

.ecu-abil-icon .ecu-meter-icon-clip img {
  max-width: none !important;
  max-height: none !important;
}

.ecu-abil-icon .ecu-meter-icon-ab {
  font-size: calc(var(--abil-icon) * 0.55);
  line-height: var(--abil-icon);
}

.ecu-abil-legend {
  margin-top: 6px;
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 13px;
  color: #888;
  line-height: 1.4;
}

.ecu-abil-timeline {
  gap: 4px;
}

.ecu-abil-scroll-labels {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.ecu-abil-panel .ecu-abil-scroll-labels {
  display: none;
}

.ecu-abil-scroll-lane {
  position: relative;
  min-width: 0;
  flex: 0 0 auto;
  min-height: calc(var(--abil-icon) + 24px);
}

.ecu-abil-panel[data-orient="vertical"] .ecu-abil-scroll-lane {
  flex: 1 1 auto;
  height: 100%;
  min-height: 120px;
  width: var(--abil-rail-w);
  background: var(--abil-rail-tint);
  border-radius: 3px;
}

.ecu-abil-panel[data-orient="vertical"] .ecu-abil-scroll-lane::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.2);
  pointer-events: none;
}

.ecu-abil-panel[data-orient="vertical"] .ecu-abil-scroll-lane::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 0;
  height: calc(var(--abil-static-ratio) * 100%);
  width: 0;
  transform: translateX(-50%);
  border-left: 1px dashed rgba(255, 255, 255, 0.16);
  pointer-events: none;
}

.ecu-abil-panel[data-orient="vertical"][data-reverse="true"] .ecu-abil-scroll-lane::after {
  top: auto;
  bottom: 0;
}

.ecu-abil-panel[data-orient="horizontal"] .ecu-abil-scroll-lane {
  flex: 1 1 auto;
  width: 100%;
  min-width: 120px;
  height: var(--abil-rail-w);
  min-height: var(--abil-rail-w);
  background: var(--abil-rail-tint);
  border-radius: 3px;
}

.ecu-abil-panel[data-orient="horizontal"] .ecu-abil-scroll-lane::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.2);
  pointer-events: none;
}

.ecu-abil-panel[data-orient="horizontal"] .ecu-abil-scroll-lane::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  width: calc(var(--abil-static-ratio) * 100%);
  height: 0;
  transform: translateY(-50%);
  border-top: 1px dashed rgba(255, 255, 255, 0.16);
  pointer-events: none;
}

.ecu-abil-panel[data-orient="horizontal"][data-reverse="true"] .ecu-abil-scroll-lane::after {
  left: auto;
  right: 0;
}

.ecu-abil-tick {
  position: absolute;
  z-index: 0;
  pointer-events: none;
}

.ecu-abil-timeline[data-orient="vertical"] .ecu-abil-tick {
  left: 0;
  right: 0;
  height: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.28);
}

.ecu-abil-timeline[data-orient="horizontal"] .ecu-abil-tick {
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 1px solid rgba(255, 255, 255, 0.28);
}

.ecu-abil-tick-label {
  position: absolute;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.ecu-abil-timeline[data-orient="vertical"] .ecu-abil-tick-label {
  left: 100%;
  margin-left: 4px;
  top: 0;
  transform: translateY(-50%);
}

.ecu-abil-panel[data-chrome="inward"][data-orient="vertical"] .ecu-abil-tick-label {
  left: auto;
  right: 100%;
  margin-left: 0;
  margin-right: 4px;
}

.ecu-abil-timeline[data-orient="horizontal"] .ecu-abil-tick-label {
  bottom: 100%;
  margin-bottom: 3px;
  left: 0;
  transform: translateX(-50%);
}

.ecu-abil-panel[data-chrome="inward"][data-orient="horizontal"] .ecu-abil-tick-label {
  bottom: auto;
  top: 100%;
  margin-bottom: 0;
  margin-top: 3px;
}

.ecu-abil-scroll-marker {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  z-index: 1;
  pointer-events: auto;
  cursor: help;
  transition: none;
}

/* Beat layout-edit body * { pointer-events: none }. */
#comm-ui .ecu-abil-scroll-marker,
#comm-ui .ecu-abil-bigicon,
#comm-ui .ecu-abil-highlight {
  pointer-events: auto !important;
}

.ecu-abil-icon-stack {
  position: relative;
  display: flex;
  line-height: 0;
}

.ecu-abil-icon-cd {
  position: absolute;
  right: 1px;
  bottom: 0;
  font-size: 13px;
  font-weight: normal;
  text-shadow: none;
  line-height: 1.1;
  padding: 0 2px;
  color: #eee;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

.ecu-abil-icon-name {
  position: absolute;
  font-size: 12px;
  color: #ddd;
  text-shadow: 0 1px 2px #000;
  white-space: nowrap;
  max-width: 96px;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.ecu-abil-panel[data-text-anchor="left"] .ecu-abil-icon-name {
  right: 100%;
  margin-right: 4px;
  top: 50%;
  transform: translateY(-50%);
}

.ecu-abil-panel[data-text-anchor="right"] .ecu-abil-icon-name {
  left: 100%;
  margin-left: 4px;
  top: 50%;
  transform: translateY(-50%);
}

.ecu-abil-panel[data-text-anchor="top"] .ecu-abil-icon-name {
  bottom: 100%;
  left: 50%;
  margin-bottom: 2px;
  transform: translateX(-50%);
}

.ecu-abil-panel[data-text-anchor="bottom"] .ecu-abil-icon-name {
  top: 100%;
  left: 50%;
  margin-top: 2px;
  transform: translateX(-50%);
}

.ecu-abil-icon-cd.is-ready {
  color: #8fd48f;
}

.ecu-abil-icon-cd.is-warn,
.ecu-abil-bigicon-cd.is-warn {
  color: #ffe066;
}

.ecu-abil-icon-cd.is-crit,
.ecu-abil-bigicon-cd.is-crit {
  color: #ff5a5a;
}

.ecu-abil-scroll-marker--tickflash .ecu-abil-icon {
  box-shadow: 0 0 12px rgba(255, 210, 138, 0.85);
  border-color: var(--ecu-abil-gold);
}

.ecu-abil-scroll-trail {
  position: absolute;
  pointer-events: none;
  transition: none;
}

.ecu-abil-panel[data-orient="vertical"] .ecu-abil-scroll-trail {
  width: 2px;
  background: linear-gradient(180deg, rgba(120, 180, 120, 0.45), transparent);
}

.ecu-abil-panel[data-orient="horizontal"] .ecu-abil-scroll-trail {
  height: 2px;
  background: linear-gradient(90deg, rgba(120, 180, 120, 0.45), transparent);
}

.ecu-abil-bigicons {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  pointer-events: none;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
}
.ecu-abil-bigicon {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  pointer-events: auto;
  cursor: help;
}
.ecu-abil-bigicon .ecu-abil-icon {
  border-width: 2px;
}
.ecu-abil-bigicon--warn .ecu-abil-icon,
.ecu-abil-bigicon--crit .ecu-abil-icon {
  border-color: var(--ecu-abil-gold, #ffd28a);
  box-shadow: 0 0 14px rgba(232, 201, 106, 0.65);
}
.ecu-abil-bigicon--crit .ecu-abil-icon {
  border-color: #ff5a5a;
  box-shadow: 0 0 14px rgba(255, 90, 90, 0.55);
}
.ecu-abil-bigicon-cd {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 22px;
  line-height: 1;
  color: #fff;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px #000, 0 0 6px #000;
  pointer-events: none;
}
.ecu-abil-bigicon-name {
  font-size: 12px;
  color: #ddd;
  max-width: 88px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 1px 2px #000;
}

.ecu-abil-highlights {
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
}
.ecu-abil-highlight {
  font-size: 22px;
  line-height: 1.15;
  color: #ffe8b0;
  text-shadow: 0 1px 3px #000, 0 0 8px rgba(0, 0, 0, 0.8);
  white-space: nowrap;
  pointer-events: auto;
  cursor: help;
}
.ecu-abil-highlight.is-warn {
  color: #ffe066;
}
.ecu-abil-highlight.is-crit {
  color: #ff6b6b;
}

.ecu-meter-tt-foot {
  margin-top: 8px;
  color: #9aa8bc;
  font-size: var(--meter-tt-foot, 13px);
  line-height: 1.35;
}
`;

export function ensureAbilityTimelineCss(): void {
  const css = ABILITY_TIMELINE_CSS + METER_HOVER_TIP_CSS;
  const existing = document.querySelector(
    "style[data-ecu-abil-css]",
  ) as HTMLStyleElement | null;
  if (existing) {
    existing.textContent = css;
    return;
  }
  const el = document.createElement("style");
  el.setAttribute("data-ecu-abil-css", "1");
  el.textContent = css;
  document.head.appendChild(el);
}
