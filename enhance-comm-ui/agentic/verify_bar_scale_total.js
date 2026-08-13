/**
 * One-off: prove Total footer must not become bar scale (Damage Done shrink bug).
 * Run: node agentic/verify_bar_scale_total.js
 */
function barAmount(r) {
  return r.barValue;
}
function isTotal(r) {
  return r.id === "__total__";
}
function scaleMax(rows) {
  let fromMeta = 0;
  let fromVisible = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (isTotal(r)) continue;
    fromVisible = Math.max(fromVisible, barAmount(r));
    if (r.barMax > 0) fromMeta = Math.max(fromMeta, r.barMax);
  }
  return fromMeta || fromVisible || 1;
}
function buggyMax(rows) {
  return (
    rows.reduce((m, r) => {
      const v = barAmount(r);
      return v > m ? v : m;
    }, 0) || 1
  );
}

// Early fight: only A damaged. Later: B joins.
const early = [
  { id: "a", barValue: 1000, barMax: 1000, value: 1000 },
  { id: "__total__", barValue: 1000, barMax: 1000, value: 1000 },
];
const late = [
  { id: "a", barValue: 1000, barMax: 1000, value: 1000 },
  { id: "b", barValue: 500, barMax: 1000, value: 500 },
  { id: "__total__", barValue: 1500, barMax: 1000, value: 1500 },
];

const earlyBug = (1000 / buggyMax(early)) * 100;
const lateBug = (1000 / buggyMax(late)) * 100;
const earlyFix = (1000 / scaleMax(early)) * 100;
const lateFix = (1000 / scaleMax(late)) * 100;

console.log("buggy A width early→late:", earlyBug, "→", lateBug, "(shrinks)");
console.log(
  "fixed A width early→late:",
  earlyFix,
  "→",
  lateFix,
  "(stays 100%)",
);
if (lateBug >= earlyBug - 0.01) {
  console.error("FAIL: expected buggy path to shrink");
  process.exit(1);
}
if (Math.abs(lateFix - 100) > 0.01 || Math.abs(earlyFix - 100) > 0.01) {
  console.error("FAIL: fixed path should keep #1 at 100%");
  process.exit(1);
}
console.log("OK");
