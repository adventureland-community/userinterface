/**
 * Details-style bottom statusbar — three micro-display slots.
 */

import { getReact, e } from "../../host/react";
import { getMeterAppearance } from "../../meters/meterAppearance";
import { resolveSegment } from "../../meters/meterSession";
import {
  renderStatusbarPluginText,
  statusbarForInstance,
  statusbarNeedsTotal,
  statusbarPluginTitle,
  statusbarSlotAction,
  sumRankedTotal,
  type StatusbarSlotAction,
} from "../../meters/meterStatusbarPlugins";
import type {
  MeterInstance,
  MeterQuery,
  SegmentRef,
  StatusbarPluginId,
} from "../../meters/meterTypes";
import { segmentDurationMs } from "../../meters/meterTypes";
import { rootQuery } from "./meterShellHelpers";

export type MeterStatusbarProps = {
  instance: MeterInstance;
  segmentRef: SegmentRef;
  /** Segment name only (no duration, no mapIn). */
  segmentLabel: string;
  /** Anchor is the slot button — required for bottom-edge flip-above. */
  onSegmentClick?: (el: HTMLElement) => void;
  onEncounterClick?: () => void;
};

function slotClass(side: "left" | "center" | "right"): string {
  return `ecu-meter-status-micro ecu-meter-status-slot-${side}`;
}

function renderSlot(
  side: "left" | "center" | "right",
  plugin: StatusbarPluginId,
  text: string,
  action: StatusbarSlotAction,
  props: MeterStatusbarProps,
): any {
  if (!text && plugin === "off") {
    return e("span", {
      key: side,
      className: slotClass(side),
      "aria-hidden": true,
    });
  }
  const title = statusbarPluginTitle(plugin);
  if (action === "segment" && props.onSegmentClick) {
    return e(
      "button",
      {
        key: side,
        type: "button",
        className: slotClass(side),
        title,
        onClick: (ev: any) => {
          ev.stopPropagation();
          props.onSegmentClick?.(ev.currentTarget as HTMLElement);
        },
      },
      text,
    );
  }
  if (action === "encounter" && props.onEncounterClick) {
    return e(
      "button",
      {
        key: side,
        type: "button",
        className: `${slotClass(side)} ecu-meter-status-link`,
        title: "Open Encounter",
        onClick: (ev: any) => {
          ev.stopPropagation();
          props.onEncounterClick?.();
        },
      },
      text,
    );
  }
  return e("span", { key: side, className: slotClass(side), title }, text);
}

export function MeterStatusbar(props: MeterStatusbarProps): any {
  const React = getReact();
  const [, tick] = React.useState(0);
  React.useEffect(() => {
    const id = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      tick((n: number) => n + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const app = getMeterAppearance();
  if (!app.showStatusbar) return null;

  const slots = statusbarForInstance(props.instance);
  const query: MeterQuery = rootQuery(props.instance);
  const seg = resolveSegment(props.segmentRef);
  const durMs = seg ? segmentDurationMs(seg, Date.now()) : 0;
  const durSec = Math.max(durMs / 1000, 0);

  const needsTotal = statusbarNeedsTotal(slots);

  const attributeTotal = needsTotal
    ? sumRankedTotal(query, props.segmentRef, props.instance.partyFocus)
    : 0;

  const sides: Array<"left" | "center" | "right"> = ["left", "center", "right"];
  const children: any[] = [];
  for (let i = 0; i < sides.length; i++) {
    const side = sides[i];
    const plugin = slots[side];
    const text = renderStatusbarPluginText({
      plugin,
      segmentLabel: props.segmentLabel,
      durSec,
      query,
      instanceLabel: props.instance.label,
      attributeTotal,
    });
    children.push(
      renderSlot(side, plugin, text, statusbarSlotAction(plugin), props),
    );
  }

  return e("div", { className: "ecu-meter-statusbar" }, ...children);
}
