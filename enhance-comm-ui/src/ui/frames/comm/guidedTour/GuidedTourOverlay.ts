/**
 * Spotlight guided tour overlay — dims UI except highlighted target.
 */

import { getReact, e } from "../../../../host/react";
import { PIXEL_TEXT } from "../../../../lib/typeScale";
import { injectGuidedTourCss } from "./guidedTourCss";
import {
  cardPosition,
  measureTarget,
  shadePanels,
  tourConnector,
  type SpotlightRect,
} from "./tourGeometry";
import type { GuidedTourDef } from "./tourCatalog";
import { markTourCompleted } from "./tourCatalog";
import { tourAdvanceReady, type TourAdvanceContext } from "./tourAdvance";
import { TourPortal } from "./tourPortal";

const CARD_W = 460;
const CARD_H_FALLBACK = 280;

export type GuidedTourOverlayProps = {
  tour: GuidedTourDef;
  stepIndex: number;
  onStep: (index: number) => void;
  onDone: () => void;
  advanceContext: TourAdvanceContext;
};

function tourBtn(
  label: string,
  onClick: () => void,
  opts?: { primary?: boolean; hidden?: boolean; disabled?: boolean },
): any {
  const classes = ["ecu-tour-btn"];
  if (opts?.primary) classes.push("primary");
  if (opts?.hidden) classes.push("is-slot-hidden");
  return e(
    "button",
    {
      type: "button",
      className: classes.join(" "),
      disabled: !!opts?.disabled,
      onClick,
    },
    label,
  );
}

function TourOverlayBody(props: GuidedTourOverlayProps): any {
  const React = getReact();
  const cardRef = React.useRef(null as HTMLDivElement | null);
  const [spot, setSpot] = React.useState(null as SpotlightRect | null);
  const [cardPos, setCardPos] = React.useState({ top: 24, left: 24 });
  const [cardH, setCardH] = React.useState(CARD_H_FALLBACK);
  const [viewport, setViewport] = React.useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1920,
    h: typeof window !== "undefined" ? window.innerHeight : 1080,
  }));
  const advancedRef = React.useRef(false);
  const step = props.tour.steps[props.stepIndex];
  injectGuidedTourCss();

  React.useEffect(() => {
    advancedRef.current = false;
  }, [props.stepIndex, step?.advanceWhen]);

  React.useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const h = el.getBoundingClientRect().height;
    if (h > 40) setCardH(h);
  }, [step?.title, step?.body, step?.missingHint, props.stepIndex, spot]);

  React.useEffect(() => {
    if (!step) return;
    const kind = step.targetKind || "region";
    const placement = step.cardPlacement || "auto";

    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setViewport({ w: vw, h: vh });
      const rect = measureTarget(step.target, kind);
      setSpot(rect);
      const h = cardRef.current
        ? Math.max(
            CARD_H_FALLBACK,
            cardRef.current.getBoundingClientRect().height,
          )
        : cardH;
      setCardPos(cardPosition(rect, CARD_W, h, placement));
      return rect;
    };

    measure();
    window.addEventListener("resize", measure);

    let ro: ResizeObserver | null = null;
    const firstSel = step.target.split(",")[0].trim();
    const targetEl = document.querySelector(firstSel) as HTMLElement | null;
    if (typeof ResizeObserver !== "undefined" && targetEl) {
      ro = new ResizeObserver(() => measure());
      ro.observe(targetEl);
    }

    // Poll only while the target is missing (panel not mounted yet).
    let missTimer: number | null = null;
    if (!targetEl) {
      missTimer = window.setInterval(() => {
        const rect = measure();
        if (rect && missTimer != null) {
          window.clearInterval(missTimer);
          missTimer = null;
          const el = document.querySelector(firstSel) as HTMLElement | null;
          if (typeof ResizeObserver !== "undefined" && el && !ro) {
            ro = new ResizeObserver(() => measure());
            ro.observe(el);
          }
        }
      }, 250);
    }

    return () => {
      window.removeEventListener("resize", measure);
      if (ro) ro.disconnect();
      if (missTimer != null) window.clearInterval(missTimer);
    };
  }, [
    step?.target,
    step?.targetKind,
    step?.cardPlacement,
    props.stepIndex,
    cardH,
  ]);

  React.useEffect(() => {
    if (!step?.advanceWhen || advancedRef.current) return;
    let advanceTimer: number | null = null;
    const tick = () => {
      if (advancedRef.current) return;
      if (!tourAdvanceReady(step.advanceWhen, props.advanceContext)) return;
      advancedRef.current = true;
      advanceTimer = window.setTimeout(() => {
        if (props.stepIndex >= props.tour.steps.length - 1) {
          markTourCompleted(props.tour.id);
          props.onDone();
          return;
        }
        props.onStep(props.stepIndex + 1);
      }, 450);
    };
    tick();
    // playerFrame (and late panel mounts) need a light poll until ready.
    const id = window.setInterval(tick, 250);
    return () => {
      window.clearInterval(id);
      if (advanceTimer != null) window.clearTimeout(advanceTimer);
    };
  }, [
    step?.advanceWhen,
    props.stepIndex,
    props.advanceContext.isObserving,
    props.advanceContext.bagOpen,
    props.advanceContext.commandOpen,
  ]);

  React.useEffect(() => {
    if (!step) props.onDone();
  }, [step]);

  if (!step) return null;

  const isLast = props.stepIndex >= props.tour.steps.length - 1;

  const next = () => {
    if (isLast) {
      markTourCompleted(props.tour.id);
      props.onDone();
      return;
    }
    props.onStep(props.stepIndex + 1);
  };

  const back = () => {
    if (props.stepIndex > 0) props.onStep(props.stepIndex - 1);
  };

  const skip = () => {
    markTourCompleted(props.tour.id);
    props.onDone();
  };

  const shades = shadePanels(spot, viewport.w, viewport.h);
  const connector =
    spot != null ? tourConnector(cardPos, CARD_W, cardH, spot) : null;
  const showHint = !!step.missingHint && (!spot || !!step.advanceWhen);

  return e(
    "div",
    { className: "ecu-tour-root" },
    ...shades.map((sh, i) =>
      e("div", {
        key: "shade-" + i,
        className: "ecu-tour-shade",
        style: {
          top: sh.top + "px",
          left: sh.left + "px",
          width: sh.width + "px",
          height: sh.height + "px",
        },
      }),
    ),
    spot
      ? e("div", {
          className: "ecu-tour-spot",
          style: {
            top: spot.top + "px",
            left: spot.left + "px",
            width: spot.width + "px",
            height: spot.height + "px",
          },
        })
      : null,
    connector
      ? e(
          "svg",
          { className: "ecu-tour-connector", "aria-hidden": true },
          e(
            "defs",
            null,
            e(
              "marker",
              {
                id: "ecu-tour-arrowhead",
                markerWidth: 8,
                markerHeight: 8,
                refX: 6,
                refY: 4,
                orient: "auto",
              },
              e("path", {
                d: "M0,0 L8,4 L0,8 Z",
                fill: "rgba(255, 210, 138, 0.92)",
              }),
            ),
          ),
          e("line", {
            x1: connector.x1,
            y1: connector.y1,
            x2: connector.x2,
            y2: connector.y2,
            markerEnd: "url(#ecu-tour-arrowhead)",
          }),
        )
      : null,
    e(
      "div",
      {
        ref: cardRef,
        className: "ecu-tour-card",
        style: {
          ...PIXEL_TEXT,
          top: cardPos.top + "px",
          left: cardPos.left + "px",
        },
      },
      e("h3", null, step.title),
      e("p", null, step.body),
      showHint
        ? e("p", { className: "ecu-tour-hint" }, step.missingHint)
        : null,
      e(
        "div",
        { className: "ecu-tour-actions" },
        e(
          "div",
          { className: "ecu-tour-actions-left" },
          tourBtn("Back", back, {
            hidden: props.stepIndex === 0,
            disabled: props.stepIndex === 0,
          }),
        ),
        e(
          "div",
          { className: "ecu-tour-actions-right" },
          tourBtn("Skip tour", skip),
          tourBtn(isLast ? "Done" : "Next", next, { primary: true }),
        ),
      ),
      e(
        "div",
        { className: "ecu-tour-foot" },
        `${step.section || props.tour.label} · ${props.stepIndex + 1} / ${props.tour.steps.length}`,
      ),
    ),
  );
}

export function GuidedTourOverlay(props: GuidedTourOverlayProps): any {
  return e(TourPortal, null, e(TourOverlayBody, props));
}
