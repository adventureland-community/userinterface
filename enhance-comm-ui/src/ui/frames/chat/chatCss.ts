/** Chat panel styles — injected once. */

export const CHAT_PANEL_CSS = `
.ecu-chat {
  --ecu-chat-fg: #f0f0f0;
  --ecu-chat-muted: #a8aeb6;
  --ecu-chat-dim: #8a9098;
  --ecu-chat-line: #3a3a3a;
  --ecu-chat-bg: #14161a;
  --ecu-chat-panel: #1a1c22;
  --ecu-chat-log: #0e1014;
  --ecu-chat-accent: #c9a227;
  /* Match stock #comm-chat: 24px body, 20px meta (pixel face). */
  --ecu-chat-fs: 24px;
  --ecu-chat-fs-meta: 20px;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 200px;
  box-sizing: border-box;
  color: var(--ecu-chat-fg);
  font-family: var(--pixel-font, pixel), Pixel, sans-serif;
  font-size: var(--ecu-chat-fs);
  line-height: 24px;
  font-weight: normal;
  background: var(--ecu-chat-bg);
  -webkit-font-smoothing: subpixel-antialiased;
}
.ecu-chat-layout {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  position: relative;
}
.ecu-chat-sidebar {
  flex: 0 0 248px;
  width: 248px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--ecu-chat-line);
  background: var(--ecu-chat-panel);
  z-index: 2;
}
.ecu-chat-sidebar-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-bottom: 1px solid var(--ecu-chat-line);
  flex-shrink: 0;
}
.ecu-chat-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.ecu-chat-filter-btn {
  cursor: pointer;
  flex: 1 1 auto;
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid #555;
  background: #181a20;
  color: #a8aeb6;
  font-family: inherit;
  font-size: 16px;
  font-weight: normal;
  line-height: 18px;
}
.ecu-chat-filter-btn.is-active {
  border-color: var(--ecu-chat-accent);
  background: #2a2410;
  color: #ffe08a;
}
.ecu-chat-sidebar-empty {
  color: var(--ecu-chat-muted);
  font-size: var(--ecu-chat-fs-meta);
  line-height: 20px;
  font-style: italic;
  padding: 10px 8px;
}
.ecu-chat-sidebar-btn {
  cursor: pointer;
  width: 100%;
  box-sizing: border-box;
  padding: 6px 10px;
  border: 1px solid #666;
  background: #22252c;
  color: #ddd;
  font-family: inherit;
  font-size: var(--ecu-chat-fs-meta);
  line-height: 20px;
  font-weight: normal;
  text-align: left;
}
.ecu-chat-sidebar-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.ecu-chat-conv-list {
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 0;
  padding: 4px;
}
.ecu-chat-conv {
  display: block;
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;
  text-align: left;
  margin: 0 0 4px;
  padding: 6px 8px;
  border: 1px solid transparent;
  background: transparent;
  color: #e8e8e8;
  font-family: inherit;
  font-size: var(--ecu-chat-fs);
  line-height: 22px;
  font-weight: normal;
}
.ecu-chat-conv:hover {
  background: #22252c;
  border-color: #444;
}
.ecu-chat-conv.is-active {
  background: #2a2410;
  border-color: var(--ecu-chat-accent);
}
.ecu-chat-conv.is-unread:not(.is-active) {
  background: #1e222a;
  border-color: #5a4040;
}
.ecu-chat-conv-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 2px;
}
.ecu-chat-conv-label {
  color: #fff;
  font-size: inherit;
  font-weight: normal;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.ecu-chat-conv.is-unread .ecu-chat-conv-label {
  color: #fff;
}
.ecu-chat-conv.is-server .ecu-chat-conv-label {
  color: #c9e4ff;
}
.ecu-chat-conv.is-private .ecu-chat-conv-label {
  color: #f0a0b4;
}
.ecu-chat-conv.is-party .ecu-chat-conv-label {
  color: #7ec8ef;
}
.ecu-chat-unread-badge {
  flex: 0 0 auto;
  min-width: 20px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #d33;
  color: #fff;
  font-size: 14px;
  font-weight: normal;
  line-height: 18px;
  text-align: center;
  box-shadow: 0 0 0 1px #1a1a1a;
}
.ecu-chat-conv-time {
  flex: 0 0 auto;
  color: var(--ecu-chat-muted);
  font-size: var(--ecu-chat-fs-meta);
  line-height: 20px;
  font-variant-numeric: tabular-nums;
}
.ecu-chat-conv-preview {
  display: block;
  color: var(--ecu-chat-muted);
  font-size: var(--ecu-chat-fs-meta);
  line-height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-chat-conv.is-unread .ecu-chat-conv-preview {
  color: #d8dde4;
}
.ecu-chat-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
}
.ecu-chat-title {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--ecu-chat-line);
  background: var(--ecu-chat-panel);
  font-size: var(--ecu-chat-fs);
  line-height: 24px;
  font-weight: normal;
  color: #fff;
  min-height: 2.2em;
  box-sizing: border-box;
}
.ecu-chat-title-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1 1 auto;
}
.ecu-chat-title-from {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 1 auto;
  min-width: 0;
  max-width: 46%;
  font-weight: normal;
  color: var(--ecu-chat-muted);
}
.ecu-chat-title-from-sep {
  flex: 0 0 auto;
  color: var(--ecu-chat-dim);
  font-weight: normal;
}
.ecu-chat-title-from .ecu-chat-from {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 200px;
  width: auto;
  padding: 2px 4px;
  border: 1px solid #555;
  background: var(--ecu-chat-log);
  color: #ffe08a;
  font-family: inherit;
  font-size: var(--ecu-chat-fs-meta);
  line-height: 20px;
  font-weight: normal;
}
.ecu-chat-title-from--party {
  color: #7ec8ef;
  font-size: var(--ecu-chat-fs-meta);
  line-height: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ecu-chat-expand {
  cursor: pointer;
  flex: 0 0 auto;
  margin-left: 4px;
  padding: 4px 8px;
  border: 1px solid #666;
  background: #22252c;
  color: #ddd;
  font-family: inherit;
  font-size: 16px;
  font-weight: normal;
  line-height: 18px;
  letter-spacing: 0.04em;
}
.ecu-chat-expand.is-expanded {
  border-color: var(--ecu-chat-accent);
  color: #ffe08a;
  background: #2a2410;
}
.ecu-chat-title-toggle {
  cursor: pointer;
  flex: 0 0 auto;
  padding: 4px 8px;
  border: 1px solid #666;
  background: #22252c;
  color: #ddd;
  font-family: inherit;
  font-size: 16px;
  font-weight: normal;
  line-height: 18px;
}
.ecu-chat-title-toggle.is-open {
  border-color: var(--ecu-chat-accent);
  color: #ffe08a;
  background: #2a2410;
}
/* Thin busy pulse — absolute, never shifts layout. */
.ecu-chat-title.is-busy::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--ecu-chat-accent),
    transparent
  );
  background-size: 40% 100%;
  animation: ecu-chat-busy 1.1s linear infinite;
}
@keyframes ecu-chat-busy {
  0% { background-position: -40% 0; }
  100% { background-position: 140% 0; }
}
.ecu-chat-log {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 8px 10px;
  min-height: 80px;
  line-height: 24px;
  background: var(--ecu-chat-log);
}
.ecu-chat-row {
  display: block;
  margin: 0 0 6px;
  overflow-wrap: break-word;
  word-break: normal;
  color: #f2f2f2;
  font-size: var(--ecu-chat-fs);
  line-height: 24px;
  font-weight: normal;
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
  color: var(--ecu-chat-muted);
  font-size: var(--ecu-chat-fs-meta);
  line-height: 20px;
  font-variant-numeric: tabular-nums;
  margin-right: 6px;
}
.ecu-chat-owner {
  cursor: pointer;
  margin: 0 4px 0 0;
  padding: 0;
  border: none;
  background: transparent;
  color: #ffffff;
  font-weight: normal;
  font-size: inherit;
  font-family: inherit;
  line-height: inherit;
}
.ecu-chat-owner:hover {
  text-decoration: underline;
  color: #ffe08a;
}
.ecu-chat-body {
  color: inherit;
}
.ecu-chat-x {
  color: #7a8088;
  margin-left: 4px;
  font-size: var(--ecu-chat-fs-meta);
  line-height: 20px;
}
.ecu-chat-local {
  opacity: 0.9;
}
.ecu-chat-compose {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border-top: 1px solid var(--ecu-chat-line);
  flex-shrink: 0;
  background: var(--ecu-chat-panel);
}
.ecu-chat-compose-row {
  display: flex;
  gap: 5px;
  align-items: stretch;
  min-width: 0;
}
.ecu-chat-to {
  flex: 0 1 100px;
  width: auto;
  max-width: 120px;
  min-width: 64px;
  box-sizing: border-box;
  padding: 4px 6px;
  border: 1px solid #555;
  background: var(--ecu-chat-log);
  color: var(--ecu-chat-fg);
  font-family: inherit;
  font-size: var(--ecu-chat-fs-meta);
  line-height: 20px;
  font-weight: normal;
}
.ecu-chat-input {
  flex: 1 1 auto;
  min-width: 0;
  box-sizing: border-box;
  padding: 6px 8px;
  border: 1px solid #555;
  background: var(--ecu-chat-log);
  color: var(--ecu-chat-fg);
  font-family: inherit;
  font-size: var(--ecu-chat-fs);
  line-height: 24px;
  font-weight: normal;
}
.ecu-chat-input::placeholder {
  color: var(--ecu-chat-dim);
}
.ecu-chat-input:disabled {
  opacity: 0.55;
}
.ecu-chat-send {
  cursor: pointer;
  flex: 0 0 auto;
  padding: 4px 10px;
  border: 1px solid var(--ecu-chat-accent);
  background: #2a2410;
  color: #ffe08a;
  font-family: inherit;
  font-size: var(--ecu-chat-fs-meta);
  line-height: 20px;
  font-weight: normal;
}
.ecu-chat-send:disabled {
  opacity: 0.45;
  cursor: default;
}
/* Only take space when there is something to say. */
.ecu-chat-status {
  display: none;
  padding: 2px 10px 0;
  font-size: var(--ecu-chat-fs-meta);
  line-height: 20px;
  color: var(--ecu-chat-muted);
  flex-shrink: 0;
  background: var(--ecu-chat-panel);
  box-sizing: border-box;
}
.ecu-chat-status.is-visible {
  display: block;
}
.ecu-chat-status.is-err {
  color: #f0a0a0;
}
.ecu-chat-empty {
  color: var(--ecu-chat-muted);
  font-style: italic;
  padding: 10px 0;
  font-size: var(--ecu-chat-fs);
  line-height: 24px;
}
.ecu-chat-history-top {
  text-align: center;
  padding: 4px 0 10px;
}
.ecu-chat-load-older {
  cursor: pointer;
  font-family: inherit;
  font-size: var(--ecu-chat-fs-meta);
  line-height: 20px;
  font-weight: normal;
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
  color: var(--ecu-chat-dim);
  font-size: var(--ecu-chat-fs-meta);
  line-height: 20px;
  padding: 4px 0 10px;
}
.ecu-chat-backdrop {
  display: none;
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

/* Narrow panel: sidebar becomes a drawer so the message column stays readable. */
.ecu-chat.is-narrow .ecu-chat-sidebar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: min(280px, 82%);
  flex-basis: auto;
  transform: translateX(-105%);
  transition: transform 0.15s ease-out;
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.45);
  border-right: 1px solid var(--ecu-chat-line);
}
.ecu-chat.is-narrow.is-sidebar-open .ecu-chat-sidebar {
  transform: translateX(0);
}
.ecu-chat.is-narrow .ecu-chat-backdrop {
  display: block;
  position: absolute;
  inset: 0;
  z-index: 1;
  background: rgba(0, 0, 0, 0.45);
  border: none;
  padding: 0;
  cursor: pointer;
}
.ecu-chat.is-narrow:not(.is-sidebar-open) .ecu-chat-backdrop {
  display: none;
}
.ecu-chat.is-narrow .ecu-chat-main {
  width: 100%;
}
.ecu-chat.is-narrow .ecu-chat-compose-row {
  flex-wrap: nowrap;
}
.ecu-chat.is-narrow .ecu-chat-title-from {
  max-width: 42%;
}
.ecu-chat.is-narrow .ecu-chat-title-from .ecu-chat-from {
  max-width: 120px;
}
.ecu-chat.is-narrow .ecu-chat-to {
  flex: 0 1 88px;
}
.ecu-chat.is-expanded .ecu-chat-sidebar {
  flex: 0 0 280px;
  width: 280px;
}

/* Stock-like FULL mode — lift the chat shell over the layout. */
[data-panel="chat"].ecu-chat-shell-expanded {
  position: fixed !important;
  left: 10px !important;
  right: 10px !important;
  top: 10px !important;
  bottom: 56px !important;
  width: auto !important;
  height: auto !important;
  max-width: none !important;
  max-height: none !important;
  min-width: 0 !important;
  min-height: 0 !important;
  z-index: 480 !important;
  transform: none !important;
}
[data-panel="chat"].ecu-chat-shell-expanded .ecu-chat {
  height: 100%;
  min-height: 0;
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
