/** Ability timeline panel — extracted from mock-live.js */
(function () {
  "use strict";

  const STATIC_MS = 10000;
  const IMMINENT_MS = 5000;
  const STATIC_STACK_STEP = 34;
  const READY_HOLD_MS = 2800;

  /** @param {HTMLElement} root */
  function bindAbilityTimeline(root) {
    if (root.dataset.mockTimelineBound === "1") return;
    root.dataset.mockTimelineBound = "1";

    const formatCd = window.MockLive ? window.MockLive.formatCd : (ms) => `${(ms / 1000).toFixed(1)}s`;
    const timeline = root.querySelector("#timeline");
    if (!timeline) return;

    /** @type {{ id: string; name: string; cooldown: number; ms: number; ready: boolean; readyMs: number; el: HTMLElement | null; marker: HTMLElement | null; trail: HTMLElement | null }[]} */
    const abilities = [
      { id: "anger", name: "Anger", cooldown: 12000, ms: 11500, ready: false, readyMs: 0, el: null, marker: null, trail: null },
      { id: "warpstomp", name: "Warpstomp", cooldown: 8000, ms: 6200, ready: false, readyMs: 0, el: null, marker: null, trail: null },
    ];

    if (window.MockGameData) {
      for (let i = 0; i < abilities.length; i++) {
        abilities[i].name = window.MockGameData.skillName(abilities[i].id);
      }
    }

    function abilityIconHtml(ability) {
      if (window.MockGameIcons) {
        return window.MockGameIcons.skillIconHtml(ability.id, 20);
      }
      const letter = (ability.name || ability.id).slice(0, 1);
      return `<span class="ecu-game-icon-letter">${letter}</span>`;
    }

    let display = timeline.getAttribute("data-display") || "scroll";
    let orient = timeline.getAttribute("data-orient") || "vertical";

    const BARS_HTML = `
      <div class="ecu-abil-zone ecu-abil-zone--static">
        <div class="ecu-abil-zone-label ecu-abil-zone-label--static">static &gt;10s</div>
        <div id="zone-static"></div>
      </div>
      <div class="ecu-abil-now" title="NOW — ability fires when bar reaches this edge"></div>
      <div class="ecu-abil-zone ecu-abil-zone--dynamic">
        <div class="ecu-abil-zone-label ecu-abil-zone-label--dynamic">dynamic ≤10s</div>
        <div id="zone-dynamic"></div>
      </div>`;

    const SCROLL_HTML = `
      <div class="ecu-abil-scroll-labels">
        <span class="ecu-abil-zone-label ecu-abil-zone-label--static">static &gt;10s</span>
        <span class="ecu-abil-zone-label ecu-abil-zone-label--dynamic">dynamic ≤10s</span>
      </div>
      <div class="ecu-abil-scroll-lane" id="scroll-lane"></div>
      <div class="ecu-abil-now" title="NOW — icon reaches this line when ability fires"></div>`;

    function createBarEntry(ability) {
      const entry = document.createElement("div");
      entry.className = "ecu-abil-entry";
      entry.dataset.ability = ability.id;
      entry.innerHTML =
        `<div class="ecu-abil-icon" data-skill-id="${ability.id}" title="${ability.name} · ${ability.cooldown / 1000}s CD">${abilityIconHtml(ability)}</div>` +
        `<div class="ecu-abil-entry__name">${ability.name}</div>` +
        `<div class="ecu-abil-track"><div class="ecu-abil-bar"></div><span class="ecu-abil-cd"></span></div>`;
      ability.el = entry;
      return entry;
    }

    function createScrollMarker(ability) {
      const marker = document.createElement("div");
      marker.className = "ecu-abil-scroll-marker";
      marker.dataset.ability = ability.id;
      marker.innerHTML =
        `<div class="ecu-abil-icon" data-skill-id="${ability.id}" title="${ability.name} · ${ability.cooldown / 1000}s CD">${abilityIconHtml(ability)}</div>` +
        `<span class="ecu-abil-scroll-name">${ability.name}</span>` +
        `<span class="ecu-abil-scroll-cd"></span>`;
      const trail = document.createElement("div");
      trail.className = "ecu-abil-scroll-trail";
      trail.dataset.ability = ability.id;
      ability.marker = marker;
      ability.trail = trail;
      return marker;
    }

    function mountDOM() {
      timeline.setAttribute("data-display", display);
      timeline.setAttribute("data-orient", orient);
      timeline.innerHTML = display === "scroll" ? SCROLL_HTML : BARS_HTML;

      for (let i = 0; i < abilities.length; i++) {
        abilities[i].el = null;
        abilities[i].marker = null;
        abilities[i].trail = null;
      }

      if (display === "bars") {
        const zoneStatic = timeline.querySelector("#zone-static");
        const zoneDynamic = timeline.querySelector("#zone-dynamic");
        if (!zoneStatic || !zoneDynamic) return;
        for (let i = 0; i < abilities.length; i++) {
          zoneStatic.appendChild(createBarEntry(abilities[i]));
        }
        for (let i = 0; i < abilities.length; i++) {
          renderBar(abilities[i], zoneStatic, zoneDynamic);
        }
      } else {
        const lane = timeline.querySelector("#scroll-lane");
        if (!lane) return;
        for (let i = 0; i < abilities.length; i++) {
          const a = abilities[i];
          createScrollMarker(a);
          if (a.trail) lane.appendChild(a.trail);
          if (a.marker) lane.appendChild(a.marker);
        }
      }
    }

    function abilityInStatic(ability) {
      return !ability.ready && ability.cooldown > STATIC_MS && ability.ms > STATIC_MS;
    }

    function staticStackIndex(ability) {
      const pinned = abilities.filter((a) => abilityInStatic(a));
      pinned.sort((a, b) => b.ms - a.ms || a.id.localeCompare(b.id));
      return pinned.indexOf(ability);
    }

    /** 0 = NOW edge, 1 = far start (static pin / full CD remaining) */
    function scrollPos(ability) {
      if (ability.ready || ability.ms <= 0) return 0;
      if (ability.cooldown <= STATIC_MS) {
        return Math.max(0, Math.min(1, ability.ms / ability.cooldown));
      }
      if (ability.ms > STATIC_MS) return 1;
      return Math.max(0, Math.min(1, ability.ms / STATIC_MS));
    }

    /**
     * @param {HTMLElement} marker
     * @param {boolean} pinned
     * @param {number} stack
     * @param {number} pos
     * @param {"vertical" | "horizontal"} axis
     */
    function applyScrollMarkerPos(marker, pinned, stack, pos, axis) {
      if (axis === "vertical") {
        marker.style.left = "-2px";
        marker.style.right = "";
        marker.style.top = "auto";
        marker.style.bottom = `${pos * 100}%`;
        if (pinned && stack > 0) {
          marker.style.transform = `translateX(-50%) translateY(${-stack * STATIC_STACK_STEP}px)`;
        } else {
          marker.style.transform = "translateX(-50%)";
        }
        return;
      }
      marker.style.top = "0";
      marker.style.bottom = "auto";
      marker.style.left = "auto";
      marker.style.right = `${pos * 100}%`;
      if (pinned && stack > 0) {
        marker.style.transform = `translateX(50%) translateY(${stack * STATIC_STACK_STEP}px)`;
      } else {
        marker.style.transform = "translateX(50%) translateY(-50%)";
      }
    }

    /**
     * @param {HTMLElement | null} trail
     * @param {number} pos
     * @param {"vertical" | "horizontal"} axis
     */
    function applyScrollTrailPos(trail, pos, axis) {
      if (!trail) return;
      if (axis === "vertical") {
        trail.style.left = "-2px";
        trail.style.right = "";
        trail.style.width = "3px";
        trail.style.top = "auto";
        trail.style.bottom = "0";
        trail.style.height = `${pos * 100}%`;
        return;
      }
      trail.style.top = "0";
      trail.style.bottom = "auto";
      trail.style.height = "3px";
      trail.style.left = "auto";
      trail.style.right = "0";
      trail.style.width = `${pos * 100}%`;
    }

    function renderBar(ability, zoneStatic, zoneDynamic) {
      if (!ability.el) return;
      const ready = ability.ready || ability.ms <= 0;
      const pct = ready ? 0 : Math.max(0, Math.min(1, ability.ms / ability.cooldown));
      const imminent = !ready && ability.ms <= IMMINENT_MS;
      const dynamic = ready || ability.ms <= STATIC_MS;
      const bar = ability.el.querySelector(".ecu-abil-bar");
      const track = ability.el.querySelector(".ecu-abil-track");
      const icon = ability.el.querySelector(".ecu-abil-icon");
      const cd = ability.el.querySelector(".ecu-abil-cd");

      if (bar) bar.style.width = `${pct * 100}%`;
      if (cd) cd.textContent = ready ? "Ready" : formatCd(ability.ms);
      if (bar) {
        bar.classList.toggle("ecu-abil-bar--dynamic", dynamic);
        bar.classList.toggle("ecu-abil-bar--imminent", imminent);
      }
      if (track) track.classList.toggle("ecu-abil-track--imminent", imminent);
      if (icon) icon.classList.toggle("ecu-abil-icon--imminent", imminent);

      const targetZone = abilityInStatic(ability) ? zoneStatic : zoneDynamic;
      if (ability.el.parentElement !== targetZone) targetZone.appendChild(ability.el);

      const nameEl = ability.el.querySelector(".ecu-abil-entry__name");
      if (nameEl) {
        nameEl.textContent =
          orient === "horizontal"
            ? `${ability.name} · ${ready ? "Ready" : formatCd(ability.ms)}`
            : ability.name;
      }
    }

    function renderScroll(ability) {
      if (!ability.marker) return;
      const lane = timeline.querySelector("#scroll-lane");
      if (!lane) return;

      const pinned = abilityInStatic(ability);
      const ready = ability.ready || ability.ms <= 0;
      const pos = scrollPos(ability);
      const stack = pinned ? staticStackIndex(ability) : 0;
      const imminent = !ready && ability.ms <= IMMINENT_MS;
      const axis = orient === "horizontal" ? "horizontal" : "vertical";
      const cd = ability.marker.querySelector(".ecu-abil-scroll-cd");
      const icon = ability.marker.querySelector(".ecu-abil-icon");

      if (ability.trail) {
        ability.trail.hidden = pinned || ready;
        if (ability.trail.parentElement !== lane) {
          lane.insertBefore(ability.trail, lane.firstChild);
        }
      }
      if (ability.marker.parentElement !== lane) {
        lane.appendChild(ability.marker);
      }

      if (cd) cd.textContent = ready ? "Ready" : formatCd(ability.ms);
      ability.marker.classList.toggle("ecu-abil-scroll-marker--imminent", imminent);
      ability.marker.classList.toggle("ecu-abil-scroll-marker--ready", ready);
      ability.marker.classList.toggle("ecu-abil-scroll-marker--static", pinned);
      ability.marker.classList.toggle("ecu-abil-scroll-marker--dynamic", !pinned && !ready);
      if (icon) icon.classList.toggle("ecu-abil-icon--imminent", imminent || ready);

      applyScrollMarkerPos(ability.marker, pinned, stack, pos, axis);
      if (ability.trail && !ability.trail.hidden) {
        applyScrollTrailPos(ability.trail, pos, axis);
      }
    }

    function renderAll() {
      if (display === "bars") {
        const zoneStatic = timeline.querySelector("#zone-static");
        const zoneDynamic = timeline.querySelector("#zone-dynamic");
        if (!zoneStatic || !zoneDynamic) return;
        for (let i = 0; i < abilities.length; i++) {
          renderBar(abilities[i], zoneStatic, zoneDynamic);
        }
      } else {
        for (let i = 0; i < abilities.length; i++) {
          renderScroll(abilities[i]);
        }
      }
    }

    mountDOM();

    window.MockLive.registerTick((dt) => {

        for (let i = 0; i < abilities.length; i++) {
          const a = abilities[i];
          if (a.ready) {
            a.readyMs -= dt;
            if (a.readyMs <= 0) {
              a.ready = false;
              a.ms = a.cooldown;
              if (a.marker) {
                a.marker.classList.remove("ecu-abil-scroll-marker--cast");
                void a.marker.offsetWidth;
                a.marker.classList.add("ecu-abil-scroll-marker--cast");
              } else if (display === "bars" && a.el) {
                a.el.classList.remove("ecu-abil-entry--cast");
                void a.el.offsetWidth;
                a.el.classList.add("ecu-abil-entry--cast");
              }
            }
            continue;
          }
          a.ms -= dt;
          if (a.ms <= 0) {
            a.ms = 0;
            a.ready = true;
            a.readyMs = READY_HOLD_MS;
          }
        }
        renderAll();
    });

    const btnV = root.querySelector("#btn-v");
    const btnH = root.querySelector("#btn-h");
    const btnBars = root.querySelector("#btn-bars");
    const btnScroll = root.querySelector("#btn-scroll");

    function applyOrient(next) {
      orient = next;
      if (btnV) btnV.setAttribute("aria-pressed", orient === "vertical" ? "true" : "false");
      if (btnH) btnH.setAttribute("aria-pressed", orient === "horizontal" ? "true" : "false");
      mountDOM();
      renderAll();
      if (window.MockGameIcons) window.MockGameIcons.hydrateAbilityIcons(timeline);
    }

    function applyDisplay(next) {
      display = next;
      if (btnBars) btnBars.setAttribute("aria-pressed", display === "bars" ? "true" : "false");
      if (btnScroll) btnScroll.setAttribute("aria-pressed", display === "scroll" ? "true" : "false");
      mountDOM();
      renderAll();
      if (window.MockGameIcons) window.MockGameIcons.hydrateAbilityIcons(timeline);
    }

    if (btnV) btnV.addEventListener("click", () => applyOrient("vertical"));
    if (btnH) btnH.addEventListener("click", () => applyOrient("horizontal"));
    if (btnBars) btnBars.addEventListener("click", () => applyDisplay("bars"));
    if (btnScroll) btnScroll.addEventListener("click", () => applyDisplay("scroll"));

    if (btnV) btnV.setAttribute("aria-pressed", orient === "vertical" ? "true" : "false");
    if (btnH) btnH.setAttribute("aria-pressed", orient === "horizontal" ? "true" : "false");
    if (btnBars) btnBars.setAttribute("aria-pressed", display === "bars" ? "true" : "false");
    if (btnScroll) btnScroll.setAttribute("aria-pressed", display === "scroll" ? "true" : "false");
    renderAll();
    if (window.MockGameIcons) window.MockGameIcons.hydrateAbilityIcons(timeline);
  }

  window.MockAbilityTimeline = { bind: bindAbilityTimeline };
})();
