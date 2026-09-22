/**
 * Auto-advance predicates for guided tour steps.
 */

export type TourAdvanceWhen =
  | "observing"
  | "bagOpen"
  | "commandOpen"
  | "itemInfoOpen"
  | "marketFocus";

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
    case "marketFocus":
      return !!document.querySelector(
        '[data-ecu-tour="market-focus"][data-ecu-has-focus="1"]',
      );
    default: {
      const _exhaustive: never = when;
      return _exhaustive;
    }
  }
}
