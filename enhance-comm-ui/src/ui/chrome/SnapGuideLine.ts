/**
 * Details-style snap guide: dotted ball line from dragging window → peer.
 * Green when within snap range; red when near but not yet attachable.
 */

import { getReact, e } from "../../host/react";
import { cssEscapePanelId } from "../../lib/panelEdgeGroup";
import { layoutDragRoot } from "../../lib/percentDrag";

export type SnapGuideLineProps = {
  dragId: string | null;
  /** Peer id when already in snap range (forces green). */
  snapPeerId: string | null;
  /** Nearest peer for red line when not yet in range. */
  nearPeerId: string | null;
  /** Delay before showing (Details ~0.95s). */
  visible: boolean;
};

const BALL_STEP_PX = 22;
const BALL_SIZE = 10;

function readCenter(id: string): { x: number; y: number } | null {
  const el = document.querySelector(
    `.comm-pos-panel.comm-pos-${cssEscapePanelId(id)}`,
  ) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 };
}

export function SnapGuideLine(props: SnapGuideLineProps): any {
  const React = getReact();
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    if (!props.dragId || !props.visible) return;
    let raf = 0;
    const loop = () => {
      setTick((n: number) => n + 1);
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [props.dragId, props.visible]);

  if (!props.dragId || !props.visible) return null;
  const targetId = props.snapPeerId || props.nearPeerId;
  if (!targetId) return null;

  const from = readCenter(props.dragId);
  const to = readCenter(targetId);
  if (!from || !to) return null;

  const root = layoutDragRoot().getBoundingClientRect();
  const x0 = from.x - root.left;
  const y0 = from.y - root.top;
  const x1 = to.x - root.left;
  const y1 = to.y - root.top;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (!(dist > 8)) return null;

  const canSnap = !!props.snapPeerId;
  const color = canSnap
    ? "rgba(80, 220, 120, 0.85)"
    : "rgba(220, 70, 70, 0.75)";
  const count = Math.max(1, Math.floor(dist / BALL_STEP_PX));
  const balls: any[] = [];
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    balls.push(
      e("div", {
        key: "b" + i + "-" + (tick % 2),
        className: "comm-snap-guide-ball",
        style: {
          position: "absolute",
          left: x0 + dx * t - BALL_SIZE / 2,
          top: y0 + dy * t - BALL_SIZE / 2,
          width: BALL_SIZE,
          height: BALL_SIZE,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 0 1px rgba(0,0,0,0.45)`,
          pointerEvents: "none",
        },
      }),
    );
  }

  return e(
    "div",
    {
      className: "comm-snap-guide",
      "aria-hidden": true,
      style: {
        position: "absolute",
        inset: 0,
        zIndex: 50,
        pointerEvents: "none",
        overflow: "hidden",
      },
    },
    ...balls,
  );
}
