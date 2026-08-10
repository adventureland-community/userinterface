/**
 * Shared Comm UI type scale for AdventureLand pixel font.
 * Comfortable mins: secondary ≥13px, counts/badges ≥15–16px, names ≥16–18px.
 * Never use bold or text-shadow with the pixel font.
 */
export const TYPE = {
  /** Party chip / compact names */
  name: "16px",
  /** Unit-frame / threat / aggro bar names */
  nameLg: "18px",
  /** General body / panel content */
  body: "15px",
  /** Secondary chrome / meta labels */
  secondary: "14px",
  /** Absolute floor for secondary text */
  secondaryMin: "13px",
  /** Counts, ×N, overflow +N */
  count: "16px",
  /** Badge digits (aggro, threat spark, stacks) */
  badge: "15px",
  /** Alias — prefer TYPE.badge */
  countBadge: "15px",
  /** Compact chrome labels (gear TRADE, layout hints) */
  micro: "13px",
  /** Absolute floor — never go below for readable UI text */
  microMin: "13px",
  /** Panel titles */
  title: "17px",
  /** topCenter map/server body */
  chrome: "16px",
  /** topCenter secondary line (time / until) */
  chromeMeta: "14px",
} as const;

/** Party-chip / threat aggro count badge (pixel UI). */
export const AGGRO_BADGE = {
  minWidth: "22px",
  height: "22px",
  fontSize: TYPE.badge,
  padX: "5px",
} as const;

/** Always pair with pixel font — no bold, no text-shadow. */
export const PIXEL_TEXT = {
  fontWeight: "normal" as const,
  textShadow: "none" as const,
};
