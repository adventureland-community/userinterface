/**
 * Guided tour styles — dim overlay + spotlight hole + callout card.
 */

let injected = false;

const CSS = `
.ecu-tour-root {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  pointer-events: none;
}
.ecu-tour-shade {
  position: fixed;
  background: rgba(0, 0, 0, 0.76);
  pointer-events: auto;
  z-index: 0;
}
.ecu-tour-spot {
  position: fixed;
  border-radius: 4px;
  background: transparent;
  pointer-events: none;
  z-index: 1;
  outline: 2px solid rgba(255, 210, 138, 0.95);
  outline-offset: 2px;
  box-shadow:
    0 0 0 4px rgba(255, 210, 138, 0.12),
    0 0 20px rgba(255, 210, 138, 0.55);
  animation: ecu-tour-spot-pulse 1.8s ease-in-out infinite;
  transition: top 0.15s ease, left 0.15s ease, width 0.15s ease, height 0.15s ease;
}
@keyframes ecu-tour-spot-pulse {
  0%, 100% {
    outline-color: rgba(255, 210, 138, 0.82);
    box-shadow:
      0 0 0 4px rgba(255, 210, 138, 0.1),
      0 0 16px rgba(255, 210, 138, 0.42);
  }
  50% {
    outline-color: rgba(255, 228, 170, 1);
    box-shadow:
      0 0 0 7px rgba(255, 210, 138, 0.22),
      0 0 32px rgba(255, 210, 138, 0.78);
  }
}
.ecu-tour-connector {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
  overflow: visible;
}
.ecu-tour-connector line {
  stroke: rgba(255, 210, 138, 0.88);
  stroke-width: 2.5;
  stroke-dasharray: 9 7;
  animation: ecu-tour-dash 1.1s linear infinite;
}
@keyframes ecu-tour-dash {
  to { stroke-dashoffset: -16; }
}
.ecu-tour-card {
  position: fixed;
  z-index: 3;
  width: min(460px, calc(100vw - 24px));
  max-width: min(460px, calc(100vw - 24px));
  box-sizing: border-box;
  padding: 22px 24px 18px;
  background: linear-gradient(180deg, #1a171b 0%, #0e0c10 100%);
  border: 1px solid rgba(0, 0, 0, 0.85);
  outline: 1px solid rgba(232, 201, 106, 0.35);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.75);
  color: #eee;
  font-size: 19px;
  pointer-events: auto;
}
.ecu-tour-card h3 {
  margin: 0 0 10px;
  font-size: 24px;
  color: #fff;
  font-weight: normal;
}
.ecu-tour-card p {
  margin: 0 0 14px;
  color: rgba(220, 210, 210, 0.92);
  line-height: 1.55;
}
.ecu-tour-card .ecu-tour-hint {
  color: #e8b86a;
  font-size: 18px;
  line-height: 1.45;
  margin: 0 0 14px;
}
.ecu-tour-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.ecu-tour-actions-left {
  flex: 0 0 auto;
  min-width: 76px;
}
.ecu-tour-actions-right {
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
  margin-left: auto;
}
.ecu-tour-btn {
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: #eee;
  padding: 10px 18px;
  font-size: 18px;
  font-weight: normal;
  border-radius: 2px;
  min-width: 76px;
  box-sizing: border-box;
}
.ecu-tour-btn.is-slot-hidden {
  visibility: hidden;
  pointer-events: none;
}
.ecu-tour-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
}
.ecu-tour-btn.primary {
  color: #ffd28a;
  border-color: rgba(232, 201, 106, 0.45);
  background: rgba(232, 201, 106, 0.12);
  min-width: 88px;
}
.ecu-tour-btn:disabled {
  cursor: default;
}
.ecu-tour-foot {
  margin-top: 12px;
  color: rgba(220, 210, 210, 0.65);
  font-size: 16px;
}
`;

export function injectGuidedTourCss(): void {
  if (typeof document === "undefined") return;
  if (injected) {
    const existing = document.querySelector("style[data-ecu-tour]");
    if (existing) return;
  }
  let el = document.querySelector(
    "style[data-ecu-tour]",
  ) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.setAttribute("data-ecu-tour", "1");
    document.head.appendChild(el);
  }
  el.textContent = CSS;
  injected = true;
}
