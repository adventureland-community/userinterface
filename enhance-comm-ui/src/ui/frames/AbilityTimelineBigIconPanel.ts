/**
 * Movable last-N BigIcon frame. Show/hide is panelVisible only.
 */

import { e } from "../../host/react";
import type { EntityLike } from "../../host/globals";
import type { AbilityTimelinePanelModel } from "../../instance/abilityTimelineModel";
import type { AbilityTimelinePrefs } from "../../instance/abilityTimelinePrefs";
import {
  bigIconSize,
  collectBigIcons,
  formatAbilityCountdown,
  growFlexDirection,
} from "../../instance/abilityTimelineChrome";
import { PIXEL_TEXT } from "../../lib/typeScale";
import { useAbilityTimelineLive } from "../hooks/useAbilityTimelineLive";
import { abilityIcon } from "./abilityTimelineRenderUtil";
import { ensureAbilityTimelineCss } from "./abilityTimelineCss";
import {
  abilityTimelineHover,
  hideAbilityTimelineTip,
} from "./abilityTimelineTip";

export type AbilityTimelineBigIconPanelProps = {
  entities: EntityLike[];
  selectedEntity?: string;
  observing?: EntityLike | null;
  layoutEdit?: boolean;
};

export function renderAbilityBigIcons(
  model: AbilityTimelinePanelModel,
  prefs: AbilityTimelinePrefs,
): any {
  ensureAbilityTimelineCss();
  const icons = collectBigIcons(model.sections, prefs);
  if (!icons.length) return null;
  const size = bigIconSize(prefs.iconSize);
  const kids: any[] = [];
  for (let i = 0; i < icons.length; i++) {
    const icon = icons[i];
    const cd = formatAbilityCountdown(icon.ms);
    kids.push(
      e(
        "div",
        {
          key: icon.key,
          className: [
            "ecu-abil-bigicon",
            icon.highlight === "crit" ? "ecu-abil-bigicon--crit" : "",
            icon.highlight === "warn" ? "ecu-abil-bigicon--warn" : "",
          ]
            .filter(Boolean)
            .join(" "),
          ...abilityTimelineHover({
            caster: icon.caster,
            abilityId: icon.id,
            abilityName: icon.skillName,
            remainingLabel: cd || "ready",
            cooldown: icon.cooldown,
          }),
        },
        abilityIcon(icon.id, true, size, icon.mtype),
        e(
          "span",
          {
            className: [
              "ecu-abil-bigicon-cd",
              icon.highlight === "crit" ? "is-crit" : "",
              icon.highlight === "warn" ? "is-warn" : "",
            ]
              .filter(Boolean)
              .join(" "),
          },
          cd,
        ),
        e("span", { className: "ecu-abil-bigicon-name" }, icon.name),
      ),
    );
  }
  return e(
    "div",
    {
      className: "ecu-abil-bigicons",
      style: {
        flexDirection: growFlexDirection(prefs.bigIconGrow),
        gap: prefs.bigIconMargin + "px",
        ...PIXEL_TEXT,
      },
      onMouseLeave: hideAbilityTimelineTip,
    },
    ...kids,
  );
}

export function AbilityTimelineBigIconPanel(
  props: AbilityTimelineBigIconPanelProps,
): any {
  const { prefs, model } = useAbilityTimelineLive(props);
  if (!model) return null;
  const body = renderAbilityBigIcons(model, prefs);
  if (!body && !props.layoutEdit) return null;
  return e(
    "div",
    {
      className: "ecu-abil-bigicon-panel",
      style: { height: "100%", width: "100%", ...PIXEL_TEXT },
    },
    body,
  );
}
