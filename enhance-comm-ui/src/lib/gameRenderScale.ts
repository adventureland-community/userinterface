/**
 * Optional PIXI resolution scale — lowers GPU fill when FPS cap alone
 * is not enough. Experimental: interacts with FOV/zoom sizing.
 */

export const GAME_RENDER_SCALES = [1, 0.75, 0.5] as const;

export type GameRenderScale = (typeof GAME_RENDER_SCALES)[number];

export function normalizeGameRenderScale(raw: unknown): GameRenderScale {
  if (raw === 0.75 || raw === "0.75") return 0.75;
  if (raw === 0.5 || raw === "0.5") return 0.5;
  return 1;
}

export function gameRenderScaleLabel(scale: GameRenderScale): string {
  if (scale === 0.75) return "¾";
  if (scale === 0.5) return "½";
  return "1×";
}
