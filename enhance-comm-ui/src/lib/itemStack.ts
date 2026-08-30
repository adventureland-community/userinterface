/**
 * Stack merge rules — mirrors server `can_stack` in old_common_functions.js.
 */

export type StackableItemLike = {
  name?: string;
  q?: number;
  p?: string;
  l?: unknown;
  b?: unknown;
  v?: unknown;
  data?: unknown;
};

export type CanStackOptions = {
  ignorePvp?: boolean;
};

function stackLimitForName(name: string): number | null {
  const G =
    typeof window !== "undefined"
      ? (window as { G?: { items?: Record<string, { s?: boolean | number }> } }).G
      : undefined;
  const stack = G?.items?.[name]?.s;
  if (!stack) return null;
  return stack === true ? 9999 : Number(stack);
}

/** True when two bag items would merge on `imove` instead of swapping. */
export function canStackItems(
  a: StackableItemLike | null | undefined,
  b: StackableItemLike | null | undefined,
  extraQty = 0,
  options?: CanStackOptions,
): boolean {
  if (!a || !b || !a.name || !b.name) return false;
  const limit = stackLimitForName(a.name);
  if (limit == null) return false;
  if (a.name !== b.name) return false;
  const aq = a.q ?? 1;
  const bq = b.q ?? 1;
  if (aq + bq + extraQty > limit) return false;
  if ((a.p || b.p) && a.p !== b.p) return false;
  if (a.name === "cxjar" && a.data !== b.data) return false;
  if (!options?.ignorePvp) {
    if ((a.v && !b.v) || (!a.v && b.v)) return false;
  }
  if (a.l || b.l || a.b || b.b) return false;
  return true;
}
