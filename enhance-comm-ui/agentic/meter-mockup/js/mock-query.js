/**
 * AL meter mockup — query selectors / formatters.
 * Depends on window.MockFixtures + window.MockSegments.
 */
window.MockQuery = (() => {
  const F = window.MockFixtures;
  const S = window.MockSegments;
  const { CLASS_COLORS, METRIC_ORDER, CHANNELS, ABSOLUTE_METRICS, SEG_SEC, INCOMING_MATRIX } = F;

  function fmt(n) {
    if (n == null) return "—";
    const a = Math.abs(n);
    if (a >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (a >= 1e3) return (n / 1e3).toFixed(1) + "k";
    return String(Math.round(n));
  }

  function fmtRate(n) {
    if (n == null) return "—";
    if (n >= 1000) return (n / 1000).toFixed(1) + "k";
    return Number(n).toFixed(1);
  }

  function playerMetric(p, metric) {
    switch (metric) {
      case "damage":
        return p.damage;
      case "heal":
        return p.heal;
      case "taken":
        return p.taken;
      case "healing_required":
        return p.healingRequired;
      case "pdps":
        return p.pdps;
      case "rolling":
        return p.rolling;
      case "coop":
        return p.coop;
      case "base":
        return p.channels.base;
      case "blast":
        return p.channels.blast;
      case "burn":
        return p.channels.burn;
      case "cleave":
        return p.channels.cleave;
      case "avoidance": {
        const a = p.avoidance;
        const total = a.hits + a.miss + a.evade + a.avoid;
        return total ? (a.miss + a.evade + a.avoid) / total : 0;
      }
      default:
        return 0;
    }
  }

  function rateFor(p, metric) {
    if (ABSOLUTE_METRICS.has(metric)) return null;
    return playerMetric(p, metric) / (S.activeSeg().durationSec || SEG_SEC);
  }

  function formatMetricValue(metric, value) {
    if (metric === "avoidance") return `${(value * 100).toFixed(1)}%`;
    if (metric === "coop") return value.toFixed(2);
    return fmt(value);
  }

  function isAbsoluteMetric(metric) {
    return ABSOLUTE_METRICS.has(metric);
  }

  function cycleMetric(metric, delta) {
    const i = METRIC_ORDER.indexOf(metric);
    const idx = i < 0 ? 0 : (i + delta + METRIC_ORDER.length) % METRIC_ORDER.length;
    return METRIC_ORDER[idx];
  }

  function modeLabel(metric) {
    const ch = CHANNELS.find((c) => c.id === metric);
    return ch ? ch.label : metric;
  }

  function playerById(id) {
    return S.activeSeg().players.find((p) => p.id === id);
  }

  /**
   * Outcome × school matrix for summary.
   * Outgoing: derived from ability outcomes + ability.school.
   * Incoming: fixture table (wire would use taken hits' damage_type).
   */
  function schoolMatrix(actorId, side) {
    if (side === "incoming") {
      return INCOMING_MATRIX[actorId] || { Hit: [0, 0, 0], Crit: [0, 0, 0], Miss: [0, 0, 0], Evade: [0, 0, 0], Splash: [0, 0, 0] };
    }
    const p = playerById(actorId);
    const mx = { Hit: [0, 0, 0], Crit: [0, 0, 0], Miss: [0, 0, 0], Evade: [0, 0, 0], Splash: [0, 0, 0] };
    if (!p) return mx;
    const colOf = { physical: 0, magical: 1, pure: 2 };
    for (const a of p.abilities) {
      const col = colOf[a.school] ?? 0;
      mx.Hit[col] += a.outcomes.hit.count;
      mx.Crit[col] += a.outcomes.crit.count;
      mx.Miss[col] += a.outcomes.miss.count;
      mx.Evade[col] += a.outcomes.evade.count;
      mx.Splash[col] += a.outcomes.splash.count;
    }
    return mx;
  }

  function rankedPlayers(metric) {
    return [...S.scopedPlayers()]
      .map((p) => ({
        id: p.id,
        name: p.name,
        ctype: p.ctype,
        you: p.you,
        color: CLASS_COLORS[p.ctype],
        value: playerMetric(p, metric),
        rate: rateFor(p, metric),
        player: p,
        kind: "player",
        partyKey: p.partyKey,
        visible: p.visible,
      }))
      .sort((a, b) => b.value - a.value);
  }

  /** Ability contribution for a metric — views must not invent this math. */
  function abilityMetric(ability, metric) {
    if (metric === "heal") return ability.heal;
    if (metric === "blast") return ability.damage + ability.splash;
    if (metric === "burn" && /burn/i.test(ability.key)) return ability.damage;
    if (metric === "cleave" && /cleave/i.test(ability.key)) return ability.damage;
    if (metric === "base") {
      if (/burn|cleave/i.test(ability.key)) return 0;
      return Math.max(0, ability.damage - ability.splash);
    }
    return ability.damage;
  }

  function abilityTotal(ability) {
    return ability.damage + ability.heal;
  }

  function rankedAbilities(player, metric) {
    const rows = player.abilities.map((a) => ({
      id: a.key,
      name: a.label,
      letter: a.letter,
      color: a.color,
      iconKey: a.key,
      value: metric != null ? abilityMetric(a, metric) : abilityTotal(a),
      ability: a,
      player,
      kind: "ability",
    }));
    return rows.sort((a, b) => b.value - a.value);
  }

  function encounterMeta() {
    const seg = S.activeSeg();
    const players = S.scopedPlayers();
    const totalDmg = players.reduce((s, p) => s + p.damage, 0);
    const totalHeal = players.reduce((s, p) => s + p.heal, 0);
    const totalTaken = players.reduce((s, p) => s + p.taken, 0);
    return {
      name: seg.short,
      label: seg.label,
      live: seg.live,
      outcome: seg.outcome,
      durationSec: seg.durationSec,
      players: players.length,
      deaths: seg.deaths.length,
      totalDmg,
      totalHeal,
      totalTaken,
      partyScope: S.getPartyScope(),
    };
  }

  function timelineLanes(filter = "all") {
    const lanes = S.activeSeg().timeline.filter((lane) => {
      const p = S.activeSeg().players.find((x) => x.id === lane.actorId);
      return S.playerInScope(p);
    });
    if (filter === "all") return lanes;
    return lanes.map((lane) => ({
      ...lane,
      intervals: lane.intervals.filter((iv) => {
        if (filter === "cds") return iv.kind === "cd";
        if (filter === "buffs") return iv.kind === "buff";
        if (filter === "debuffs") return iv.kind === "debuff";
        return true;
      }),
    }));
  }

  function conditionUptime(actorId) {
    return F.conditionUptime(S.activeSeg().timeline, S.activeSeg().durationSec, actorId);
  }

  function deathConditionStrip(deathId) {
    const death = S.activeSeg().deaths.find((d) => d.id === deathId) || S.activeSeg().deaths[0];
    return F.deathConditionStrip(S.activeSeg().timeline, death);
  }

  function activeSegment() {
    const s = S.activeSeg();
    return {
      id: s.id,
      label: s.label,
      short: s.short,
      live: s.live,
      outcome: s.outcome,
      durationSec: s.durationSec,
      deaths: s.deaths.length,
    };
  }

  return {
    fmt,
    fmtRate,
    formatMetricValue,
    isAbsoluteMetric,
    playerMetric,
    abilityMetric,
    abilityTotal,
    rateFor,
    cycleMetric,
    modeLabel,
    playerById,
    schoolMatrix,
    rankedPlayers,
    rankedAbilities,
    encounterMeta,
    timelineLanes,
    conditionUptime,
    deathConditionStrip,
    activeSegment,
  };
})();
