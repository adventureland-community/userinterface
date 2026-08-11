import { getG } from "../../host/al";
import { info, INFO_SOURCE_ATTR } from "../../host/dialogHost";
import {
  addTint,
  getTint,
  itemContainer,
  rebindTint,
} from "../../host/icons";
import { getReact, e } from "../../host/react";
import type { EntityLike, StatusLike } from "../../host/globals";
import {
  hardCcFallbackSkin,
  PROMOTED_HARD_CC_IDS,
} from "../../lib/controlState";
import {
  formatDurationCompact,
  formatTime,
  syncEndsAt,
} from "../../lib/format";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";

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
    const promoted =
      PROMOTED_HARD_CC_IDS.indexOf(condition) !== -1;
    if (
      !actual.skin &&
      !promoted &&
      (!prop || (!prop.ui && (!actual.s || actual.s < 20)))
    ) {
      continue;
    }
    if (entity.type === "monster" && condition === "poisonous") continue;
    const skin =
      actual.skin || prop?.skin || hardCcFallbackSkin(condition);
    if (!skin) continue;
    out.push({
      id: condition,
      skin,
      ms: actual.ms,
      stacks: typeof actual.s === "number" ? actual.s : undefined,
      debuff: !!(prop && prop.debuff) || promoted,
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

function effectTooltip(effect: BuiltEffect, remainingMs?: number): string {
  const parts: string[] = [];
  const label = effect.name || effect.id;
  const kind =
    effect.type === "skill"
      ? "Skill"
      : effect.debuff
        ? "Debuff"
        : "Buff";
  parts.push(`${label} (${kind})`);
  const ms =
    remainingMs != null && remainingMs > 0
      ? remainingMs
      : effect.ms != null && effect.ms > 0
        ? effect.ms
        : 0;
  if (ms > 0) {
    parts.push(`Remaining: ${formatTime(ms / 1000)}`);
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
 *
 * Restart only when the sticky endsAt epoch changes (true refresh). Observe
 * rebroadcasts of a similar `ms` must not call add_tint again — that resets
 * tint.start to now and makes the bar "seize".
 */
function ensureSkidLoader(wrap: HTMLElement, rid: string): HTMLElement | null {
  const root = wrap.firstElementChild as HTMLElement | null;
  const host =
    (wrap.querySelector("div[style*='position: absolute']") as HTMLElement | null) ||
    (wrap.querySelector("div[style*='overflow']") as HTMLElement | null) ||
    root;
  if (!host) return null;

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
  return loader;
}

function applyEffectTint(
  wrap: HTMLElement,
  rid: string,
  endsAt: number,
  durationMs: number,
  mode: "restart" | "sync" | "rebind",
): void {
  const now = Date.now();
  const remaining = endsAt - now;
  if (!(remaining > 0) || !(durationMs > 0)) return;

  const loader = ensureSkidLoader(wrap, rid);
  if (!loader) return;

  const selector = ".skidloader" + rid;
  const existing = getTint(selector);

  if (mode === "sync" && existing) {
    // Shorten/extend end without resetting start (no visual restart).
    existing.end = new Date(endsAt);
    existing.ms = remaining;
    return;
  }

  rebindTint(selector);
  loader.style.height = "1px";
  const img = loader.parentElement?.querySelector("img") as HTMLElement | null;
  if (img) img.style.opacity = "0.5";

  // Past start keeps mid-buff progress after DOM remount; fresh restart uses now.
  const start =
    mode === "restart"
      ? new Date(now)
      : new Date(Math.min(now, endsAt - durationMs));

  addTint(selector, {
    ms: remaining,
    type: "skill",
    skid: rid,
    start,
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

export function EffectIcon(props: {
  effect: BuiltEffect;
  hostClass: string;
  entity: EntityLike;
  iconSize: number;
}): any {
  const React = getReact();
  const iconRef = React.useRef(null);
  const endsAtRef = React.useRef(0);
  const durationRef = React.useRef(0);
  const { effect, hostClass, entity, iconSize } = props;
  const entityId = String(entity.id);
  const rid = loaderId(hostClass);
  const clickable = effect.type !== "skill";

  const [remainingMs, setRemainingMs] = React.useState(0);

  const paintIcon = () => {
    const el = iconRef.current as HTMLElement | null;
    if (!el) return;

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
      if (root) {
        root.style.margin = "0";
        root.removeAttribute("onmousedown");
        root.removeAttribute("ontouchstart");
        root.removeAttribute("onclick");
      }
    } else {
      el.textContent =
        effect.id + (effect.stacks != null ? ` ${effect.stacks}` : "");
    }
  };

  const pushTint = (mode: "restart" | "sync" | "rebind") => {
    const el = iconRef.current as HTMLElement | null;
    if (!el || !el.firstElementChild) return;
    const endsAt = endsAtRef.current;
    const durationMs = durationRef.current;
    if (!(endsAt > Date.now()) || !(durationMs > 0)) return;
    applyEffectTint(el, rid, endsAt, durationMs, mode);
  };

  // Paint stock item_container; rebind tint onto the new DOM without resetting epoch.
  React.useEffect(() => {
    const el = iconRef.current as HTMLElement | null;
    if (!el) return;
    paintIcon();
    pushTint(durationRef.current > 0 ? "rebind" : "restart");
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

  // Sticky absolute end — only restart tint when endsAt clearly refreshes.
  React.useEffect(() => {
    const now = Date.now();
    const prev = endsAtRef.current;
    const next = syncEndsAt(prev, effect.ms, now);
    endsAtRef.current = next;
    setRemainingMs(Math.max(0, next - now));

    if (!(next > now)) {
      durationRef.current = 0;
      return;
    }

    if (!prev || next > prev + 750) {
      // New buff or clear refresh — new tint epoch from current remaining.
      durationRef.current = next - now;
      pushTint("restart");
      return;
    }
    if (next < prev - 250) {
      // Shortened — keep start, move end.
      durationRef.current = Math.max(durationRef.current, next - now);
      pushTint("sync");
      return;
    }
    // Similar ms rebroadcast: leave tint alone.
  }, [entityId, effect.id, effect.ms, rid]);

  // Local countdown for the text overlay / tooltip.
  React.useEffect(() => {
    const tick = () => {
      const ends = endsAtRef.current;
      if (!ends) {
        setRemainingMs(0);
        return;
      }
      setRemainingMs(Math.max(0, ends - Date.now()));
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [entityId, effect.id]);

  const msLabel = formatDurationCompact(remainingMs / 1000);
  const tooltip = effectTooltip(effect, remainingMs);

  const onClick = clickable
    ? (ev: any) => {
        if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
        if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
        info.openCondition(entity, effect.id);
      }
    : undefined;

  return e(
    "div",
    {
      className: `comm-fx-icon ${hostClass}`,
      "data-condition": effect.id,
      "data-entity": entityId,
      [INFO_SOURCE_ATTR]: clickable ? "" : undefined,
      title: tooltip,
      onClick,
      onMouseDown: clickable
        ? (ev: any) => {
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
        overflow: "visible",
        flex: "0 0 auto",
        cursor: clickable ? "pointer" : "default",
        pointerEvents: "auto",
      },
    },
    e("div", {
      ref: iconRef,
      style: {
        position: "relative",
        display: "inline-block",
        verticalAlign: "top",
      },
    }),
    msLabel
      ? e(
          "div",
          {
            className: "comm-fx-ms",
            style: {
              position: "absolute",
              left: "50%",
              bottom: "1px",
              transform: "translateX(-50%)",
              zIndex: 2,
              padding: "0 3px",
              background: "rgba(0,0,0,0.82)",
              border: "1px solid #444",
              color: remainingMs <= 5000 ? "#ffcc66" : "#e8e8e8",
              fontSize: TYPE.microMin,
              lineHeight: "14px",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              ...PIXEL_TEXT,
            },
          },
          msLabel,
        )
      : null,
  );
}

export function EffectsRow(props: EffectsRowProps): any {
  const entityId = String(props.entity.id);
  const effects = buildEntityEffects(props.entity);
  if (!effects.length) return null;
  const key = effectsKey(effects);
  const iconSize =
    typeof props.iconSize === "number" && props.iconSize > 0
      ? props.iconSize
      : ICON_SIZE;
  const compact = !!props.compact;
  const gap = compact ? "3px" : "6px";
  const marginTop = compact ? "3px" : "6px";
  const padBottom = compact ? "2px" : "4px";
  const minHeight = iconSize + (compact ? 8 : 14);
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
        marginTop,
        gap,
        flexWrap: compact && maxVisible > 0 ? "nowrap" : "wrap",
        alignItems: "flex-start",
        width: "100%",
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
              fontSize: compact ? TYPE.badge : TYPE.secondary,
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
