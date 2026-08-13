/**
 * Party-chip outline priority: aggro > fear/CC tint > observing > selected.
 */
export function chipOutline(opts: {
  hasAggro: boolean;
  controlTint?: string;
  observed: boolean;
  selected: boolean;
}): string | undefined {
  if (opts.hasAggro) return "1px solid #e05555";
  if (opts.controlTint) return `1px solid ${opts.controlTint}`;
  if (opts.observed) return "1px solid #e13758";
  if (opts.selected) return "1px solid #fff";
  return undefined;
}
