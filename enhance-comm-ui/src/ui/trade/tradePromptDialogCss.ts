/** Async trade prompts — non-blocking (sync prompt freezes socket heartbeat). */

let injected = false;

const CSS = `
.ecu-trade-prompt-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483005;
  background: rgba(0, 0, 0, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}
.ecu-trade-prompt {
  min-width: min(400px, 94vw);
  max-width: 460px;
  padding: 18px 20px 16px;
  background: linear-gradient(180deg, #1a171b 0%, #0e0c10 100%);
  border: 1px solid rgba(0, 0, 0, 0.85);
  outline: 1px solid rgba(232, 201, 106, 0.35);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.7);
  color: #eee;
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
  font-size: 15px;
  box-sizing: border-box;
}
.ecu-trade-prompt__title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 600;
  color: #ffd28a;
}
.ecu-trade-prompt__item {
  margin: 0 0 12px;
  color: rgba(220, 210, 210, 0.92);
  line-height: 1.35;
}
.ecu-trade-prompt__item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 14px;
}
.ecu-trade-prompt__icon {
  flex: 0 0 auto;
  line-height: 0;
  font-size: 0;
}
.ecu-trade-prompt__icon .itemslot,
.ecu-trade-prompt__icon .item_container {
  margin: 0 !important;
}
.ecu-trade-prompt__item-text {
  flex: 1;
  min-width: 0;
}
.ecu-trade-prompt__item-name {
  color: rgba(235, 225, 210, 0.96);
  font-size: 15px;
  line-height: 1.35;
  word-break: break-word;
}
.ecu-trade-prompt__nearby {
  margin: 0 0 12px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.ecu-trade-prompt__nearby-title {
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(200, 180, 120, 0.85);
  margin-bottom: 6px;
}
.ecu-trade-prompt__nearby-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 88px;
  overflow-y: auto;
}
.ecu-trade-prompt__nearby-row {
  font-size: 13px;
  color: rgba(210, 205, 195, 0.92);
  font-variant-numeric: tabular-nums;
}
.ecu-trade-prompt__field {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 0 0 10px;
}
.ecu-trade-prompt__field input[type="number"],
.ecu-trade-prompt__field input[type="text"] {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  box-sizing: border-box;
}
.ecu-trade-prompt__field input:focus {
  outline: none;
  border-color: rgba(232, 201, 106, 0.55);
  box-shadow: 0 0 0 1px rgba(232, 201, 106, 0.2);
}
.ecu-trade-prompt__suffix {
  color: rgba(200, 190, 170, 0.85);
  font-size: 14px;
  white-space: nowrap;
}
.ecu-trade-prompt__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 12px;
}
.ecu-trade-prompt__chips button {
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: #ddd;
  font-size: 13px;
  cursor: pointer;
}
.ecu-trade-prompt__chips button:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(232, 201, 106, 0.35);
}
.ecu-trade-prompt__chips button.is-active,
.ecu-trade-prompt__chip.is-active {
  background: rgba(232, 201, 106, 0.18);
  border-color: rgba(232, 201, 106, 0.55);
  color: #fff;
}
.ecu-trade-prompt__chip--vendor {
  border-color: rgba(140, 190, 140, 0.35);
}
.ecu-trade-prompt__chip--nearby,
.ecu-trade-prompt__chip--undercut {
  border-color: rgba(143, 212, 255, 0.28);
}
.ecu-trade-prompt__chip--last,
.ecu-trade-prompt__chip--current,
.ecu-trade-prompt__chip--yours {
  border-color: rgba(232, 201, 106, 0.28);
}
.ecu-trade-prompt__hint {
  min-height: 18px;
  margin: 0 0 12px;
  font-size: 13px;
  color: #e88;
}
.ecu-trade-prompt__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.ecu-trade-prompt__actions button {
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: #eee;
  font-size: 15px;
  cursor: pointer;
}
.ecu-trade-prompt__actions button.primary {
  background: rgba(232, 201, 106, 0.22);
  border-color: rgba(232, 201, 106, 0.55);
  color: #fff;
}
`;

export function ensureTradePromptDialogCss(): void {
  if (injected) return;
  injected = true;
  const style = document.createElement("style");
  style.setAttribute("data-ecu-trade-prompt", "1");
  style.textContent = CSS;
  document.head.appendChild(style);
}
