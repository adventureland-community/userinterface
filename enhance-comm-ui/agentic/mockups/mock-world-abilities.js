/**
 * Shared boss ability CD clock + world overlay rendering for viz mockups.
 */
(function () {
  "use strict";

  const IMMINENT_RATIO = 0.15;

  /** @type {Record<string, { cd: number; startMs: number }>} */
  const DEMO_ABILITIES = {
    warpstomp: { cd: 8000, startMs: 3200 },
    anger: { cd: 12000, startMs: 9200 },
  };

  /**
   * @param {{ abilities?: Record<string, { cd: number; startMs?: number }> }} [cfg]
   * @returns {{ tick: (dt: number) => void; get: (id: string) => { ms: number; cd: number } | undefined; imminent: (id: string, enabled?: boolean) => boolean; IMMINENT_RATIO: number }}
   */
  function createAbilityClock(cfg) {
    const defs = cfg?.abilities || DEMO_ABILITIES;
    /** @type {Record<string, { ms: number; cd: number }>} */
    const state = {};
    for (const id of Object.keys(defs)) {
      const def = defs[id];
      state[id] = { ms: def.startMs != null ? def.startMs : def.cd * 0.4, cd: def.cd };
    }

    return {
      IMMINENT_RATIO,
      tick(dt) {
        for (const id of Object.keys(state)) {
          state[id].ms -= dt;
          if (state[id].ms <= 0) state[id].ms = state[id].cd;
        }
      },
      get(id) {
        return state[id];
      },
      imminent(id, enabled) {
        if (enabled === false) return false;
        const a = state[id];
        return !!a && a.ms / a.cd < IMMINENT_RATIO;
      },
    };
  }

  /**
   * @param {ReturnType<typeof createAbilityClock>} clock
   * @param {string} id
   */
  function imminentOpacity(clock, id) {
    const a = clock.get(id);
    if (!a) return 0;
    const windowMs = a.cd * IMMINENT_RATIO;
    return 0.5 + (1 - a.ms / windowMs) * 0.5;
  }

  /**
   * @param {number} ms
   */
  function formatSec(ms) {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  /**
   * @param {HTMLElement} root
   * @param {Record<string, boolean>} settings
   * @param {ReturnType<typeof createAbilityClock>} clock
   * @param {{ ringWarp: string; ringAnger: string; ringAttack?: string; ringAura?: string; statusLabel?: string; cdWarp?: string; cdAnger?: string; targetLine?: string; playerHighlight?: "opacity" | "class" }} sel
   */
  function renderWorldOverlay(root, settings, clock, sel) {
    const warpImminent = clock.imminent("warpstomp", settings["world.abilityImminent"]);
    const angerImminent = clock.imminent("anger", settings["world.abilityImminent"]);
    const warp = clock.get("warpstomp");
    const anger = clock.get("anger");

    const ringWarp = root.querySelector(sel.ringWarp);
    if (ringWarp instanceof SVGElement) {
      ringWarp.style.display = warpImminent ? "" : "none";
      ringWarp.style.opacity = warpImminent ? String(imminentOpacity(clock, "warpstomp")) : "0";
    }

    const ringAnger = root.querySelector(sel.ringAnger);
    if (ringAnger instanceof SVGElement) {
      const showGhost = settings["world.abilityGhost"] && !angerImminent;
      const showImminent = settings["world.abilityImminent"] && angerImminent;
      ringAnger.style.display = showGhost || showImminent ? "" : "none";
      ringAnger.style.opacity = showImminent ? "0.55" : "0.25";
      ringAnger.setAttribute("stroke-dasharray", showImminent ? "none" : "8 6");
    }

    if (sel.ringAttack) {
      const ringAttack = root.querySelector(sel.ringAttack);
      if (ringAttack instanceof SVGElement) {
        ringAttack.style.display = settings["world.attackRange"] ? "" : "none";
        ringAttack.hidden = !settings["world.attackRange"];
      }
    }

    if (sel.ringAura) {
      const ringAura = root.querySelector(sel.ringAura);
      if (ringAura instanceof SVGElement) {
        ringAura.hidden = !settings["world.auraRing"];
      }
    }

    if (sel.targetLine) {
      const targetLine = root.querySelector(sel.targetLine);
      if (targetLine instanceof SVGElement) {
        const useLegacy = settings["world.targetLine"] && !settings["lines.aggroTarget"];
        targetLine.hidden = !useLegacy;
      }
    }

    const highlightMode = sel.playerHighlight || "class";
    if (highlightMode === "class") {
      root.querySelectorAll("[data-viz-at-risk]").forEach((el) => {
        const on = settings["world.highlightAtRisk"] && warpImminent;
        el.classList.toggle("viz-player--at-risk", on);
        el.classList.toggle("viz-player--dim", !on && settings["world.highlightAtRisk"]);
      });
    } else {
      root.querySelectorAll(".player-in").forEach((el) => {
        const on = settings["world.highlightAtRisk"] && warpImminent;
        /** @type {HTMLElement} */ (el).style.opacity = on ? "1" : "0.35";
      });
    }

    const nameplate = root.querySelector("[data-viz-nameplate]");
    if (nameplate instanceof SVGElement) {
      nameplate.hidden = !settings["entity.nameplate"];
    }

    const warpName =
      window.MockGameData ? window.MockGameData.skillName("warpstomp") : "Warpstomp";
    const angerName = window.MockGameData ? window.MockGameData.skillName("anger") : "Anger";

    if (sel.statusLabel) {
      const statusLabel = root.querySelector(sel.statusLabel);
      if (statusLabel instanceof SVGTextElement) {
        if (warpImminent && warp) {
          statusLabel.textContent = `${warpName} · ${formatSec(warp.ms)}`;
          statusLabel.style.fill = "#ffd28a";
        } else if (angerImminent && anger) {
          statusLabel.textContent = `${angerName} · ${formatSec(anger.ms)}`;
          statusLabel.style.fill = "#ffd28a";
        } else {
          statusLabel.textContent = "abilities on cooldown";
          statusLabel.style.fill = "#666";
        }
      } else if (statusLabel instanceof HTMLElement) {
        if (warpImminent && warp) {
          statusLabel.textContent = `${warpName} · ${formatSec(warp.ms)}`;
          statusLabel.className = "viz-status viz-status--imminent";
        } else if (angerImminent && anger) {
          statusLabel.textContent = `${angerName} · ${formatSec(anger.ms)}`;
          statusLabel.className = "viz-status viz-status--imminent";
        } else {
          statusLabel.textContent = "abilities on cooldown";
          statusLabel.className = "viz-status";
        }
      }
    }

    if (sel.cdWarp && warp) {
      const cdWarp = root.querySelector(sel.cdWarp);
      if (cdWarp) cdWarp.textContent = formatSec(warp.ms);
    }
    if (sel.cdAnger && anger) {
      const cdAnger = root.querySelector(sel.cdAnger);
      if (cdAnger) cdAnger.textContent = formatSec(anger.ms);
    }
  }

  /** Shared demo clock — one simulator for viz lab + world demo. */
  const demoClock = createAbilityClock({});

  /** @type {WeakMap<HTMLElement, number>} */
  const chipLastMs = new WeakMap();

  /**
   * @param {HTMLElement} root
   * @param {ReturnType<typeof createAbilityClock>} clock
   * @param {Record<string, boolean>} [settings]
   */
  function renderAbilityChips(root, clock, settings) {
    if (settings && !settings["comm.mechanicChips"]) return;
    root.querySelectorAll("[data-viz-ability-chip]").forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      const skillId = el.getAttribute("data-ability-id") || "";
      const a = clock.get(skillId);
      if (!a) return;

      const prev = chipLastMs.get(el);
      if (prev != null && prev > 0 && a.ms > prev) {
        el.classList.add("ecu-mech--flash");
        window.setTimeout(() => el.classList.remove("ecu-mech--flash"), 400);
      }
      chipLastMs.set(el, a.ms);

      const label =
        window.MockGameData && skillId ? window.MockGameData.skillName(skillId) : skillId;
      const show = a.ms <= a.cd * 0.85;
      el.hidden = !show;
      if (!show) return;

      const fmt =
        window.MockLive && typeof window.MockLive.formatCd === "function"
          ? window.MockLive.formatCd(a.ms)
          : formatSec(a.ms);
      const icon =
        window.MockGameIcons && skillId
          ? `<span class="ecu-mech__icon">${window.MockGameIcons.skillIconHtml(skillId, 14)}</span>`
          : "";
      el.innerHTML = `${icon}${label} · ${fmt}`;
      el.classList.toggle("ecu-mech--imminent", a.ms <= Math.min(5000, a.cd * 0.2));
    });
  }

  window.MockWorldAbilities = {
    IMMINENT_RATIO,
    createAbilityClock,
    demoClock,
    renderWorldOverlay,
    renderAbilityChips,
  };
})();
