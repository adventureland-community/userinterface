import { info, INFO_SOURCE_ATTR } from "../../host/dialogHost";
import { addTint, getTint, rebindTint } from "../../host/icons";
import { paintItemContainerIcon } from "../../lib/gameIcon";
import { getReact, e } from "../../host/react";
import type { EntityLike } from "../../host/globals";
import {
  formatDurationCompact,
  formatTime,
  syncEndsAt,
} from "../../lib/format";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import type { BuiltEffect } from "./effectsModel";

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

function loaderId(hostClass: string): string {
  return hostClass.replace(/[^a-zA-Z0-9_\-]/g, "_");
}

/** Update stock `.iqui` stack digit without rebuilding the icon (preserves skidloader). */
function syncStackBadge(
  wrap: HTMLElement,
  stacks: number | undefined,
  iconSize: number,
): void {
  const root = wrap.firstElementChild as HTMLElement | null;
  if (!root) return;
  let badge = root.querySelector(".iqui") as HTMLElement | null;
  if (stacks != null && stacks > 0) {
    if (!badge) {
      badge = document.createElement("div");
      badge.className = "iqui";
      // Stock places `.iqui` on the absolute chrome host (sibling of the
      // overflow crop). Putting it inside the crop clips 3-digit stacks on
      // compact HUD icons (boss bar 22px vs target-frame 36px).
      const crop = root.querySelector(
        "div[style*='overflow']",
      ) as HTMLElement | null;
      const host =
        (crop && crop.parentElement) ||
        (root.querySelector(
          "div[style*='position: absolute']",
        ) as HTMLElement | null) ||
        root;
      host.appendChild(badge);
    }
    badge.textContent = String(stacks);
    // Stock .iqui is tuned for ~40px inventory slots — compact via CSS class.
    const compact = iconSize < 34;
    badge.classList.toggle("is-compact", compact);
    if (compact) {
      badge.style.setProperty(
        "--comm-fx-iqui-scale",
        String(Math.max(0.5, iconSize / 40)),
      );
    } else {
      badge.style.removeProperty("--comm-fx-iqui-scale");
    }
  } else if (badge) {
    badge.remove();
  }
}

function effectTooltip(effect: BuiltEffect, remainingMs?: number): string {
  const parts: string[] = [];
  const label = effect.name || effect.id;
  const kind =
    effect.type === "skill" ? "Skill" : effect.debuff ? "Debuff" : "Buff";
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

/** One 250ms clock for every buff icon (all rows), not one interval per icon. */
const EFFECT_CLOCK_MS = 250;
type EffectClockListener = () => void;
const effectClockListeners: EffectClockListener[] = [];
let effectClockId = 0;
let effectClockVisBound = false;

function notifyEffectClock(): void {
  if (typeof document !== "undefined" && document.hidden) return;
  for (let i = 0; i < effectClockListeners.length; i++) {
    effectClockListeners[i]();
  }
}

function onEffectClockVisibility(): void {
  if (typeof document !== "undefined" && document.hidden) return;
  notifyEffectClock();
}

function subscribeEffectClock(listener: EffectClockListener): () => void {
  effectClockListeners.push(listener);
  if (!effectClockId) {
    effectClockId = window.setInterval(notifyEffectClock, EFFECT_CLOCK_MS);
    if (!effectClockVisBound && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onEffectClockVisibility);
      effectClockVisBound = true;
    }
  }
  return () => {
    const idx = effectClockListeners.indexOf(listener);
    if (idx >= 0) effectClockListeners.splice(idx, 1);
    if (effectClockListeners.length === 0 && effectClockId) {
      window.clearInterval(effectClockId);
      effectClockId = 0;
    }
  };
}

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
    (wrap.querySelector(
      "div[style*='position: absolute']",
    ) as HTMLElement | null) ||
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

export function EffectIcon(props: {
  effect: BuiltEffect;
  hostClass: string;
  entity: EntityLike;
  iconSize: number;
}): any {
  const React = getReact();
  const iconRef = React.useRef(null);
  const wrapRef = React.useRef(null as HTMLElement | null);
  const labelRef = React.useRef(null as HTMLElement | null);
  const endsAtRef = React.useRef(0);
  const startedAtRef = React.useRef(0);
  const tintShownRef = React.useRef(false);
  const peakRemainRef = React.useRef(0);
  const lastExtendAtRef = React.useRef(0);
  const lastMsRef = React.useRef(0);
  const paintedRef = React.useRef({
    text: "",
    color: "",
    show: false,
    title: "",
  });
  const { effect, hostClass, entity, iconSize } = props;
  const effectRef = React.useRef(effect);
  effectRef.current = effect;
  const entityId = String(entity.id);
  const rid = loaderId(hostClass);
  const clickable = effect.type !== "skill";

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

  const paintRemainUi = () => {
    const ef = effectRef.current;
    const ends = endsAtRef.current;
    const now = Date.now();
    const remaining = ends > 0 ? Math.max(0, ends - now) : 0;
    const show = shouldShowRemainingLabel(
      ef,
      remaining,
      peakRemainRef.current,
      lastExtendAtRef.current,
      now,
    );
    const text =
      show && remaining > 0 ? formatDurationCompact(remaining / 1000) : "";
    const color = remaining <= 5000 ? "#ffcc66" : "#e8e8e8";
    const title = effectTooltip(ef, show ? remaining : undefined);
    const painted = paintedRef.current;
    const label = labelRef.current;
    if (label) {
      if (painted.text !== text) {
        painted.text = text;
        label.textContent = text || "\u00a0";
      }
      if (painted.show !== !!text) {
        painted.show = !!text;
        label.style.visibility = text ? "visible" : "hidden";
        label.style.background = text ? "rgba(0,0,0,0.82)" : "transparent";
        label.style.border = text ? "1px solid #444" : "1px solid transparent";
      }
      if (painted.color !== color) {
        painted.color = color;
        label.style.color = color;
      }
    }
    const wrap = wrapRef.current;
    if (wrap && painted.title !== title) {
      painted.title = title;
      wrap.setAttribute("title", title);
    }
  };

  const paintIcon = () => {
    const el = iconRef.current as HTMLElement | null;
    if (!el) return;
    paintItemContainerIcon(el, effect.skin, iconSize);
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
    syncStackBadge(el, effect.stacks, iconSize);
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
    syncStackBadge(el, effect.stacks, iconSize);
  }, [entityId, effect.id, effect.stacks, iconSize]);

  // Sticky absolute end + stacked expiry-window gating for the skidloader.
  React.useEffect(() => {
    const now = Date.now();
    const prev = endsAtRef.current;
    const rawMs = effect.ms;
    const next = syncEndsAt(prev, rawMs, now, lastMsRef.current);
    if (rawMs != null && rawMs > 0) lastMsRef.current = rawMs;
    endsAtRef.current = next;
    const remaining = Math.max(0, next - now);
    paintRemainUi();

    if (!(next > now)) {
      startedAtRef.current = 0;
      peakRemainRef.current = 0;
      lastExtendAtRef.current = 0;
      lastMsRef.current = 0;
      hideTint();
      paintRemainUi();
      return;
    }

    if (!prev) {
      noteDurationPeak(remaining, true);
      paintRemainUi();
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
      paintRemainUi();
      if (wantsStackedSoftTint(effect)) {
        // Refresh pushed remaining back up — drop bar until expiry window again.
        hideTint();
        return;
      }
      if (!(startedAtRef.current > 0)) {
        startedAtRef.current = buffStartedAt(effect, next, now, "restart", 0);
      } else {
        const maxSpan = Math.max(SKILL_UI_SPAN_MS, effect.ms || 0, next - now);
        if (next - startedAtRef.current > maxSpan) {
          startedAtRef.current = next - maxSpan;
        }
      }
      pushTint("sync");
      return;
    }

    paintRemainUi();

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

  // Shared 250ms clock — remaining label / tint threshold, no per-icon timer.
  const onClockRef = React.useRef(() => {});
  onClockRef.current = () => {
    const ef = effectRef.current;
    const ends = endsAtRef.current;
    if (!ends) {
      paintRemainUi();
      hideTint();
      return;
    }
    const remaining = Math.max(0, ends - Date.now());
    paintRemainUi();
    if (!shouldShowEffectTint(ef, remaining)) {
      if (tintShownRef.current) hideTint();
      return;
    }
    if (!tintShownRef.current) pushTint("restart");
  };
  React.useEffect(() => {
    const tick = () => onClockRef.current();
    tick();
    return subscribeEffectClock(tick);
  }, [entityId, effect.id]);

  const remainNow = Math.max(0, (endsAtRef.current || 0) - Date.now());
  const showRemainLabel = shouldShowRemainingLabel(
    effect,
    remainNow,
    peakRemainRef.current,
    lastExtendAtRef.current,
    Date.now(),
  );
  const remainingMs = remainNow;
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
        if (ev && typeof ev.stopPropagation === "function")
          ev.stopPropagation();
        if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
        info.openCondition(entity, effect.id);
      }
    : undefined;

  return e(
    "div",
    {
      ref: wrapRef,
      className: `comm-fx-icon ${hostClass}`,
      "data-condition": effect.id,
      "data-entity": entityId,
      [INFO_SOURCE_ATTR]: clickable ? "" : undefined,
      title: tooltip,
      onClick,
      onMouseDown: clickable
        ? (ev: any) => {
            if (ev && typeof ev.stopPropagation === "function")
              ev.stopPropagation();
          }
        : undefined,
      onPointerDown: clickable
        ? (ev: any) => {
            if (ev && typeof ev.stopPropagation === "function")
              ev.stopPropagation();
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
        ref: labelRef,
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
