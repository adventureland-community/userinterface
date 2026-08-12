/**
 * Details-style bottom statusbar with micro displays.
 */

import { getReact, e } from "../../host/react";
import { formatCompactNumber, formatCompactRatePerSec } from "../../lib/format";
import { getMeterAppearance } from "../../meters/meterAppearance";
import { isMeterInCombat, resolveSegment } from "../../meters/meterEngine";
import { runMeterQuery } from "../../meters/meterQuery";
import type { MeterInstance, SegmentRef } from "../../meters/meterTypes";
import { segmentDurationMs } from "../../meters/meterTypes";

export type MeterStatusbarProps = {
  instance: MeterInstance;
  segmentRef: SegmentRef;
  segmentLabel: string;
  onSegmentClick?: () => void;
  onEncounterClick?: () => void;
};

export function MeterStatusbar(props: MeterStatusbarProps): any {
  const React = getReact();
  const [, tick] = React.useState(0);
  React.useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const app = getMeterAppearance();
  if (!app.showStatusbar) return null;

  const seg = resolveSegment(props.segmentRef);
  const durMs = seg ? segmentDurationMs(seg, Date.now()) : 0;
  const durSec = Math.max(durMs / 1000, 0);
  const inCombat = isMeterInCombat() && props.segmentRef === "current";

  let totalDmg = 0;
  let totalHeal = 0;
  if (seg) {
    const dmg = runMeterQuery(
      { kind: "players", metric: "damage", primary: "total" },
      { segmentRef: props.segmentRef, partyFocus: props.instance.partyFocus },
    );
    const heal = runMeterQuery(
      { kind: "players", metric: "heal", primary: "total" },
      { segmentRef: props.segmentRef, partyFocus: props.instance.partyFocus },
    );
    if (dmg.kind === "ranked") {
      for (let i = 0; i < dmg.rows.length; i++) totalDmg += dmg.rows[i].value;
    }
    if (heal.kind === "ranked") {
      for (let i = 0; i < heal.rows.length; i++) totalHeal += heal.rows[i].value;
    }
  }

  const dps = durSec > 0 ? totalDmg / durSec : 0;
  const hps = durSec > 0 ? totalHeal / durSec : 0;

  return e(
    "div",
    { className: "ecu-meter-statusbar" },
    e(
      "button",
      {
        type: "button",
        className: "ecu-meter-status-micro",
        onClick: (ev: any) => {
          ev.stopPropagation();
          props.onSegmentClick?.();
        },
        title: "Segment",
      },
      inCombat ? "Combat" : props.segmentLabel,
      ` · ${durSec.toFixed(0)}s`,
    ),
    e(
      "span",
      { className: "ecu-meter-status-micro" },
      `Dmg ${formatCompactNumber(totalDmg)}`,
    ),
    e(
      "span",
      { className: "ecu-meter-status-micro" },
      `DPS ${formatCompactRatePerSec(dps)}`,
    ),
    e(
      "button",
      {
        type: "button",
        className: "ecu-meter-status-micro ecu-meter-status-link",
        onClick: (ev: any) => {
          ev.stopPropagation();
          props.onEncounterClick?.();
        },
        title: "Open Encounter",
      },
      `Heal ${formatCompactNumber(totalHeal)} · ${formatCompactRatePerSec(hps)} HPS`,
    ),
  );
}
