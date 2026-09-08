/** Chat panel styles — injected once. */

export const CHAT_PANEL_CSS = `
.ecu-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 220px;
  box-sizing: border-box;
  color: #f0f0f0;
  font-size: 16px;
  background: #14161a;
}
.ecu-chat-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid #3a3a3a;
  flex-shrink: 0;
  background: #1a1c22;
}
.ecu-chat-mode {
  display: inline-flex;
  gap: 2px;
}
.ecu-chat-mode button {
  cursor: pointer;
  font-size: 13px;
  padding: 4px 10px;
  border: 1px solid #666;
  background: #22252c;
  color: #ddd;
}
.ecu-chat-mode button.is-on {
  border-color: #c9a227;
  background: #2a2410;
  color: #ffe08a;
}
.ecu-chat-whisper {
  flex: 1 1 120px;
  min-width: 100px;
  max-width: 180px;
  box-sizing: border-box;
  padding: 5px 8px;
  border: 1px solid #555;
  background: #0e1014;
  color: #f0f0f0;
  font-size: 14px;
}
.ecu-chat-log {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 8px 10px;
  min-height: 120px;
  line-height: 1.45;
  background: #0e1014;
}
.ecu-chat-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 6px;
  margin: 0 0 6px;
  word-break: break-word;
  color: #f2f2f2;
  font-size: 16px;
}
.ecu-chat-row--party {
  color: #7ec8ef;
}
.ecu-chat-row--pm {
  color: #f0a0b4;
}
.ecu-chat-row--system {
  color: #c4c8ce;
  font-style: italic;
}
.ecu-chat-time {
  flex: 0 0 auto;
  color: #9aa0a8;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  min-width: 3.2em;
}
.ecu-chat-owner {
  color: #ffffff;
  margin-right: 2px;
  font-weight: 700;
}
.ecu-chat-body {
  color: inherit;
  flex: 1 1 auto;
  min-width: 0;
}
.ecu-chat-x {
  color: #7a8088;
  margin-left: 4px;
  font-size: 12px;
}
.ecu-chat-local {
  opacity: 0.9;
}
.ecu-chat-compose {
  display: flex;
  gap: 6px;
  padding: 8px 10px;
  border-top: 1px solid #3a3a3a;
  flex-shrink: 0;
  background: #1a1c22;
}
.ecu-chat-input {
  flex: 1 1 auto;
  min-width: 0;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid #555;
  background: #0e1014;
  color: #f0f0f0;
  font-size: 15px;
}
.ecu-chat-input::placeholder {
  color: #8a9098;
}
.ecu-chat-send {
  cursor: pointer;
  flex-shrink: 0;
  padding: 6px 14px;
  border: 1px solid #c9a227;
  background: #2a2410;
  color: #ffe08a;
  font-size: 14px;
}
.ecu-chat-send:disabled {
  opacity: 0.45;
  cursor: default;
}
.ecu-chat-status {
  padding: 0 10px 6px;
  font-size: 13px;
  color: #a8aeb6;
  flex-shrink: 0;
  background: #1a1c22;
}
.ecu-chat-status.is-err {
  color: #f0a0a0;
}
.ecu-chat-empty {
  color: #a8aeb6;
  font-style: italic;
  padding: 10px 0;
  font-size: 14px;
}
.ecu-chat-history-top {
  text-align: center;
  padding: 4px 0 10px;
}
.ecu-chat-load-older {
  cursor: pointer;
  font-size: 13px;
  padding: 4px 12px;
  border: 1px solid #555;
  background: #22252c;
  color: #ddd;
}
.ecu-chat-load-older:disabled {
  opacity: 0.5;
  cursor: default;
}
.ecu-chat-history-end {
  text-align: center;
  color: #8a9098;
  font-size: 13px;
  padding: 4px 0 10px;
}
.ecu-btn[data-ecu-chat] {
  position: relative;
  overflow: visible;
}
.ecu-btn[data-ecu-chat] .ecu-chat-badge {
  position: absolute;
  top: -7px;
  right: -8px;
  min-width: 22px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #d33;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  font-family: Consolas, "Segoe UI", Tahoma, sans-serif;
  letter-spacing: 0;
  line-height: 18px;
  text-align: center;
  box-shadow: 0 0 0 1px #1a1a1a;
  pointer-events: none;
}
`;

let injected = false;

export function ensureChatCss(): void {
  if (typeof document === "undefined") return;
  const existing = document.getElementById("ecu-chat-css");
  if (existing) {
    existing.textContent = CHAT_PANEL_CSS;
    injected = true;
    return;
  }
  const el = document.createElement("style");
  el.id = "ecu-chat-css";
  el.textContent = CHAT_PANEL_CSS;
  document.head.appendChild(el);
  injected = true;
}
