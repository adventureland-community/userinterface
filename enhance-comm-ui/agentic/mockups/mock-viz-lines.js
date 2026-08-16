/**
 * Debug entity lines on map — move destination, aggro target, attack target.
 * Settings: ecu-viz-settings (lines.*) + ecu-viz-line-mtypes (per-mtype overrides).
 * Game fields: entity.real_x/y, going_x/y, target (entity id).
 */
(function () {
  "use strict";

  const MTYPE_STORAGE_KEY = "ecu-viz-line-mtypes";

  /** @type {Record<string, { moveDest: boolean; aggroTarget: boolean; attackTarget: boolean }>} */
  const DEFAULT_BY_KIND = {
    monster: { moveDest: true, aggroTarget: true, attackTarget: false },
    player: { moveDest: true, aggroTarget: false, attackTarget: true },
  };

  /** Demo overrides — production would be comm settings UI per mtype */
  const MTYPE_PRESETS = {
    gpurplepro: { moveDest: false, aggroTarget: true, attackTarget: false },
    zapper0: { moveDest: true, aggroTarget: false, attackTarget: false },
    "p:Alice": { moveDest: true, aggroTarget: false, attackTarget: true },
    "p:Bob": { moveDest: true, aggroTarget: false, attackTarget: true },
  };

  /**
   * @typedef {{ id: string; kind: "monster" | "player"; mtype: string; x: number; y: number; going_x: number; going_y: number; target?: string; focus?: boolean; label?: string }} DemoEntity
   */

  /** @returns {Record<string, Partial<{ moveDest: boolean; aggroTarget: boolean; attackTarget: boolean }>>} */
  function loadMtypeRules() {
    try {
      const raw = localStorage.getItem(MTYPE_STORAGE_KEY);
      if (!raw) return { ...MTYPE_PRESETS };
      return { ...MTYPE_PRESETS, ...JSON.parse(raw) };
    } catch {
      return { ...MTYPE_PRESETS };
    }
  }

  /** @param {Record<string, unknown>} rules */
  function saveMtypeRules(rules) {
    try {
      localStorage.setItem(MTYPE_STORAGE_KEY, JSON.stringify(rules));
    } catch {
      /* ignore */
    }
  }

  /**
   * @param {DemoEntity} entity
   * @param {"moveDest" | "aggroTarget" | "attackTarget"} lineType
   * @param {Record<string, boolean>} settings
   * @param {ReturnType<typeof loadMtypeRules>} mtypeRules
   */
  function lineEnabled(entity, lineType, settings, mtypeRules) {
    if (!settings[`lines.${lineType}`]) return false;
    if (settings["lines.filter.focusOnly"] && !entity.focus) return false;
    if (entity.kind === "player" && !settings["lines.filter.players"]) return false;
    if (entity.kind === "monster" && !settings["lines.filter.monsters"]) return false;
    const preset = DEFAULT_BY_KIND[entity.kind] || DEFAULT_BY_KIND.monster;
    const override = mtypeRules[entity.mtype] || mtypeRules[entity.id];
    const rule = override ? { ...preset, ...override } : preset;
    return !!rule[lineType];
  }

  /**
   * @param {DemoEntity} from
   * @param {DemoEntity} to
   * @param {string} className
   * @param {string} [title]
   */
  function svgLine(from, to, className, title) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(from.x));
    line.setAttribute("y1", String(from.y));
    line.setAttribute("x2", String(to.x));
    line.setAttribute("y2", String(to.y));
    line.setAttribute("class", className);
    if (title) {
      const t = document.createElementNS("http://www.w3.org/2000/svg", "title");
      t.textContent = title;
      line.appendChild(t);
    }
    return line;
  }

  /**
   * @param {DemoEntity} from
   * @param {number} gx
   * @param {number} gy
   * @param {string} className
   * @param {string} title
   */
  function svgMoveLine(from, gx, gy, className, title) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(from.x));
    line.setAttribute("y1", String(from.y));
    line.setAttribute("x2", String(gx));
    line.setAttribute("y2", String(gy));
    line.setAttribute("class", className);
    const t = document.createElementNS("http://www.w3.org/2000/svg", "title");
    t.textContent = title;
    line.appendChild(t);
    return line;
  }

  /**
   * @param {SVGElement} svg
   * @param {Record<string, DemoEntity>} entities
   * @param {Record<string, boolean>} settings
   */
  function renderLines(svg, entities, settings) {
    const mtypeRules = loadMtypeRules();
    svg.replaceChildren();

    /** @param {string} id */
    function ent(id) {
      return entities[id];
    }

    for (const id of Object.keys(entities)) {
      const e = entities[id];
      const moving = Math.hypot(e.going_x - e.x, e.going_y - e.y) > 0.75;
      if (moving && lineEnabled(e, "moveDest", settings, mtypeRules)) {
        svg.appendChild(
          svgMoveLine(
            e,
            e.going_x,
            e.going_y,
            `viz-debug-line viz-debug-line--move viz-debug-line--${e.kind}`,
            `${e.label || id} → going (${Math.round(e.going_x)}, ${Math.round(e.going_y)})`,
          ),
        );
        const dest = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dest.setAttribute("cx", String(e.going_x));
        dest.setAttribute("cy", String(e.going_y));
        dest.setAttribute("r", "3");
        dest.setAttribute("class", "viz-debug-line-dest");
        svg.appendChild(dest);
      }

      if (!e.target) continue;
      const target = ent(e.target);
      if (!target) continue;

      const aggro = e.kind === "monster" && lineEnabled(e, "aggroTarget", settings, mtypeRules);
      const atk = lineEnabled(e, "attackTarget", settings, mtypeRules);
      if (aggro) {
        svg.appendChild(
          svgLine(
            e,
            target,
            `viz-debug-line viz-debug-line--aggro`,
            `${e.label || id} aggro → ${target.label || e.target}`,
          ),
        );
      } else if (atk) {
        svg.appendChild(
          svgLine(
            e,
            target,
            `viz-debug-line viz-debug-line--target viz-debug-line--${e.kind}`,
            `${e.label || id} target → ${target.label || e.target}`,
          ),
        );
      }
    }
  }

  /**
   * @param {HTMLElement} root
   * @param {() => Record<string, boolean>} getSettings
   */
  function bindDebugLines(root, getSettings) {
    const svg = root.querySelector("[data-viz-lines-svg]");
    if (!svg) return;

    /** @type {Record<string, DemoEntity>} */
    const entities = {
      gpurplepro: {
        id: "gpurplepro",
        kind: "monster",
        mtype: "gpurplepro",
        x: 240,
        y: 190,
        going_x: 240,
        going_y: 190,
        target: "p:Alice",
        focus: true,
        label: "Protector of Darkness",
      },
      "p:Alice": {
        id: "p:Alice",
        kind: "player",
        mtype: "player",
        x: 268,
        y: 168,
        going_x: 265,
        going_y: 170,
        target: "gpurplepro",
        label: "Alice",
      },
      "p:Bob": {
        id: "p:Bob",
        kind: "player",
        mtype: "player",
        x: 222,
        y: 208,
        going_x: 232,
        going_y: 198,
        target: "gpurplepro",
        label: "Bob",
      },
      "p:Carol": {
        id: "p:Carol",
        kind: "player",
        mtype: "player",
        x: 120,
        y: 120,
        going_x: 120,
        going_y: 120,
        label: "Carol",
      },
      zapper0: {
        id: "zapper0",
        kind: "monster",
        mtype: "zapper0",
        x: 380,
        y: 100,
        going_x: 340,
        going_y: 130,
        label: "Zapper",
      },
    };

    let t = 0;

    function tick(dt) {
      t += dt;
      const aliceGoX = 265 + Math.sin(t / 900) * 10;
      const aliceGoY = 170 + Math.cos(t / 1100) * 8;
      entities["p:Alice"].going_x = aliceGoX;
      entities["p:Alice"].going_y = aliceGoY;
      entities["p:Alice"].x = aliceGoX - Math.cos(t / 900) * 14;
      entities["p:Alice"].y = aliceGoY - Math.sin(t / 1100) * 10;

      const bobGoX = 232 + Math.sin(t / 700) * 12;
      const bobGoY = 198 + Math.cos(t / 800) * 10;
      entities["p:Bob"].going_x = bobGoX;
      entities["p:Bob"].going_y = bobGoY;
      entities["p:Bob"].x = bobGoX - Math.cos(t / 700) * 16;
      entities["p:Bob"].y = bobGoY - Math.sin(t / 800) * 12;

      const zapGoX = 340 + Math.sin(t / 1200) * 30;
      const zapGoY = 130 + Math.cos(t / 1400) * 20;
      entities.zapper0.going_x = zapGoX;
      entities.zapper0.going_y = zapGoY;
      entities.zapper0.x = zapGoX - Math.cos(t / 1200) * 22;
      entities.zapper0.y = zapGoY - Math.sin(t / 1400) * 18;

      renderLines(/** @type {SVGElement} */ (svg), entities, getSettings());
    }

    window.MockLive.registerTick(tick);
    tick(0);
  }

  /** @param {HTMLElement} root */
  function bindMtypePanel(root) {
    const panel = root.querySelector("[data-viz-mtype-panel]");
    if (!panel) return;
    const rules = loadMtypeRules();
    const rows = [
      { key: "gpurplepro", label: "gpurplepro · Protector" },
      { key: "zapper0", label: "zapper0 · Zapper" },
      { key: "p:Alice", label: "player · Alice" },
      { key: "p:Bob", label: "player · Bob" },
    ];

    panel.replaceChildren();
    const head = document.createElement("div");
    head.className = "viz-mtype-head";
    head.innerHTML = "<span>mtype / id</span><span>move</span><span>aggro</span><span>target</span>";
    panel.appendChild(head);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const kind = row.key.startsWith("p:") ? "player" : "monster";
      const preset = { ...DEFAULT_BY_KIND[kind], ...rules[row.key] };
      const tr = document.createElement("div");
      tr.className = "viz-mtype-row";
      tr.dataset.mtypeKey = row.key;

      const label = document.createElement("span");
      label.className = "viz-mtype-row__label";
      label.textContent = row.label;
      tr.appendChild(label);

      for (const lineType of ["moveDest", "aggroTarget", "attackTarget"]) {
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!preset[lineType];
        input.dataset.lineType = lineType;
        input.title = lineType;
        input.addEventListener("change", () => {
          const next = loadMtypeRules();
          if (!next[row.key]) next[row.key] = {};
          next[row.key][lineType] = input.checked;
          saveMtypeRules(next);
        });
        tr.appendChild(input);
      }
      panel.appendChild(tr);
    }
  }

  window.MockVizLines = {
    MTYPE_STORAGE_KEY,
    loadMtypeRules,
    bind: bindDebugLines,
    bindMtypePanel,
  };
})();
