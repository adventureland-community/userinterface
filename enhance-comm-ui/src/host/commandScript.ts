/**
 * Helpers for observer COMMAND snippets (`o:command` → code_eval).
 *
 * Stock `code_eval` only wraps snippets that contain the substring `await`.
 * Scripts that use `return` for early exit must be wrapped in an async function
 * explicitly — otherwise eval throws SyntaxError: Illegal return statement.
 */

/** Grep-friendly prefix for bot/docker logs — marks /comm UI o:command scripts. */
export const ECU_COMM_TAG = "[ECU/comm]";

/** Full game_log line prefix for comm-driven actions. */
export function commLogText(label: string): string {
  const text = String(label || "").trim();
  return text ? `${ECU_COMM_TAG} ${text}` : ECU_COMM_TAG;
}

/** Emit a comm tag line at script start (best-effort). */
export function commLogJs(label: string): string {
  return `try{game_log(${JSON.stringify(commLogText(label))});}catch(__e){}`;
}

/** Inject a comm start log into a wrapCommandScript-style async IIFE. */
export function injectCommLog(code: string, label: string): string {
  const trimmed = String(code || "").trim();
  const log = commLogJs(label);
  const m = /^\(async function\(\)\{([\s\S]*)\}\)\(\);$/.exec(trimmed);
  if (m) return `(async function(){${log}${m[1]}})();`;
  return `(async function(){${log}${trimmed}})();`;
}

/** Wrap CODE body so `return` and top-level `await` are valid under code_eval. */
export function wrapCommandScript(body: string): string {
  return `(async function(){${body}})();`;
}
