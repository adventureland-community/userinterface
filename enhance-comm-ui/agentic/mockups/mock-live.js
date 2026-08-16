/**
 * Shared live tick simulation for comm UI mockups.
 * Countdowns, spawn alerts (visible only when imminent/firing), HP, scores, clocks.
 */
(function () {
  "use strict";

  const SPAWN_WARN_RATIO = 0.15;
  const SPAWN_FLASH_MS = 700;

  /** @param {number} ms */
  function formatCd(ms) {
    const s = Math.max(0, ms) / 1000;
    if (s >= 3600) {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = Math.floor(s % 60);
      return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    }
    if (s >= 600) {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m}:${String(sec).padStart(2, "0")}`;
    }
    if (s >= 10) return `${s.toFixed(0)}s`;
    return `${s.toFixed(1)}s`;
  }

  /** @param {number} ms */
  function formatMmSs(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  /** @param {number} ms */
  function formatAgo(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
  }

  /** @type {{ tick: (dt: number, now: number) => void }[]} */
  const subscribers = [];
  let last = performance.now();
  let running = false;

  function loop(now) {
    const dt = Math.min(now - last, 100);
    last = now;
    for (let i = 0; i < subscribers.length; i++) {
      subscribers[i].tick(dt, now);
    }
    requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(loop);
  }

  /** @param {(dt: number) => void} fn */
  function registerTick(fn) {
    subscribers.push({
      tick(dt) {
        fn(dt);
      },
    });
    start();
  }

  /**
   * @param {HTMLElement} el
   * @param {number} startMs
   * @param {(mode: string) => string} [formatter]
   */
  function bindCountdown(el, startMs, formatter) {
    let ms = startMs;
    const mode = el.getAttribute("data-live-countdown") || "cd";
    const fmt =
      formatter ||
      ((m) => {
        if (mode === "mmss") return formatMmSs(m);
        if (mode === "ago") return formatAgo(m);
        if (mode === "hms") return formatCd(m);
        return formatCd(m);
      });
    const countUp = mode === "ago";
    const suffix = el.getAttribute("data-countdown-suffix") || "";
    const setText = (m) => {
      el.textContent = fmt(m) + suffix;
    };
    setText(ms);
    subscribers.push({
      tick(dt) {
        if (countUp) ms += dt;
        else ms -= dt;
        if (!countUp && ms <= 0) {
          ms = Number(el.dataset.loopMs) || 0;
          if (ms <= 0) ms = 0;
        }
        setText(ms);
      },
    });
  }

  /**
   * @param {HTMLElement} container
   * @param {{ interval: number; label: string; minion?: string; mtype?: string; warnMs?: number; startOffset?: number }} cfg
   */
  function bindSpawnAlerts(container, cfg) {
    const interval = cfg.interval;
    const warnMs = cfg.warnMs != null ? cfg.warnMs : Math.max(400, interval * SPAWN_WARN_RATIO);
    let ms = cfg.startOffset != null ? cfg.startOffset : interval * 0.35;
    const chip = document.createElement("span");
    chip.className = "ecu-mech ecu-mech--spawn ecu-mech--spawn-alert";
    chip.hidden = true;
    container.appendChild(chip);

    subscribers.push({
      tick(dt) {
        ms -= dt;
        if (ms <= 0) {
          chip.hidden = false;
          chip.className = "ecu-mech ecu-mech--spawn ecu-mech--spawn-alert ecu-mech--spawn-flash";
          const minionName =
            (cfg.mtype && window.MockGameData && window.MockGameData.monsterName(cfg.mtype)) ||
            cfg.minion ||
            cfg.label;
          const icon =
            window.MockGameIcons && cfg.mtype
              ? `<span class="ecu-mech__icon">${window.MockGameIcons.monsterSpriteHtml(cfg.mtype, 14, 14)}</span>`
              : "";
          chip.innerHTML = `${icon}${minionName} spawned!`;
          ms = interval;
          window.setTimeout(() => {
            chip.classList.remove("ecu-mech--spawn-flash");
            chip.hidden = true;
          }, SPAWN_FLASH_MS);
          return;
        }
        if (ms <= warnMs) {
          chip.hidden = false;
          chip.className = "ecu-mech ecu-mech--spawn ecu-mech--spawn-alert ecu-mech--spawn-soon";
          const minionName =
            (cfg.mtype && window.MockGameData && window.MockGameData.monsterName(cfg.mtype)) ||
            cfg.minion ||
            cfg.label;
          const icon =
            window.MockGameIcons && cfg.mtype
              ? `<span class="ecu-mech__icon">${window.MockGameIcons.monsterSpriteHtml(cfg.mtype, 14, 14)}</span>`
              : "";
          chip.innerHTML = `${icon}Spawning ${minionName} · ${formatCd(ms)}`;
        } else {
          chip.hidden = true;
        }
      },
    });
  }

  /**
   * @param {HTMLElement} el
   * @param {number} intervalMs
   * @param {string} label
   */
  function bindAbilityChip(el, intervalMs, label) {
    let ms = intervalMs * 0.6;
    const skillId = el.getAttribute("data-ability-id") || "";
    const displayLabel =
      window.MockGameData && skillId ? window.MockGameData.skillName(skillId) : label;
    el.hidden = true;
    subscribers.push({
      tick(dt) {
        ms -= dt;
        if (ms <= 0) {
          ms = intervalMs;
          el.classList.add("ecu-mech--flash");
          window.setTimeout(() => el.classList.remove("ecu-mech--flash"), 400);
        }
        if (ms <= intervalMs * 0.85) {
          el.hidden = false;
          const icon =
            window.MockGameIcons && skillId
              ? `<span class="ecu-mech__icon">${window.MockGameIcons.skillIconHtml(skillId, 14)}</span>`
              : "";
          el.innerHTML = `${icon}${displayLabel} · ${formatCd(ms)}`;
          el.classList.toggle("ecu-mech--imminent", ms <= Math.min(5000, intervalMs * 0.2));
        } else {
          el.hidden = true;
        }
      },
    });
  }

  /** @param {HTMLElement} fill */
  function bindHp(fill) {
    let pct = Number(fill.dataset.liveHp) || 58;
    const min = Number(fill.dataset.liveHpMin) || 12;
    const rate = Number(fill.dataset.liveHpRate) || 0.004;
    const label = fill.closest(".comm-vitals-mock, .ecu-card")?.querySelector("[data-live-hp-label]");
    subscribers.push({
      tick(dt) {
        pct = Math.max(min, pct - rate * dt);
        fill.style.width = `${pct.toFixed(1)}%`;
        if (label) label.textContent = `${Math.round(pct)}%`;
      },
    });
  }

  function bindAbScore(root) {
    let scoreA = Number(root.dataset.scoreA) || 12;
    let scoreB = Number(root.dataset.scoreB) || 9;
    let timerMs = Number(root.dataset.timerMs) || 278000;
    const fillA = root.querySelector(".ecu-ab-scorebar__fill-a");
    const fillB = root.querySelector(".ecu-ab-scorebar__fill-b");
    const ptsA = root.querySelector(".ecu-ab-scorebar__team--a .ecu-ab-scorebar__pts");
    const ptsB = root.querySelector(".ecu-ab-scorebar__team--b .ecu-ab-scorebar__pts");
    const timerEl = root.querySelector(".ecu-ab-scorebar__timer");
    let tickAcc = 0;
    subscribers.push({
      tick(dt) {
        timerMs = Math.max(0, timerMs - dt);
        if (timerEl) timerEl.textContent = formatMmSs(timerMs);
        tickAcc += dt;
        if (tickAcc > 4200) {
          tickAcc = 0;
          if (Math.random() > 0.45) scoreA += 1;
          else scoreB += 1;
          const total = scoreA + scoreB || 1;
          const wA = (scoreA / total) * 100;
          const wB = (scoreB / total) * 100;
          if (fillA) fillA.style.width = `${wA.toFixed(1)}%`;
          if (fillB) fillB.style.width = `${wB.toFixed(1)}%`;
          if (ptsA) ptsA.textContent = String(scoreA);
          if (ptsB) ptsB.textContent = String(scoreB);
        }
      },
    });
  }

  function bindDayClock(el) {
    let mins = 14 * 60 + 32;
    let sec = 0;
    subscribers.push({
      tick(dt) {
        sec += dt / 1000;
        while (sec >= 1) {
          sec -= 1;
          mins += 1;
          if (mins >= 24 * 60) mins = 0;
        }
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        el.textContent = el.textContent.replace(/\d{1,2}:\d{2}/, `${h}:${String(m).padStart(2, "0")}`);
      },
    });
  }

  /** @param {HTMLElement} el @param {string} key @param {(el: HTMLElement) => void} fn */
  function bindOnce(el, key, fn) {
    if (el.dataset.mockLiveBound === key) return;
    el.dataset.mockLiveBound = key;
    fn(el);
  }

  function bindLayoutEdit() {
    const layoutToggle = document.getElementById("layout-toggle");
    const commUi = document.getElementById("comm-ui");
    const abilPanel = document.getElementById("abil-panel");
    if (!layoutToggle || !commUi || !abilPanel || layoutToggle.dataset.mockLiveBound) return;
    layoutToggle.dataset.mockLiveBound = "layout-edit";
    layoutToggle.addEventListener("click", () => {
      const on = commUi.getAttribute("data-layout-edit") !== "true";
      commUi.setAttribute("data-layout-edit", on ? "true" : "false");
      layoutToggle.setAttribute("aria-pressed", on ? "true" : "false");
      abilPanel.classList.toggle("comm-pos-editing", on);
    });
  }

  function bindHpThresholds(root) {
    let pct = Number(root.dataset.liveHp) || 41;
    const fill = root.querySelector(".ecu-hp-thresholds__fill");
    const chip = root.querySelector("[data-live-threshold-chip]");
    let warned = false;
    subscribers.push({
      tick(dt) {
        pct = Math.max(8, pct - 0.003 * dt);
        if (fill) fill.style.width = `${pct}%`;
        const status = root.querySelector(".ecu-card__status");
        if (status) status.textContent = `${Math.round(pct)}% HP`;
        if (chip && !warned && pct <= 26 && pct >= 22) {
          warned = true;
          chip.hidden = false;
          chip.textContent = "Jr spawn at 25%!";
          chip.classList.add("ecu-mech--spawn-flash");
          window.setTimeout(() => chip.classList.remove("ecu-mech--spawn-flash"), 600);
        }
      },
    });
  }

  function scan() {
    document.querySelectorAll("[data-live-countdown]").forEach((el) => {
      bindOnce(/** @type {HTMLElement} */ (el), "countdown", (node) => {
        const ms = Number(node.dataset.ms) || Number(node.dataset.liveMs) || 0;
        bindCountdown(node, ms);
      });
    });

    document.querySelectorAll("[data-live-spawn]").forEach((el) => {
      bindOnce(/** @type {HTMLElement} */ (el), "spawn", (node) => {
        bindSpawnAlerts(node, {
          interval: Number(node.dataset.spawnInterval) || 1600,
          label: node.dataset.spawnLabel || "minion",
          minion: node.dataset.spawnMinion || "",
          mtype: node.dataset.spawnMtype || "",
          startOffset: node.dataset.spawnOffset ? Number(node.dataset.spawnOffset) : undefined,
        });
      });
    });

    document.querySelectorAll("[data-live-ability]").forEach((el) => {
      bindOnce(/** @type {HTMLElement} */ (el), "ability-chip", (node) => {
        bindAbilityChip(
          node,
          Number(node.dataset.abilityInterval) || 8000,
          node.dataset.abilityLabel || "Ability",
        );
      });
    });

    document.querySelectorAll("[data-live-hp]").forEach((el) => {
      bindOnce(/** @type {HTMLElement} */ (el), "hp", bindHp);
    });

    document.querySelectorAll("[data-live-ab-score]").forEach((el) => {
      bindOnce(/** @type {HTMLElement} */ (el), "ab-score", bindAbScore);
    });

    document.querySelectorAll("[data-live-day-clock]").forEach((el) => {
      bindOnce(/** @type {HTMLElement} */ (el), "day-clock", bindDayClock);
    });

    document.querySelectorAll("[data-live-hp-thresholds]").forEach((el) => {
      bindOnce(/** @type {HTMLElement} */ (el), "hp-thresholds", bindHpThresholds);
    });

    if (window.MockAbilityTimeline) {
      document.querySelectorAll("[data-live-ability-timeline]").forEach((el) => {
        window.MockAbilityTimeline.bind(/** @type {HTMLElement} */ (el));
      });
    }

    bindLayoutEdit();
  }

  window.MockLive = {
    formatCd,
    formatMmSs,
    formatAgo,
    registerTick,
    init() {
      scan();
      start();
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.MockLive.init());
  } else {
    window.MockLive.init();
  }
})();
