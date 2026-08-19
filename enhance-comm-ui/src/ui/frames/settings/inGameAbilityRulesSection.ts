/**
 * Settings → In game · per-ability name + ring color overrides.
 */

import { e, getReact } from "../../../host/react";
import { GameIcon } from "../../chrome/GameIcon";
import {
  formatHexColor,
  getVizAbilityRules,
  listConfigurableAbilities,
  parseHexColor,
  patchVizAbilityRule,
  resolveAbilityAppearance,
  resolveAbilityShowName,
  type ConfigurableAbility,
} from "../../../viz/vizAbilityRules";
import {
  listAbilityPreviewCasters,
  type AbilityPreviewCaster,
} from "../../../instance/abilityTimelineDummy";
import { getVizSettings, type VizSettings } from "../../../viz/vizSettings";
import { settingsSection } from "./settingsPaneChrome";
import { SettingsColorInput } from "./settingsColorInput";

export type InGameAbilityRulesSectionProps = {
  bump: () => void;
  query?: string;
};

function abilityMatchesQuery(ab: ConfigurableAbility, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay =
    `${ab.name} ${ab.id} name color ring auto ability appearance`.toLowerCase();
  return hay.indexOf(q) !== -1;
}

export function countInGameAbilityRuleMatches(query: string): number {
  const abilities = listConfigurableAbilities();
  const q = query.trim();
  if (!q) return abilities.length;
  let total = 0;
  for (let i = 0; i < abilities.length; i++) {
    if (abilityMatchesQuery(abilities[i], q)) total += 1;
  }
  return total;
}

type CasterRef = { mtype: string; name: string };

function buildCasterMap(
  casters: AbilityPreviewCaster[],
): Map<string, CasterRef[]> {
  const map = new Map<string, CasterRef[]>();
  for (let i = 0; i < casters.length; i++) {
    const c = casters[i];
    for (let j = 0; j < c.abilities.length; j++) {
      const aId = c.abilities[j].id;
      const existing = map.get(aId);
      if (existing) {
        existing.push({ mtype: c.mtype, name: c.name });
      } else {
        map.set(aId, [{ mtype: c.mtype, name: c.name }]);
      }
    }
  }
  return map;
}

function abilityRuleRow(
  ab: ConfigurableAbility,
  settings: VizSettings,
  rules: ReturnType<typeof getVizAbilityRules>,
  onChange: () => void,
  casterRefs: CasterRef[],
): any {
  const rule = rules[ab.id];
  const showName = resolveAbilityShowName(ab.id, settings, rules);
  const hasNameOverride = typeof rule?.showName === "boolean";
  const appearance = resolveAbilityAppearance(ab.id, settings, rules);
  const activeColor = formatHexColor(appearance.color);
  return e(
    "div",
    { key: ab.id, className: "ecu-settings-abil-row" },
    e(
      "div",
      { className: "ecu-settings-abil-id" },
      e(GameIcon, {
        id: ab.id,
        kind: "skill",
        size: 32,
        className: "ecu-settings-abil-icon",
        title: ab.name,
      }),
      e(
        "div",
        { className: "ecu-settings-abil-copy" },
        e("span", { className: "ecu-settings-abil-name" }, ab.name),
        e("span", { className: "ecu-settings-abil-key" }, ab.id),
      ),
    ),
    e(
      "div",
      { className: "ecu-settings-abil-casters" },
      ...casterRefs.map((c: CasterRef) =>
        e(
          "span",
          { key: c.mtype, className: "ecu-settings-abil-caster" },
          e(GameIcon, {
            id: c.mtype,
            kind: "monster",
            mtype: c.mtype,
            size: 40,
            title: c.name,
          }),
        ),
      ),
    ),
    e(
      "label",
      {
        className: "ecu-settings-abil-check",
        title: hasNameOverride
          ? "Per-ability show-name override"
          : "Uses the global show-name default",
      },
      e("input", {
        type: "checkbox",
        checked: showName,
        onChange: (ev: { target: { checked: boolean } }) => {
          patchVizAbilityRule(ab.id, { showName: ev.target.checked });
          onChange();
        },
      }),
      "Show name",
    ),
    e(SettingsColorInput, {
      value: activeColor,
      fallbackColor: activeColor,
      clearLabel: "Clear per-ability color",
      onCommit: (value: string) => {
        const parsed = parseHexColor(value);
        if (parsed == null) return;
        patchVizAbilityRule(ab.id, { color: parsed });
        onChange();
      },
      onClear:
        rule?.color != null
          ? () => {
              const next = { ...(rules[ab.id] || {}) };
              delete next.color;
              patchVizAbilityRule(
                ab.id,
                next.showName === undefined ? null : next,
              );
              onChange();
            }
          : undefined,
    }),
  );
}

export function InGameAbilityRulesSection(
  props: InGameAbilityRulesSectionProps,
): any {
  const settings = getVizSettings();
  const rules = getVizAbilityRules();
  const abilities = listConfigurableAbilities();
  const casterMap = buildCasterMap(listAbilityPreviewCasters());
  const kids: any[] = [];
  for (let i = 0; i < abilities.length; i++) {
    if (!abilityMatchesQuery(abilities[i], props.query || "")) continue;
    kids.push(
      abilityRuleRow(
        abilities[i],
        settings,
        rules,
        props.bump,
        casterMap.get(abilities[i].id) || [],
      ),
    );
  }
  return e(
    "div",
    { className: "ecu-settings-abil-list" },
    settingsSection("Ability appearance"),
    e(
      "p",
      { className: "ecu-settings-lead" },
      "Per-skill overrides for ring color and name labels (like test_visualize_skills).",
    ),
    kids.length
      ? kids
      : e(
          "p",
          { className: "ecu-settings-help" },
          "No trackable abilities in roster.",
        ),
  );
}

let sectionMemo: ((props: InGameAbilityRulesSectionProps) => any) | null = null;

export function InGameAbilityRulesSectionMemo(
  props: InGameAbilityRulesSectionProps,
): any {
  const React = getReact();
  if (!sectionMemo) {
    sectionMemo = React.memo(InGameAbilityRulesSection);
  }
  return e(sectionMemo, props);
}
