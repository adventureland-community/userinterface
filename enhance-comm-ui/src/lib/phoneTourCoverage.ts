/**
 * Static audit: every guided-tour step that needs a click target should
 * include a phone-reachable selector (or be marked optional/panel-only).
 */

import { GUIDED_TOURS, type GuidedTourStep } from "../ui/frames/comm/guidedTour/tourCatalog";

/** Selectors that exist on phone chrome / sheets when tours open them. */
export const PHONE_TOUR_SELECTORS = [
  '[data-ecu-tour="phone-observe-list"]',
  '[data-ecu-tour="phone-server-list"]',
  '[data-ecu-tour="phone-apps-grid"]',
  '[data-ecu-tour="character-ui"]',
  '[data-ecu-tour="server-picker"]',
  '[data-ecu-tour="btn-apps"]',
  '[data-ecu-tour="btn-bag"]',
  '[data-ecu-tour="btn-command"]',
  '[data-ecu-tour="btn-layout"]',
  '[data-ecu-tour="phone-shade-qs"]',
  '[data-ecu-tour="btn-add-meter"]',
  '[data-ecu-tour="btn-chat"]',
  '[data-ecu-tour="btn-mail"]',
  '[data-ecu-tour="btn-bank"]',
  '[data-ecu-tour="btn-market"]',
  '[data-ecu-tour="btn-settings"]',
  '[data-ecu-tour="market-panel"]',
  '[data-ecu-tour="market-you"]',
  '[data-ecu-tour="market-tools"]',
  '[data-ecu-tour="market-grid"]',
  '[data-ecu-tour="market-focus"]',
  '[data-ecu-tour="bank-panel"]',
  '[data-ecu-tour="bank-refresh"]',
  '[data-ecu-tour="bank-search"]',
  '[data-ecu-tour="bank-views"]',
  '[data-ecu-tour="bank-body"]',
  '[data-ecu-tour="bank-sort"]',
  ".ecu-meter-shell",
  ".comm-pos-panel",
  ".comm-pos-players",
  ".comm-pos-paperdoll",
  ".comm-pos-edit-header",
  ".comm-pos-anchor-pad",
  ".comm-pos-opacity-row",
  ".comm-pos-enemies",
  ".comm-pos-threat",
  ".comm-pos-bossBar",
  ".comm-pos-buffInfo",
  '[data-ecu-tour="buff-icons"]',
  '[data-ecu-tour="paperdoll-gear"]',
  '[data-ecu-tour="meter-coop"]',
  '[data-ecu-tour="meter-gear"]',
  '[data-ecu-tour="meter-segment"]',
  '[data-ecu-tour="meter-display"]',
  '[data-ecu-tour="meter-report"]',
  ".ecu-meter-resize",
  '[data-ecu-tour="preset-pdps"]',
];

export type PhoneTourCoverageIssue = {
  tourId: string;
  stepIndex: number;
  title: string;
  target: string;
  reason: string;
};

function targetHasPhonePath(target: string): boolean {
  for (let i = 0; i < PHONE_TOUR_SELECTORS.length; i++) {
    const sel = PHONE_TOUR_SELECTORS[i];
    if (target.indexOf(sel) >= 0) return true;
    // Class-only fragments: .comm-pos-bag etc.
    if (sel.charAt(0) === "." && target.indexOf(sel) >= 0) return true;
  }
  // Generic panel / meter shells used across profiles
  if (/\.comm-pos-|\.ecu-meter-/.test(target)) return true;
  if (/data-ecu-tour-focus/.test(target)) return true;
  return false;
}

/** Steps that are desktop-chrome-only and must be rewritten for phone. */
function isDesktopOnlyChrome(target: string): boolean {
  const desktopOnly = [
    '[data-ecu-tour="chrome-actions"]',
    ".comm-pos-toggles",
    '[data-ecu-tour="server-picker-dd"]',
  ];
  let onlyDesktop = false;
  for (let i = 0; i < desktopOnly.length; i++) {
    if (target.indexOf(desktopOnly[i]) >= 0) onlyDesktop = true;
  }
  if (!onlyDesktop) return false;
  // OK if also lists a phone path
  return !targetHasPhonePath(target);
}

export function auditPhoneTourCoverage(): PhoneTourCoverageIssue[] {
  const issues: PhoneTourCoverageIssue[] = [];
  for (let t = 0; t < GUIDED_TOURS.length; t++) {
    const tour = GUIDED_TOURS[t];
    for (let s = 0; s < tour.steps.length; s++) {
      const step: GuidedTourStep = tour.steps[s];
      if (isDesktopOnlyChrome(step.target)) {
        issues.push({
          tourId: tour.id,
          stepIndex: s,
          title: step.title,
          target: step.target,
          reason: "desktop-only chrome target without phone fallback",
        });
        continue;
      }
      if (!targetHasPhonePath(step.target)) {
        issues.push({
          tourId: tour.id,
          stepIndex: s,
          title: step.title,
          target: step.target,
          reason: "no known phone-reachable selector",
        });
      }
    }
  }
  return issues;
}
