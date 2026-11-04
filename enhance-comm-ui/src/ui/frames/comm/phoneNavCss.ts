/**
 * Material-inspired phone dock + bottom sheet (dark surface, ECU cyan accent).
 * Injected once; only used when PhoneNavDock mounts.
 */

const STYLE_ID = "ecu-phone-nav-css";

const CSS = `
.ecu-phone-dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 240;
  pointer-events: none;
  font-family: Roboto, "Segoe UI", system-ui, sans-serif;
}
.ecu-phone-dock__bar {
  pointer-events: auto;
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 0;
  min-height: 44px;
  padding: 10px 2px calc(2px + env(safe-area-inset-bottom, 0px));
  background: #1c1b1f;
  border-top: 1px solid rgba(230, 225, 229, 0.12);
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.45);
  touch-action: pan-y;
  position: relative;
}
.ecu-phone-dock__nub {
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: rgba(230, 225, 229, 0.35);
  pointer-events: none;
}
.ecu-phone-dock__btn {
  position: relative;
  z-index: 1;
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  min-height: 40px;
  min-width: 0;
  margin: 0;
  padding: 4px 2px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #cac4d0;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ecu-phone-dock__btn:active {
  background: rgba(232, 222, 248, 0.08);
}
.ecu-phone-dock__btn.is-on {
  color: #9dd4ec;
}
.ecu-phone-dock__btn.is-on .ecu-phone-dock__glyph {
  background: rgba(157, 212, 236, 0.16);
}
.ecu-phone-dock__glyph {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 48px;
  height: 26px;
  border-radius: 14px;
  font-size: 15px;
  line-height: 1;
}
.ecu-phone-home-screen-label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
.ecu-phone-sheet-scrim {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0, 0, 0, 0.55);
  pointer-events: auto;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
}
.ecu-phone-sheet {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 510;
  max-height: none;
  height: 100%;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  background: #1c1b1f;
  border-radius: 0;
  box-shadow: none;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  font-family: Roboto, "Segoe UI", system-ui, sans-serif;
  color: #e6e1e5;
}
.ecu-phone-sheet__handle {
  align-self: center;
  width: 48px;
  height: 20px;
  margin: 6px 0 2px;
  border-radius: 2px;
  background: transparent;
  flex-shrink: 0;
  touch-action: none;
  position: relative;
}
.ecu-phone-sheet__handle::after {
  content: "";
  position: absolute;
  left: 8px;
  right: 8px;
  top: 8px;
  height: 4px;
  border-radius: 2px;
  background: rgba(230, 225, 229, 0.35);
}
.ecu-phone-sheet__hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 16px 12px;
  flex-shrink: 0;
  touch-action: none;
}
.ecu-phone-sheet__title {
  margin: 0;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: 0;
}
.ecu-phone-sheet__done {
  min-height: 40px;
  padding: 0 16px;
  border: none;
  border-radius: 20px;
  background: rgba(157, 212, 236, 0.16);
  color: #9dd4ec;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.ecu-phone-sheet__body {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0 8px 16px;
  flex: 1 1 auto;
  min-height: 0;
}
.ecu-phone-sheet__sec {
  margin: 12px 8px 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #cac4d0;
}
.ecu-phone-sheet__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  padding: 8px 12px;
  margin: 2px 0;
  border-radius: 12px;
}
.ecu-phone-sheet__row:active {
  background: rgba(232, 222, 248, 0.06);
}
.ecu-phone-sheet__row-label {
  font-size: 16px;
  font-weight: 400;
  min-width: 0;
}
.ecu-phone-sheet__row-meta {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: #938f99;
}
.ecu-phone-switch {
  position: relative;
  width: 52px;
  height: 32px;
  flex-shrink: 0;
}
.ecu-phone-switch input {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  cursor: pointer;
  z-index: 1;
}
.ecu-phone-switch__track {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 16px;
  background: #49454f;
  border: 2px solid #938f99;
  box-sizing: border-box;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.ecu-phone-switch__thumb {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #938f99;
  transition: transform 0.15s ease, background 0.15s ease, width 0.15s ease, height 0.15s ease, top 0.15s ease;
  pointer-events: none;
}
.ecu-phone-switch input:checked + .ecu-phone-switch__track {
  background: #9dd4ec;
  border-color: #9dd4ec;
}
.ecu-phone-switch input:checked + .ecu-phone-switch__track .ecu-phone-switch__thumb {
  transform: translateX(20px);
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  background: #00344a;
}
.ecu-phone-sheet__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 12px 8px;
}
.ecu-phone-sheet__chip {
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid rgba(147, 143, 153, 0.5);
  border-radius: 20px;
  background: transparent;
  color: #e6e1e5;
  font-size: 14px;
  cursor: pointer;
}
.ecu-phone-sheet__chip.is-on {
  border-color: #9dd4ec;
  color: #9dd4ec;
  background: rgba(157, 212, 236, 0.12);
}
.ecu-phone-edge-hint {
  position: fixed;
  left: 50%;
  bottom: calc(var(--ecu-phone-dock-h, 48px) + 72px);
  transform: translateX(-50%);
  z-index: 600;
  max-width: calc(100vw - 32px);
  padding: 10px 16px;
  border-radius: 12px;
  background: rgba(28, 27, 31, 0.94);
  border: 1px solid rgba(157, 212, 236, 0.45);
  color: #e6e1e5;
  font: 14px/1.3 Roboto, "Segoe UI", system-ui, sans-serif;
  pointer-events: none;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.ecu-phone-edge-hint.is-out {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
.ecu-phone-home-dots {
  pointer-events: auto;
  position: fixed;
  left: 0;
  right: 0;
  /* Sit in the clear fight viewport, just above dock + #bottom chrome. */
  bottom: calc(var(--ecu-phone-hud-bottom, 160px) + 10px);
  z-index: 235;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 6px 12px;
}
.ecu-phone-home-dots__dot {
  width: 8px;
  height: 8px;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.45);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ecu-phone-home-dots__dot.is-on {
  background: #ffffff;
  transform: scale(1.25);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
}
.ecu-phone-shade-scrim {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: var(--ecu-phone-dock-h, 48px);
  z-index: 500;
  background: rgba(0, 0, 0, 0.45);
  pointer-events: auto;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
}
.ecu-phone-shade {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 520;
  max-height: min(72vh, 560px);
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  background: #1c1b1f;
  border-radius: 0 0 28px 28px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.5);
  padding-top: env(safe-area-inset-top, 0px);
  font-family: Roboto, "Segoe UI", system-ui, sans-serif;
  color: #e6e1e5;
}
.ecu-phone-shade.is-qs-expanded {
  max-height: min(78vh, 640px);
}
.ecu-phone-shade__top {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
  min-height: 36px;
}
.ecu-phone-shade__cog {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 20px;
  background: rgba(157, 212, 236, 0.12);
  color: #9dd4ec;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ecu-phone-shade__cog:active {
  background: rgba(157, 212, 236, 0.22);
}
.ecu-phone-shade__qs {
  flex-shrink: 0;
  padding: 0 4px 8px;
  border-bottom: 1px solid rgba(230, 225, 229, 0.1);
  touch-action: none;
}
.ecu-phone-shade__qs-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px 0;
}
.ecu-phone-shade__sec {
  margin: 8px 12px 4px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #cac4d0;
}
.ecu-phone-shade__expand {
  min-height: 32px;
  padding: 0 12px;
  border: none;
  border-radius: 16px;
  background: rgba(157, 212, 236, 0.12);
  color: #9dd4ec;
  font-size: 13px;
  cursor: pointer;
}
.ecu-phone-shade__notifs {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  padding: 4px 8px 16px;
  flex: 1 1 auto;
}
.ecu-phone-shade__notif {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  min-height: 56px;
  margin: 4px 0;
  padding: 10px 14px;
  border: none;
  border-radius: 16px;
  background: #2b2930;
  color: #e6e1e5;
  text-align: left;
  cursor: pointer;
}
.ecu-phone-shade__notif-title {
  font-size: 16px;
  font-weight: 500;
}
.ecu-phone-shade__notif-meta {
  font-size: 13px;
  color: #938f99;
}
.ecu-phone-apps {
  padding: 4px 16px 24px;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}
.ecu-phone-apps__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px 12px;
  padding: 12px 4px 20px;
  align-content: start;
  flex: 1 1 auto;
}
.ecu-phone-apps__tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 4px;
  border: none;
  background: transparent;
  color: #e6e1e5;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ecu-phone-apps__tile.is-on .ecu-phone-apps__icon {
  box-shadow: 0 0 0 2px #9dd4ec;
}
.ecu-phone-apps__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}
.ecu-phone-apps__label {
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
  max-width: 72px;
}
.ecu-phone-apps__edit {
  display: block;
  width: 100%;
  min-height: 44px;
  margin: 4px 0 0;
  border: 1px solid rgba(147, 143, 153, 0.45);
  border-radius: 22px;
  background: transparent;
  color: #cac4d0;
  font-size: 14px;
  cursor: pointer;
}
`;

export function ensurePhoneNavCss(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.append(style);
}
