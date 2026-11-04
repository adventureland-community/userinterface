/**
 * On-screen camera joystick for phone — pans free camera (WASD equivalent).
 */

import { e, getReact } from "../../host/react";
import {
  followObservedCamera,
  isFreeCamera,
  setJoystickPan,
  subscribeFreeCamera,
} from "../../host/cameraPan";
import {
  JOYSTICK_RADIUS_PX,
  joystickToPan,
} from "../../lib/cameraPan";

const STYLE_ID = "ecu-camera-joystick-css";

function ensureCss(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.ecu-cam-stick {
  position: fixed;
  left: max(12px, env(safe-area-inset-left, 0px));
  bottom: calc(var(--ecu-phone-hud-bottom, 160px) + 12px);
  z-index: 230;
  width: ${JOYSTICK_RADIUS_PX * 2 + 24}px;
  height: ${JOYSTICK_RADIUS_PX * 2 + 24}px;
  pointer-events: auto;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.ecu-cam-stick__base {
  position: absolute;
  inset: 12px;
  border-radius: 50%;
  background: rgba(28, 27, 31, 0.45);
  border: 1px solid rgba(230, 225, 229, 0.28);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.25);
}
.ecu-cam-stick__knob {
  position: absolute;
  width: 44px;
  height: 44px;
  margin-left: -22px;
  margin-top: -22px;
  left: 50%;
  top: 50%;
  border-radius: 50%;
  background: rgba(157, 212, 236, 0.55);
  border: 1px solid rgba(157, 212, 236, 0.85);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}
.ecu-cam-stick__follow {
  position: absolute;
  left: 50%;
  bottom: 100%;
  transform: translateX(-50%);
  margin-bottom: 6px;
  min-height: 28px;
  padding: 4px 10px;
  border-radius: 14px;
  border: 1px solid rgba(157, 212, 236, 0.45);
  background: rgba(28, 27, 31, 0.82);
  color: #9dd4ec;
  font: 12px/1.2 Roboto, "Segoe UI", system-ui, sans-serif;
  cursor: pointer;
  white-space: nowrap;
  pointer-events: auto;
}
.ecu-cam-stick__follow[hidden] {
  display: none !important;
}
`;
  document.head.appendChild(style);
}

export function CameraJoystick(): any {
  const React = getReact();
  ensureCss();
  const rootRef = React.useRef(null as HTMLDivElement | null);
  const knobRef = React.useRef(null as HTMLDivElement | null);
  const [free, setFree] = React.useState(() => isFreeCamera());
  const activePtr = React.useRef(null as number | null);

  React.useEffect(() => subscribeFreeCamera(setFree), []);

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
      knob.style.transform = "translate(0px,0px)";
      setJoystickPan({ x: 0, y: 0 });
    };

    const onDown = (ev: PointerEvent) => {
      if (activePtr.current != null) return;
      activePtr.current = ev.pointerId;
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

  return e(
    "div",
    {
      className: "ecu-cam-stick",
      ref: rootRef,
      "aria-label": "Camera pan joystick",
    },
    e("button", {
      type: "button",
      className: "ecu-cam-stick__follow",
      hidden: !free,
      title: "Re-center on observed character",
      onClick: (ev: { stopPropagation?: () => void; preventDefault?: () => void }) => {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        if (ev && ev.preventDefault) ev.preventDefault();
        followObservedCamera();
      },
    }, "Follow"),
    e("div", { className: "ecu-cam-stick__base" }),
    e("div", { className: "ecu-cam-stick__knob", ref: knobRef }),
  );
}
