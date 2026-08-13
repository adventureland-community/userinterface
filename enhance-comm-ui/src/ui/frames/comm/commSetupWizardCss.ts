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
  min-width: min(560px, 94vw);
  max-width: 720px;
  padding: 26px 28px 22px;
  background: linear-gradient(180deg, #1a171b 0%, #0e0c10 100%);
  border: 1px solid rgba(0, 0, 0, 0.85);
  outline: 1px solid rgba(232, 201, 106, 0.35);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.7);
  color: #eee;
  font-size: 22px;
}
.ecu-comm-wiz-logo {
  font-size: 36px;
  font-weight: normal;
  color: #ffd28a;
  letter-spacing: 0.02em;
  margin-bottom: 14px;
  text-shadow: none;
}
.ecu-comm-wiz h3 {
  margin: 0 0 12px;
  font-size: 28px;
  color: #fff;
  font-weight: normal;
}
.ecu-comm-wiz p {
  margin: 0 0 18px;
  color: rgba(220, 210, 210, 0.92);
  font-size: 22px;
  line-height: 1.55;
}
.ecu-comm-wiz-list {
  margin: 0 0 18px;
  padding-left: 22px;
  color: rgba(220, 210, 210, 0.92);
  font-size: 22px;
  line-height: 1.55;
}
.ecu-comm-wiz-list li {
  margin-bottom: 8px;
}
.ecu-comm-wiz-caps {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 0 0 20px;
}
.ecu-comm-wiz-cap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-top: 2px solid rgba(232, 201, 106, 0.55);
  box-sizing: border-box;
  min-height: 0;
}
.ecu-comm-wiz-cap-label {
  color: #ffd28a;
  font-size: 19px;
  line-height: 1.25;
}
.ecu-comm-wiz-cap-detail {
  color: rgba(220, 210, 210, 0.9);
  font-size: 17px;
  line-height: 1.4;
}
@media (max-width: 560px) {
  .ecu-comm-wiz-caps {
    grid-template-columns: 1fr;
  }
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
  font-size: 22px;
  cursor: pointer;
}
.ecu-comm-wiz-grid label input[type="checkbox"] {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
.ecu-comm-wiz-btn {
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: #eee;
  padding: 12px 20px;
  font-size: 22px;
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
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(220, 210, 210, 0.72);
  font-size: 20px;
}
.ecu-comm-wiz-skip {
  cursor: pointer;
  background: transparent;
  border: none;
  color: rgba(220, 210, 210, 0.85);
  font-size: 20px;
  font-weight: normal;
  padding: 4px 0;
  text-decoration: underline;
}
.ecu-comm-wiz-skip:hover {
  color: #fff;
}
.ecu-comm-wiz-changelog-block {
  margin: 0 0 4px;
}
.ecu-comm-wiz-changelog-ver {
  color: #ffd28a;
  font-size: 20px;
  margin: 0 0 10px;
}
.ecu-comm-wiz-changelog-sep {
  height: 1px;
  margin: 8px 0 16px;
  background: rgba(255, 255, 255, 0.08);
}
`;

export function injectCommSetupWizardCss(): void {
  if (typeof document === "undefined") return;
  let el = document.querySelector(
    "style[data-ecu-comm-wiz]",
  ) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.setAttribute("data-ecu-comm-wiz", "1");
    document.head.appendChild(el);
  }
  el.textContent = CSS;
  injected = true;
}
