/**
 * Auto-advance predicates for guided tour steps.
 */

export type TourAdvanceWhen =
  | "observing"
  | "bagOpen"
  | "commandOpen"
  | "itemInfoOpen";

export type TourAdvanceContext = {
  isObserving: boolean;
  bagOpen: boolean;
  commandOpen: boolean;
  itemInfoOpen: boolean;
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
    case "itemInfoOpen":
      return ctx.itemInfoOpen;
    default: {
      const _exhaustive: never = when;
      return _exhaustive;
    }
  }
}
