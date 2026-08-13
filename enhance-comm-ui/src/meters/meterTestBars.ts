import type { RankedRow } from "./meterTypes";

/** Fake ranked rows for setup / options preview. */
export const METER_TEST_BAR_ROWS: RankedRow[] = [
  {
    id: "t1",
    name: "TestWarrior",
    ctype: "warrior",
    value: 120000,
    rate: 1200,
    pct: 0.4,
    barMax: 120000,
    barValue: 120000,
    primary: "total",
    label: "",
    kind: "player",
  },
  {
    id: "t2",
    name: "TestMage",
    ctype: "mage",
    value: 90000,
    rate: 900,
    pct: 0.3,
    barMax: 120000,
    barValue: 90000,
    primary: "total",
    label: "",
    kind: "player",
  },
  {
    id: "t3",
    name: "TestPriest",
    ctype: "priest",
    value: 60000,
    rate: 600,
    pct: 0.2,
    barMax: 120000,
    barValue: 60000,
    primary: "total",
    label: "",
    kind: "player",
  },
];

export function meterTestBarResult(): {
  kind: "ranked";
  rows: RankedRow[];
} {
  return { kind: "ranked", rows: METER_TEST_BAR_ROWS.slice() };
}
