import { getG } from "../../host/al";
import { closeBuffDialog, isBuffDialogOpen } from "../../host/dialogHost";
import {
  addTint,
  conditionClick,
  itemContainer,
  rebindTint,
  setXTarget,
} from "../../host/icons";
import { getReact, e } from "../../host/react";
import type { EntityLike, StatusLike } from "../../host/globals";
import { formatTime } from "../../lib/format";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import { TYPE, PIXEL_TEXT } from "../../lib/typeScale";

/** Mirror stock toggle for condition info on /comm. */
let lastConditionClick = "";

/** Match observe-hud default; item_container outer box is size + 2*3 padding. */
const ICON_SIZE = 36;

export type BuiltEffect = {
  id: string;
  skin: string;
  ms?: number;
  stacks?: number;
  debuff?: boolean;
  type: "skill" | "condition";
  name?: string;
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
          stacks: typeof actual.s === "number" ? actual.s : undefined,
          debuff: false,
          type: "skill",
          name: typeof def.name === "string" ? def.name : undefined,
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
      stacks: typeof actual.s === "number" ? actual.s : undefined,
      debuff: !!(prop && prop.debuff),
      type: "condition",
      name: typeof prop?.name === "string" ? prop.name : undefined,
    });
  }
  return out;
}

export function effectsKey(effects: BuiltEffect[]): string {
  return effects.map((ef) => ef.id).join("|");
}

function loaderId(hostClass: string): string {
  return hostClass.replace(/[^a-zA-Z0-9_\-]/g, "_");
}

function effectTooltip(effect: BuiltEffect): string {
  const parts: string[] = [];
  const label = effect.name || effect.id;
  const kind =
    effect.type === "skill"
      ? "Skill"
      : effect.debuff
        ? "Debuff"
        : "Buff";
  parts.push(`${label} (${kind})`);
  if (effect.ms != null && effect.ms > 0) {
    parts.push(`Remaining: ${formatTime(effect.ms / 1000)}`);
  }
  if (effect.stacks != null && effect.stacks > 0) {
    parts.push(`Stacks: ${effect.stacks}`);
  }
  if (effect.name && effect.name !== effect.id) {
    parts.push(`id: ${effect.id}`);
  }
  return parts.join("\n");
}

/**
 * Duration tint via classic skill skidloader (1px bar + scaleY).
 * Never call add_tint type skill/progress on the icon host itself — that stretches the whole tile.
 */
function applyEffectTint(wrap: HTMLElement, rid: string, ms: number | undefined): void {
  if (!(ms != null && ms > 0)) return;

  const root = wrap.firstElementChild as HTMLElement | null;
  // Absolute bordered tile (has overflow:hidden) — same parent skillbar uses for .skidloader.
  const host =
    (wrap.querySelector("div[style*='position: absolute']") as HTMLElement | null) ||
    (wrap.querySelector("div[style*='overflow']") as HTMLElement | null) ||
    root;
  if (!host) return;

  const selector = ".skidloader" + rid;
  let loader = wrap.querySelector(selector) as HTMLElement | null;
  if (!loader) {
    loader = document.createElement("div");
    loader.className = "skidloader" + rid;
    loader.setAttribute(
      "style",
      "position: absolute; bottom: 0px; right: 0px; width: 4px; height: 1px; background-color: yellow",
    );
    host.appendChild(loader);
  }

  const until = Date.now() + ms;
  const prevUntil = Number(loader.getAttribute("data-until") || 0);
  if (prevUntil && until <= prevUntil + 400) return;
  loader.setAttribute("data-until", String(until));

  // Re-bind after React remount: existing tint.added skips height/opacity setup on the new node.
  rebindTint(selector);
  loader.style.height = "1px";
  const img = host.querySelector("img") as HTMLElement | null;
  if (img) img.style.opacity = "0.5";

  addTint(selector, {
    ms,
    type: "skill",
    skid: rid,
  });
}

type EffectsRowProps = {
  entity: EntityLike;
  /** item_container icon size; default matches observe-hud player frame. */
  iconSize?: number;
  /** Compact party-chip spacing (tighter margin/gap under MP). */
  compact?: boolean;
  /**
   * When set (or defaulted in compact), hide overflow behind a +N chip
   * with a tooltip listing the rest — keeps party frames short.
   */
  maxVisible?: number;
};

function EffectIcon(props: {
  effect: BuiltEffect;
  hostClass: string;
  entity: EntityLike;
  iconSize: number;
}): any {
  const React = getReact();
  const ref = React.useRef(null);
  const { effect, hostClass, entity, iconSize } = props;
  const entityId = String(entity.id);
  const rid = loaderId(hostClass);
  const tooltip = effectTooltip(effect);
  const clickable = effect.type !== "skill";

  React.useEffect(() => {
    const el = ref.current as HTMLElement | null;
    if (!el) return;

    // draggable:false → item_container uses onmousedown; we own clicks via React instead.
    const opts: Record<string, any> = {
      skin: effect.skin,
      size: iconSize,
      draggable: false,
    };

    const actual =
      typeof effect.stacks === "number" && effect.stacks
        ? ({ s: effect.stacks } as StatusLike)
        : null;
    const html = itemContainer(opts, actual);

    if (html) {
      el.innerHTML = html;
      const root = el.firstElementChild as HTMLElement | null;
      // item_container defaults margin:2px — observe-hud zeroes it.
      if (root) {
        root.style.margin = "0";
        // Strip host inline handlers; React wrapper owns the click.
        root.removeAttribute("onmousedown");
        root.removeAttribute("ontouchstart");
        root.removeAttribute("onclick");
      }
      applyEffectTint(el, rid, effect.ms);
    } else {
      el.textContent =
        effect.id +
        (effect.stacks != null ? ` ${effect.stacks}` : "") +
        (effect.ms != null ? ` (${formatTime(effect.ms / 1000)})` : "");
    }

    return () => {
      if (el) el.innerHTML = "";
    };
  }, [
    entityId,
    effect.id,
    effect.skin,
    effect.type,
    effect.stacks,
    hostClass,
    rid,
    iconSize,
  ]);

  // Same effect set — refresh tint only when ms jumps forward.
  React.useEffect(() => {
    const el = ref.current as HTMLElement | null;
    if (!el || !el.firstElementChild) return;
    applyEffectTint(el, rid, effect.ms);
  }, [entityId, effect.ms, rid]);

  const onClick = clickable
    ? (ev: any) => {
        if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
        if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
        // Info only — do not open CommUI paperdoll via xtarget selection sync.
        if (
          lastConditionClick === effect.id &&
          isBuffDialogOpen()
        ) {
          closeBuffDialog();
          lastConditionClick = "";
          return;
        }
        lastConditionClick = effect.id;
        setXTarget(entity, { dialogOnly: true });
        conditionClick(effect.id);
      }
    : undefined;

  return e("div", {
    ref,
    className: `comm-fx-icon ${hostClass}`,
    "data-condition": effect.id,
    "data-entity": entityId,
    title: tooltip,
    onClick,
    onMouseDown: clickable
      ? (ev: any) => {
          // Avoid parent vitals/selection handlers eating the press.
          if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
        }
      : undefined,
    onPointerDown: clickable
      ? (ev: any) => {
          if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
        }
      : undefined,
    style: {
      position: "relative",
      display: "inline-block",
      verticalAlign: "top",
      // Allow .iqui / border overhang (right/bottom: -2px) to paint.
      overflow: "visible",
      flex: "0 0 auto",
      cursor: clickable ? "pointer" : "default",
      pointerEvents: "auto",
    },
  });
}

export function EffectsRow(props: EffectsRowProps): any {
  const entityId = String(props.entity.id);
  const effects = buildEntityEffects(props.entity);
  const key = effectsKey(effects);
  const iconSize =
    typeof props.iconSize === "number" && props.iconSize > 0
      ? props.iconSize
      : ICON_SIZE;
  const compact = !!props.compact;
  const gap = compact ? "3px" : "6px";
  const marginTop = compact ? "3px" : "6px";
  const padBottom = effects.length ? (compact ? "2px" : "4px") : 0;
  const minHeight = effects.length ? iconSize + (compact ? 8 : 14) : 0;
  // Compact party chips default to 4 visible; full unit frames show all.
  const maxVisible =
    typeof props.maxVisible === "number"
      ? props.maxVisible
      : compact
        ? 4
        : 0;
  const overflow =
    maxVisible > 0 && effects.length > maxVisible
      ? effects.length - maxVisible
      : 0;
  const shown =
    overflow > 0 ? effects.slice(0, maxVisible) : effects;
  const hidden = overflow > 0 ? effects.slice(maxVisible) : [];
  const overflowTitle = hidden
    .map((ef) => {
      const label = ef.name || ef.id;
      const kind =
        ef.type === "skill" ? "skill" : ef.debuff ? "debuff" : "buff";
      return `${label} (${kind})`;
    })
    .join("\n");

  return e(
    "div",
    {
      key: `${entityId}:${key}`,
      className: "comm-fx-row" + (compact ? " is-compact" : ""),
      style: {
        display: "flex",
        flexDirection: "row",
        // Gap under MP bar so icons / quantity badges are not flush.
        marginTop,
        gap,
        flexWrap: compact && maxVisible > 0 ? "nowrap" : "wrap",
        alignItems: "flex-start",
        width: "100%",
        // Room for item_container chrome + .iqui (bottom:-2px overhang).
        minHeight,
        paddingBottom: padBottom,
        boxSizing: "border-box",
        pointerEvents: "auto",
        overflow: compact && maxVisible > 0 ? "hidden" : "visible",
      },
    },
    ...shown.map((ef) => {
      const hostClass = `comm-fx-${entityId}-${ef.id}`.replace(
        /[^a-zA-Z0-9_\-]/g,
        "_",
      );
      return e(EffectIcon, {
        key: `${entityId}-${ef.id}`,
        effect: ef,
        hostClass,
        entity: props.entity,
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
              fontSize: compact ? TYPE.countBadge : TYPE.secondary,
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
  const ids = Object.keys(byId);
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
      const entityId = String(ef.entity.id);
      const hostClass = `comm-fx-shared-${entityId}-${ef.id}`.replace(
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
