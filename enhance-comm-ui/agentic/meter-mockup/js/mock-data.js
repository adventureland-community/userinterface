/**
 * AL meter mockup — thin facade over fixtures / segments / query.
 * Views call window.MockData only (same public API as pre-split).
 */
window.MockData = (() => {
  const F = window.MockFixtures;
  const S = window.MockSegments;
  const Q = window.MockQuery;

  return {
    CLASS_COLORS: F.CLASS_COLORS,
    CHANNELS: F.CHANNELS,
    METRIC_ORDER: F.METRIC_ORDER,
    get SEG_SEC() {
      return S.activeSeg().durationSec;
    },
    get PLAYERS() {
      return S.activeSeg().players;
    },
    get DEATHS() {
      return S.activeSeg().deaths;
    },
    get INCOMING_SPELLS() {
      return S.activeSeg().incoming;
    },
    get TIMELINE() {
      return S.activeSeg().timeline;
    },
    fmt: Q.fmt,
    fmtRate: Q.fmtRate,
    formatMetricValue: Q.formatMetricValue,
    isAbsoluteMetric: Q.isAbsoluteMetric,
    playerMetric: Q.playerMetric,
    abilityMetric: Q.abilityMetric,
    abilityTotal: Q.abilityTotal,
    rateFor: Q.rateFor,
    cycleMetric: Q.cycleMetric,
    modeLabel: Q.modeLabel,
    playerById: Q.playerById,
    schoolMatrix: Q.schoolMatrix,
    rankedPlayers: Q.rankedPlayers,
    rankedAbilities: Q.rankedAbilities,
    tickSeries: S.tickSeries,
    encounterMeta: Q.encounterMeta,
    listSegments: S.listSegments,
    selectSegment: S.selectSegment,
    setDefaultSelectedset: S.setDefaultSelectedset,
    getDefaultSelectedset: S.getDefaultSelectedset,
    resolveSegment: S.resolveSegment,
    withSegment: S.withSegment,
    setLabel: S.setLabel,
    setCombatLive: S.setCombatLive,
    isCombatLive: S.isCombatLive,
    activeSegment: Q.activeSegment,
    timelineLanes: Q.timelineLanes,
    conditionUptime: Q.conditionUptime,
    deathConditionStrip: Q.deathConditionStrip,
    PARTY_SCOPES: S.PARTY_SCOPES,
    setPartyScope: S.setPartyScope,
    getPartyScope: S.getPartyScope,
    scopedPlayers: S.scopedPlayers,
    playerInScope: S.playerInScope,
    tickCombatNoise: S.tickCombatNoise,
    noiseGeneration: S.noiseGeneration,
  };
})();
