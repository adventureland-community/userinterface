/** Cooltip menus, bookmark overlay, and switch grid. */
export const METER_COOLTIP_CSS = `
/* Floating Cooltip (Details GameCooltip analogue)
 * Portaled to document.body — do NOT rely on --meter-* vars from .ecu-meter-shell. */
.ecu-meter-cooltip,
.ecu-meter-switch-overlay,
.ecu-meter-bookmark-overlay {
  --meter-cooltip-bg: #141214;
  --meter-muted: rgba(220, 210, 210, 0.78);
  --meter-accent: #e8c96a;
}
.ecu-meter-cooltip {
  position: fixed;
  background: #141214;
  border: 1px solid rgba(0,0,0,0.85);
  outline: 1px solid rgba(232, 201, 106, 0.28);
  border-radius: 0;
  padding: 4px 0;
  box-shadow: 0 10px 28px rgba(0,0,0,0.65);
  color: #eee;
  font-size: 11px;
  max-height: min(360px, 72vh);
  overflow-x: hidden;
  overflow-y: auto;
  pointer-events: auto;
  z-index: 2147483000;
  scrollbar-width: thin;
  scrollbar-color: #5a5050 #1a1618;
}
.ecu-meter-cooltip::-webkit-scrollbar {
  width: 8px;
}
.ecu-meter-cooltip::-webkit-scrollbar-track {
  background: #1a1618;
}
.ecu-meter-cooltip::-webkit-scrollbar-thumb {
  background: #5a5050;
  border-radius: 2px;
}
/* Hover bridge so mouse can travel from toolbar → tip without closing. */
.ecu-meter-cooltip::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: -10px;
  height: 10px;
}
.ecu-meter-cooltip-sec {
  padding: 4px 10px 2px;
  color: rgba(220, 210, 210, 0.78);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ecu-meter-cooltip-item {
  display: block;
  width: 100%;
  box-sizing: border-box;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  color: #eee;
  padding: 4px 12px;
  font-size: 12px;
  line-height: 1.35;
}
.ecu-meter-cooltip-item:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}
.ecu-meter-cooltip-item.is-selected {
  color: #ffd28a;
  background: rgba(232, 201, 106, 0.12);
}
.ecu-meter-cooltip-item.is-muted {
  color: rgba(220, 210, 210, 0.55);
}
.ecu-meter-cooltip-div {
  height: 1px;
  margin: 4px 8px;
  background: rgba(255,255,255,0.1);
}
.ecu-meter-bookmark-overlay {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: #141214;
  border: 1px solid rgba(255,255,255,0.12);
  box-sizing: border-box;
  overflow: auto;
  z-index: 2147483000;
  pointer-events: auto;
  color: #eee;
}
.ecu-meter-bookmark-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}
.ecu-meter-bookmark-hint {
  padding: 0 2px 4px;
  color: rgba(220, 210, 210, 0.55);
  font-size: 10px;
}
.ecu-meter-bookmark-slot {
  cursor: grab;
  text-align: left;
  padding: 6px 8px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  color: #eee;
  font-size: 11px;
  border-radius: 2px;
  min-height: 32px;
  touch-action: none;
  user-select: none;
}
.ecu-meter-bookmark-slot.is-dragging {
  opacity: 0.45;
  cursor: grabbing;
  border-style: dashed;
}
.ecu-meter-bookmark-slot.is-drop-target {
  border-color: rgba(232, 201, 106, 0.65);
  background: rgba(232, 201, 106, 0.14);
  box-shadow: inset 0 0 0 1px rgba(232, 201, 106, 0.25);
}
.ecu-meter-bookmark-slot:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.22);
}
.ecu-meter-bookmark-slot.is-empty {
  color: rgba(220, 210, 210, 0.55);
  font-style: italic;
}
/* All-displays Switch grid (title right-click) */
.ecu-meter-switch-overlay {
  position: fixed;
  padding: 6px;
  background: #141214;
  border: 1px solid rgba(0,0,0,0.85);
  outline: 1px solid rgba(232, 201, 106, 0.28);
  box-shadow: 0 10px 28px rgba(0,0,0,0.65);
  max-height: min(360px, 70vh);
  overflow: auto;
  color: #eee;
  font-size: 11px;
  z-index: 2147483000;
  pointer-events: auto;
  scrollbar-width: thin;
  scrollbar-color: #5a5050 #1a1618;
}
.ecu-meter-switch-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}
.ecu-meter-switch-sec {
  grid-column: 1 / -1;
  padding: 6px 4px 2px;
  color: rgba(220, 210, 210, 0.78);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ecu-meter-switch-cell {
  cursor: pointer;
  text-align: left;
  padding: 6px 8px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  color: #eee;
  font-size: 11px;
  border-radius: 2px;
  min-height: 28px;
}
.ecu-meter-switch-cell:hover {
  background: rgba(255,255,255,0.1);
}
.ecu-meter-switch-cell.is-selected {
  color: #ffd28a;
  border-color: rgba(232, 201, 106, 0.45);
  background: rgba(232, 201, 106, 0.12);
}
/* —— Details parity: segment outcome colors —— */
.ecu-meter-cooltip-item.ecu-seg-wipe,
.ecu-seg-wipe {
  color: #ef5350;
}
.ecu-meter-cooltip-item.ecu-seg-wipe:hover {
  color: #ff8a80;
  background: rgba(229, 57, 53, 0.12);
}
.ecu-meter-cooltip-item.ecu-seg-kill,
.ecu-seg-kill {
  color: #66bb6a;
}
.ecu-meter-cooltip-item.ecu-seg-kill:hover {
  color: #a5d6a7;
  background: rgba(76, 175, 80, 0.12);
}
/* —— Details parity: bookmark header —— */
.ecu-meter-bookmark-hd {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  margin: -8px -8px 6px;
  background: linear-gradient(180deg, #34292d 0%, #241c20 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.55);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}
.ecu-meter-bookmark-hd-title {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  color: #ffd28a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-meter-bookmark-hd .ecu-meter-tool,
.ecu-meter-bookmark-hd .ecu-meter-btn {
  flex-shrink: 0;
}
`;
