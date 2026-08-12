/**
 * Series views — realtime (live paint tick) vs compare (stack/integrate/normalize).
 * Realtime: full redraw only on user chrome changes; tick paints canvas + rates.
 */
window.MockSeries = (() => {
  const D = () => window.MockData;
  const C = () => window.MockCharts;
  const V = () => window.MockViews;

  function enabledMap(state) {
    const Dref = D();
    const pool = Dref.scopedPlayers();
    if (!state.enabled) {
      state.enabled = Object.fromEntries(pool.map((p) => [p.id, true]));
    }
    return state.enabled;
  }

  function activePlayers(state) {
    const enabled = enabledMap(state);
    return D().scopedPlayers().filter((p) => enabled[p.id]);
  }

  function chartOpts(state, mode) {
    return {
      stack: mode === "compare" && !!state.stack,
      integrate: mode === "compare" && !!state.integrate,
      normalize: mode === "compare" && !!state.normalize,
      fill: mode === "realtime",
      axis: true,
      dots: mode === "realtime",
      fmtY: (v) => D().fmtRate(v),
    };
  }

  function buildLines(state, mode) {
    const Dref = D();
    const metric = mode === "compare" ? "dps" : state.rtMetric || "dps";
    const win = state.rtWindow || 30;
    const slicePts = (pts) => (mode === "realtime" ? pts.slice(-win) : pts.slice());
    return activePlayers(state).map((p) => ({
      id: p.id,
      name: p.name,
      color: Dref.CLASS_COLORS[p.ctype],
      pts: slicePts(p.series[metric] || p.series.dps),
    }));
  }

  function bindHover(canvas, state, mode) {
    canvas.onmousemove = (e) => {
      const lines = state._lines;
      const layout = state._layout;
      if (!lines?.length || !layout) return;
      const hit = C().hitTest(layout, lines, e.clientX, canvas);
      if (!hit) return;
      state._layout = C().multiLine(canvas, lines, chartOpts(state, mode));
      C().drawCrosshair(canvas, state._layout, hit);
      const rows = [...hit.samples]
        .sort((a, b) => b.value - a.value)
        .map((s) => `<li><span style="color:${s.color}">${s.name}</span><b>${D().fmtRate(s.value)}/s</b></li>`)
        .join("");
      state._showTooltip?.(e, `<h4>Sample ${hit.idx + 1}</h4><ul>${rows}</ul>`);
    };
    canvas.onmouseleave = () => {
      state._hideTooltip?.();
      if (state._lines) {
        state._layout = C().multiLine(canvas, state._lines, chartOpts(state, mode));
      }
    };
  }

  function paintCanvas(body, state, mode) {
    const canvas = body.querySelector("canvas");
    if (!canvas) return;
    const lines = buildLines(state, mode);
    state._lines = lines;
    state._layout = C().multiLine(canvas, lines, chartOpts(state, mode));
  }

  function updateLegendRates(body, state, mode) {
    const Dref = D();
    const metric = mode === "compare" ? "dps" : state.rtMetric || "dps";
    for (const lab of body.querySelectorAll("[data-leg] .leg-item")) {
      const id = lab.getAttribute("data-id");
      const p = Dref.playerById(id);
      if (!p) continue;
      const pts = p.series[metric] || p.series.dps;
      const rateEl = lab.querySelector(".leg-rate");
      if (rateEl) rateEl.textContent = Dref.fmtRate(pts[pts.length - 1] || 0);
    }
  }

  function updateRealtimeChrome(body, state) {
    const meta = body.querySelector(".rt-meta");
    if (meta) {
      const n = activePlayers(state).length;
      const metric = (state.rtMetric || "dps").toUpperCase();
      const win = state.rtWindow || 30;
      meta.textContent = `${n} · ${metric} · ${win}s`;
    }
    const pauseBtn = body.querySelector("[data-pause]");
    if (pauseBtn) pauseBtn.textContent = state.rtPaused ? "▶" : "⏸";
  }

  function refreshTitle(state, ctx) {
    const ttl = state.el?.querySelector(".ttl");
    if (!ttl || !V()) return;
    const seg = typeof ctx.segLabel === "function" ? ctx.segLabel() : "";
    ttl.innerHTML = V().titleFor(state, seg);
  }

  /** Live tick: mutate series + paint canvas/rates/title. No DOM chrome rebuild. */
  function paintLive(state, ctx) {
    if (!state.el?.isConnected) return;
    const body = state.el.querySelector(".panel-body");
    if (!body?.querySelector("canvas")) return;
    paintCanvas(body, state, "realtime");
    updateLegendRates(body, state, "realtime");
    updateRealtimeChrome(body, state);
    refreshTitle(state, ctx);
  }

  function clearTick(state) {
    if (state._seriesUnsub) {
      state._seriesUnsub();
      state._seriesUnsub = null;
    }
    if (state._tick) {
      clearInterval(state._tick);
      state._tick = null;
    }
  }

  function ensureRealtimeTick(state, ctx) {
    if (state._seriesUnsub) return;
    const onTick = () => {
      if (state.rtPaused) return;
      if (!state.el?.isConnected) {
        clearTick(state);
        return;
      }
      const ref = state.selectedset || "current";
      if (ref !== "current" || !D().isCombatLive()) return;
      // ingest already ran in MockUiTick.pump; paint only
      D().withSegment(ref, () => paintLive(state, ctx));
    };
    state._seriesUnsub = window.MockUiTick.subscribe(onTick);
  }

  function renderLegend(leg, state, mode, ctx) {
    const Dref = D();
    const enabled = enabledMap(state);
    const metric = mode === "compare" ? "dps" : state.rtMetric || "dps";
    leg.innerHTML = "";
    for (const p of Dref.scopedPlayers()) {
      const pts = p.series[metric] || p.series.dps;
      const live = pts[pts.length - 1] || 0;
      const lab = document.createElement("label");
      lab.className = "leg-item" + (enabled[p.id] ? " on" : "");
      lab.setAttribute("data-id", p.id);
      lab.innerHTML = `<input type="checkbox" ${enabled[p.id] ? "checked" : ""}/>
        <span class="swatch" style="background:${Dref.CLASS_COLORS[p.ctype]}"></span>
        <span class="leg-name">${p.name}</span>
        <b class="leg-rate">${Dref.fmtRate(live)}</b>`;
      lab.querySelector("input").onchange = (e) => {
        enabled[p.id] = e.target.checked;
        if (!Object.values(enabled).some(Boolean)) {
          enabled[p.id] = true;
          e.target.checked = true;
        }
        ctx.redraw();
      };
      leg.appendChild(lab);
    }
  }

  function renderRealtime(body, state, ctx) {
    clearTick(state);
    const metric = state.rtMetric || "dps";
    const win = state.rtWindow || 30;
    const paused = !!state.rtPaused;
    const active = activePlayers(state);
    state._showTooltip = ctx.showTooltip;
    state._hideTooltip = ctx.hideTooltip;

    body.innerHTML = `
      <div class="chart-panel">
        <div class="chart-tools">
          <button type="button" data-m="dps" class="${metric === "dps" ? "active" : ""}">DPS</button>
          <button type="button" data-m="hps" class="${metric === "hps" ? "active" : ""}">HPS</button>
          <button type="button" data-m="taken" class="${metric === "taken" ? "active" : ""}">Taken</button>
          <span class="sep"></span>
          <button type="button" data-win="15" class="${win === 15 ? "active" : ""}">15s</button>
          <button type="button" data-win="30" class="${win === 30 ? "active" : ""}">30s</button>
          <button type="button" data-win="60" class="${win === 60 ? "active" : ""}">60s</button>
          <span class="sep"></span>
          <button type="button" data-pause>${paused ? "▶" : "⏸"}</button>
          <button type="button" data-all>All</button>
          <button type="button" data-none>None</button>
          <span class="rt-meta">${active.length} · ${metric.toUpperCase()} · ${win}s</span>
        </div>
        <div class="chart-wrap"><canvas></canvas></div>
        <div class="chart-legend" data-leg></div>
      </div>`;

    for (const b of body.querySelectorAll("[data-m]")) {
      b.onclick = () => {
        state.rtMetric = b.getAttribute("data-m");
        ctx.redraw();
      };
    }
    for (const b of body.querySelectorAll("[data-win]")) {
      b.onclick = () => {
        state.rtWindow = Number(b.getAttribute("data-win"));
        ctx.redraw();
      };
    }
    body.querySelector("[data-pause]").onclick = () => {
      state.rtPaused = !state.rtPaused;
      updateRealtimeChrome(body, state);
      refreshTitle(state, ctx);
    };
    body.querySelector("[data-all]").onclick = () => {
      for (const p of D().scopedPlayers()) enabledMap(state)[p.id] = true;
      ctx.redraw();
    };
    body.querySelector("[data-none]").onclick = () => {
      const enabled = enabledMap(state);
      const pool = D().scopedPlayers();
      for (const p of pool) enabled[p.id] = false;
      if (pool[0]) enabled[pool[0].id] = true;
      ctx.redraw();
    };

    renderLegend(body.querySelector("[data-leg]"), state, "realtime", ctx);
    paintCanvas(body, state, "realtime");
    bindHover(body.querySelector("canvas"), state, "realtime");
    ensureRealtimeTick(state, ctx);
  }

  function renderCompare(body, state, ctx) {
    clearTick(state);
    state._showTooltip = ctx.showTooltip;
    state._hideTooltip = ctx.hideTooltip;

    body.innerHTML = `
      <div class="chart-panel">
        <div class="chart-tools">
          <label><input type="checkbox" data-k="stack" ${state.stack ? "checked" : ""}/> Stack</label>
          <label><input type="checkbox" data-k="integrate" ${state.integrate ? "checked" : ""}/> Integrate</label>
          <label><input type="checkbox" data-k="normalize" ${state.normalize ? "checked" : ""}/> Normalize</label>
        </div>
        <div class="chart-wrap"><canvas></canvas></div>
        <div class="chart-legend" data-leg></div>
      </div>`;

    for (const cb of body.querySelectorAll("[data-k]")) {
      cb.onchange = () => {
        state[cb.getAttribute("data-k")] = cb.checked;
        ctx.redraw();
      };
    }

    renderLegend(body.querySelector("[data-leg]"), state, "compare", ctx);
    paintCanvas(body, state, "compare");
    bindHover(body.querySelector("canvas"), state, "compare");
  }

  function renderSeries(body, state, ctx) {
    if ((state.seriesMode || "realtime") === "compare") renderCompare(body, state, ctx);
    else renderRealtime(body, state, ctx);
  }

  return { renderSeries, renderRealtime, renderCompare, clearTick, paintLive };
})();
