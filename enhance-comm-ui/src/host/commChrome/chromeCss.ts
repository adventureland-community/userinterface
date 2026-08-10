const STYLE_ID = "comm-ui-chrome-css";

export function injectChromeCss(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
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

/* Secondary control cluster — same visual language, larger hit targets */
.ecu-actions {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: stretch;
  justify-content: center;
  gap: 8px;
  padding: 6px 8px;
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
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
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
  width: max(100%, 240px);
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
  gap: 14px;
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
  font-weight: 400 !important;
  text-shadow: none !important;
}
.ecu-server-dd-option-players {
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
  .ecu-chrome {
    flex: 1 1 auto;
    min-width: 0;
  }
  .charactersui.charactersuic {
    max-width: min(62vw, 640px);
  }
}

/* Party roster: Buffs mode control — hover / layout-edit / touch */
.ecu-roster-buffs {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.12s ease;
}
.ecu-roster:hover .ecu-roster-buffs,
.ecu-roster.is-layout-edit .ecu-roster-buffs,
#comm-ui.comm-ui-touch .ecu-roster-buffs,
#comm-ui[data-viewport="tablet"] .ecu-roster-buffs,
#comm-ui[data-viewport="phone"] .ecu-roster-buffs {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
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
#comm-ui[data-viewport="phone"] .comm-pos-combat,
#comm-ui[data-viewport="phone"] .comm-pos-bag,
#comm-ui[data-viewport="phone"] .comm-pos-command {
  max-width: 96vw;
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
