/**
 * Resize clamp: min floor stays, max is viewport (not 960×720).
 * Defaults per window type must stay put.
 *
 * Usage: node agentic/verify_meter_frame_clamp.js
 */

const fs = require("fs");
const path = require("path");

const METER_FRAME_MIN = { w: 240, h: 140 };
const METER_FRAME_DEFAULT = { w: 320, h: 200 };
const INSPECTOR_FRAME_DEFAULT = { w: 560, h: 400 };
const REPORT_FRAME_DEFAULT = { w: 780, h: 520 };
const OLD_MAX = { w: 960, h: 720 };

function clampMeterFrame(w, h, viewportW, viewportH) {
  const maxW =
    Number.isFinite(viewportW) && viewportW > 0
      ? Math.round(viewportW)
      : Number.POSITIVE_INFINITY;
  const maxH =
    Number.isFinite(viewportH) && viewportH > 0
      ? Math.round(viewportH)
      : Number.POSITIVE_INFINITY;
  return {
    frameW: Math.min(maxW, Math.max(METER_FRAME_MIN.w, Math.round(w))),
    frameH: Math.min(maxH, Math.max(METER_FRAME_MIN.h, Math.round(h))),
  };
}

const root = path.join(__dirname, "..");
const frameSizes = fs.readFileSync(
  path.join(root, "src/lib/frameSizes.ts"),
  "utf8",
);
const layout = fs.readFileSync(path.join(root, "src/lib/layout.ts"), "utf8");
const shell = fs.readFileSync(
  path.join(root, "src/ui/meter/MeterPanelShell.ts"),
  "utf8",
);
const catalog = fs.readFileSync(
  path.join(root, "src/meters/meterCatalog.ts"),
  "utf8",
);

const VP = { w: 1920, h: 1080 };
const failures = [];

function eq(got, want, label) {
  if (got.frameW !== want.w || got.frameH !== want.h) {
    failures.push(
      `${label}: got ${got.frameW}x${got.frameH}, want ${want.w}x${want.h}`,
    );
  }
}

if (/METER_FRAME_MAX\s*=\s*\{\s*w:\s*960/.test(frameSizes)) {
  failures.push("src/lib/frameSizes.ts still defines METER_FRAME_MAX 960×720");
}
if (!frameSizes.includes("export function clampMeterFrame")) {
  failures.push("src/lib/frameSizes.ts missing clampMeterFrame");
}
if (
  !/maxWidth:\s*"100vw"/.test(layout) ||
  !/maxHeight:\s*"100vh"/.test(layout)
) {
  failures.push("src/lib/layout.ts panelStyle not 100vw/100vh");
}
if (/maxWidth:\s*"96vw"/.test(layout) || /maxHeight:\s*"96vh"/.test(layout)) {
  failures.push("src/lib/layout.ts still uses 96vw/96vh cap");
}
if (shell.includes("METER_FRAME_MAX")) {
  failures.push("MeterPanelShell.ts still references METER_FRAME_MAX");
}
if (!shell.includes("clampMeterFrame")) {
  failures.push("MeterPanelShell.ts does not call clampMeterFrame");
}
if (!catalog.includes("defaultFrame: { w: 560, h: 400 }")) {
  failures.push("Inspector defaultFrame changed");
}
if ((catalog.match(/defaultFrame: \{ w: 780, h: 520 \}/g) || []).length < 3) {
  failures.push("Timeline/Encounter/Deaths defaultFrame changed");
}
if (
  !frameSizes.includes("METER_FRAME_DEFAULT = { w: 320, h: 200 }") ||
  !frameSizes.includes("INSPECTOR_FRAME_DEFAULT = { w: 560, h: 400 }") ||
  !frameSizes.includes("REPORT_FRAME_DEFAULT = { w: 780, h: 520 }")
) {
  failures.push("per-type default constants changed");
}

eq(
  clampMeterFrame(100, 50, VP.w, VP.h),
  METER_FRAME_MIN,
  "min floor (don't collapse)",
);

eq(
  clampMeterFrame(1200, 900, VP.w, VP.h),
  { w: 1200, h: 900 },
  "Timeline/Inspector larger than old 960×720 cap",
);

eq(
  clampMeterFrame(2000, 1400, VP.w, VP.h),
  { w: VP.w, h: VP.h },
  "ceiling is full viewport",
);

eq(
  clampMeterFrame(METER_FRAME_DEFAULT.w, METER_FRAME_DEFAULT.h, VP.w, VP.h),
  METER_FRAME_DEFAULT,
  "meter default unchanged",
);
eq(
  clampMeterFrame(
    INSPECTOR_FRAME_DEFAULT.w,
    INSPECTOR_FRAME_DEFAULT.h,
    VP.w,
    VP.h,
  ),
  INSPECTOR_FRAME_DEFAULT,
  "Inspector default unchanged",
);
eq(
  clampMeterFrame(REPORT_FRAME_DEFAULT.w, REPORT_FRAME_DEFAULT.h, VP.w, VP.h),
  REPORT_FRAME_DEFAULT,
  "Timeline/Encounter default unchanged",
);

const overOld = clampMeterFrame(OLD_MAX.w + 80, OLD_MAX.h + 80, VP.w, VP.h);
if (overOld.frameW <= OLD_MAX.w || overOld.frameH <= OLD_MAX.h) {
  failures.push(
    `still capped at old max: ${overOld.frameW}x${overOld.frameH} vs old ${OLD_MAX.w}x${OLD_MAX.h}`,
  );
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      viewport: `${VP.w}x${VP.h}`,
      oldCap: `${OLD_MAX.w}x${OLD_MAX.h}`,
      stretchPastOldCap: `${overOld.frameW}x${overOld.frameH}`,
      fillScreen: clampMeterFrame(9999, 9999, VP.w, VP.h),
      defaults: {
        meter: METER_FRAME_DEFAULT,
        inspector: INSPECTOR_FRAME_DEFAULT,
        report: REPORT_FRAME_DEFAULT,
      },
    },
    null,
    2,
  ),
);
