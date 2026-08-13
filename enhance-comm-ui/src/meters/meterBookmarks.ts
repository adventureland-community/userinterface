/**
 * Meter bookmark settings helpers (apply / save / reorder).
 */

import { getSettings, patchSettings } from "../lib/settings";
import type {
  MeterBookmark,
  MeterInstance,
  MeterPresentation,
  MeterQuery,
} from "./meterTypes";

export function reorderMeterBookmarks(from: number, to: number): void {
  if (from === to) return;
  const bookmarks = (getSettings().meterBookmarks || []).slice();
  const moved = bookmarks[from];
  if (!moved) return;
  bookmarks.splice(from, 1);
  bookmarks.splice(to, 0, moved);
  patchSettings({ meterBookmarks: bookmarks });
}

export function bookmarkFromInstance(
  instance: MeterInstance,
  label: string,
  query: MeterQuery,
  presentation?: MeterPresentation,
): MeterBookmark {
  return {
    id: `bm-${Date.now().toString(36)}`,
    label,
    query: { ...query },
    presentation: presentation || "bars",
    partyFocus: instance.partyFocus,
    selectedset: instance.selectedset,
  };
}

export function saveMeterBookmark(bm: MeterBookmark): void {
  const prev = getSettings().meterBookmarks || [];
  patchSettings({ meterBookmarks: prev.concat([bm]) });
}

export function saveMeterBookmarkAtSlot(
  slotIndex: number,
  bm: MeterBookmark,
): void {
  const prev = (getSettings().meterBookmarks || []).slice();
  if (slotIndex >= prev.length) prev.push(bm);
  else prev[slotIndex] = bm;
  patchSettings({ meterBookmarks: prev });
}

/** Right-click replace: keep slot id, overwrite payload from instance. */
export function replaceMeterBookmarkAtSlot(
  slotIndex: number,
  instance: MeterInstance,
  label: string,
  query: MeterQuery,
  presentation: MeterPresentation,
): void {
  const next = (getSettings().meterBookmarks || []).slice();
  const prev = next[slotIndex];
  if (!prev) return;
  next[slotIndex] = {
    id: prev.id,
    label,
    query: { ...query },
    presentation,
    partyFocus: instance.partyFocus,
    selectedset: instance.selectedset,
  };
  patchSettings({ meterBookmarks: next });
}

export function applyMeterBookmarkPatch(
  bm: MeterBookmark,
): Partial<MeterInstance> {
  return {
    query: { ...bm.query },
    presentation: bm.presentation || "bars",
    label: bm.label,
    partyFocus: bm.partyFocus,
    selectedset: bm.selectedset,
  };
}
