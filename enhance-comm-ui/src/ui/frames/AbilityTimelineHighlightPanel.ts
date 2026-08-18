/**
 * Movable center text highlight frame. Show/hide is panelVisible only.
 */

import { e } from "../../host/react";
import type { EntityLike } from "../../host/globals";
import type { AbilityTimelinePanelModel } from "../../instance/abilityTimelineModel";
import type { AbilityTimelinePrefs } from "../../instance/abilityTimelinePrefs";
import {
  collectBigIcons,
  formatAbilityCountdown,
  growFlexDirection,
} from "../../instance/abilityTimelineChrome";
import { PIXEL_TEXT } from "../../lib/typeScale";
import { useAbilityTimelineLive } from "../hooks/useAbilityTimelineLive";
import { ensureAbilityTimelineCss } from "./abilityTimelineCss";
import {
  abilityTimelineHover,
  hideAbilityTimelineTip,
} from "./abilityTimelineTip";

export type AbilityTimelineHighlightPanelProps = {
  entities: EntityLike[];
  selectedEntity?: string;
  observing?: EntityLike | null;
  layoutEdit?: boolean;
};

export function renderAbilityHighlights(
  model: AbilityTimelinePanelModel,
  prefs: AbilityTimelinePrefs,
): any {
  ensureAbilityTimelineCss();
  const rows = collectBigIcons(model.sections, prefs);
  if (!rows.length) return null;
  const kids: any[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    kids.push(
      e(
        "div",
        {
          key: row.key,
          className: [
            "ecu-abil-highlight",
            row.highlight === "crit" ? "is-crit" : "",
            row.highlight === "warn" ? "is-warn" : "",
          ]
            .filter(Boolean)
            .join(" "),
          ...abilityTimelineHover({
            caster: row.caster,
            abilityId: row.id,
            abilityName: row.skillName,
            remainingLabel: formatAbilityCountdown(row.ms) || "ready",
            cooldown: row.cooldown,
          }),
        },
        row.name,
      ),
    );
  }
  return e(
    "div",
    {
      className: "ecu-abil-highlights",
      style: {
        flexDirection: growFlexDirection(prefs.highlightGrow),
        gap: prefs.highlightMargin + "px",
        ...PIXEL_TEXT,
      },
      onMouseLeave: hideAbilityTimelineTip,
    },
    ...kids,
  );
}

export function AbilityTimelineHighlightPanel(
  props: AbilityTimelineHighlightPanelProps,
): any {
  const { prefs, model } = useAbilityTimelineLive(props);
  if (!model) return null;
  const body = renderAbilityHighlights(model, prefs);
  if (!body && !props.layoutEdit) return null;
  return e(
    "div",
    {
      className: "ecu-abil-highlight-panel",
      style: { height: "100%", width: "100%", ...PIXEL_TEXT },
    },
    body,
  );
}
