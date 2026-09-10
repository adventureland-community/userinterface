/**
 * Observer COMMAND panel — run CODE via o:command on the watched character.
 */

import { expandCommandTemplate } from "../lib/commandSnippets";
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

function clockStamp(): string {
  try {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return hh + ":" + mm + ":" + ss;
  } catch {
    return "";
  }
}

/**
 * Validate + emit a COMMAND snippet. Expands {{placeholders}} from observe
 * context. Side effect: observe toast when needed.
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
  const expanded = expandCommandTemplate(trimmed).trim();
  if (!expanded) {
    return { ok: false, status: "Command empty after template expand" };
  }
  const ok = emitObserverCommand(expanded);
  if (!ok) {
    return { ok: false, status: "No socket — not connected" };
  }
  const obs = getObserving();
  const who = obs && obs.name ? String(obs.name) : "observed";
  const t = clockStamp();
  return {
    ok: true,
    status: t ? `Sent to ${who} · ${t}` : `Sent to ${who}`,
  };
}
