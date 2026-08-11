import { getG } from "../../host/al";
import { info, INFO_SOURCE_ATTR } from "../../host/dialogHost";
import {
  addTint,
  getTint,
  itemContainer,
  rebindTint,
} from "../../host/icons";
import { getReact, e } from "../../host/react";
import type { EntityLike } from "../../host/globals";
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

/** Stock skill UI (`render_conditions`) uses a fixed 24s skidloader/progress span. */
const SKILL_UI_SPAN_MS = 24000;

function buffStartedAt(
  effect: BuiltEffect,
  endsAt: number,
  now: number,
  mode: "restart" | "sync" | "rebind",
  prevStartedAt: number,
): number {
  if (effect.type === "skill") {
    const spanMs = Math.max(SKILL_UI_SPAN_MS, endsAt - now);
    return endsAt - spanMs;
  }
  if (mode === "restart") return now;
  return prevStartedAt;
}

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
    // Duration debuffs (cursed, poisoned, …) have prop.skin but no ui flag — show on unit frames.
    const debuffIcon = !!(prop && prop.debuff && prop.skin);
    if (
      !actual.skin &&
      !promoted &&
      !debuffIcon &&
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
  return effects
    .map((ef) => ef.id)
    .slice()
    .sort()
    .join("|");
}

function loaderId(hostClass: string): string {
  return hostClass.replace(/[^a-zA-Z0-9_\-]/g, "_");
}

/** Update stock `.iqui` stack digit without rebuilding the icon (preserves skidloader). */
function syncStackBadge(
  wrap: HTMLElement,
  stacks: number | undefined,
): void {
  const root = wrap.firstElementChild as HTMLElement | null;
  if (!root) return;
  let badge = root.querySelector(".iqui") as HTMLElement | null;
  if (stacks != null && stacks > 0) {
    if (!badge) {
      badge = document.createElement("div");
      badge.className = "iqui";
      // Stock places `.iqui` on the absolute overflow host that holds the art.
      const host =
        (root.querySelector(
          "div[style*='overflow']",
        ) as HTMLElement | null) || root;
      host.appendChild(badge);
    }
    badge.textContent = String(stacks);
  } else if (badge) {
    badge.remove();
  }
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

/** Ends-at must jump at least this far to count as a duration refresh. */
const EXTEND_ENDS_MS = 750;
/** Remaining must also grow by this much — filters clock-skew / observe noise. */
const EXTEND_REMAIN_MS = 500;

/**
 * True when absolute end moved forward *and* remaining time clearly grew
 * (full re-apply / refresh), not a tiny rebroadcast wobble.
 */
function durationWasExtended(
  prevEndsAt: number,
  nextEndsAt: number,
  now: number,
): boolean {
  if (!(prevEndsAt > 0)) return false;
  if (!(nextEndsAt > prevEndsAt + EXTEND_ENDS_MS)) return false;
  const prevRemain = Math.max(0, prevEndsAt - now);
  const nextRemain = Math.max(0, nextEndsAt - now);
  return nextRemain > prevRemain + EXTEND_REMAIN_MS;
}

/**
 * Stack digits (`.iqui`) sit on the icon. While a stacked effect is kept fresh
 * (ms re-applied every hit), a full-time skidloader just covers the count and
 * seizes on every refresh. Show the bar only in the late window so expiry is
 * still visible. Non-stacked effects keep the normal always-on bar.
 */
function stackedTintWarnMs(effect: BuiltEffect, remainingMs: number): number {
  const hint = Math.max(effect.ms || 0, remainingMs, 1000);
  return Math.min(4000, Math.max(2500, Math.floor(hint * 0.4)));
}

function wantsStackedSoftTint(effect: BuiltEffect): boolean {
  return effect.stacks != null;
}

function shouldShowEffectTint(
  effect: BuiltEffect,
  remainingMs: number,
): boolean {
  if (!(remainingMs > 0)) return false;
  if (!wantsStackedSoftTint(effect)) return true;
  return remainingMs <= stackedTintWarnMs(effect, remainingMs);
}

/** Must sit this long without a duration refresh before a stacked timer may show. */
const STACKED_LABEL_SETTLE_MS = 1250;
/** Remaining must fall this far below the post-refresh peak (kills 10s↔9s flicker). */
const STACKED_LABEL_DROP_MS = 1000;

/**
 * Stacked effects re-apply full ms every hit, so a live `10s` label is noise.
 * Only show remaining once time is actually counting down (settled + dropped
 * from the last refresh peak), or when inside the expiry warn window.
 */
function shouldShowRemainingLabel(
  effect: BuiltEffect,
  remainingMs: number,
  peakRemainMs: number,
  lastExtendAt: number,
  now: number,
): boolean {
  if (!(remainingMs > 0)) return false;
  if (!wantsStackedSoftTint(effect)) return true;
  if (remainingMs <= stackedTintWarnMs(effect, remainingMs)) return true;
  if (!(lastExtendAt > 0) || now - lastExtendAt < STACKED_LABEL_SETTLE_MS) {
    return false;
  }
  const peak = Math.max(peakRemainMs, remainingMs);
  return remainingMs <= peak - STACKED_LABEL_DROP_MS;
}

/**
 * Duration tint via classic skill skidloader (1px bar + scaleY).
 * Never call add_tint type skill/progress on the icon host itself — that stretches the whole tile.
 *
 * Duration refreshes extend end and keep start (with span clamp). Stacked effects
 * gate the bar behind an expiry window — see shouldShowEffectTint.
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

function clearEffectTint(wrap: HTMLElement, rid: string): void {
  const selector = ".skidloader" + rid;
  const existing = getTint(selector);
  if (existing) {
    existing.end = new Date(0);
    existing.ms = 0;
  }
  const loader = wrap.querySelector(selector);
  if (loader && loader.parentElement) loader.parentElement.removeChild(loader);
  const img = wrap.querySelector("img") as HTMLElement | null;
  if (img) img.style.opacity = "1";
}

function applyEffectTint(
  wrap: HTMLElement,
  rid: string,
  endsAt: number,
  startedAt: number,
  mode: "restart" | "sync" | "rebind",
): void {
  const now = Date.now();
  const remaining = endsAt - now;
  const spanMs = endsAt - startedAt;
  if (!(remaining > 0) || !(startedAt > 0) || !(spanMs > 0)) return;

  const loader = ensureSkidLoader(wrap, rid);
  if (!loader) return;

  const selector = ".skidloader" + rid;
  const existing = getTint(selector);

  if (mode === "sync") {
    if (existing) {
      const prevStart = existing.start ? existing.start.getTime() : 0;
      const prevEnd = existing.end ? existing.end.getTime() : 0;
      // No-op sync — avoid touching DOM / tint_logic when epoch is unchanged.
      if (
        Math.abs(prevStart - startedAt) < 50 &&
        Math.abs(prevEnd - endsAt) < 50
      ) {
        return;
      }
      existing.start = new Date(startedAt);
      existing.end = new Date(endsAt);
      existing.ms = remaining;
      return;
    }
    mode = "rebind";
  }

  rebindTint(selector);
  loader.style.height = "1px";
  const img = loader.parentElement?.querySelector("img") as HTMLElement | null;
  if (img) img.style.opacity = "0.5";

  addTint(selector, {
    ms: remaining,
    type: "skill",
    skid: rid,
    start: new Date(startedAt),
  });

  // add_tint sets end = call-time + ms; pin epoch for overlay parity.
  const tint = getTint(selector);
  if (tint) {
    tint.start = new Date(startedAt);
    tint.end = new Date(endsAt);
  }
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
  const startedAtRef = React.useRef(0);
  const tintShownRef = React.useRef(false);
  const peakRemainRef = React.useRef(0);
  const lastExtendAtRef = React.useRef(0);
  const lastMsRef = React.useRef(0);
  const { effect, hostClass, entity, iconSize } = props;
  const entityId = String(entity.id);
  const rid = loaderId(hostClass);
  const clickable = effect.type !== "skill";

  const [remainingMs, setRemainingMs] = React.useState(0);
  const [showRemainLabel, setShowRemainLabel] = React.useState(false);

  const noteDurationPeak = (remaining: number, extended: boolean) => {
    if (extended || !(peakRemainRef.current > 0)) {
      peakRemainRef.current = Math.max(
        effect.ms || 0,
        remaining,
        peakRemainRef.current,
      );
      lastExtendAtRef.current = Date.now();
    }
  };

  const refreshRemainLabel = (remaining: number) => {
    setShowRemainLabel(
      shouldShowRemainingLabel(
        effect,
        remaining,
        peakRemainRef.current,
        lastExtendAtRef.current,
        Date.now(),
      ),
    );
  };

  const paintIcon = () => {
    const el = iconRef.current as HTMLElement | null;
    if (!el) return;

    const opts: Record<string, any> = {
      skin: effect.skin,
      size: iconSize,
      draggable: false,
    };
    // Stacks are applied via syncStackBadge so count updates do not wipe skidloader.
    const html = itemContainer(opts, null);

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
      el.textContent = effect.id;
    }
  };

  const hideTint = () => {
    const el = iconRef.current as HTMLElement | null;
    if (el) clearEffectTint(el, rid);
    tintShownRef.current = false;
    if (wantsStackedSoftTint(effect)) startedAtRef.current = 0;
  };

  const pushTint = (mode: "restart" | "sync" | "rebind") => {
    const el = iconRef.current as HTMLElement | null;
    if (!el || !el.firstElementChild) return;
    const endsAt = endsAtRef.current;
    const remaining = endsAt - Date.now();
    if (!shouldShowEffectTint(effect, remaining)) {
      hideTint();
      return;
    }
    let startedAt = startedAtRef.current;
    // Entering the stacked expiry window: anchor a clean short span once.
    if (wantsStackedSoftTint(effect) && !tintShownRef.current) {
      startedAt = Date.now();
      startedAtRef.current = startedAt;
      mode = "restart";
    }
    if (!(endsAt > Date.now()) || !(startedAt > 0)) return;
    applyEffectTint(el, rid, endsAt, startedAt, mode);
    tintShownRef.current = true;
  };

  // Paint stock item_container; stacks update separately so skidloader survives.
  // Do not depend on entityId — shared-strip ownership can switch member without
  // changing skin/id; wiping for that remounts the art for no reason.
  React.useEffect(() => {
    const el = iconRef.current as HTMLElement | null;
    if (!el) return;
    paintIcon();
    syncStackBadge(el, effect.stacks);
    tintShownRef.current = false;
    pushTint(startedAtRef.current > 0 ? "rebind" : "restart");
    return () => {
      if (el) el.innerHTML = "";
    };
  }, [effect.id, effect.skin, effect.type, hostClass, rid, iconSize]);

  // Stack digit only — do not wipe the icon DOM (that resets tint / opacity).
  React.useEffect(() => {
    const el = iconRef.current as HTMLElement | null;
    if (!el || !el.firstElementChild) return;
    syncStackBadge(el, effect.stacks);
  }, [entityId, effect.id, effect.stacks]);

  // Sticky absolute end + stacked expiry-window gating for the skidloader.
  React.useEffect(() => {
    const now = Date.now();
    const prev = endsAtRef.current;
    const rawMs = effect.ms;
    const next = syncEndsAt(prev, rawMs, now, lastMsRef.current);
    if (rawMs != null && rawMs > 0) lastMsRef.current = rawMs;
    endsAtRef.current = next;
    const remaining = Math.max(0, next - now);
    setRemainingMs(remaining);

    if (!(next > now)) {
      startedAtRef.current = 0;
      peakRemainRef.current = 0;
      lastExtendAtRef.current = 0;
      lastMsRef.current = 0;
      hideTint();
      setShowRemainLabel(false);
      return;
    }

    if (!prev) {
      noteDurationPeak(remaining, true);
      refreshRemainLabel(remaining);
      startedAtRef.current = buffStartedAt(
        effect,
        next,
        now,
        "restart",
        startedAtRef.current,
      );
      pushTint("restart");
      return;
    }

    if (durationWasExtended(prev, next, now)) {
      noteDurationPeak(remaining, true);
      refreshRemainLabel(remaining);
      if (wantsStackedSoftTint(effect)) {
        // Refresh pushed remaining back up — drop bar until expiry window again.
        hideTint();
        return;
      }
      if (!(startedAtRef.current > 0)) {
        startedAtRef.current = buffStartedAt(
          effect,
          next,
          now,
          "restart",
          0,
        );
      } else {
        const maxSpan = Math.max(
          SKILL_UI_SPAN_MS,
          effect.ms || 0,
          next - now,
        );
        if (next - startedAtRef.current > maxSpan) {
          startedAtRef.current = next - maxSpan;
        }
      }
      pushTint("sync");
      return;
    }

    refreshRemainLabel(remaining);

    if (!shouldShowEffectTint(effect, remaining)) {
      // Keep endsAt for countdown detection; hide the intrusive bar while fresh.
      hideTint();
      return;
    }

    if (next < prev - 250) {
      if (effect.type === "skill") {
        startedAtRef.current = buffStartedAt(
          effect,
          next,
          now,
          "sync",
          startedAtRef.current,
        );
      }
      pushTint("sync");
      return;
    }
    pushTint(tintShownRef.current ? "sync" : "restart");
  }, [entityId, effect.id, effect.ms, effect.stacks, rid]);

  // Local countdown for the text label / tooltip; also crosses stacked warn threshold.
  React.useEffect(() => {
    const tick = () => {
      const ends = endsAtRef.current;
      if (!ends) {
        setRemainingMs(0);
        setShowRemainLabel(false);
        hideTint();
        return;
      }
      const remaining = Math.max(0, ends - Date.now());
      setRemainingMs(remaining);
      refreshRemainLabel(remaining);
      if (!shouldShowEffectTint(effect, remaining)) {
        if (tintShownRef.current) hideTint();
        return;
      }
      if (!tintShownRef.current) pushTint("restart");
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [entityId, effect.id, effect.stacks, effect.ms, rid]);

  const msLabel =
    showRemainLabel && remainingMs > 0
      ? formatDurationCompact(remainingMs / 1000)
      : "";
  const tooltip = effectTooltip(
    effect,
    showRemainLabel ? remainingMs : undefined,
  );

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
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
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
    // Always reserve label height so show/hide does not reflow the row.
    e(
      "div",
      {
        className: "comm-fx-ms",
        style: {
          marginTop: "1px",
          zIndex: 2,
          padding: "0 3px",
          background: msLabel ? "rgba(0,0,0,0.82)" : "transparent",
          border: msLabel ? "1px solid #444" : "1px solid transparent",
          color: remainingMs <= 5000 ? "#ffcc66" : "#e8e8e8",
          fontSize: TYPE.microMin,
          lineHeight: "14px",
          minHeight: "14px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          visibility: msLabel ? "visible" : "hidden",
          ...PIXEL_TEXT,
        },
      },
      msLabel || "\u00a0",
    ),
  );
}

export function EffectsRow(props: EffectsRowProps): any {
  const React = getReact();
  const lastEffectsRef = React.useRef([] as BuiltEffect[]);
  const emptySinceRef = React.useRef(0);

  let effects = buildEntityEffects(props.entity);
  // Stable order — Object.keys(entity.s) can reshuffle across soft-sync packets
  // and would otherwise reorder/remount icons.
  effects = effects.slice().sort((a, b) => {
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });

  if (effects.length) {
    lastEffectsRef.current = effects;
    emptySinceRef.current = 0;
  } else if (lastEffectsRef.current.length) {
    // Brief empty `s` during entity replace — keep last row instead of unmount flash.
    if (!emptySinceRef.current) emptySinceRef.current = Date.now();
    if (Date.now() - emptySinceRef.current < 500) {
      effects = lastEffectsRef.current;
    } else {
      lastEffectsRef.current = [];
    }
  }

  if (!effects.length) return null;

  const entityId = String(props.entity.id);
  const iconSize =
    typeof props.iconSize === "number" && props.iconSize > 0
      ? props.iconSize
      : ICON_SIZE;
  const compact = !!props.compact;
  const gap = compact ? "3px" : "6px";
  const marginTop = compact ? "3px" : "6px";
  const padBottom = compact ? "2px" : "4px";
  const minHeight = iconSize + (compact ? 8 : 14) + 16;
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
      // Do NOT key by effects list — that remounts every icon when one buff
      // is added/removed. EffectIcon keys already identity each buff.
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
            key: `${entityId}-overflow`,
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
