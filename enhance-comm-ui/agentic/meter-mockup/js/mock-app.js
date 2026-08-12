/**
 * AL meter mockup v4.7 — Skada per-panel selectedset.
 * Architecture: MockData (query) → MockViews registry → MockShell → stage
 */
(() => {
  const D = window.MockData;
  const stage = document.getElementById("stage");
  const tooltip = document.getElementById("tooltip");
  const addSelect = document.getElementById("add-preset");
  const segSelect = document.getElementById("seg-select");
  const partySelect = document.getElementById("party-scope");

  const opts = { fade: false, rank: true, pct: true, icons: true };
  const panels = [];

  /** Apply-all convenience (not Skada) — set every panel's selectedset */
  function applySegmentToAll(id) {
    D.setDefaultSelectedset(id);
    fillSegmentSelect();
    for (const p of panels) {
      p.selectedset = id;
      if (p.kind === "death") p.deathId = undefined;
      p.render();
    }
  }

  const PRESETS = [
    { id: "damage", label: "Damage Done (bars)", kind: "bars", metric: "damage", w: 280, h: 200 },
    { id: "heal", label: "Healing Done (bars)", kind: "bars", metric: "heal", w: 280, h: 180 },
    { id: "taken", label: "Damage Taken (bars)", kind: "bars", metric: "taken", w: 260, h: 180 },
    { id: "healreq", label: "Healing Required", kind: "bars", metric: "healing_required", w: 260, h: 180 },
    { id: "avoid", label: "Avoidance (bars)", kind: "bars", metric: "avoidance", w: 260, h: 200 },
    { id: "channel", label: "Channel: Blast", kind: "bars", metric: "blast", w: 240, h: 180 },
    { id: "pdps", label: "PDPS snapshot", kind: "bars", metric: "pdps", w: 240, h: 180 },
    { id: "rolling", label: "Hit DPS 10s", kind: "bars", metric: "rolling", w: 240, h: 180 },
    { id: "inspector", label: "Player Inspector", kind: "inspector", actorId: "p1", w: 520, h: 300 },
    { id: "details", label: "Recount Details (pie)", kind: "details", actorId: "p1", w: 420, h: 320 },
    { id: "summary", label: "Summary Report", kind: "summary", actorId: "p1", w: 480, h: 280 },
    { id: "death", label: "Advanced Death Logs", kind: "death", w: 560, h: 360 },
    { id: "realtime", label: "Realtime (multi)", kind: "series", seriesMode: "realtime", w: 520, h: 300 },
    { id: "compare", label: "Compare Graph", kind: "series", seriesMode: "compare", w: 480, h: 280 },
    { id: "chart", label: "Chart (query × view)", kind: "chart", chartQuery: "players_damage", chartPresentation: "line", w: 520, h: 300 },
    { id: "timeline", label: "Time Line (buffs/CDs)", kind: "timeline", w: 720, h: 360 },
    { id: "encounter", label: "Encounter Summary", kind: "encounter", w: 720, h: 400 },
    { id: "pie", label: "Ability Pie", kind: "pie", actorId: "p1", w: 240, h: 220 },
  ];

  function showTooltip(e, html) {
    tooltip.hidden = false;
    tooltip.innerHTML = html;
    tooltip.style.left = Math.min(window.innerWidth - 280, e.clientX + 12) + "px";
    tooltip.style.top = Math.min(window.innerHeight - 40, e.clientY + 12) + "px";
  }
  function hideTooltip() {
    tooltip.hidden = true;
  }

  function rebindAll() {
    for (const p of panels) {
      if (p.kind === "death") p.deathId = undefined;
      p.render();
    }
  }

  const api = {
    opts,
    defaultSegment: () => D.getDefaultSelectedset(),
    showTooltip,
    hideTooltip,
    selectSegment: applySegmentToAll,
    openPreset: (id, x, y, overrides) => {
      const cfg = window.MockPanelConfig.fromPreset(id, overrides || {});
      const existing = panels.find(
        (p) => p.kind === cfg.kind && (cfg.kind !== "series" || p.seriesMode === cfg.seriesMode),
      );
      if (existing && overrides) {
        Object.assign(existing, overrides);
        if (overrides.layout) existing.layout = overrides.layout;
        existing.el.style.zIndex = String(Date.now() % 100000);
        existing.el.classList.add("active");
        for (const o of panels) if (o !== existing) o.el.classList.remove("active");
        existing.render();
        return existing;
      }
      return add(id, x, y, overrides);
    },
  };

  function add(presetId, x, y, overrides) {
    const cfg = window.MockPanelConfig.fromPreset(presetId, overrides || {});
    const pr = {
      id: presetId,
      label: PRESETS.find((p) => p.id === presetId)?.label || presetId,
      kind: cfg.kind,
      metric: cfg.metric,
      actorId: cfg.actorId,
      seriesMode: cfg.seriesMode,
      chartQuery: cfg.chartQuery,
      chartPresentation: cfg.chartPresentation,
      layout: cfg.layout,
      query: cfg.query,
      presentation: cfg.presentation,
      w: PRESETS.find((p) => p.id === presetId)?.w || 280,
      h: PRESETS.find((p) => p.id === presetId)?.h || 200,
    };
    return window.MockShell.createPanel(stage, panels, pr, x, y, api, {
      ...cfg,
      ...(overrides || {}),
    });
  }

  function clearPanels() {
    for (const p of panels) if (p.dispose) p.dispose();
    stage.innerHTML = "";
    panels.length = 0;
  }

  function defaultLayout() {
    clearPanels();
    // Demo Skada independence: Damage on Current, Chart pinned to past wipe
    add("damage", 12, 12, { selectedset: "current" });
    add("chart", 300, 12, { selectedset: "past1" });
    add("timeline", 840, 12, { selectedset: "current" });
    add("death", 12, 330, { selectedset: "current" });
    add("encounter", 590, 330, { selectedset: "current" });
    add("realtime", 12, 720, { selectedset: "current" });
  }

  function focusEncRtLayout() {
    clearPanels();
    add("encounter", 12, 12);
    add("realtime", 750, 12);
    add("timeline", 12, 430);
    add("death", 750, 430);
  }

  function paintLegend() {
    document.getElementById("legend-bar").innerHTML = D.CHANNELS.slice(0, 8)
      .map((c) => `<span><span class="swatch" style="background:${c.color}"></span>${c.label}</span>`)
      .join("");
  }

  function fillSegmentSelect() {
    if (!segSelect) return;
    segSelect.innerHTML = "";
    const cur = D.getDefaultSelectedset();
    for (const s of D.listSegments()) {
      const opt = document.createElement("option");
      opt.value = s.id;
      const mark = s.id === "current" ? "●" : s.id === "total" ? "Σ" : s.outcome === "wipe" ? "✗" : "✓";
      opt.textContent = `${mark} ${s.label} · ${window.MockViews.fmtTime(s.durationSec)} · ${s.deaths}d`;
      if (s.id === cur) opt.selected = true;
      segSelect.appendChild(opt);
    }
  }

  for (const pr of PRESETS) {
    const opt = document.createElement("option");
    opt.value = pr.id;
    opt.textContent = pr.label;
    addSelect.appendChild(opt);
  }

  document.getElementById("btn-add").onclick = () =>
    add(addSelect.value, 40 + panels.length * 16, 40 + panels.length * 12);
  document.getElementById("btn-layout-default").onclick = defaultLayout;
  document.getElementById("btn-layout-clear").onclick = clearPanels;
  const focusBtn = document.getElementById("btn-layout-encrt");
  if (focusBtn) focusBtn.onclick = focusEncRtLayout;
  document.getElementById("btn-reset").onclick = () => applySegmentToAll("current");
  if (segSelect) {
    segSelect.onchange = () => applySegmentToAll(segSelect.value);
  }

  const ooc = document.getElementById("opt-ooc");
  if (ooc) {
    ooc.onchange = (e) => {
      D.setCombatLive(!e.target.checked);
      rebindAll();
    };
  }

  function fillPartyScope() {
    if (!partySelect) return;
    partySelect.innerHTML = "";
    for (const s of D.PARTY_SCOPES) {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.label;
      if (s.id === D.getPartyScope()) opt.selected = true;
      partySelect.appendChild(opt);
    }
  }
  if (partySelect) {
    fillPartyScope();
    partySelect.onchange = () => {
      D.setPartyScope(partySelect.value);
      rebindAll();
    };
  }
  document.getElementById("opt-fade").onchange = (e) => {
    opts.fade = e.target.checked;
    for (const p of panels) p.el.classList.toggle("fade-idle", opts.fade);
  };
  document.getElementById("opt-rank").onchange = (e) => {
    opts.rank = e.target.checked;
    for (const p of panels) p.render();
  };
  document.getElementById("opt-pct").onchange = (e) => {
    opts.pct = e.target.checked;
    for (const p of panels) p.render();
  };
  document.getElementById("opt-icons").onchange = (e) => {
    opts.icons = e.target.checked;
    for (const p of panels) p.render();
  };
  window.addEventListener("resize", () => {
    for (const p of panels) p.render();
  });

  paintLegend();
  fillSegmentSelect();
  if (/focus=enc-rt/.test(location.search)) focusEncRtLayout();
  else defaultLayout();
})();
