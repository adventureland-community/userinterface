import { getG } from "../../host/al";
import { addTint, itemContainer } from "../../host/icons";
import { getReact, e } from "../../host/react";
import type { EntityLike, StatusLike } from "../../host/globals";
import { formatTime } from "../../lib/format";

export type BuiltEffect = {
  id: string;
  skin: string;
  ms?: number;
  stacks?: number;
  actual: StatusLike;
};

export function buildEntityEffects(entity: EntityLike): BuiltEffect[] {
  const G = getG();
  const state = entity.s || {};
  const out: BuiltEffect[] = [];
  const keys = Object.keys(state);
  for (let i = 0; i < keys.length; i++) {
    const condition = keys[i];
    const actual = state[condition];
    if (!actual) continue;

    if (G?.skills?.[condition]?.ui) {
      const def = G.skills[condition];
      if (def?.skin) {
        out.push({
          id: condition,
          skin: def.skin,
          ms: actual.ms,
          stacks: actual.s,
          actual,
        });
      }
      continue;
    }

    const prop = G?.conditions?.[condition];
    if (!actual.skin && (!prop || (!prop.ui && (!actual.s || actual.s < 20)))) {
      continue;
    }
    if (entity.type === "monster" && condition === "poisonous") continue;
    const skin = actual.skin || prop?.skin;
    if (!skin) continue;
    out.push({
      id: condition,
      skin,
      ms: actual.ms,
      stacks: actual.s,
      actual,
    });
  }
  return out;
}

export function effectsKey(effects: BuiltEffect[]): string {
  return effects.map((ef) => ef.id).join("|");
}

type EffectsRowProps = {
  entity: EntityLike;
};

function EffectIcon(props: {
  effect: BuiltEffect;
  hostClass: string;
}): any {
  const React = getReact();
  const ref = React.useRef(null);
  const { effect, hostClass } = props;

  React.useEffect(() => {
    const el = ref.current as HTMLElement | null;
    if (!el) return;
    const html = itemContainer(
      { skin: effect.skin, onclick: `condition_click('${effect.id}')` },
      effect.actual,
    );
    if (html) {
      el.innerHTML = html;
      const selector = `.${hostClass}`;
      if (effect.ms != null && effect.ms > 0) {
        addTint(selector, { ms: effect.ms, type: "progress" });
      }
    } else {
      el.textContent =
        effect.id +
        (effect.stacks != null ? ` ${effect.stacks}` : "") +
        (effect.ms != null ? ` (${formatTime(effect.ms / 1000)})` : "");
    }
    return () => {
      if (el) el.innerHTML = "";
    };
  }, [effect.id, effect.skin, hostClass]);

  // ms-only updates: tint only, do not rewrite children
  React.useEffect(() => {
    if (effect.ms == null) return;
    addTint(`.${hostClass}`, { ms: effect.ms, type: "progress" });
  }, [effect.ms, hostClass]);

  return e("div", {
    ref,
    className: hostClass,
    title: effect.id,
    style: {
      display: "inline-block",
      background: "black",
      padding: "1px",
      minWidth: "20px",
      minHeight: "20px",
      fontSize: "10px",
    },
  });
}

export function EffectsRow(props: EffectsRowProps): any {
  const React = getReact();
  const effects = buildEntityEffects(props.entity);
  const key = effectsKey(effects);

  if (effects.length === 0) return null;

  return e(
    "div",
    {
      key,
      style: {
        display: "flex",
        marginBottom: "4px",
        gap: "2px",
        flexWrap: "wrap",
      },
    },
    ...effects.map((ef) => {
      const hostClass = `comm-fx-${props.entity.id}-${ef.id}`.replace(
        /[^a-zA-Z0-9_-]/g,
        "_",
      );
      return e(EffectIcon, {
        key: ef.id,
        effect: ef,
        hostClass,
      });
    }),
  );
}
