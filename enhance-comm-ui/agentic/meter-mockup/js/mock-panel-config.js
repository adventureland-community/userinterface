/**
 * Panel config — query × presentation (Skada Graphs lesson).
 * `kind` remains a short registry key derived from presentation for the mock shell.
 */
window.MockPanelConfig = (() => {
  /** @typedef {"bars"|"table"|"pie"|"line"|"realtime"|"details"|"summary"|"death_log"|"timeline"|"encounter"|"inspector"} Presentation */

  const PRESET_TO_CONFIG = {
    damage: { query: { kind: "players", metric: "damage" }, presentation: "bars" },
    heal: { query: { kind: "players", metric: "heal" }, presentation: "bars" },
    taken: { query: { kind: "players", metric: "taken" }, presentation: "bars" },
    healreq: { query: { kind: "players", metric: "healing_required" }, presentation: "bars" },
    avoid: { query: { kind: "avoidance" }, presentation: "bars", metric: "avoidance" },
    channel: { query: { kind: "channel", channel: "blast" }, presentation: "bars", metric: "blast" },
    pdps: { query: { kind: "snapshot", metric: "pdps" }, presentation: "bars", metric: "pdps" },
    rolling: { query: { kind: "rolling", windowMs: 10_000 }, presentation: "bars", metric: "rolling" },
    inspector: { query: { kind: "details", actorId: "p1" }, presentation: "inspector" },
    details: { query: { kind: "details", actorId: "p1" }, presentation: "inspector", layout: "details" },
    summary: { query: { kind: "summary", actorId: "p1" }, presentation: "summary" },
    death: { query: { kind: "death_log" }, presentation: "death_log" },
    realtime: { query: { kind: "realtime", metric: "dps" }, presentation: "realtime", seriesMode: "realtime" },
    compare: { query: { kind: "compare", metric: "damage" }, presentation: "realtime", seriesMode: "compare" },
    chart: {
      query: { kind: "players", metric: "damage" },
      presentation: "line",
      chartQuery: "players_damage",
      chartPresentation: "line",
    },
    timeline: { query: { kind: "timeline" }, presentation: "timeline" },
    encounter: { query: { kind: "encounter_summary" }, presentation: "encounter" },
    pie: { query: { kind: "pie", actorId: "p1" }, presentation: "pie" },
  };

  /** Map presentation → MockViews registry key (legacy kind). */
  function registryKind(cfg) {
    const p = cfg.presentation;
    if (p === "bars" || p === "table") return "bars";
    if (p === "inspector" || p === "details") return "inspector";
    if (p === "summary") return "summary";
    if (p === "death_log") return "death";
    if (p === "realtime" || p === "line") {
      if (cfg.seriesMode === "compare") return "series";
      if (cfg.chartQuery) return "chart";
      if (p === "realtime") return "series";
      return "chart";
    }
    if (p === "timeline") return "timeline";
    if (p === "encounter") return "encounter";
    if (p === "pie") return "pie";
    return "bars";
  }

  function fromPreset(presetId, overrides = {}) {
    const base = PRESET_TO_CONFIG[presetId] || PRESET_TO_CONFIG.damage;
    const cfg = {
      ...base,
      query: { ...base.query, ...(overrides.query || {}) },
      ...overrides,
    };
    if (overrides.metric && cfg.query) cfg.query = { ...cfg.query, metric: overrides.metric };
    if (overrides.actorId && cfg.query) cfg.query = { ...cfg.query, actorId: overrides.actorId };
    cfg.kind = registryKind(cfg);
    if (cfg.query?.metric) cfg.metric = cfg.query.metric;
    if (cfg.query?.actorId) cfg.actorId = cfg.query.actorId;
    return cfg;
  }

  return { PRESET_TO_CONFIG, fromPreset, registryKind };
})();
