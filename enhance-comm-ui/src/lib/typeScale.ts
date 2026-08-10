/**
 * Shared Comm UI type scale for AdventureLand pixel font.
 * Floor secondary chrome at ~12–13px; counts/badges ~14–16px; names ~15–18px.
 * Never use bold or text-shadow with the pixel font.
 */
export const TYPE = {
  /** Secondary chrome / meta labels */
  secondary: "13px",
  /** Absolute floor for secondary text */
  secondaryMin: "12px",
  /** Counts, ×N, overflow +N */
  count: "15px",
  /** Badge digits (aggro, threat spark) */
  countBadge: "14px",
  /** Party chip / compact names */
  name: "15px",
  /** Unit-frame / threat row names */
  nameLg: "16px",
  /** Panel titles */
  title: "16px",
  /** topCenter map/server body */
  chrome: "15px",
  /** topCenter secondary line (time / until) */
  chromeMeta: "13px",
} as const;

/** Party-chip / threat aggro count badge (pixel UI). */
export const AGGRO_BADGE = {
  minWidth: "20px",
  height: "20px",
  fontSize: TYPE.countBadge,
  padX: "4px",
} as const;

/** Always pair with pixel font — no bold, no text-shadow. */
export const PIXEL_TEXT = {
  fontWeight: "normal" as const,
  textShadow: "none" as const,
};
