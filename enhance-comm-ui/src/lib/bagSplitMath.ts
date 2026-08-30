/**
 * Pure helpers for bag stack split quantity (mirrors common MMO split UX).
 */

export type SplitPreset = "one" | "half" | "max";

export type SplitPreview = {
  peel: number;
  remain: number;
  total: number;
};

export function clampSplitQuantity(
  value: number,
  maxPeel: number,
): number | null {
  const max = Number(maxPeel) | 0;
  if (max <= 0) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const q = Math.floor(n);
  if (q <= 0 || q > max) return null;
  return q;
}

export function splitPresetQuantity(
  preset: SplitPreset,
  totalQ: number,
  maxPeel: number,
): number {
  const total = Math.max(2, Number(totalQ) | 0);
  const max = Math.max(1, Number(maxPeel) | 0);
  switch (preset) {
    case "one":
      return 1;
    case "half":
      return Math.min(max, Math.max(1, Math.floor(total / 2)));
    case "max":
      return max;
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

export function splitPreview(peel: number, totalQ: number): SplitPreview {
  const total = Math.max(0, Number(totalQ) | 0);
  const take = Math.max(0, Math.min(total, Number(peel) | 0));
  return { peel: take, remain: Math.max(0, total - take), total };
}

export function defaultSplitPeel(totalQ: number, maxPeel: number): number {
  const max = Math.max(1, Number(maxPeel) | 0);
  if (max <= 1) return 1;
  const half = splitPresetQuantity("half", totalQ, maxPeel);
  return clampSplitQuantity(half, max) ?? 1;
}

export function parseSplitQuantityInput(
  raw: string,
  maxPeel: number,
): number | null {
  const trimmed = String(raw ?? "").trim().replace(/,/g, "");
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  return clampSplitQuantity(n, maxPeel);
}

export type SplitModifierKeys = {
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
};

/** Modifier → preset (Alt max, Shift half, Ctrl/Meta one). Alt wins if several held. */
export function quickSplitPresetFromModifiers(
  ev: SplitModifierKeys,
): SplitPreset | null {
  if (ev.altKey) return "max";
  if (ev.shiftKey) return "half";
  if (ev.ctrlKey || ev.metaKey) return "one";
  return null;
}

export function resolveQuickSplitQuantity(
  totalQ: number,
  maxPeel: number,
  preset: SplitPreset,
): number | null {
  const total = Number(totalQ) | 0;
  const max = Number(maxPeel) | 0;
  if (total < 2 || max <= 0) return null;
  return clampSplitQuantity(splitPresetQuantity(preset, total, max), max);
}

export const SPLIT_MODIFIER_HINT =
  "Ctrl+middle: 1 · Shift+middle: half · Alt+middle: max · Middle: custom";
