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
/* Changelog: top-anchor so version switches don't jump the top edge */
.ecu-comm-wiz-backdrop--changelog {
  align-items: flex-start;
  padding-top: 6vh;
  box-sizing: border-box;
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
/* What's New / Changelog — viewport-safe shell (intro wizard unchanged) */
.ecu-comm-wiz--changelog {
  width: min(1000px, 96vw);
  max-width: min(1000px, 96vw);
  min-width: 0;
  height: min(88vh, 900px);
  max-height: min(88vh, 900px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  box-sizing: border-box;
  background: linear-gradient(180deg, #0a090c 0%, #050406 100%);
}
.ecu-comm-wiz-cl-head {
  flex: 0 0 auto;
  position: relative;
  padding: 22px 44px 10px 28px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(232, 201, 106, 0.16);
}
.ecu-comm-wiz--changelog .ecu-comm-wiz-logo {
  margin-bottom: 8px;
}
.ecu-comm-wiz--changelog h3 {
  margin: 0 0 4px;
}
.ecu-comm-wiz-cl-ver {
  color: #ffe0a0;
  font-size: 20px;
  margin: 0 0 2px;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
}
.ecu-comm-wiz-cl-ver-date {
  color: rgba(220, 210, 190, 0.78);
  font-size: 16px;
  font-weight: normal;
}
.ecu-comm-wiz-cl-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(235, 230, 225, 0.92);
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  border-radius: 2px;
}
.ecu-comm-wiz-cl-close:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
}
.ecu-comm-wiz-cl-shell {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.ecu-comm-wiz-cl-shell--nav {
  flex-direction: row;
}
.ecu-comm-wiz-cl-nav {
  flex: 0 0 176px;
  min-width: 0;
  overflow: auto;
  padding: 8px 10px 12px;
  background: rgba(0, 0, 0, 0.38);
  border-right: 1px solid rgba(232, 201, 106, 0.28);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ecu-comm-wiz-cl-nav-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  box-sizing: border-box;
  text-align: left;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-left: 2px solid transparent;
  background: transparent;
  color: #fff;
  padding: 8px 10px 8px 9px;
  font-size: 18px;
  line-height: 1.25;
  border-radius: 2px;
}
.ecu-comm-wiz-cl-nav-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  border-left-color: rgba(255, 255, 255, 0.1);
  color: #f5f5f5;
}
.ecu-comm-wiz-cl-nav-btn.is-active {
  color: #e8c96a;
  border-color: rgba(232, 201, 106, 0.35);
  border-left-color: #e8c96a;
  background: rgba(255, 255, 255, 0.06);
}
.ecu-comm-wiz-cl-nav-btn.is-seen {
  color: rgba(210, 205, 198, 0.62);
}
.ecu-comm-wiz-cl-nav-btn.is-seen .ecu-comm-wiz-cl-nav-date {
  color: rgba(180, 172, 162, 0.42);
}
.ecu-comm-wiz-cl-nav-btn.is-seen.is-active {
  color: #e8c96a;
}
.ecu-comm-wiz-cl-nav-btn.is-new {
  color: #fff;
}
.ecu-comm-wiz-cl-nav-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  width: 100%;
}
.ecu-comm-wiz-cl-nav-title {
  font-size: 19px;
  line-height: 1.2;
  color: inherit;
}
.ecu-comm-wiz-cl-badge-new {
  flex: 0 0 auto;
  padding: 1px 6px 2px;
  border: 1px solid rgba(232, 201, 106, 0.55);
  border-radius: 2px;
  background: rgba(232, 201, 106, 0.16);
  color: #ffe0a0;
  font-size: 11px;
  line-height: 1.2;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.ecu-comm-wiz-cl-nav-date {
  font-size: 13px;
  line-height: 1.2;
  color: rgba(200, 192, 180, 0.55);
}
.ecu-comm-wiz-cl-nav-btn.is-active .ecu-comm-wiz-cl-nav-date {
  color: rgba(220, 208, 180, 0.72);
}
.ecu-comm-wiz-cl-nav-btn:hover .ecu-comm-wiz-cl-nav-date {
  color: rgba(210, 200, 188, 0.68);
}
.ecu-comm-wiz-cl-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 12px 26px 18px;
  background: #0c0b0e;
}
.ecu-comm-wiz-cl-summary {
  margin: 0 0 10px !important;
  color: #fff;
  font-size: 22px !important;
  line-height: 1.45 !important;
}
.ecu-comm-wiz-cl-date {
  margin: -4px 0 14px;
  color: rgba(230, 220, 200, 0.82);
  font-size: 17px;
  letter-spacing: 0.02em;
}
.ecu-comm-wiz-cl-section-label {
  margin: 18px 0 12px;
  padding-bottom: 6px;
  color: #ffe0a0;
  font-size: 21px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  border-bottom: 2px solid rgba(232, 201, 106, 0.5);
}
.ecu-comm-wiz-cl-section-label:first-child {
  margin-top: 0;
}
.ecu-comm-wiz-cl-section-label--also {
  margin-top: 26px;
  padding-top: 4px;
  border-top: none;
}
.ecu-comm-wiz-cl-kind-group-label {
  margin: 22px 0 10px;
  padding-bottom: 5px;
  color: #f2efe8;
  font-size: 21px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.25;
  border-bottom: 1px solid rgba(232, 201, 106, 0.35);
}
.ecu-comm-wiz-cl-section-label--also + .ecu-comm-wiz-cl-kind-group-label {
  margin-top: 14px;
}
.ecu-comm-wiz-cl-items {
  display: grid;
  grid-template-columns: 1fr;
  gap: 13px;
  margin: 0 0 6px;
}
.ecu-comm-wiz-cl-items--grid {
  grid-template-columns: 1fr 1fr;
}
.ecu-comm-wiz-cl-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-left: 3px solid rgba(255, 255, 255, 0.22);
  box-sizing: border-box;
}
.ecu-comm-wiz-cl-item--highlight {
  border-left-width: 4px;
  border-color: rgba(255, 255, 255, 0.12);
}
.ecu-comm-wiz-cl-item--kind-feature {
  border-left-color: #f0d070;
}
.ecu-comm-wiz-cl-item--kind-fix {
  border-left-color: #7ab8e0;
}
.ecu-comm-wiz-cl-item--kind-improve {
  border-left-color: #7fd9a8;
}
.ecu-comm-wiz-cl-item--kind-ui {
  border-left-color: #e09a62;
}
.ecu-comm-wiz-cl-item--highlight.ecu-comm-wiz-cl-item--kind-feature {
  border-left-color: #ffe08a;
}
.ecu-comm-wiz-cl-item--highlight.ecu-comm-wiz-cl-item--kind-fix {
  border-left-color: #8ec8ef;
}
.ecu-comm-wiz-cl-item--highlight.ecu-comm-wiz-cl-item--kind-improve {
  border-left-color: #92e8b8;
}
.ecu-comm-wiz-cl-item--highlight.ecu-comm-wiz-cl-item--kind-ui {
  border-left-color: #f0aa72;
}
.ecu-comm-wiz-cl-item-top {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}
.ecu-comm-wiz-cl-kind {
  flex: 0 0 auto;
  margin-left: auto;
  margin-top: 2px;
  font-size: 13px;
  line-height: 1.2;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(200, 190, 170, 0.85);
  border: 1px solid transparent;
  padding: 3px 8px;
  border-radius: 2px;
  white-space: nowrap;
}
.ecu-comm-wiz-cl-kind--feature {
  color: #fff0c0;
  background: rgba(210, 155, 35, 0.62);
}
.ecu-comm-wiz-cl-kind--fix {
  color: #e4f2ff;
  background: rgba(55, 125, 185, 0.68);
}
.ecu-comm-wiz-cl-kind--improve {
  color: #e0ffe9;
  background: rgba(35, 145, 95, 0.64);
}
.ecu-comm-wiz-cl-kind--ui {
  color: #ffe2bc;
  background: rgba(175, 95, 40, 0.64);
}
.ecu-comm-wiz-cl-item-label {
  flex: 1 1 auto;
  min-width: 0;
  color: #fff;
  font-size: 35px;
}
.ecu-comm-wiz-cl-item-detail {
  color: #fff;
  font-size: 30px;
  max-width: 36em;
}
.ecu-comm-wiz-cl-foot {
  flex: 0 0 auto;
  padding: 12px 28px 20px;
  background: rgba(0, 0, 0, 0.22);
  border-top: 1px solid rgba(232, 201, 106, 0.18);
}
@media (max-width: 640px) {
  .ecu-comm-wiz-cl-items--grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 560px) {
  .ecu-comm-wiz-cl-shell--nav {
    flex-direction: column;
  }
  .ecu-comm-wiz-cl-nav {
    flex: 0 0 auto;
    max-height: 112px;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    border-right: none;
    border-bottom: 1px solid rgba(232, 201, 106, 0.28);
    padding: 4px 12px 8px;
    gap: 6px;
  }
  .ecu-comm-wiz-cl-nav-btn {
    width: auto;
    flex: 0 0 auto;
    white-space: nowrap;
  }
  .ecu-comm-wiz-cl-body {
    padding: 8px 18px 14px;
  }
  .ecu-comm-wiz-cl-head {
    padding: 18px 40px 8px 18px;
  }
  .ecu-comm-wiz-cl-foot {
    padding: 10px 18px 16px;
  }
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
  // Always refresh so rebuilds / HMR do not leave a blank or stale sheet.
  if (!injected || el.textContent !== CSS) {
    el.textContent = CSS;
  }
  injected = true;
}
