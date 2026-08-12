/**
 * AL meter mockup — segment store, party scope, live combat ticks.
 * Depends on window.MockFixtures.
 */
window.MockSegments = (() => {
  const F = window.MockFixtures;
  const {
    PLAYERS,
    DEATHS,
    INCOMING_SPELLS,
    SEG_SEC,
    clone,
    scalePlayers,
    scaleIncoming,
    buildTimeline,
    deriveChannels,
  } = F;

  const currentPlayers = PLAYERS;
  const currentDeaths = DEATHS;
  const currentIncoming = INCOMING_SPELLS;
  const currentTimeline = buildTimeline(currentPlayers, SEG_SEC, 0);

  const past1Players = scalePlayers(currentPlayers, 0.42, 48);
  for (const p of past1Players) p.deaths = p.id === "p1" || p.id === "p3" ? 1 : 0;
  const past1Deaths = clone(currentDeaths)
    .slice(0, 2)
    .map((d, i) => ({ ...d, id: `p1d${i + 1}`, atFightSec: 20 + i * 18 }));
  const past1Timeline = buildTimeline(past1Players, 48, 2);

  const past2Players = scalePlayers(currentPlayers, 0.88, 112);
  for (const p of past2Players) p.deaths = p.id === "p5" ? 1 : 0;
  const past2Deaths = clone(currentDeaths)
    .slice(2, 3)
    .map((d) => ({ ...d, id: "p2d1", atFightSec: 88 }));
  const past2Timeline = buildTimeline(past2Players, 112, 5);

  const totalPlayers = scalePlayers(currentPlayers, 2.3, SEG_SEC + 48 + 112);
  const totalDeaths = [...clone(past1Deaths), ...clone(past2Deaths), ...clone(currentDeaths)];
  const totalIncoming = scaleIncoming(currentIncoming, 2.3);
  const totalTimeline = buildTimeline(totalPlayers, SEG_SEC + 48 + 112, 9);

  const SEGMENTS = {
    past1: {
      id: "past1",
      label: "Crypt #1 · wipe",
      short: "Crypt #1",
      live: false,
      outcome: "wipe",
      durationSec: 48,
      players: past1Players,
      deaths: past1Deaths,
      incoming: scaleIncoming(currentIncoming, 0.42),
      timeline: past1Timeline,
    },
    past2: {
      id: "past2",
      label: "Crypt #2 · clear",
      short: "Crypt #2",
      live: false,
      outcome: "clear",
      durationSec: 112,
      players: past2Players,
      deaths: past2Deaths,
      incoming: scaleIncoming(currentIncoming, 0.88),
      timeline: past2Timeline,
    },
    current: {
      id: "current",
      label: "Current · Crypt",
      short: "Current",
      live: true,
      outcome: "live",
      durationSec: SEG_SEC,
      players: currentPlayers,
      deaths: currentDeaths,
      incoming: currentIncoming,
      timeline: currentTimeline,
    },
    total: {
      id: "total",
      label: "Total session",
      short: "Total",
      live: false,
      outcome: "total",
      durationSec: SEG_SEC + 48 + 112,
      players: totalPlayers,
      deaths: totalDeaths,
      incoming: totalIncoming,
      timeline: totalTimeline,
    },
  };

  let defaultSelectedset = "current"; // new panels + apply-all toolbar
  let _segOverride = null; // sync withSegment for query frame
  let combatLive = true; // mock: toggle OOC → find_set Current falls back to last

  const PARTY_SCOPES = [
    { id: "party", label: "My party" },
    { id: "visible", label: "Visible" },
    { id: "you", label: "You only" },
    { id: "all", label: "All seen" },
  ];
  let partyScope = "party";

  function setPartyScope(id) {
    if (PARTY_SCOPES.some((s) => s.id === id)) partyScope = id;
    return partyScope;
  }

  function getPartyScope() {
    return partyScope;
  }

  /** Skada find_set — Current means live if in combat, else last completed. */
  function resolveSegment(ref = "current") {
    const id = typeof ref === "string" ? ref : ref?.pastId || "current";
    if (id === "total") return SEGMENTS.total;
    if (id === "current") {
      if (combatLive && SEGMENTS.current) return SEGMENTS.current;
      // OOC / ended: last archived (past2 = most recent clear in fixtures)
      return SEGMENTS.past2 || SEGMENTS.past1 || SEGMENTS.current;
    }
    return SEGMENTS[id] || SEGMENTS.current;
  }

  function activeSeg() {
    return resolveSegment(_segOverride ?? defaultSelectedset);
  }

  /** Run queries against a panel's selectedset (sync only — mock has no await). */
  function withSegment(ref, fn) {
    const prev = _segOverride;
    _segOverride = ref;
    try {
      return fn();
    } finally {
      _segOverride = prev;
    }
  }

  function playerInScope(p, scope = partyScope) {
    if (!p) return false;
    if (scope === "all") return true;
    if (scope === "you") return !!p.you;
    if (scope === "visible") return p.visible !== false;
    const list = activeSeg().players;
    const you = list.find((x) => x.you) || list[0];
    return p.partyKey === you?.partyKey;
  }

  function scopedPlayers(scope = partyScope) {
    return activeSeg().players.filter((p) => playerInScope(p, scope));
  }

  function listSegments() {
    return ["current", "total", "past2", "past1"].map((id) => {
      const s = SEGMENTS[id];
      return {
        id: s.id,
        label: s.label,
        short: s.short,
        live: s.live,
        outcome: s.outcome,
        durationSec: s.durationSec,
        deaths: s.deaths.length,
        /** Title chip: Current/Total stay symbolic; past uses short name */
        titleChip: id === "current" ? "Current" : id === "total" ? "Total" : s.short,
      };
    });
  }

  function setLabel(ref = "current") {
    const id = typeof ref === "string" ? ref : ref?.pastId || "current";
    if (id === "current") return "Current";
    if (id === "total") return "Total";
    const s = SEGMENTS[id];
    if (!s) return String(id);
    return s.short;
  }

  function getDefaultSelectedset() {
    return defaultSelectedset;
  }

  /** Toolbar apply-all / new-panel default — not Skada primary UX. */
  function setDefaultSelectedset(id) {
    if (!SEGMENTS[id] && id !== "current" && id !== "total") return defaultSelectedset;
    defaultSelectedset = id;
    return defaultSelectedset;
  }

  /** @deprecated use per-panel selectedset; kept as alias for apply-all */
  function selectSegment(id) {
    return setDefaultSelectedset(id);
  }

  function setCombatLive(on) {
    combatLive = !!on;
    if (SEGMENTS.current) SEGMENTS.current.live = combatLive;
    return combatLive;
  }

  function isCombatLive() {
    return combatLive;
  }

  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}m${String(s).padStart(2, "0")}s`;
  }

  /** Fake combat noise — always mutates live current (ingest ≠ panel view). */
  let _noiseGen = 0;
  function tickCombatNoise(noise = 0.04) {
    if (!combatLive) return _noiseGen;
    const seg = SEGMENTS.current;
    if (!seg?.live) return _noiseGen;
    _noiseGen += 1;
    for (const p of seg.players) {
      if (!playerInScope(p)) continue;
      const bump = 1 + (Math.random() - 0.35) * noise;
      p.damage = Math.max(0, Math.round(p.damage * bump));
      p.taken = Math.max(0, Math.round(p.taken * (1 + (Math.random() - 0.5) * noise * 0.5)));
      p.heal = Math.max(0, Math.round(p.heal * (1 + (Math.random() - 0.45) * noise * 0.3)));
      p.healingRequired = Math.max(0, p.healTaken - p.selfHeal);
      p.channels = deriveChannels(p);
    }
    return _noiseGen;
  }

  function noiseGeneration() {
    return _noiseGen;
  }

  function tickSeries(noise = 0.12) {
    if (!combatLive) return;
    const seg = SEGMENTS.current;
    if (!seg?.live) return;
    for (const [i, p] of seg.players.entries()) {
      for (const key of ["dps", "hps", "taken"]) {
        const pts = p.series[key];
        if (!pts?.length) continue;
        const last = pts[pts.length - 1];
        const base =
          key === "dps"
            ? p.damage / seg.durationSec
            : key === "hps"
              ? (p.heal || 1) / seg.durationSec
              : p.taken / seg.durationSec;
        const next = Math.max(0, last * (1 + (Math.random() - 0.48) * noise) * 0.85 + base * 0.15);
        pts.push(next);
        if (pts.length > 60) pts.shift();
      }
    }
  }

  return {
    SEGMENTS,
    resolveSegment,
    withSegment,
    activeSeg,
    listSegments,
    setLabel,
    getDefaultSelectedset,
    setDefaultSelectedset,
    selectSegment,
    setCombatLive,
    isCombatLive,
    PARTY_SCOPES,
    setPartyScope,
    getPartyScope,
    playerInScope,
    scopedPlayers,
    tickCombatNoise,
    tickSeries,
    noiseGeneration,
    fmtTime,
    get players() {
      return activeSeg().players;
    },
    get deaths() {
      return activeSeg().deaths;
    },
    get incoming() {
      return activeSeg().incoming;
    },
    get timeline() {
      return activeSeg().timeline;
    },
    get durationSec() {
      return activeSeg().durationSec;
    },
  };
})();
