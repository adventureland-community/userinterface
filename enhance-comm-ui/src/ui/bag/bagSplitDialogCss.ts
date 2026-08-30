/** Modal for splitting inventory stacks. */

let injected = false;

const CSS = `
.ecu-bag-split-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483004;
  background: rgba(0, 0, 0, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}
.ecu-bag-split {
  min-width: min(380px, 94vw);
  max-width: 440px;
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
.ecu-bag-split__title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 600;
  color: #ffd28a;
}
.ecu-bag-split__item {
  margin: 0 0 14px;
  color: rgba(220, 210, 210, 0.92);
  line-height: 1.35;
}
.ecu-bag-split__preview {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 8px;
  align-items: center;
  margin: 0 0 14px;
}
.ecu-bag-split__stack {
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  text-align: center;
}
.ecu-bag-split__stack-label {
  display: block;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(200, 190, 170, 0.75);
  margin-bottom: 4px;
}
.ecu-bag-split__stack-qty {
  font-size: 24px;
  color: #fff;
  font-variant-numeric: tabular-nums;
}
.ecu-bag-split__arrow {
  color: rgba(232, 201, 106, 0.8);
  font-size: 18px;
}
.ecu-bag-split__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin: 0 0 12px;
}
.ecu-bag-split__controls input[type="range"] {
  flex: 1 1 140px;
  min-width: 120px;
  height: 18px;
  accent-color: #c9a227;
  cursor: pointer;
}
.ecu-bag-split__controls input[type="number"] {
  width: 72px;
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  box-sizing: border-box;
}
.ecu-bag-split__controls input[type="number"]:focus {
  outline: none;
  border-color: rgba(232, 201, 106, 0.55);
  box-shadow: 0 0 0 1px rgba(232, 201, 106, 0.2);
}
.ecu-bag-split__presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 14px;
}
.ecu-bag-split__presets button {
  flex: 1 1 0;
  min-width: 72px;
  padding: 7px 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: #ddd;
  font-size: 14px;
  cursor: pointer;
}
.ecu-bag-split__presets button:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(232, 201, 106, 0.35);
}
.ecu-bag-split__presets button.is-active {
  background: rgba(232, 201, 106, 0.18);
  border-color: rgba(232, 201, 106, 0.55);
  color: #fff;
}
.ecu-bag-split__hint {
  min-height: 18px;
  margin: 0 0 8px;
  font-size: 13px;
  color: #e88;
}
.ecu-bag-split__shortcuts {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.4;
  color: rgba(200, 190, 170, 0.72);
}
.ecu-bag-split__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.ecu-bag-split__actions button {
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: #eee;
  font-size: 15px;
  cursor: pointer;
}
.ecu-bag-split__actions button:hover {
  background: rgba(255, 255, 255, 0.12);
}
.ecu-bag-split__actions button.primary {
  background: rgba(232, 201, 106, 0.22);
  border-color: rgba(232, 201, 106, 0.55);
  color: #fff;
}
.ecu-bag-split__actions button.primary:hover {
  background: rgba(232, 201, 106, 0.32);
}
`;

export function ensureBagSplitDialogCss(): void {
  if (injected) return;
  injected = true;
  const style = document.createElement("style");
  style.setAttribute("data-ecu-bag-split", "1");
  style.textContent = CSS;
  document.head.appendChild(style);
}
