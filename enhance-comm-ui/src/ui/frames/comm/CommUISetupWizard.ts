/**
 * Brief Comm UI intro — optional handoff to spotlight tours.
 */

import { getReact, e } from "../../../host/react";
import { FEATURE_OVERVIEW, latestChangelogId } from "../../../lib/changelog";
import { patchSettings } from "../../../lib/settings";
import { PIXEL_TEXT } from "../../../lib/typeScale";
import { patchMeterAppearance } from "../../../meters/meterAppearance";
import { capabilityCaps } from "./commWizCaps";
import { injectCommSetupWizardCss } from "./commSetupWizardCss";

const WIZARD_TITLE = "Comm UI";
const STEP_KEY = "ecu-intro-step";

export type CommUISetupWizardProps = {
  step: number;
  onStep: (step: number) => void;
  onDone: () => void;
  onStartTour: () => void;
};

function wizBtn(label: string, onClick: () => void, primary?: boolean): any {
  return e(
    "button",
    {
      type: "button",
      className: "ecu-comm-wiz-btn" + (primary ? " primary" : ""),
      onClick,
    },
    label,
  );
}

function featureList(items: string[]): any {
  return e(
    "ul",
    { className: "ecu-comm-wiz-list" },
    ...items.map((text, i) => e("li", { key: `li-${i}` }, text)),
  );
}

function markIntroComplete(): void {
  patchSettings({
    setupWizardDone: true,
    changelogSeenId: latestChangelogId(),
  });
  patchMeterAppearance({ testBars: false });
  clearIntroStep();
}

export function readIntroStep(): number {
  try {
    const raw = sessionStorage.getItem(STEP_KEY);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function writeIntroStep(step: number): void {
  try {
    sessionStorage.setItem(STEP_KEY, String(step));
  } catch {
    /* ignore */
  }
}

export function clearIntroStep(): void {
  try {
    sessionStorage.removeItem(STEP_KEY);
  } catch {
    /* ignore */
  }
}

export function CommUISetupWizard(props: CommUISetupWizardProps): any {
  injectCommSetupWizardCss();

  const finish = () => {
    markIntroComplete();
    props.onDone();
  };

  const steps = [
    {
      title: "Overview",
      body: "",
      extra: capabilityCaps(FEATURE_OVERVIEW),
      actions: e(
        "div",
        { className: "ecu-comm-wiz-actions" },
        wizBtn("Next", () => props.onStep(1), true),
      ),
    },
    {
      title: "How do you want to learn?",
      body: "Spotlight tours dim the screen and highlight one area at a time. You stay in control — Next, Back, or Skip at any point.",
      extra: featureList([
        "Recommended: short intro (~17 steps) — observe chrome, overlay essentials, PDPS",
        "Deeper tours appear once when you use layout, meters, paperdoll, buffs, and more",
        "Replay the intro anytime from the Intro button on the control strip",
      ]),
      actions: e(
        "div",
        { className: "ecu-comm-wiz-actions" },
        wizBtn("Back", () => props.onStep(0)),
        wizBtn("Explore on my own", finish),
        wizBtn(
          "Start spotlight tour",
          () => {
            markIntroComplete();
            props.onStartTour();
          },
          true,
        ),
      ),
    },
  ];

  const cur = steps[Math.min(props.step, steps.length - 1)];

  return e(
    "div",
    { className: "ecu-comm-wiz-backdrop" },
    e(
      "div",
      {
        className: "ecu-comm-wiz",
        style: PIXEL_TEXT,
        onMouseDown: (ev: any) => ev.stopPropagation(),
      },
      e("div", { className: "ecu-comm-wiz-logo" }, WIZARD_TITLE),
      e("h3", null, cur.title),
      cur.body ? e("p", null, cur.body) : null,
      cur.extra || null,
      cur.actions,
      e(
        "div",
        { className: "ecu-comm-wiz-foot" },
        e(
          "button",
          { type: "button", className: "ecu-comm-wiz-skip", onClick: finish },
          "Skip intro",
        ),
        `${props.step + 1} / ${steps.length}`,
      ),
    ),
  );
}
