/**
 * Party chip, menu options, and remapped focus for a meter window.
 */

import type { PartyFocus, PartyFocusOption } from "../../lib/settingsFocus";
import {
  namedPartyKey,
  partyFocusLabel,
  partyFocusMenuOptions,
} from "../../lib/settingsFocus";
import {
  listSegmentParties,
  listVisibleParties,
  type VisiblePartyRow,
} from "../../meters/meterEngine";
import { isLiveCombatSegment } from "../../meters/meterSession";
import { isLiveCameraRef } from "../../meters/meterSegmentRef";
import type { CombatSegment, SegmentRef } from "../../meters/meterTypes";

export type MeterPartyChrome = {
  followCamera: boolean;
  liveRoster: boolean;
  youId: string;
  partyKey: string;
  observingName?: string;
  hasObserver: boolean;
  appliedFocus: PartyFocus;
  partyLabel: string;
  partyMenuOpts: PartyFocusOption[];
  watchedLabel: string;
};

function coerceFocus(
  focus: PartyFocus,
  liveRoster: boolean,
  parties: VisiblePartyRow[],
): PartyFocus {
  if (liveRoster) return focus;
  if (focus === "visible") return "all";
  const named = namedPartyKey(focus);
  if (!named) return focus;
  for (let i = 0; i < parties.length; i++) {
    if (parties[i].id === named) return focus;
  }
  return "all";
}

export function meterPartyChrome(args: {
  ref: SegmentRef;
  seg: CombatSegment | null;
  partyFocus?: PartyFocus;
  watchedName?: string;
}): MeterPartyChrome {
  const followCamera = isLiveCameraRef(args.ref);
  const liveRoster = !!(args.seg && isLiveCombatSegment(args.seg));
  const youId = args.seg?.observingId || "";
  const partyKey = args.seg?.partyKey || "";
  const observingName = args.seg?.observingName;
  const hasObserver = !!youId;
  const filterParties = liveRoster
    ? listVisibleParties()
    : args.seg
      ? listSegmentParties(args.seg)
      : [];
  const appliedFocus = coerceFocus(
    args.partyFocus || "watched",
    liveRoster,
    filterParties,
  );
  const partyLabels: Record<string, string> = {};
  for (let i = 0; i < filterParties.length; i++) {
    partyLabels[filterParties[i].id] = filterParties[i].label;
  }
  const watchedLabel =
    (liveRoster ? args.watchedName : observingName) || args.watchedName || "";
  const partyMenuOpts = partyFocusMenuOptions({
    hasObserver,
    watchedName: watchedLabel,
    watchedPartyKey: partyKey,
    visibleParties: filterParties,
    roster: liveRoster ? "live" : "archived",
  });
  return {
    followCamera,
    liveRoster,
    youId,
    partyKey,
    observingName,
    hasObserver,
    appliedFocus,
    partyLabel: partyFocusLabel(
      appliedFocus,
      watchedLabel,
      hasObserver,
      partyLabels,
    ),
    partyMenuOpts,
    watchedLabel,
  };
}
