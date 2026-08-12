/** Shared ranked bar rows — pool + patch; live updates via MockUiTick. */
window.MockBars = (() => {
  const D = () => window.MockData;

  function formatRowValue(row, metric, share, opts) {
    const Dref = D();
    if (row.pctMode || (metric && Dref.isAbsoluteMetric(metric))) {
      return Dref.formatMetricValue(metric || "avoidance", row.value);
    }
    if (row.rate != null) {
      const pct = opts.pct ? `, ${share.toFixed(0)}%` : "";
      return `${Dref.fmt(row.value)} (${Dref.fmtRate(row.rate)}${pct})`;
    }
    const pct = opts.pct ? ` <span class="pct">${share.toFixed(0)}%</span>` : "";
    return `${Dref.fmt(row.value)}${pct}`;
  }

  function makeRowEl(r, i, opts, max, total) {
    const el = document.createElement("div");
    el.className = "row" + (r.you ? " you" : "") + (r.kind === "ability" || r.iconKey || r.letter ? " has-skill" : "");
    el.dataset.id = r.id || String(i);
    const pct = max ? (r.value / max) * 100 : 0;
    const share = (r.value / total) * 100;
    const icon = window.MockIcons.iconHtml(r, opts);
    el.innerHTML = `
      <div class="fill" style="width:${pct}%;background:${r.color || "#607d8b"}"></div>
      ${opts.rank ? `<span class="rank">${i + 1}.</span>` : "<span></span>"}
      <span class="name">${icon}<span class="label">${r.name}</span></span>
      <span class="vals">${formatRowValue(r, opts.metric, share, opts)}</span>`;
    return el;
  }

  function renderRankedRows(container, rows, opts = {}) {
    if (opts.clear !== false) container.innerHTML = "";
    const sorted = [...rows].sort((a, b) => b.value - a.value);
    const max = sorted[0]?.value || 1;
    const total = sorted.reduce((s, r) => s + r.value, 0) || 1;

    for (const [i, r] of sorted.entries()) {
      const el = makeRowEl(r, i, opts, max, total);
      if (opts.tooltipHtml) {
        el.onmousemove = (e) => opts.tooltipHtml(e, r);
        el.onmouseleave = opts.onTooltipHide;
      }
      if (opts.onClick) el.onclick = (e) => opts.onClick(e, r);
      if (opts.onContextMenu) el.oncontextmenu = (e) => opts.onContextMenu(e, r);
      container.appendChild(el);
    }
    container._barOpts = opts;
    container._barById = Object.fromEntries(sorted.map((r) => [r.id, r]));
  }

  function patchRankedRows(container, rows, opts = {}) {
    const merged = { ...container._barOpts, ...opts };
    const sorted = [...rows].sort((a, b) => b.value - a.value);
    const max = sorted[0]?.value || 1;
    const total = sorted.reduce((s, r) => s + r.value, 0) || 1;
    const kids = [...container.children].filter((el) => el.classList?.contains("row"));

    while (kids.length > sorted.length) {
      const last = kids.pop();
      last.remove();
    }
    while (kids.length < sorted.length) {
      const r = sorted[kids.length];
      const el = makeRowEl(r, kids.length, merged, max, total);
      container.appendChild(el);
      kids.push(el);
    }

    for (const [i, r] of sorted.entries()) {
      const el = kids[i];
      el.dataset.id = r.id || String(i);
      el.className = "row" + (r.you ? " you" : "") + (r.kind === "ability" || r.iconKey || r.letter ? " has-skill" : "");
      const fill = el.querySelector(".fill");
      const pct = max ? (r.value / max) * 100 : 0;
      if (fill) {
        fill.style.width = pct + "%";
        fill.style.background = r.color || "#607d8b";
      }
      const rank = el.querySelector(".rank");
      if (rank && merged.rank) rank.textContent = `${i + 1}.`;
      const label = el.querySelector(".label");
      if (label) label.textContent = r.name;
      const vals = el.querySelector(".vals");
      const share = (r.value / total) * 100;
      if (vals) vals.innerHTML = formatRowValue(r, merged.metric, share, merged);
      if (merged.tooltipHtml) {
        el.onmousemove = (e) => merged.tooltipHtml(e, r);
        el.onmouseleave = merged.onTooltipHide;
      }
      if (merged.onClick) el.onclick = (e) => merged.onClick(e, r);
      if (merged.onContextMenu) el.oncontextmenu = (e) => merged.onContextMenu(e, r);
    }
    container._barOpts = merged;
    container._barById = Object.fromEntries(sorted.map((r) => [r.id, r]));
  }

  function clearTick(state) {
    if (state._barUnsub) {
      state._barUnsub();
      state._barUnsub = null;
    }
    state._barOnTick = null;
    state._barTick = null;
  }

  function ensureBarTick(state, onTick) {
    clearTick(state);
    state._barOnTick = onTick;
    state._barUnsub = window.MockUiTick.subscribe(onTick);
  }

  return { renderRankedRows, patchRankedRows, clearTick, ensureBarTick };
})();
