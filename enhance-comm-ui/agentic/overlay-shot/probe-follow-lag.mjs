/**
 * Red-capable: desktop Follow must track observing XY every frame (no stale lock).
 * maxErr >= 1 world unit while moving → rubber-band / "UI lagging around".
 */
import { chromium } from "playwright";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "shots");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e.message || e)));

await page.addInitScript(() => {
  localStorage.setItem(
    "al-comm-ui-settings-v1",
    JSON.stringify({
      layoutProfileMode: "desktop",
      setupWizardDone: true,
      whatsNewSeenVersion: "99.0.0",
      toursCompleted: {
        intro: true,
        meters: true,
        combat: true,
        coop: true,
        layout: true,
        market: true,
        bank: true,
        "buff-info": true,
        "paperdoll-gear": true,
      },
    }),
  );
});

await page.goto(
  "http://127.0.0.1:3927/overlay/frame?embed=1&view=desktop&engine_mode=canvas",
  { waitUntil: "domcontentloaded", timeout: 120000 },
);
await page.waitForFunction(
  () =>
    !!(
      window.game_loaded &&
      window.observing &&
      window.observing.drawn &&
      document.getElementById("comm-ui") &&
      typeof window.__ecuPreviewPlace === "function" &&
      typeof window.__ecuSetFollowCamera === "function"
    ),
  { timeout: 120000 },
);
await page.waitForTimeout(1000);

const report = await page.evaluate(async () => {
  window.__ecuSetFollowCamera(true);
  await new Promise((r) => setTimeout(r, 100));

  const map = window.map;
  if (!map) return { error: "no map" };

  let maxErr = 0;
  let sumErr = 0;
  let samples = 0;
  let screenChanges = 0;
  let lastScreen = map.x + "," + map.y;
  let longFrames = 0;
  let lastTs = performance.now();

  await new Promise((resolve) => {
    const start = performance.now();
    const tick = (ts) => {
      const dt = ts - lastTs;
      lastTs = ts;
      if (dt > 24) longFrames++;
      const t = (ts - start) / 1000;
      const nx = Math.sin(t * 10) * 60;
      const ny = Math.cos(t * 10) * 60;
      window.__ecuPreviewPlace(nx, ny);
      if (typeof window.position_map === "function") window.position_map();
      const err = Math.hypot(
        Number(map.real_x) - nx,
        Number(map.real_y) - ny,
      );
      if (err > maxErr) maxErr = err;
      sumErr += err;
      samples++;
      const screen = map.x + "," + map.y;
      if (screen !== lastScreen) {
        screenChanges++;
        lastScreen = screen;
      }
      if (ts - start < 1500) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });

  return {
    maxErr: Math.round(maxErr * 1000) / 1000,
    avgErr: samples ? Math.round((sumErr / samples) * 1000) / 1000 : 0,
    samples,
    screenChanges,
    longFrames,
    viewport: document.getElementById("comm-ui")?.getAttribute("data-viewport"),
  };
});

const shot = join(outDir, "follow-lag-probe.png");
await page.screenshot({ path: shot, fullPage: false });

const trackLag = (report.maxErr || 0) >= 1;
const verdict = {
  trackLag,
  longFramesBad: (report.longFrames || 0) > (report.samples || 1) * 0.5,
  notDesktop: report.viewport !== "desktop",
};
const full = { report, errs, shot, verdict };
writeFileSync(join(outDir, "follow-lag-probe.json"), JSON.stringify(full, null, 2));
console.log(JSON.stringify(full, null, 2));
const code =
  trackLag || verdict.longFramesBad || verdict.notDesktop || report.error ? 1 : 0;
console.log("VERDICT", JSON.stringify({ ok: code === 0, ...verdict, maxErr: report.maxErr }));
await browser.close();
process.exit(code);
