/**
 * Observer COMMAND panel — run CODE via o:command on the watched character.
 */

import { emitObserverCommand, getObserving } from "./al";
import { showCommToast } from "./commToast";

export type CommandRunResult = {
  ok: boolean;
  status: string;
};

/** True when /comm is watching a character (same as Bag/Command chrome). */
export function isCommandObserveReady(): boolean {
  const obs = getObserving();
  return !!(obs && obs.name);
}

/**
 * Validate + emit a COMMAND snippet. Side effect: observe toast when needed.
 */
export function runCommandSnippet(code: string): CommandRunResult {
  const trimmed = String(code || "").trim();
  if (!trimmed) {
    return { ok: false, status: "Write a command first" };
  }
  if (!isCommandObserveReady()) {
    showCommToast("Observe a character first");
    return { ok: false, status: "Observe a character first" };
  }
  const ok = emitObserverCommand(trimmed);
  if (!ok) {
    return { ok: false, status: "No socket — not connected" };
  }
  return { ok: true, status: "Sent to observed character" };
}
