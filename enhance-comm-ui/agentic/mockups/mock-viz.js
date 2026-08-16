/**
 * Toggleable mob/boss/ability visualizations for mockups.
 * Layers use data-viz-layer="group.key" — hidden when setting is off.
 * Persists to localStorage (ecu-viz-settings).
 */
(function () {
  "use strict";

  const STORAGE_KEY = "ecu-viz-settings";

  const VIZ_LAB_SELECTORS = {
    ringWarp: "#viz-ring-warp",
    ringAnger: "#viz-ring-anger",
    ringAttack: "#viz-ring-attack",
    ringAura: "#viz-ring-aura",
    statusLabel: "[data-viz-status]",
    cdWarp: "[data-viz-cd-warp]",
    cdAnger: "[data-viz-cd-anger]",
    targetLine: "#viz-target-line",
    playerHighlight: "class",
  };

  const WORLD_DEMO_SELECTORS = {
    ringWarp: "#ring-warp",
    ringAnger: "#ring-anger",
    ringAttack: "#ring-attack",
    statusLabel: "[data-viz-status]",
    playerHighlight: "opacity",
  };

  /** @returns {Record<string, boolean>} */
  function defaults() {
    return { ...(window.MockVizDefaults || {}) };
  }

  /** @returns {Record<string, boolean>} */
  function loadSettings() {
    const base = defaults();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return base;
      return { ...base, ...JSON.parse(raw) };
    } catch {
      return base;
    }
  }

  /** @param {Record<string, boolean>} settings */
  function saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore quota */
    }
  }

  /**
   * @param {string} key
   * @param {Record<string, boolean>} settings
   */
  function layerVisible(key, settings) {
    if (key === "lines.any") {
      return !!(settings["lines.moveDest"] || settings["lines.aggroTarget"] || settings["lines.attackTarget"]);
    }
    return settings[key] !== false;
  }

  /**
   * @param {HTMLElement} root
   * @param {Record<string, boolean>} settings
   */
  function applyLayers(root, settings) {
    root.querySelectorAll("[data-viz-layer]").forEach((el) => {
      const key = el.getAttribute("data-viz-layer");
      if (!key) return;
      const on = layerVisible(key, settings);
      /** @type {HTMLElement} */ (el).hidden = !on;
      el.classList.toggle("viz-layer--off", !on);
    });
    root.querySelectorAll("[data-viz-toggle]").forEach((input) => {
      const key = input.getAttribute("data-viz-toggle");
      if (!key || !(input instanceof HTMLInputElement)) return;
      input.checked = settings[key] !== false;
    });
  }

  /** @param {(dt: number) => void} fn */
  function registerTick(fn) {
    window.MockLive.registerTick(fn);
  }

  /**
   * @param {HTMLElement} root
   * @param {Record<string, boolean>} settings
   * @param {typeof VIZ_LAB_SELECTORS | typeof WORLD_DEMO_SELECTORS} selectors
   */
  function paintWorldOverlay(root, settings, selectors) {
    window.MockWorldAbilities.renderWorldOverlay(
      root,
      settings,
      window.MockWorldAbilities.demoClock,
      selectors,
    );
  }

  /**
   * @param {HTMLElement} root
   * @param {Record<string, boolean>} settings
   * @param {() => void} onChange
   */
  function bindVizToggles(root, settings, onChange) {
    root.querySelectorAll("[data-viz-toggle]").forEach((input) => {
      if (!(input instanceof HTMLInputElement)) return;
      const key = input.getAttribute("data-viz-toggle");
      if (!key) return;
      input.addEventListener("change", () => {
        settings[key] = input.checked;
        saveSettings(settings);
        onChange();
      });
    });
  }

  /**
   * @param {HTMLElement} root
   */
  function bindVizLab(root) {
    if (root.dataset.mockVizBound === "viz-lab") return;
    root.dataset.mockVizBound = "viz-lab";
    /** @type {Record<string, boolean>} */
    let settings = loadSettings();

    const refresh = () => {
      applyLayers(root, settings);
      paintWorldOverlay(root, settings, VIZ_LAB_SELECTORS);
      window.MockWorldAbilities.renderAbilityChips(root, window.MockWorldAbilities.demoClock, settings);
    };
    refresh();

    bindVizToggles(root, settings, refresh);

    const resetBtn = root.querySelector("[data-viz-reset]");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        settings = defaults();
        saveSettings(settings);
        refresh();
      });
    }

    const clock = window.MockWorldAbilities.demoClock;
    const bossHpFill = root.querySelector("[data-viz-boss-hp]");
    const bossHpLabel = root.querySelector("[data-viz-boss-hp-label]");
    let bossHp = 58;

    registerTick((dt) => {
      clock.tick(dt);
      paintWorldOverlay(root, settings, VIZ_LAB_SELECTORS);
      window.MockWorldAbilities.renderAbilityChips(root, clock, settings);

      bossHp = Math.max(12, bossHp - 0.002 * dt);
      if (bossHpFill instanceof SVGRectElement) {
        bossHpFill.setAttribute("width", String(Math.round((36 * bossHp) / 100)));
      } else if (bossHpFill instanceof HTMLElement) {
        bossHpFill.style.width = `${bossHp}%`;
      }
      if (bossHpLabel) bossHpLabel.textContent = `${Math.round(bossHp)}%`;
    });

    if (window.MockVizLines) {
      window.MockVizLines.bindMtypePanel(root);
      window.MockVizLines.bind(root, () => settings);
    }
  }

  /** @param {HTMLElement} root — compact world demo (world-ability-ranges.html) */
  function bindWorldDemo(root) {
    if (root.dataset.mockVizBound === "world-demo") return;
    root.dataset.mockVizBound = "world-demo";
    /** @type {Record<string, boolean>} */
    let settings = loadSettings();

    const refresh = () => {
      applyLayers(root, settings);
      paintWorldOverlay(root, settings, WORLD_DEMO_SELECTORS);
    };
    refresh();

    bindVizToggles(root, settings, refresh);

    registerTick((dt) => {
      window.MockWorldAbilities.demoClock.tick(dt);
      paintWorldOverlay(root, settings, WORLD_DEMO_SELECTORS);
    });
  }

  function scan() {
    document.querySelectorAll("[data-viz-lab]").forEach((el) => bindVizLab(/** @type {HTMLElement} */ (el)));
    document.querySelectorAll("[data-viz-world-demo]").forEach((el) =>
      bindWorldDemo(/** @type {HTMLElement} */ (el)),
    );
  }

  window.MockViz = {
    get DEFAULTS() {
      return defaults();
    },
    loadSettings,
    saveSettings,
    applyLayers,
    init() {
      scan();
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.MockViz.init());
  } else {
    window.MockViz.init();
  }
})();
