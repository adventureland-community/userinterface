/** Chat panel styles — injected once. */

import { phoneShellExpandCss } from "../../chrome/phoneShell";

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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #666;
  background: #22252c;
  color: #ddd;
  font-family: inherit;
  line-height: 0;
}
.ecu-chat-expand.is-expanded {
  border-color: var(--ecu-chat-accent);
  color: #ffe08a;
  background: #2a2410;
}
.ecu-chat-expand .ecu-expand-glyph {
  display: block;
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
.ecu-chat.is-phone .ecu-chat-status.is-err {
  /* Fixture / hub pull noise shouldn't eat the compose stack on phone. */
  display: none;
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
/* PeerPageDots chrome — keep chat-panel border under the shared pager. */
.ecu-chat-server-dots {
  border-bottom: 1px solid var(--ecu-chat-line);
  background: var(--ecu-chat-panel);
}
/* Phone: keep server pager above the log so compose stays a clean thumb path. */
.ecu-chat.is-narrow .ecu-chat-server-dots {
  flex-shrink: 0;
  padding: 2px 6px 4px;
}
.ecu-chat.is-narrow .ecu-chat-main {
  width: 100%;
  min-width: 0;
  flex: 1 1 auto;
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
/* Wide expand only — never override the narrow drawer (phone FULL mode). */
.ecu-chat.is-expanded:not(.is-narrow) .ecu-chat-sidebar {
  flex: 0 0 280px;
  width: 280px;
}
.ecu-chat.is-narrow.is-expanded .ecu-chat-sidebar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: min(300px, 86%);
  flex: none;
  z-index: 2;
}
.ecu-chat.is-narrow .ecu-chat-log {
  padding: 6px 10px 8px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.ecu-chat.is-narrow .ecu-chat-log .ecu-chat-line {
  padding-top: 6px;
  padding-bottom: 6px;
  flex: 0 0 auto;
}
.ecu-chat.is-narrow .ecu-chat-log,
.ecu-chat.is-narrow .ecu-chat-body {
  overflow-wrap: anywhere;
  word-break: normal;
}

/* Stock-like FULL mode — lift the chat shell over the layout + phone dock. */
/* Phone / narrow compose — 44px targets above the soft keyboard. */
.ecu-chat.is-narrow .ecu-chat-compose {
  padding: 8px 10px;
  gap: 6px;
}
.ecu-chat.is-narrow .ecu-chat-compose-row {
  gap: 8px;
  align-items: stretch;
}
.ecu-chat.is-narrow .ecu-chat-to,
.ecu-chat.is-narrow .ecu-chat-input,
.ecu-chat.is-narrow .ecu-chat-send {
  min-height: 44px;
  font-size: 16px;
  line-height: 1.2;
  padding: 10px 12px;
}
.ecu-chat.is-narrow .ecu-chat-to {
  flex: 0 1 96px;
  max-width: 110px;
}
.ecu-chat.is-narrow .ecu-chat-send {
  min-width: 72px;
  flex: 0 0 auto;
}

/* Phone hub — Material-style segment + bubble transcript. */
.ecu-chat.is-phone .ecu-chat-phone-hub {
  flex-shrink: 0;
  padding: 6px 10px 4px;
  border-bottom: 1px solid var(--ecu-chat-line);
  background: var(--ecu-chat-panel);
}
.ecu-chat.is-phone .ecu-chat-phone-hub--foot {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 10px 0;
  border-top: 1px solid var(--ecu-chat-line);
  background: var(--ecu-chat-panel);
}
.ecu-chat.is-phone .ecu-chat-phone-done {
  appearance: none;
  flex: 0 0 auto;
  width: calc(100% - 20px);
  margin: 0 10px 8px;
  min-height: 44px;
  border: 1px solid #4a6a7a;
  border-radius: 12px;
  background: rgba(157, 212, 236, 0.14);
  color: #9dd4ec;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
.ecu-chat.is-phone .ecu-chat-phone-seg {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: #101214;
  border: 1px solid #333;
}
.ecu-chat.is-phone .ecu-chat-phone-seg-btn {
  appearance: none;
  cursor: pointer;
  flex: 1 1 0;
  min-width: 0;
  min-height: 40px;
  padding: 8px 10px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #a8aeb6;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.1;
}
.ecu-chat.is-phone .ecu-chat-phone-seg-btn.is-on {
  background: #2a3340;
  color: #e8f0ff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
}
.ecu-chat.is-phone .ecu-chat-server-pick {
  cursor: pointer;
  flex: 1 1 auto;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid #555;
  border-radius: 999px;
  background: #181a20;
  color: #c9e4ff;
  font-family: inherit;
  font-size: 16px;
  line-height: 20px;
  font-weight: normal;
  text-align: left;
}
.ecu-chat.is-phone .ecu-chat-server-pick.is-open {
  border-color: var(--ecu-chat-accent);
  background: #2a2410;
  color: #ffe08a;
}
.ecu-chat.is-phone .ecu-chat-server-pick-caret {
  flex: 0 0 auto;
  font-size: 12px;
  opacity: 0.85;
}
.ecu-chat.is-phone .ecu-chat-server-sheet-backdrop {
  position: absolute;
  inset: 0;
  z-index: 4;
  border: none;
  padding: 0;
  margin: 0;
  background: rgba(0, 0, 0, 0.45);
  cursor: pointer;
}
.ecu-chat.is-phone .ecu-chat-server-sheet {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 0;
  z-index: 5;
  max-height: min(52%, 320px);
  display: flex;
  flex-direction: column;
  border-radius: 14px 14px 0 0;
  border: 1px solid var(--ecu-chat-line);
  border-bottom: none;
  background: var(--ecu-chat-panel);
  box-shadow: 0 -10px 28px rgba(0, 0, 0, 0.5);
}
.ecu-chat.is-phone .ecu-chat-server-sheet-head {
  flex-shrink: 0;
  padding: 10px 12px 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ecu-chat-muted);
}
.ecu-chat.is-phone .ecu-chat-server-sheet-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0 8px 10px;
}
.ecu-chat.is-phone .ecu-chat-server-sheet-row {
  cursor: pointer;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 0 0 6px;
  padding: 10px 12px;
  min-height: 44px;
  border: 1px solid #444;
  border-radius: 10px;
  background: #181a20;
  color: #e8e8e8;
  font-family: inherit;
  font-size: 16px;
  line-height: 20px;
  text-align: left;
}
.ecu-chat.is-phone .ecu-chat-server-sheet-row.is-active {
  border-color: var(--ecu-chat-accent);
  background: #2a2410;
  color: #ffe08a;
}
.ecu-chat.is-phone .ecu-chat-server-sheet-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-chat.is-phone .ecu-chat-server-sheet-count {
  flex: 0 0 auto;
  font-size: 13px;
  color: var(--ecu-chat-muted);
}
.ecu-chat.is-phone .ecu-chat-quick-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0 0 2px;
}
.ecu-chat.is-phone .ecu-chat-quick-chip {
  cursor: pointer;
  flex: 0 0 auto;
  min-height: 36px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid #555;
  background: #181a20;
  color: #ddd;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.1;
  font-weight: 600;
}
.ecu-chat.is-phone .ecu-chat-quick-chip:disabled {
  opacity: 0.45;
  cursor: default;
}
.ecu-chat.is-phone .ecu-chat-log {
  padding: 8px 10px 10px;
}
.ecu-chat.is-phone .ecu-chat-line {
  display: block;
  flex: 0 0 auto;
  max-width: 88%;
  padding: 3px 0;
  align-self: flex-start;
}
.ecu-chat.is-phone .ecu-chat-line.ecu-chat-row--mine {
  align-self: flex-end;
}
.ecu-chat.is-phone .ecu-chat-line.ecu-chat-row--system {
  align-self: center;
  max-width: 96%;
}
.ecu-chat.is-phone .ecu-chat-row {
  margin: 0;
  max-width: 100%;
}
.ecu-chat.is-phone .ecu-chat-bubble {
  box-sizing: border-box;
  padding: 8px 10px 10px;
  border-radius: 16px 16px 16px 4px;
  background: #22252c;
  border: 1px solid #3a4048;
  color: inherit;
}
.ecu-chat.is-phone .ecu-chat-row--mine .ecu-chat-bubble {
  border-radius: 16px 16px 4px 16px;
  background: #2a2410;
  border-color: rgba(201, 162, 39, 0.45);
}
.ecu-chat.is-phone .ecu-chat-row--party .ecu-chat-bubble {
  background: rgba(40, 56, 72, 0.95);
  border-color: rgba(126, 200, 239, 0.35);
}
.ecu-chat.is-phone .ecu-chat-row--pm .ecu-chat-bubble {
  background: rgba(56, 36, 44, 0.95);
  border-color: rgba(240, 160, 180, 0.35);
}
.ecu-chat.is-phone .ecu-chat-row--system .ecu-chat-bubble {
  background: transparent;
  border-color: transparent;
  font-style: italic;
}
.ecu-chat.is-phone .ecu-chat-bubble-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
  font-size: var(--ecu-chat-fs-meta);
  line-height: 18px;
}
.ecu-chat.is-phone .ecu-chat-row--mine .ecu-chat-bubble-meta {
  flex-direction: row-reverse;
}
.ecu-chat.is-phone .ecu-chat-bubble-meta .ecu-chat-time {
  margin: 0;
  flex: 0 0 auto;
}
.ecu-chat.is-phone .ecu-chat-bubble-meta .ecu-chat-owner {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: inherit;
  line-height: inherit;
}
.ecu-chat.is-phone .ecu-chat-bubble .ecu-chat-body {
  display: block;
  font-size: 16px;
  line-height: 1.35;
}
.ecu-chat.is-phone.is-keyboard .ecu-chat-phone-hub,
.ecu-chat.is-phone.is-keyboard .ecu-chat-title-from,
.ecu-chat.is-phone.is-keyboard .ecu-chat-expand {
  display: none;
}
.ecu-chat.is-phone.is-keyboard .ecu-chat-title {
  min-height: 0;
  padding: 4px 8px;
  gap: 6px;
}
.ecu-chat.is-phone.is-keyboard .ecu-chat-title-label,
.ecu-chat.is-phone.is-keyboard .ecu-chat-server-pick {
  font-size: 14px;
  line-height: 18px;
}
.ecu-chat.is-phone.is-keyboard .ecu-chat-quick-row {
  display: none;
}
.ecu-chat.is-phone.is-keyboard .ecu-chat-status.is-visible {
  padding-top: 0;
  line-height: 16px;
  font-size: 12px;
}
` +
  phoneShellExpandCss("chat", "ecu-chat-shell-expanded", ".ecu-chat");

let injected = false;

export function ensureChatCss(): void {
  if (typeof document === "undefined") return;
  if (injected || document.getElementById("ecu-chat-css")) {
    injected = true;
    return;
  }
  const el = document.createElement("style");
  el.id = "ecu-chat-css";
  el.textContent = CHAT_PANEL_CSS;
  document.head.appendChild(el);
  injected = true;
}
