import { e } from "../../host/react";
import type { EntityLike } from "../../host/globals";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import {
  EffectIcon,
  buildEntityEffects,
  type BuiltEffect,
} from "./EffectsRow";

export type SharedEffectEntry = BuiltEffect & { entity: EntityLike };

/** Unique buffs across party members (longest remaining ms wins). */
export function collectUniquePartyEffects(
  members: EntityLike[],
): SharedEffectEntry[] {
  const byId: Record<string, SharedEffectEntry> = {};
  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    const effects = buildEntityEffects(member);
    for (let j = 0; j < effects.length; j++) {
      const ef = effects[j];
      const prev = byId[ef.id];
      if (!prev || (ef.ms || 0) > (prev.ms || 0)) {
        byId[ef.id] = { ...ef, entity: member };
      }
    }
  }
  const ids = Object.keys(byId).sort();
  const out: SharedEffectEntry[] = [];
  for (let i = 0; i < ids.length; i++) out.push(byId[ids[i]]);
  return out;
}

/** One shared strip of unique party buffs (no under-chip rows). */
export function SharedPartyEffects(props: {
  members: EntityLike[];
  iconSize?: number;
  maxVisible?: number;
}): any {
  const entries = collectUniquePartyEffects(props.members);
  if (!entries.length) return null;
  const iconSize =
    typeof props.iconSize === "number" && props.iconSize > 0
      ? props.iconSize
      : 22;
  const maxVisible =
    typeof props.maxVisible === "number" ? props.maxVisible : 8;
  const overflow =
    maxVisible > 0 && entries.length > maxVisible
      ? entries.length - maxVisible
      : 0;
  const shown = overflow > 0 ? entries.slice(0, maxVisible) : entries;
  const hidden = overflow > 0 ? entries.slice(maxVisible) : [];
  const overflowTitle = hidden
    .map((ef) => {
      const label = ef.name || ef.id;
      const who = ef.entity.name || ef.entity.id;
      return `${label} · ${who}`;
    })
    .join("\n");

  return e(
    "div",
    {
      className: "comm-fx-row is-shared",
      style: {
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: "3px",
        marginTop: "4px",
        marginBottom: "2px",
        alignItems: "flex-start",
        width: "100%",
        boxSizing: "border-box",
        pointerEvents: "auto",
      },
    },
    ...shown.map((ef) => {
      // Host class is effect-id only — switching which member "owns" the
      // longest remaining must not change rid/hostClass (that would wipe paint).
      const hostClass = `comm-fx-shared-${ef.id}`.replace(
        /[^a-zA-Z0-9_\-]/g,
        "_",
      );
      return e(EffectIcon, {
        key: `shared-${ef.id}`,
        effect: ef,
        hostClass,
        entity: ef.entity,
        iconSize,
      });
    }),
    overflow > 0
      ? e(
          "div",
          {
            className: "comm-fx-overflow",
            title: overflowTitle,
            style: {
              flex: "0 0 auto",
              minWidth: `${Math.max(22, iconSize - 4)}px`,
              height: `${iconSize}px`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(20,20,20,0.9)",
              border: "1px solid #555",
              color: "#ccc",
              fontSize: TYPE.countBadge,
              lineHeight: 1,
              ...PIXEL_TEXT,
              cursor: "default",
              boxSizing: "border-box",
            },
          },
          `+${overflow}`,
        )
      : null,
  );
}
