/**
 * Ctrl during drag: skip new group join (preview + drop).
 * Live: releasing Ctrl mid-drag re-enables snap for the rest of the gesture.
 */

export type PanelGroupDragOpts = {
  skipGroupJoin?: boolean;
};

export function isPlaceWithoutGroupModifier(ev: {
  ctrlKey?: boolean;
}): boolean {
  return !!ev.ctrlKey;
}
