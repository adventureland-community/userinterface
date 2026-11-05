/**
 * On-screen camera joystick for phone — pans free camera (WASD equivalent)
 * plus FOV out/in, one-shot Center, and Follow toggle (Map info may be off Home).
 */

import { e, getReact } from "../../host/react";
import {
  centerOnObservedCamera,
  isFollowCamera,
  setFollowCamera,
  setJoystickPan,
  subscribeFollowCamera,
  subscribeFreeCamera,
} from "../../host/cameraPan";
import {
  readAppliedWorldFov,
  setWorldFov,
  subscribeWorldFov,
  WORLD_FOV_DEFAULT,
  WORLD_FOV_MAX,
  WORLD_FOV_MIN,
  zoomFovIn,
  zoomFovOut,
} from "../../host/worldFov";
import {
  JOYSTICK_RADIUS_PX,
  joystickToPan,
} from "../../lib/cameraPan";
import {
  getSettings,
  normalizeCameraJoystickSide,
  patchSettings,
} from "../../lib/settings";
import { formatWorldFov } from "../../lib/worldFov";
import { wrapIconHtml } from "./wrapIconHtml";

const STYLE_ID = "ecu-camera-joystick-css";

type JoystickSide = "left" | "right";

function readJoystickSide(): JoystickSide {
  return normalizeCameraJoystickSide(getSettings().cameraJoystickSide);
}

/** Crosshair — one-shot recenter without engaging Follow. */
const ICON_CENTER =
  '<svg class="ecu-cam-chrome__ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>';

/** Person + track arc — keep the observed character framed. */
const ICON_FOLLOW =
  '<svg class="ecu-cam-chrome__ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 19c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19.5 5.5a8 8 0 0 0-11.5-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7.2 5.2L8 3.5M7.2 5.2L5.4 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

function ensureCss(): void {
  if (typeof document === "undefined") return;
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `
.ecu-cam-chrome {
  position: fixed;
  bottom: calc(var(--ecu-phone-hud-bottom, 160px) + 8px);
  z-index: 236;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  pointer-events: none;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.ecu-cam-chrome.is-left {
  left: max(8px, env(safe-area-inset-left, 0px));
  right: auto;
}
.ecu-cam-chrome.is-right {
  right: max(8px, env(safe-area-inset-right, 0px));
  left: auto;
}
.ecu-cam-chrome > * {
  pointer-events: auto;
}
.ecu-cam-stick {
  position: relative;
  left: 0;
  bottom: 0;
  z-index: 1;
  width: ${JOYSTICK_RADIUS_PX * 2 + 16}px;
  height: ${JOYSTICK_RADIUS_PX * 2 + 16}px;
  touch-action: none;
}
.ecu-cam-stick__base {
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: rgba(28, 27, 31, 0.38);
  border: 1px solid rgba(230, 225, 229, 0.32);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
  opacity: 0.82;
  transition: opacity 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}
.ecu-cam-stick__knob {
  position: absolute;
  width: 32px;
  height: 32px;
  margin-left: -16px;
  margin-top: -16px;
  left: 50%;
  top: 50%;
  border-radius: 50%;
  background: rgba(157, 212, 236, 0.42);
  border: 1px solid rgba(157, 212, 236, 0.58);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.22);
  pointer-events: none;
  opacity: 0.9;
  transition: opacity 0.18s ease, background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}
.ecu-cam-stick.is-active .ecu-cam-stick__base {
  opacity: 1;
  background: rgba(28, 27, 31, 0.42);
  border-color: rgba(230, 225, 229, 0.28);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.2);
}
.ecu-cam-stick.is-active .ecu-cam-stick__knob {
  opacity: 1;
  background: rgba(157, 212, 236, 0.55);
  border-color: rgba(157, 212, 236, 0.85);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
}
.ecu-cam-chrome__fov {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0;
  width: ${JOYSTICK_RADIUS_PX * 2 + 8}px;
  min-height: 24px;
  padding: 0;
  border-radius: 12px;
  border: 1px solid rgba(230, 225, 229, 0.14);
  background: rgba(28, 27, 31, 0.42);
  box-shadow: none;
  opacity: 0.78;
}
.ecu-cam-chrome__fov-btn {
  min-width: 28px;
  min-height: 24px;
  margin: 0;
  padding: 0 5px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: rgba(230, 225, 229, 0.85);
  font: 500 10px/1 Roboto, "Segoe UI", system-ui, sans-serif;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ecu-cam-chrome__fov-btn:disabled {
  opacity: 0.3;
  cursor: default;
}
.ecu-cam-chrome__fov-btn:not(:disabled):active {
  background: rgba(157, 212, 236, 0.14);
  color: #9dd4ec;
}
.ecu-cam-chrome__fov-label {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 24px;
  margin: 0;
  padding: 0 2px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: rgba(157, 212, 236, 0.9);
  font: 500 10px/1 Roboto, "Segoe UI", system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ecu-cam-chrome__fov-label:disabled {
  opacity: 0.5;
  cursor: default;
}
.ecu-cam-chrome__track {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: ${JOYSTICK_RADIUS_PX * 2 + 8}px;
}
.ecu-cam-chrome__icon-btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  min-height: 30px;
  margin: 0;
  padding: 0;
  border-radius: 9px;
  border: 1px solid rgba(230, 225, 229, 0.2);
  background: rgba(28, 27, 31, 0.72);
  color: rgba(230, 225, 229, 0.92);
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  -webkit-tap-highlight-color: transparent;
}
.ecu-cam-chrome__icon-btn:active {
  background: rgba(157, 212, 236, 0.16);
  color: #9dd4ec;
}
.ecu-cam-chrome__icon-btn.is-on {
  border-color: rgba(157, 212, 236, 0.7);
  background: rgba(28, 27, 31, 0.88);
  color: #9dd4ec;
  box-shadow: 0 0 0 1px rgba(157, 212, 236, 0.28);
}
.ecu-cam-chrome__ico {
  display: block;
  width: 15px;
  height: 15px;
  pointer-events: none;
}
.ecu-cam-chrome__side {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  min-height: 30px;
  margin: 0;
  padding: 0;
  border-radius: 9px;
  border: 1px solid rgba(230, 225, 229, 0.18);
  background: rgba(28, 27, 31, 0.55);
  color: rgba(230, 225, 229, 0.78);
  font: 600 12px/1 Roboto, "Segoe UI", system-ui, sans-serif;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ecu-cam-chrome__side:active {
  color: #9dd4ec;
  border-color: rgba(157, 212, 236, 0.45);
}
`;
}

export function CameraJoystick(): any {
  const React = getReact();
  ensureCss();
  const rootRef = React.useRef(null as HTMLDivElement | null);
  const knobRef = React.useRef(null as HTMLDivElement | null);
  const [following, setFollowing] = React.useState(() => isFollowCamera());
  const [side, setSide] = React.useState(() => readJoystickSide());
  const [fov, setFov] = React.useState(() => readAppliedWorldFov());
  const activePtr = React.useRef(null as number | null);

  React.useEffect(() => {
    const sync = () => setFollowing(isFollowCamera());
    const offFree = subscribeFreeCamera(sync);
    const offFollow = subscribeFollowCamera(sync);
    return () => {
      offFree();
      offFollow();
    };
  }, []);
  React.useEffect(() => {
    const syncSide = () => setSide(readJoystickSide());
    window.addEventListener("ecu:settings", syncSide);
    return () => window.removeEventListener("ecu:settings", syncSide);
  }, []);
  React.useEffect(() => {
    setFov(readAppliedWorldFov());
    return subscribeWorldFov(setFov);
  }, []);

  React.useEffect(() => {
    const root = rootRef.current;
    const knob = knobRef.current;
    if (!root || !knob) return;

    const setKnob = (dx: number, dy: number) => {
      const lim = JOYSTICK_RADIUS_PX;
      const mag = Math.sqrt(dx * dx + dy * dy);
      let x = dx;
      let y = dy;
      if (mag > lim && mag > 0) {
        x = (dx / mag) * lim;
        y = (dy / mag) * lim;
      }
      knob.style.transform = "translate(" + x + "px," + y + "px)";
      setJoystickPan(joystickToPan(x, y));
    };

    const reset = () => {
      activePtr.current = null;
      root.classList.remove("is-active");
      knob.style.transform = "translate(0px,0px)";
      setJoystickPan({ x: 0, y: 0 });
    };

    const onDown = (ev: PointerEvent) => {
      if (activePtr.current != null) return;
      activePtr.current = ev.pointerId;
      root.classList.add("is-active");
      try {
        root.setPointerCapture(ev.pointerId);
      } catch {
        /* ignore */
      }
      const rect = root.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      setKnob(ev.clientX - cx, ev.clientY - cy);
      ev.preventDefault();
      ev.stopPropagation();
    };

    const onMove = (ev: PointerEvent) => {
      if (activePtr.current !== ev.pointerId) return;
      const rect = root.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      setKnob(ev.clientX - cx, ev.clientY - cy);
      ev.preventDefault();
    };

    const onUp = (ev: PointerEvent) => {
      if (activePtr.current !== ev.pointerId) return;
      reset();
    };

    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);
    return () => {
      reset();
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const stopBtn = (ev: {
    stopPropagation?: () => void;
    preventDefault?: () => void;
  }) => {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    if (ev && ev.preventDefault) ev.preventDefault();
  };

  const flipSide = () => {
    const next: JoystickSide = side === "right" ? "left" : "right";
    setSide(next);
    patchSettings({ cameraJoystickSide: next });
  };

  return e(
    "div",
    {
      className: "ecu-cam-chrome is-" + side,
      "aria-label": "Camera controls",
    },
    e(
      "div",
      {
        className: "ecu-cam-chrome__track",
        role: "group",
        "aria-label": "Camera track",
      },
      e(
        "button",
        {
          type: "button",
          className: "ecu-cam-chrome__icon-btn",
          title: "Center on observed character",
          "aria-label": "Center",
          onClick: (ev: {
            stopPropagation?: () => void;
            preventDefault?: () => void;
          }) => {
            stopBtn(ev);
            centerOnObservedCamera();
          },
        },
        wrapIconHtml(ICON_CENTER),
      ),
      e(
        "button",
        {
          type: "button",
          className:
            "ecu-cam-chrome__icon-btn" + (following ? " is-on" : ""),
          title: following
            ? "Following observed — tap to free camera"
            : "Follow observed character",
          "aria-label": "Follow",
          "aria-pressed": following ? "true" : "false",
          onClick: (ev: {
            stopPropagation?: () => void;
            preventDefault?: () => void;
          }) => {
            stopBtn(ev);
            setFollowCamera(!isFollowCamera());
          },
        },
        wrapIconHtml(ICON_FOLLOW),
      ),
      e(
        "button",
        {
          type: "button",
          className: "ecu-cam-chrome__side",
          title:
            side === "right"
              ? "Joystick on right — tap to move left"
              : "Joystick on left — tap to move right",
          "aria-label":
            side === "right" ? "Move joystick left" : "Move joystick right",
          onClick: (ev: {
            stopPropagation?: () => void;
            preventDefault?: () => void;
          }) => {
            stopBtn(ev);
            flipSide();
          },
        },
        side === "right" ? "←" : "→",
      ),
    ),
    e(
      "div",
      {
        className: "ecu-cam-stick",
        ref: rootRef,
        "aria-label": "Camera pan joystick",
      },
      e("div", { className: "ecu-cam-stick__base" }),
      e("div", { className: "ecu-cam-stick__knob", ref: knobRef }),
    ),
    e(
      "div",
      {
        className: "ecu-cam-chrome__fov",
        title:
          "Camera FOV — out sees more, in sees less. Pinch the map also works.",
      },
      e(
        "button",
        {
          type: "button",
          className: "ecu-cam-chrome__fov-btn",
          disabled: fov >= WORLD_FOV_MAX,
          title: "Widen FOV (see more)",
          "aria-label": "Widen FOV",
          onClick: (ev: {
            stopPropagation?: () => void;
            preventDefault?: () => void;
          }) => {
            stopBtn(ev);
            setFov(zoomFovOut());
          },
        },
        "out",
      ),
      e(
        "button",
        {
          type: "button",
          className: "ecu-cam-chrome__fov-label",
          disabled: fov === WORLD_FOV_DEFAULT,
          title: "Reset FOV to 1×",
          "aria-label": "FOV " + formatWorldFov(fov) + "×",
          onClick: (ev: {
            stopPropagation?: () => void;
            preventDefault?: () => void;
          }) => {
            stopBtn(ev);
            setFov(setWorldFov(WORLD_FOV_DEFAULT));
          },
        },
        formatWorldFov(fov) + "×",
      ),
      e(
        "button",
        {
          type: "button",
          className: "ecu-cam-chrome__fov-btn",
          disabled: fov <= WORLD_FOV_MIN,
          title: "Tighten FOV (see less)",
          "aria-label": "Tighten FOV",
          onClick: (ev: {
            stopPropagation?: () => void;
            preventDefault?: () => void;
          }) => {
            stopBtn(ev);
            setFov(zoomFovIn());
          },
        },
        "in",
      ),
    ),
  );
}
