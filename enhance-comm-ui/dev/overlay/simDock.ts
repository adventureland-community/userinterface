/**
 * Scenario dock for overlay preview — lives next to the HUD, not in CommUI.
 */

import {
  getInstanceSimScenarioId,
  isInstanceSimActive,
  listInstanceSimScenarios,
  setInstanceSimEnabled,
  setInstanceSimScenario,
  subscribeInstanceSim,
} from "../../src/debug/instanceSim";
import type { InstanceSimScenarioId } from "../../src/debug/instanceSimScenarios";
import type { GameDataSource } from "./spriteApis";

const DOCK_ID = "ecu-overlay-dock";

const CSS = `
#${DOCK_ID} {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 400;
  height: 36px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  pointer-events: auto;
  font: 13px/1 pixel, ui-sans-serif, system-ui, sans-serif;
  color: #eee;
  background: rgba(10, 12, 16, 0.94);
  border-bottom: 1px solid #3a3a44;
}
#${DOCK_ID} .ecu-dock-title {
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #d4b;
  white-space: nowrap;
}
#${DOCK_ID} .ecu-dock-badge {
  font-size: 11px;
  padding: 2px 7px;
  border: 1px solid #555;
  border-radius: 10px;
  color: #bbb;
  white-space: nowrap;
}
#${DOCK_ID} .ecu-dock-badge.is-live {
  border-color: #3a7;
  color: #8d8;
}
#${DOCK_ID} .ecu-dock-badge.is-stub {
  border-color: #a63;
  color: #ec8;
}
#${DOCK_ID} .ecu-dock-badge.is-world {
  border-color: #48a;
  color: #8cf;
}
#${DOCK_ID} button,
#${DOCK_ID} select {
  box-sizing: border-box;
  padding: 3px 8px;
  font: inherit;
  color: #eee;
  background: #1a1a1a;
  border: 1px solid #555;
  border-radius: 4px;
}
#${DOCK_ID} button.is-on {
  border-color: #c8a;
  background: #2a1830;
  color: #e8c8ff;
}
#${DOCK_ID} .ecu-overlay-hint {
  margin-left: auto;
  color: #777;
  font-size: 11px;
  white-space: nowrap;
}
`;

function injectCss(): void {
  if (document.getElementById("ecu-overlay-dock-css")) return;
  const style = document.createElement("style");
  style.id = "ecu-overlay-dock-css";
  style.textContent = CSS;
  document.head.append(style);
}

export function pinHudBelowToolbar(): void {
  const el = document.getElementById("comm-ui") as HTMLElement | null;
  if (!el) return;
  el.style.top = "36px";
  el.style.height = "calc(100% - 36px)";
}

export function mountSimDock(gSource: GameDataSource): void {
  injectCss();
  let dock = document.getElementById(DOCK_ID);
  if (!dock) {
    dock = document.createElement("div");
    dock.id = DOCK_ID;
    document.body.append(dock);
  }

  const paint = () => {
    const el = document.getElementById(DOCK_ID);
    if (!el) return;
    const active = isInstanceSimActive();
    const scenarioId = getInstanceSimScenarioId();
    const scenarios = listInstanceSimScenarios();
    let options = "";
    for (let i = 0; i < scenarios.length; i++) {
      const sc = scenarios[i];
      const sel = sc.id === scenarioId ? " selected" : "";
      options += `<option value="${sc.id}"${sel}>${sc.label}</option>`;
    }
    const gClass = gSource === "live" ? "is-live" : "is-stub";
    const gLabel = gSource === "live" ? "G: live" : "G: stub";
    el.innerHTML =
      `<span class="ecu-dock-title">Overlay preview</span>` +
      `<span class="ecu-dock-badge ${gClass}">${gLabel}</span>` +
      `<span class="ecu-dock-badge is-world">World</span>` +
      `<button type="button" data-ecu-sim-toggle class="${active ? "is-on" : ""}">` +
      (active ? "Sim ON" : "Sim OFF") +
      `</button>` +
      `<select data-ecu-sim-scenario ${active ? "" : "disabled"}>${options}</select>` +
      `<span class="ecu-overlay-hint">Rebuild auto-reloads · cached client kit</span>`;

    const toggle = el.querySelector(
      "[data-ecu-sim-toggle]",
    ) as HTMLButtonElement | null;
    if (toggle) {
      toggle.addEventListener("click", () => {
        setInstanceSimEnabled(!isInstanceSimActive());
      });
    }
    const select = el.querySelector(
      "[data-ecu-sim-scenario]",
    ) as HTMLSelectElement | null;
    if (select) {
      select.addEventListener("change", () => {
        setInstanceSimScenario(select.value as InstanceSimScenarioId);
      });
    }
  };

  paint();
  subscribeInstanceSim(paint);
}
