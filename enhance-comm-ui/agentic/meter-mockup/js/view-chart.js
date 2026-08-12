/**
 * Generic chart panel — query × presentation (line / pie / bars).
 * Proves any ranked/series data can drive a chart pane.
 */
window.MockChartView = (() => {
  const D = () => window.MockData;
  const C = () => window.MockCharts;
  const B = () => window.MockBars;

  const QUERIES = [
    { id: "players_damage", label: "Players · Damage", metric: "damage", source: "players" },
    { id: "players_heal", label: "Players · Healing", metric: "heal", source: "players" },
    { id: "players_taken", label: "Players · Taken", metric: "taken", source: "players" },
    { id: "abilities", label: "Abilities · selected", metric: "damage", source: "abilities" },
    { id: "series_dps", label: "Series · DPS", metric: "dps", source: "series" },
    { id: "series_hps", label: "Series · HPS", metric: "hps", source: "series" },
  ];

  const PRESENTATIONS = [
    { id: "line", label: "Line" },
    { id: "pie", label: "Pie" },
    { id: "bars", label: "Bars" },
  ];

  function rankedRows(state) {
    const Dref = D();
    const q = state.chartQuery || "players_damage";
    if (q === "abilities") {
      const p = Dref.playerById(state.actorId || "p1") || Dref.PLAYERS[0];
      return Dref.rankedAbilities(p, "damage").map((r) => ({
        ...r,
        color: r.color || "#90a4ae",
      }));
    }
    const metric = q === "players_heal" ? "heal" : q === "players_taken" ? "taken" : "damage";
    return Dref.rankedPlayers(metric);
  }

  function seriesLines(state) {
    const Dref = D();
    const metric = state.chartQuery === "series_hps" ? "hps" : "dps";
    return Dref.PLAYERS.map((p) => ({
      id: p.id,
      name: p.name,
      color: Dref.CLASS_COLORS[p.ctype],
      pts: (p.series[metric] || p.series.dps).slice(),
    }));
  }

  function paint(body, state) {
    const presentation = state.chartPresentation || "line";
    const q = state.chartQuery || "players_damage";
    const wrap = body.querySelector("[data-chart-main]");
    const leg = body.querySelector("[data-chart-leg]");
    if (!wrap) return;

    if (presentation === "bars") {
      wrap.innerHTML = `<div class="list" data-bars></div>`;
      B().renderRankedRows(wrap.querySelector("[data-bars]"), rankedRows(state), {
        rank: true,
        pct: true,
        icons: true,
      });
      leg.innerHTML = "";
      return;
    }

    wrap.innerHTML = `<div class="chart-wrap"><canvas></canvas></div>`;
    const canvas = wrap.querySelector("canvas");

    if (presentation === "pie") {
      const rows = rankedRows(state).slice(0, 8);
      C().pie(
        canvas,
        rows.map((r) => ({ value: r.value, color: r.color || "#78909c", label: r.name })),
      );
      leg.innerHTML = rows
        .map(
          (r) =>
            `<span class="leg-item on"><span class="swatch" style="background:${r.color}"></span>${r.name} <b>${D().fmt(r.value)}</b></span>`,
        )
        .join("");
      return;
    }

    // line
    const lines =
      q.startsWith("series_")
        ? seriesLines(state)
        : rankedRows(state).map((r, i) => {
            const p = D().playerById(r.id);
            const metric = q === "players_heal" ? "hps" : q === "players_taken" ? "taken" : "dps";
            return {
              id: r.id,
              name: r.name,
              color: r.color,
              pts: p?.series?.[metric] || makeFlat(r.value, i),
            };
          });
    C().multiLine(canvas, lines, {
      fill: false,
      axis: true,
      dots: false,
      fmtY: (v) => D().fmtRate(v),
    });
    leg.innerHTML = lines
      .map(
        (l) =>
          `<span class="leg-item on"><span class="swatch" style="background:${l.color}"></span>${l.name}</span>`,
      )
      .join("");
  }

  function makeFlat(peak, seed) {
    const pts = [];
    for (let i = 0; i < 24; i++) pts.push(Math.round(peak * (0.4 + 0.6 * ((Math.sin(i + seed) + 1) / 2))));
    return pts;
  }

  function renderChart(body, state, ctx) {
    if (!state.chartQuery) state.chartQuery = "players_damage";
    if (!state.chartPresentation) state.chartPresentation = "line";
    if (!state.actorId) state.actorId = "p1";

    body.innerHTML = `
      <div class="chart-panel">
        <div class="chart-tools">
          <select data-q aria-label="Chart query"></select>
          <span class="sep"></span>
          <span data-pres></span>
          <span class="sep"></span>
          <select data-actor aria-label="Actor" style="display:none"></select>
          <span class="rt-meta" data-meta></span>
        </div>
        <div data-chart-main style="flex:1;min-height:0;display:flex;flex-direction:column"></div>
        <div class="chart-legend" data-chart-leg></div>
      </div>`;

    const qSel = body.querySelector("[data-q]");
    for (const q of QUERIES) {
      const opt = document.createElement("option");
      opt.value = q.id;
      opt.textContent = q.label;
      if (q.id === state.chartQuery) opt.selected = true;
      qSel.appendChild(opt);
    }
    qSel.onchange = () => {
      state.chartQuery = qSel.value;
      ctx.redraw();
    };

    const pres = body.querySelector("[data-pres]");
    for (const p of PRESENTATIONS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = p.label;
      btn.className = state.chartPresentation === p.id ? "active" : "";
      btn.onclick = () => {
        state.chartPresentation = p.id;
        ctx.redraw();
      };
      pres.appendChild(btn);
    }

    const actorSel = body.querySelector("[data-actor]");
    if (state.chartQuery === "abilities") {
      actorSel.style.display = "";
      for (const p of D().PLAYERS) {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name;
        if (p.id === state.actorId) opt.selected = true;
        actorSel.appendChild(opt);
      }
      actorSel.onchange = () => {
        state.actorId = actorSel.value;
        ctx.redraw();
      };
    }

    const live = D().activeSegment().live ? "live" : "frozen";
    body.querySelector("[data-meta]").textContent = `${state.chartPresentation} · ${live}`;
    paint(body, state);
  }

  function titleFor(panel) {
    const q = QUERIES.find((x) => x.id === (panel.chartQuery || "players_damage"));
    const pr = panel.chartPresentation || "line";
    return `Chart — ${q?.label || "Data"} · ${pr}`;
  }

  return { renderChart, titleFor, QUERIES, PRESENTATIONS };
})();
