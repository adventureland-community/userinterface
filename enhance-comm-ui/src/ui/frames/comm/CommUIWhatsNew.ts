/**
 * Post-upgrade What's New modal — independent of first-run intro.
 */

import { e } from "../../../host/react";
import { patchSettings } from "../../../lib/settings";
import { PIXEL_TEXT } from "../../../lib/typeScale";
import { injectCommSetupWizardCss } from "./commSetupWizardCss";
import { capabilityCaps } from "./commWizCaps";
import {
  latestChangelogId,
  type ChangelogEntry,
} from "../../../lib/changelog";

export type CommUIWhatsNewProps = {
  entries: ChangelogEntry[];
  onDone: () => void;
};

export function CommUIWhatsNew(props: CommUIWhatsNewProps): any {
  injectCommSetupWizardCss();

  const dismiss = () => {
    patchSettings({ changelogSeenId: latestChangelogId() });
    props.onDone();
  };

  const entries = props.entries;
  const heading =
    entries.length === 1 ? `What's new in ${entries[0].title}` : "What's new";

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
      e("div", { className: "ecu-comm-wiz-logo" }, "Comm UI"),
      e("h3", null, heading),
      ...entries.map((entry, ei) =>
        e(
          "div",
          { key: entry.id, className: "ecu-comm-wiz-changelog-block" },
          entries.length > 1
            ? e("div", { className: "ecu-comm-wiz-changelog-ver" }, entry.title)
            : null,
          capabilityCaps(entry.items),
          ei < entries.length - 1
            ? e("div", { className: "ecu-comm-wiz-changelog-sep" })
            : null,
        ),
      ),
      e(
        "div",
        { className: "ecu-comm-wiz-actions" },
        e(
          "button",
          {
            type: "button",
            className: "ecu-comm-wiz-btn primary",
            onClick: dismiss,
          },
          "Got it",
        ),
      ),
    ),
  );
}
