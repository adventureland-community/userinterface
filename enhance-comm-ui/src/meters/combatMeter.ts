/**
 * Sliding 10s hit-window meter — re-exports rollingWindow for ThreatTable / TargetFrame.
 * Ingest is owned by meterEngine; do not start a second hub subscriber in production.
 */
export {
  startRollingWindow as startCombatMeter,
  getDps,
  getHealPerSec,
  getActorDamage,
  getIncomingDps,
  getRollingWindowMs,
  estimateTtk,
} from "./rollingWindow";
