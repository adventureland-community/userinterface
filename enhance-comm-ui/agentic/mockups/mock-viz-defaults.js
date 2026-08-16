/**
 * Single settings contract for visualization mockups.
 * Loaded before mock-viz.js and mock-viz-lines.js.
 */
(function () {
  "use strict";

  /** @type {Record<string, boolean>} */
  window.MockVizDefaults = {
    "world.attackRange": true,
    "world.abilityImminent": true,
    "world.abilityGhost": false,
    "world.auraRing": false,
    "world.highlightAtRisk": true,
    "world.targetLine": true,
    "world.leashBoundary": false,
    "world.spawnPoints": false,
    "entity.hpBar": true,
    "entity.aggroRing": true,
    "entity.cdLabel": false,
    "entity.nameplate": false,
    "comm.mechanicChips": true,
    "comm.spawnAlert": true,
    "comm.hpThresholds": true,
    "debug.entityIds": false,
    "debug.gridCoords": false,
    "lines.moveDest": false,
    "lines.aggroTarget": true,
    "lines.attackTarget": false,
    "lines.filter.players": true,
    "lines.filter.monsters": true,
    "lines.filter.focusOnly": false,
  };
})();
