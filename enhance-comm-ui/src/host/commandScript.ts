/**
 * Helpers for observer COMMAND snippets (`o:command` → code_eval`).
 *
 * Stock `code_eval` only wraps snippets that contain the substring `await`.
 * Scripts that use `return` for early exit must be wrapped in an async function
 * explicitly — otherwise eval throws SyntaxError: Illegal return statement.
 */

/** Wrap CODE body so `return` and top-level `await` are valid under code_eval. */
export function wrapCommandScript(body: string): string {
  return `(async function(){${body}})();`;
}
