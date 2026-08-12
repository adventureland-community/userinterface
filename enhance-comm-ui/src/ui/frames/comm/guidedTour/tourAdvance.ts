/**
 * Auto-advance predicates for guided tour steps.
 */

export type TourAdvanceWhen =
  "observing" | "bagOpen" | "commandOpen" | "playerFrame";

export type TourAdvanceContext = {
  isObserving: boolean;
  bagOpen: boolean;
  commandOpen: boolean;
};

export function tourAdvanceReady(
  when: TourAdvanceWhen | undefined,
  ctx: TourAdvanceContext,
): boolean {
  if (!when) return false;
  switch (when) {
    case "observing":
      return ctx.isObserving;
    case "bagOpen":
      return ctx.bagOpen;
    case "commandOpen":
      return ctx.commandOpen;
    case "playerFrame": {
      if (!ctx.isObserving) return false;
      const el = document.querySelector(
        ".comm-pos-panel.comm-pos-playerFrame",
      ) as HTMLElement | null;
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 8 && r.height > 8;
    }
    default: {
      const _exhaustive: never = when;
      return _exhaustive;
    }
  }
}
