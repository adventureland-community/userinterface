/**
 * Party roster membership filter — who appears in the Players panel.
 * Persisted as CommUiSettings.partyRosterShow.
 */
import type { EntityLike } from "../host/globals";

export type PartyRosterShow = "all" | "party";

export const PARTY_ROSTER_SHOW_MODES: readonly PartyRosterShow[] = [
  "all",
  "party",
] as const;

export function normalizePartyRosterShow(raw: unknown): PartyRosterShow {
  if (raw === "all" || raw === "party") return raw;
  return "all";
}

export function nextPartyRosterShow(mode: PartyRosterShow): PartyRosterShow {
  return mode === "all" ? "party" : "all";
}

export function partyRosterShowLabel(mode: PartyRosterShow): string {
  switch (mode) {
    case "all":
      return "All";
    case "party":
      return "Party";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export function partyRosterShowTitle(mode: PartyRosterShow): string {
  switch (mode) {
    case "all":
      return "Roster: every player in vision";
    case "party":
      return "Roster: your party only (or just you when unpartied)";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export type PartyGroup = [string, EntityLike[]];

/** Keep your party — or only the observed character when they have no party. */
export function filterPartiesForShow(opts: {
  parties: PartyGroup[];
  show: PartyRosterShow;
  observing: EntityLike | null | undefined;
}): PartyGroup[] {
  const { parties, show, observing } = opts;
  if (show === "all") return parties;

  const obsId = observing?.id != null ? String(observing.id) : "";
  const obsParty =
    observing?.party != null && String(observing.party) !== ""
      ? String(observing.party)
      : "";

  if (obsParty) {
    const out: PartyGroup[] = [];
    for (let i = 0; i < parties.length; i++) {
      if (parties[i][0] === obsParty) out.push(parties[i]);
    }
    return out;
  }

  if (!obsId) return [];

  const out: PartyGroup[] = [];
  for (let i = 0; i < parties.length; i++) {
    const key = parties[i][0];
    const members = parties[i][1];
    const kept: EntityLike[] = [];
    for (let j = 0; j < members.length; j++) {
      if (String(members[j].id) === obsId) kept.push(members[j]);
    }
    if (kept.length) out.push([key, kept]);
  }
  return out;
}

/** One-member parties wrap beside each other; multi-member keep stacked blocks. */
export function partitionPartyGroups(parties: PartyGroup[]): {
  multi: PartyGroup[];
  singles: PartyGroup[];
} {
  const multi: PartyGroup[] = [];
  const singles: PartyGroup[] = [];
  for (let i = 0; i < parties.length; i++) {
    if (parties[i][1].length <= 1) singles.push(parties[i]);
    else multi.push(parties[i]);
  }
  return { multi, singles };
}
