const STYLE_ID = "comm-ui-chrome-css";

export function injectChromeCss(): void {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.append(style);
  }
  // Always rewrite so Tampermonkey reloads pick up CSS without a hard refresh.
  // Above #comm-ui (220) so strip + dropdown receive clicks.
  style.textContent = `
/* Hide stock observe gamebuttons — never restyle .gamebutton.block into the strip */
#observeui {
  display: none !important;
}

#bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 260;
  padding: 8px 10px calc(10px + env(safe-area-inset-bottom, 0px));
  text-align: center;
  pointer-events: none;
  background: none !important;
  background-image: none !important;
}
#bottom .ecu-chrome-stack,
#bottom .ecu-chrome-stack * {
  pointer-events: auto;
}

/* Vertical stack: action bar above character/server strip */
.ecu-chrome-stack {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  width: auto;
  max-width: min(96vw, 1200px);
  margin: 0 auto;
  pointer-events: auto;
}

/* Secondary control cluster — compact icon buttons */
.ecu-actions {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: stretch;
  justify-content: center;
  gap: 6px;
  padding: 4px 6px;
  background: rgba(14, 14, 14, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-sizing: border-box;
  align-self: center;
}

.ecu-btn {
  appearance: none;
  border: 1px solid #7a7a7a;
  border-radius: 0;
  background: #252525;
  color: #f5f5f5;
  font: inherit;
  font-size: 16px;
  font-weight: 500 !important;
  letter-spacing: 0.02em;
  text-shadow: none !important;
  box-shadow: none !important;
  text-transform: none;
  box-sizing: border-box;
  padding: 0 18px;
  min-width: 88px;
  min-height: 40px;
  height: 40px;
  margin: 0;
  cursor: pointer;
  line-height: 1.2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}
.ecu-btn-icon-only {
  min-width: 36px;
  width: 36px;
  height: 36px;
  min-height: 36px;
  padding: 0;
}
.ecu-btn-icon {
  display: block;
  width: 18px;
  height: 18px;
  pointer-events: none;
}
.ecu-btn:hover {
  background: #343434;
  border-color: #a0a0a0;
  color: #fff;
}
.ecu-btn:active {
  background: #3d3d3d;
}
.ecu-btn:disabled,
.ecu-btn.is-disabled {
  opacity: 0.4;
  cursor: default;
  pointer-events: none;
}

/* Primary strip: character chips + server only */
.ecu-chrome {
  display: inline-flex;
  flex-direction: row;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  width: auto;
  max-width: 100%;
  margin: 0;
  pointer-events: auto;
  background: rgba(14, 14, 14, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-sizing: border-box;
  min-height: 68px;
  height: 68px;
  overflow: visible;
}

.ecu-strip-sep {
  flex: 0 0 1px;
  width: 1px;
  align-self: stretch;
  margin: 10px 0;
  background: rgba(255, 255, 255, 0.14);
}

.charactersui.charactersuic {
  display: flex !important;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 2px;
  padding: 4px 8px;
  max-width: min(78vw, 920px);
  min-width: 0;
  flex: 0 1 auto;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
  text-align: left;
}

.ecu-char {
  appearance: none;
  border: 0;
  background: transparent;
  color: #eee;
  font: inherit;
  font-weight: 400 !important;
  text-shadow: none !important;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  min-width: 0;
  max-width: 240px;
  height: 100%;
  padding: 0 12px 0 6px;
  cursor: pointer;
  text-align: left;
  line-height: 1.15;
  overflow: hidden;
}
.ecu-char:hover { background: rgba(255, 255, 255, 0.07); }
.ecu-char.is-active {
  background: rgba(225, 55, 88, 0.2);
  box-shadow: inset 0 -3px 0 #e13758;
}
.ecu-char.is-active:hover {
  background: rgba(225, 55, 88, 0.28);
}
.ecu-char-sprite {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  overflow: hidden;
}
.ecu-char-sprite > * {
  transform: scale(1.2);
  transform-origin: center center;
}
.ecu-char-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 3px;
  min-width: 0;
  overflow: hidden;
}
.ecu-char-name {
  font-size: 18px;
  font-weight: 500 !important;
  letter-spacing: 0.02em;
  color: #f5f5f5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
  text-shadow: none !important;
}
.ecu-char-sub {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  font-weight: 400 !important;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-shadow: none !important;
}
/* Off-realm hint — only when char.server !== current (stock orange accent) */
.ecu-char-server {
  flex: 0 0 auto;
  color: #f3a05d;
  font-size: 14px;
  font-weight: 400 !important;
  letter-spacing: 0.02em;
  text-shadow: none !important;
}
.ecu-empty {
  display: inline-flex;
  align-items: center;
  height: 100%;
  padding: 0 16px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 16px;
  font-weight: 400 !important;
  text-shadow: none !important;
}

.serversui.serversuic,
.serversuic {
  display: flex !important;
  position: relative;
  flex: 0 0 auto;
  align-items: stretch;
  margin: 0 !important;
  overflow: visible;
}
.ecu-server-dd {
  position: relative;
  display: flex;
  min-width: 0;
  text-align: left;
  height: 100%;
  overflow: visible;
}
.ecu-server-dd-trigger {
  appearance: none;
  border: 0;
  background: transparent;
  color: #eee;
  font: inherit;
  font-weight: 400 !important;
  text-shadow: none !important;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 100%;
  padding: 0 16px;
  cursor: pointer;
  text-align: left;
  line-height: 1.15;
  min-width: 188px;
  box-sizing: border-box;
}
.ecu-server-dd-trigger:hover { background: rgba(255, 255, 255, 0.07); }
.ecu-server-dd.is-open .ecu-server-dd-trigger {
  background: rgba(133, 199, 107, 0.16);
  box-shadow: inset 0 -3px 0 #85c76b;
}
.ecu-server-dd-meta {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 3px;
  min-width: 0;
}
.ecu-server-dd-name {
  font-size: 21px;
  font-weight: 400 !important;
  color: #f2f2f2;
  white-space: nowrap;
  text-shadow: none !important;
}
.ecu-server-dd-sub {
  flex: 0 0 auto;
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  color: #85c76b;
  white-space: nowrap;
  text-shadow: none !important;
}
/* Current connection RTT from host globals pings[] / ping_ack */
.ecu-server-dd-ping {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 3px;
  min-width: 52px;
}
.ecu-server-dd-bars {
  display: flex;
  align-items: flex-end;
  gap: 1px;
  height: 18px;
}
.ecu-server-dd-bar {
  display: block;
  width: 3px;
  min-height: 2px;
  background: #8ab4c9;
  opacity: 0.92;
}
.ecu-server-dd-ping-ms {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: #8ab4c9;
  white-space: nowrap;
  text-shadow: none !important;
  font-weight: 400 !important;
}
.ecu-server-dd-chevron {
  flex: 0 0 auto;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid rgba(255, 255, 255, 0.5);
}
.ecu-server-dd.is-open .ecu-server-dd-chevron {
  transform: rotate(180deg);
  border-top-color: #85c76b;
}
.ecu-server-dd-menu {
  display: none;
  position: absolute;
  left: auto;
  right: 0;
  bottom: calc(100% + 6px);
  min-width: 100%;
  width: max(100%, 280px);
  z-index: 270;
  max-height: min(42vh, 320px);
  overflow: auto;
  padding: 4px;
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.6);
  pointer-events: auto;
}
.ecu-server-dd.is-open .ecu-server-dd-menu { display: block; }
.ecu-server-dd-option {
  appearance: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  margin: 0;
  border: 0;
  background: transparent;
  color: #eee;
  font: inherit;
  font-size: 18px;
  font-weight: 400 !important;
  text-shadow: none !important;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
}
.ecu-server-dd-option:hover { background: rgba(255, 255, 255, 0.08); }
.ecu-server-dd-option.is-active {
  background: rgba(133, 199, 107, 0.14);
  box-shadow: inset 3px 0 0 #85c76b;
}
.ecu-server-dd-option-name {
  flex: 0 1 auto;
  min-width: 0;
  font-weight: 400 !important;
  text-shadow: none !important;
  white-space: nowrap;
}
.ecu-server-dd-option-events {
  flex: 1 1 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  min-width: 0;
}
.ecu-server-dd-event {
  flex: 0 0 auto;
  padding: 2px 6px;
  border: 1px solid rgba(133, 199, 107, 0.45);
  background: rgba(133, 199, 107, 0.12);
  color: #b6e3a4;
  font-size: 13px;
  line-height: 1.2;
  font-weight: 400 !important;
  text-shadow: none !important;
  white-space: nowrap;
  max-width: 7.5em;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ecu-server-dd-event.is-live {
  border-color: #85c76b;
  color: #b6e3a4;
}
.ecu-server-dd-event-more {
  border-color: rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.65);
  font-variant-numeric: tabular-nums;
}
.ecu-server-dd-option-players {
  flex: 0 0 auto;
  color: #85c76b;
  font-variant-numeric: tabular-nums;
  font-size: 16px;
  font-weight: 400 !important;
  text-shadow: none !important;
}
.ecu-server-dd-empty {
  padding: 14px;
  color: #888;
  font-size: 16px;
  text-align: center;
}

/* Hide stock TOGGLE — strip shows chars + servers together */
#bottom > .gamebutton {
  display: none !important;
}

/* Narrow viewport: fold Follow/Bag/Command into the chip strip row */
@media (max-width: 900px) {
  .ecu-chrome-stack {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    align-items: stretch;
    gap: 4px;
  }
  .ecu-actions {
    flex: 0 0 auto;
    align-self: stretch;
    padding: 4px;
    gap: 4px;
    height: 68px;
    min-height: 68px;
    box-sizing: border-box;
  }
  .ecu-btn {
    min-width: 64px;
    min-height: 28px;
    height: 28px;
    padding: 0 10px;
    font-size: 14px;
  }
  .ecu-btn-icon-only {
    min-width: 32px !important;
    width: 32px;
    height: 32px !important;
    min-height: 32px !important;
    padding: 0 !important;
  }
  .ecu-chrome {
    flex: 1 1 auto;
    min-width: 0;
  }
  .charactersui.charactersuic {
    max-width: min(62vw, 640px);
  }
}

/* Party roster: Buffs mode chip sits in the first party header (gold WC family). */
.ecu-roster {
  position: relative;
}
.ecu-roster-buffs {
  cursor: pointer;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 1px 7px;
  min-height: 20px;
  line-height: 1.2;
  border: 1px solid #886;
  border-radius: 0;
  background: rgba(30, 30, 20, 0.92);
  color: #ffe08a;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.35);
  transition: background 0.1s ease, border-color 0.1s ease, color 0.1s ease;
}
.ecu-roster-buffs:hover {
  background: rgba(50, 42, 22, 0.96);
  border-color: #aa8;
  color: #ffe9a8;
}
.ecu-roster-buffs:active {
  background: rgba(40, 34, 18, 0.96);
}
.ecu-roster-buffs-k {
  color: rgba(255, 224, 138, 0.72);
  letter-spacing: 0.02em;
}
.ecu-roster-buffs-sep {
  color: rgba(255, 224, 138, 0.45);
  user-select: none;
}
.ecu-roster-buffs-v {
  color: #ffe08a;
  letter-spacing: 0.03em;
}
.ecu-roster-buffs:hover .ecu-roster-buffs-k,
.ecu-roster-buffs:hover .ecu-roster-buffs-v {
  color: #ffe9a8;
}
/* Layout-edit body is click-through — keep Buffs usable. */
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-panel-body .ecu-roster-buffs {
  pointer-events: auto !important;
  z-index: 8;
}

/* Tablet / phone — larger hit targets (Edge/Firefox Android, Safari iOS) */
@media (pointer: coarse), (max-width: 1100px) {
  .ecu-btn {
    min-width: 88px !important;
    min-height: 44px !important;
    height: 44px !important;
    padding: 0 16px !important;
    font-size: 16px !important;
  }
  .ecu-btn-icon-only {
    min-width: 44px !important;
    width: 44px !important;
    height: 44px !important;
    min-height: 44px !important;
    padding: 0 !important;
  }
  .ecu-btn-icon {
    width: 22px;
    height: 22px;
  }
  .ecu-actions {
    min-height: 56px;
    height: auto;
    padding: 6px 8px;
    gap: 8px;
  }
  .ecu-chrome {
    min-height: 76px;
    height: 76px;
  }
  .ecu-char {
    padding: 0 14px 0 8px;
    gap: 12px;
  }
  .ecu-char-sprite {
    width: 52px;
    height: 52px;
  }
  .ecu-char-name {
    font-size: 18px;
  }
  .ecu-server-dd-trigger {
    min-width: 200px;
    padding: 0 18px;
  }
}
#comm-ui.comm-ui-touch .comm-pos-panel button,
#comm-ui[data-viewport="tablet"] .comm-pos-panel button,
#comm-ui[data-viewport="phone"] .comm-pos-panel button {
  min-height: 32px;
}
/* Layout edit: click through panel content to reach overlapping drag chrome.
 * .comm-pos-interactive (meters / Layout toggles) keeps body hits so
 * controls + corner resize grips stay usable while arranging. */
#comm-ui .comm-pos-panel.comm-pos-editing:not(.comm-pos-interactive) .comm-pos-panel-body,
#comm-ui .comm-pos-panel.comm-pos-editing:not(.comm-pos-interactive) .comm-pos-panel-body *,
#comm-ui .comm-pos-panel.comm-pos-editing:not(.comm-pos-interactive) .comm-pos-hidden-body,
#comm-ui .comm-pos-panel.comm-pos-editing:not(.comm-pos-interactive) .comm-pos-hidden-body * {
  pointer-events: none;
}
/* Corner grips always receive hits — even if nested under a click-through body. */
#comm-ui .comm-pos-panel.comm-pos-editing .ecu-meter-resize,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-resize,
#comm-ui .comm-pos-panel.comm-pos-movable .ecu-meter-resize,
#comm-ui .comm-pos-panel.comm-pos-movable .comm-pos-resize {
  pointer-events: auto !important;
}
/* Details: large window numbers while left-hold dragging (~1s).
 * Prefer .comm-snap-guide (LAYOUT_GUIDE_OVERLAY_Z) so numbers sit above panels;
 * in-panel fallback keeps inset:0 for legacy mounts. */
#comm-ui .comm-pos-window-id {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 1;
  font-size: clamp(48px, 55%, 120px);
  font-weight: 800;
  line-height: 1;
  color: #ff9a28;
  text-shadow:
    0 0 2px #000,
    0 2px 8px rgba(0, 0, 0, 0.85),
    0 0 24px rgba(255, 140, 20, 0.35);
  font-variant-numeric: tabular-nums;
  user-select: none;
}
#comm-ui .comm-pos-panel > .comm-pos-window-id {
  inset: 0;
}
#comm-ui .comm-snap-guide .comm-pos-window-id {
  inset: auto;
}
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-edit-header,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-edit-header *,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-panel-close,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-anchor-pad,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-anchor-pad button,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-ungroup,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-lock,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-wc,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-wc *,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-window-chrome,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-window-chrome * {
  pointer-events: auto;
}
/* Edge-snap group affordances (layout edit + play-arrange). */
#comm-ui .comm-pos-panel.comm-pos-grouped.comm-pos-editing,
#comm-ui .comm-pos-panel.comm-pos-grouped.comm-pos-arrange {
  box-shadow: 0 0 0 1px rgba(120, 200, 255, 0.35);
}
#comm-ui .comm-pos-panel.comm-pos-snap-target {
  box-shadow:
    0 0 0 2px rgba(120, 220, 255, 0.85),
    0 0 16px rgba(80, 180, 255, 0.25) !important;
}
#comm-ui .comm-pos-panel.comm-pos-dragging {
  opacity: 0.92;
}
/* Window Control menu */
#comm-ui .comm-pos-wc-item {
  display: block;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-size: 12px;
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: #ffe08a;
}
#comm-ui .comm-pos-wc-item:hover {
  background: rgba(80, 70, 30, 0.9);
}
#comm-ui .comm-pos-edit-grip-row {
  pointer-events: auto;
  cursor: grab;
}
#comm-ui .comm-pos-edit-grip-row .comm-pos-edit-grip {
  flex: 1 1 auto;
  min-width: 48px;
}
/* Play-arrange lock / WC / grip: above the frame when space allows; otherwise
 * in-flow (is-inline) so chrome is not clipped and content shifts down. */
#comm-ui .comm-pos-arrange-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  top: auto;
  z-index: 6;
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  gap: 4px;
  margin-bottom: 0;
  padding: 0 0 4px;
  box-sizing: border-box;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.12s ease;
  background: transparent;
  height: auto;
  overflow: visible;
}
/* Hit bridge into the panel so moving onto the bar does not fire mouseleave. */
#comm-ui .comm-pos-arrange-overlay.is-above::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  height: 6px;
}
#comm-ui .comm-pos-arrange-overlay.is-inline {
  position: relative;
  left: auto;
  right: auto;
  bottom: auto;
  top: auto;
  margin-bottom: 2px;
  padding-bottom: 0;
  /* Idle inline chrome must not reserve height — only when open. */
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}
#comm-ui .comm-pos-arrange-overlay.is-chrome-only {
  justify-content: flex-end;
}
#comm-ui .comm-pos-arrange-overlay.has-grip {
  justify-content: stretch;
}
/* Mini drag header — same role as layout-edit header, but hover-only. */
#comm-ui .comm-pos-arrange-overlay .comm-pos-edit-grip {
  position: static;
  left: auto;
  top: auto;
  transform: none;
  flex: 1 1 auto;
  min-width: 48px;
  z-index: 0;
}
#comm-ui .comm-pos-arrange-overlay .comm-pos-window-chrome {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
}
#comm-ui .comm-pos-arrange-overlay .comm-pos-panel-close-in-chrome {
  position: relative;
  top: auto;
  right: auto;
  flex: 0 0 auto;
  align-self: center;
  z-index: 1;
}
#comm-ui .comm-pos-arrange-overlay > * {
  pointer-events: none;
}
/* JS hover class (delayed leave) — survives the gap to above-frame controls.
 * Do NOT use :focus-within here: clicking lock/WC leaves focus on the button
 * and would pin chrome visible after the pointer leaves (stuck after re-lock).
 * Unlocked (.comm-pos-movable): keep the whole arrange strip open so hide ×
 * and lock sit in the same row (no detached floating ×). */
@media (hover: hover) and (pointer: fine) {
  #comm-ui .comm-pos-panel.comm-pos-chrome-open > .comm-pos-arrange-overlay,
  #comm-ui .comm-pos-panel.comm-pos-movable > .comm-pos-arrange-overlay {
    opacity: 1;
    pointer-events: auto;
  }
  #comm-ui .comm-pos-panel.comm-pos-chrome-open > .comm-pos-arrange-overlay.is-inline,
  #comm-ui .comm-pos-panel.comm-pos-movable > .comm-pos-arrange-overlay.is-inline {
    max-height: 48px;
    overflow: visible;
  }
  #comm-ui .comm-pos-panel.comm-pos-chrome-open > .comm-pos-arrange-overlay > *,
  #comm-ui .comm-pos-panel.comm-pos-movable > .comm-pos-arrange-overlay > * {
    pointer-events: auto;
  }
}
/* Touch / coarse: always show so lock/WC remain reachable. */
@media (hover: none), (pointer: coarse) {
  #comm-ui .comm-pos-arrange-overlay {
    opacity: 1;
    pointer-events: auto;
  }
  #comm-ui .comm-pos-arrange-overlay.is-inline {
    max-height: 48px;
    overflow: visible;
  }
  #comm-ui .comm-pos-arrange-overlay > * {
    pointer-events: auto;
  }
}
/* Layout edit: subtle hover highlight on interactive chrome (header / × / anchor). */
#comm-ui .comm-pos-panel.comm-pos-editing {
  transition: box-shadow 0.12s ease;
}
#comm-ui .comm-pos-panel.comm-pos-editing:has(
  .comm-pos-edit-header:hover,
  .comm-pos-edit-header:active,
  .comm-pos-panel-close:hover,
  .comm-pos-anchor-pad:hover
) {
  box-shadow:
    0 0 0 1px rgba(255, 224, 138, 0.48),
    0 0 14px rgba(255, 220, 100, 0.13);
}
#comm-ui .comm-pos-panel.comm-pos-editing.comm-pos-hidden:has(
  .comm-pos-edit-header:hover,
  .comm-pos-edit-header:active
) {
  box-shadow:
    0 0 0 1px rgba(170, 170, 170, 0.42),
    0 0 12px rgba(130, 130, 130, 0.1);
}
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-edit-header {
  transition: background 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
}
#comm-ui .comm-pos-panel.comm-pos-editing:not(.comm-pos-hidden) .comm-pos-edit-header:hover,
#comm-ui .comm-pos-panel.comm-pos-editing:not(.comm-pos-hidden) .comm-pos-edit-header:active {
  background: rgba(52, 48, 24, 0.96) !important;
  border-color: #bba86a !important;
  box-shadow: inset 0 1px 0 rgba(255, 245, 200, 0.08);
}
#comm-ui .comm-pos-panel.comm-pos-editing.comm-pos-hidden .comm-pos-edit-header:hover,
#comm-ui .comm-pos-panel.comm-pos-editing.comm-pos-hidden .comm-pos-edit-header:active {
  background: rgba(42, 42, 42, 0.96) !important;
  border-color: #888 !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-panel-close {
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-panel-close:hover {
  border-color: #baa !important;
  background: rgba(35, 32, 18, 0.95) !important;
  color: #ffe08a !important;
}
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-anchor-pad button {
  transition: background 0.12s ease, border-color 0.12s ease;
}
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-anchor-pad button:not([aria-pressed="true"]):hover {
  border-color: #998 !important;
  background: rgba(35, 32, 18, 0.95) !important;
  color: #ddd !important;
}
#comm-ui[data-viewport="phone"] .comm-pos-combat,
#comm-ui[data-viewport="phone"] .comm-pos-bag,
#comm-ui[data-viewport="phone"] .comm-pos-command {
  max-width: 96vw;
}

/* HUD / generic PositionedPanel corner grips (layout edit + unlocked play). */
#comm-ui .comm-pos-resize {
  display: none;
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 18px;
  height: 18px;
  cursor: nwse-resize;
  z-index: 12;
  pointer-events: auto;
  touch-action: none;
  background:
    linear-gradient(135deg, transparent 52%, #8b9bb0 52%, #8b9bb0 58%, transparent 58%),
    linear-gradient(135deg, transparent 68%, #8b9bb0 68%, #8b9bb0 74%, transparent 74%),
    linear-gradient(135deg, transparent 84%, #8b9bb0 84%, #8b9bb0 90%, transparent 90%);
  opacity: 0.9;
}
#comm-ui .comm-pos-resize.comm-pos-resize-left {
  right: auto;
  left: 1px;
  cursor: nesw-resize;
  transform: scaleX(-1);
}
#comm-ui .comm-pos-panel.comm-pos-editing > .comm-pos-resize,
#comm-ui .comm-pos-panel.comm-pos-movable > .comm-pos-resize {
  display: block;
}
/* Meters own .ecu-meter-resize — hide generic grips on meter frames. */
#comm-ui .comm-pos-panel.ecu-meter-frame > .comm-pos-resize {
  display: none !important;
}

/* Thin dark scrollbars — #comm-ui panels + enhancer chrome outside it.
   Touch scrolling is unchanged (overflow / -webkit-overflow-scrolling stay). */
#comm-ui,
#comm-ui *,
.ecu-chrome-stack,
.ecu-chrome-stack *,
.charactersui.charactersuic,
.ecu-server-dd-menu,
#bottomleftcorner,
#ecu-buff-dialog,
#ecu-item-dialog,
#topleftcorner {
  scrollbar-width: thin;
  scrollbar-color: #7a7048 #161616;
}
#comm-ui::-webkit-scrollbar,
#comm-ui *::-webkit-scrollbar,
.ecu-chrome-stack::-webkit-scrollbar,
.ecu-chrome-stack *::-webkit-scrollbar,
.charactersui.charactersuic::-webkit-scrollbar,
.ecu-server-dd-menu::-webkit-scrollbar,
#bottomleftcorner::-webkit-scrollbar,
#ecu-buff-dialog::-webkit-scrollbar,
#ecu-item-dialog::-webkit-scrollbar,
#topleftcorner::-webkit-scrollbar {
  width: 7px;
  height: 7px;
}
#comm-ui::-webkit-scrollbar-track,
#comm-ui *::-webkit-scrollbar-track,
.ecu-chrome-stack::-webkit-scrollbar-track,
.ecu-chrome-stack *::-webkit-scrollbar-track,
.charactersui.charactersuic::-webkit-scrollbar-track,
.ecu-server-dd-menu::-webkit-scrollbar-track,
#bottomleftcorner::-webkit-scrollbar-track,
#ecu-buff-dialog::-webkit-scrollbar-track,
#ecu-item-dialog::-webkit-scrollbar-track,
#topleftcorner::-webkit-scrollbar-track {
  background: #161616;
  border-radius: 0;
}
#comm-ui::-webkit-scrollbar-thumb,
#comm-ui *::-webkit-scrollbar-thumb,
.ecu-chrome-stack::-webkit-scrollbar-thumb,
.ecu-chrome-stack *::-webkit-scrollbar-thumb,
.charactersui.charactersuic::-webkit-scrollbar-thumb,
.ecu-server-dd-menu::-webkit-scrollbar-thumb,
#bottomleftcorner::-webkit-scrollbar-thumb,
#ecu-buff-dialog::-webkit-scrollbar-thumb,
#ecu-item-dialog::-webkit-scrollbar-thumb,
#topleftcorner::-webkit-scrollbar-thumb {
  background: #6e6640;
  border: 1px solid #3a3828;
  border-radius: 0;
}
#comm-ui::-webkit-scrollbar-thumb:hover,
#comm-ui *::-webkit-scrollbar-thumb:hover,
.ecu-chrome-stack::-webkit-scrollbar-thumb:hover,
.ecu-chrome-stack *::-webkit-scrollbar-thumb:hover,
.charactersui.charactersuic::-webkit-scrollbar-thumb:hover,
.ecu-server-dd-menu::-webkit-scrollbar-thumb:hover,
#bottomleftcorner::-webkit-scrollbar-thumb:hover,
#ecu-buff-dialog::-webkit-scrollbar-thumb:hover,
#ecu-item-dialog::-webkit-scrollbar-thumb:hover,
#topleftcorner::-webkit-scrollbar-thumb:hover {
  background: #9a8840;
}
#comm-ui::-webkit-scrollbar-corner,
#comm-ui *::-webkit-scrollbar-corner,
.ecu-chrome-stack::-webkit-scrollbar-corner,
.ecu-chrome-stack *::-webkit-scrollbar-corner,
.charactersui.charactersuic::-webkit-scrollbar-corner,
.ecu-server-dd-menu::-webkit-scrollbar-corner,
#bottomleftcorner::-webkit-scrollbar-corner,
#ecu-buff-dialog::-webkit-scrollbar-corner,
#ecu-item-dialog::-webkit-scrollbar-corner,
#topleftcorner::-webkit-scrollbar-corner {
  background: #161616;
}
`;
  document.head.append(style);
}
