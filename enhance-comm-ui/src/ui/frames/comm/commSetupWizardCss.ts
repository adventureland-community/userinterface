/**
 * First-run Comm UI setup wizard styles.
 */

let injected = false;

const CSS = `
.ecu-comm-wiz-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483003;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}
.ecu-comm-wiz {
  min-width: min(520px, 94vw);
  max-width: 560px;
  padding: 22px 24px 18px;
  background: linear-gradient(180deg, #1a171b 0%, #0e0c10 100%);
  border: 1px solid rgba(0, 0, 0, 0.85);
  outline: 1px solid rgba(232, 201, 106, 0.35);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.7);
  color: #eee;
  font-size: 17px;
}
.ecu-comm-wiz-logo {
  font-size: 28px;
  font-weight: normal;
  color: #ffd28a;
  letter-spacing: 0.02em;
  margin-bottom: 12px;
  text-shadow: none;
}
.ecu-comm-wiz h3 {
  margin: 0 0 10px;
  font-size: 20px;
  color: #fff;
  font-weight: normal;
}
.ecu-comm-wiz p {
  margin: 0 0 16px;
  color: rgba(220, 210, 210, 0.88);
  font-size: 17px;
  line-height: 1.5;
}
.ecu-comm-wiz-list {
  margin: 0 0 16px;
  padding-left: 20px;
  color: rgba(220, 210, 210, 0.88);
  font-size: 17px;
  line-height: 1.55;
}
.ecu-comm-wiz-list li {
  margin-bottom: 6px;
}
.ecu-comm-wiz-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 6px;
}
.ecu-comm-wiz-grid label {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #ddd;
  font-size: 17px;
  cursor: pointer;
}
.ecu-comm-wiz-grid label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.ecu-comm-wiz-btn {
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: #eee;
  padding: 10px 18px;
  font-size: 17px;
  font-weight: normal;
  border-radius: 2px;
  align-self: flex-start;
}
.ecu-comm-wiz-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}
.ecu-comm-wiz-btn.primary {
  color: #ffd28a;
  border-color: rgba(232, 201, 106, 0.45);
  background: rgba(232, 201, 106, 0.12);
}
.ecu-comm-wiz-btn.primary:hover {
  background: rgba(232, 201, 106, 0.2);
}
.ecu-comm-wiz-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.ecu-comm-wiz-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(220, 210, 210, 0.72);
  font-size: 15px;
}
.ecu-comm-wiz-skip {
  cursor: pointer;
  background: transparent;
  border: none;
  color: rgba(220, 210, 210, 0.85);
  font-size: 15px;
  font-weight: normal;
  padding: 4px 0;
  text-decoration: underline;
}
.ecu-comm-wiz-skip:hover {
  color: #fff;
}
`;

export function injectCommSetupWizardCss(): void {
  if (injected || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.setAttribute("data-ecu-comm-wiz", "1");
  el.textContent = CSS;
  document.head.appendChild(el);
  injected = true;
}
