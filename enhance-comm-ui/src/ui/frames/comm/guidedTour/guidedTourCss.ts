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
  max-height: min(48vh, 420px);
  max-height: min(48dvh, 420px);
  box-sizing: border-box;
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(180deg, #1a171b 0%, #0e0c10 100%);
  border: 1px solid rgba(0, 0, 0, 0.85);
  outline: 1px solid rgba(232, 201, 106, 0.35);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.75);
  color: #eee;
  font-size: 19px;
  pointer-events: auto;
}
.ecu-tour-card-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding: 18px 20px 8px;
  box-sizing: border-box;
}
.ecu-tour-card-chrome {
  flex: 0 0 auto;
  padding: 8px 20px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.22);
  box-sizing: border-box;
}
.ecu-tour-card h3 {
  margin: 0 0 8px;
  font-size: 22px;
  color: #fff;
  font-weight: normal;
}
.ecu-tour-card p {
  margin: 0 0 10px;
  color: rgba(220, 210, 210, 0.92);
  font-size: 17px;
  line-height: 1.45;
}
.ecu-tour-card .ecu-tour-hint {
  color: #e8b86a;
  font-size: 16px;
  line-height: 1.45;
  margin: 0 0 10px;
}
.ecu-tour-cta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0 0 8px;
  padding: 10px 12px;
  background: rgba(232, 201, 106, 0.12);
  border: 1px solid rgba(232, 201, 106, 0.42);
  border-left: 4px solid #ffd28a;
  box-sizing: border-box;
  animation: ecu-tour-cta-pulse 2.2s ease-in-out infinite;
}
.ecu-tour-cta-label {
  color: #ffd28a;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.2;
}
.ecu-tour-cta-text {
  color: #ffe8b8;
  font-size: 16px;
  line-height: 1.35;
}
@keyframes ecu-tour-cta-pulse {
  0%, 100% {
    border-left-color: #ffd28a;
    background: rgba(232, 201, 106, 0.1);
  }
  50% {
    border-left-color: #ffe4aa;
    background: rgba(232, 201, 106, 0.18);
  }
}
.ecu-tour-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ecu-tour-actions-left {
  flex: 0 0 auto;
  min-width: 64px;
}
.ecu-tour-actions-right {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  margin-left: auto;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.ecu-tour-btn {
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: #eee;
  padding: 9px 14px;
  font-size: 16px;
  font-weight: normal;
  border-radius: 2px;
  min-width: 64px;
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
  min-width: 72px;
}
.ecu-tour-btn:disabled {
  cursor: default;
  opacity: 0.38;
  color: rgba(220, 210, 210, 0.55);
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}
.ecu-tour-btn.primary:disabled {
  color: rgba(232, 201, 106, 0.4);
  border-color: rgba(232, 201, 106, 0.16);
  background: rgba(232, 201, 106, 0.05);
}
.ecu-tour-foot {
  margin-top: 8px;
  color: rgba(220, 210, 210, 0.65);
  font-size: 13px;
}
@media (max-width: 640px) {
  .ecu-tour-card {
    width: min(100%, calc(100vw - 16px));
    max-width: min(100%, calc(100vw - 16px));
    max-height: min(32vh, 240px);
    max-height: min(32dvh, 240px);
    font-size: 15px;
  }
  .ecu-tour-card-scroll {
    padding: 12px 12px 6px;
  }
  .ecu-tour-card-chrome {
    padding: 6px 12px 10px;
  }
  .ecu-tour-card h3 {
    font-size: 17px;
    margin-bottom: 6px;
  }
  .ecu-tour-card p {
    font-size: 14px;
    margin-bottom: 8px;
  }
  .ecu-tour-card .ecu-tour-hint {
    font-size: 13px;
  }
  .ecu-tour-cta {
    padding: 8px 10px;
    margin-bottom: 6px;
  }
  .ecu-tour-cta-label {
    font-size: 11px;
  }
  .ecu-tour-cta-text {
    font-size: 13px;
  }
  .ecu-tour-btn {
    font-size: 14px;
    padding: 8px 12px;
    min-width: 56px;
  }
  .ecu-tour-foot {
    font-size: 12px;
    margin-top: 6px;
  }
}
`;

export function injectGuidedTourCss(): void {
  if (typeof document === "undefined") return;
  let el = document.querySelector(
    "style[data-ecu-tour]",
  ) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.setAttribute("data-ecu-tour", "1");
    document.head.appendChild(el);
  }
  // Always refresh so rebuilds / HMR do not leave a stale sheet.
  if (!injected || el.textContent !== CSS) {
    el.textContent = CSS;
    injected = true;
  }
}
