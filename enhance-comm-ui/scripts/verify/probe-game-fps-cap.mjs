/**
 * Overlay harness for Game FPS cap (0.19.0).
 *
 * Covers:
 *  1) Settings → Comm UI → Experimental (Off/30/60 + independent toggles)
 *  2) Real stock draw rate via wrap stats after Off→On cycle
 *  3) Selective rAF shim only while capped; restored when Off
 *  4) ECU rAF stays hot while game draw is capped at 30
 *  5) Hidden / blurred / covered policies via toggles
 *  6) Sync spam throttle
 *  7) Map render scale ½ still paints
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "shots");
mkdirSync(outDir, { recursive: true });

const REAL_SAMPLE_MS = 1000;
const SPAM_SAMPLE_MS = 300;

async function boot(page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "al-comm-ui-settings-v1",
      JSON.stringify({
        layoutProfileMode: "desktop",
        setupWizardDone: true,
        whatsNewSeenVersion: "99.0.0",
        changelogSeenId: "0.19.0",
        gameFpsCap: 0,
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
        document.getElementById("comm-ui") &&
        typeof window.draw === "function" &&
        typeof window.__ecuSetGameFpsCap === "function" &&
        typeof window.__ecuGameFpsCapStats === "function"
      ),
    { timeout: 120000 },
  );
  await page.waitForTimeout(1000);

  // Snapshot native rAF before any cap so we can prove Off restores it.
  await page.evaluate(() => {
    window.__ecuProbeNativeRaf = window.requestAnimationFrame;
  });
}

async function measureRealDraw(page, cap) {
  return page.evaluate(
    async ({ capValue, sampleMs }) => {
      const w = window;
      // Off→On cycle used to detach .bind()-based wraps; must still work.
      w.__ecuSetGameFpsCap(0);
      await new Promise((r) => setTimeout(r, 50));
      w.__ecuSetGameFpsCap(capValue);
      w.__ecuResetGameFpsCapStats();
      await new Promise((r) => setTimeout(r, sampleMs));
      const stats = w.__ecuGameFpsCapStats();
      const fps = stats.runs / (sampleMs / 1000);
      const native = w.__ecuProbeNativeRaf;
      return {
        cap: capValue,
        stats,
        fps: Math.round(fps * 10) / 10,
        rafIsNative: w.requestAnimationFrame === native,
        settingsCap: (() => {
          try {
            const raw = localStorage.getItem("al-comm-ui-settings-v1");
            return raw ? JSON.parse(raw).gameFpsCap : null;
          } catch {
            return null;
          }
        })(),
      };
    },
    { capValue: cap, sampleMs: REAL_SAMPLE_MS },
  );
}

async function measureEcuRafWhileCapped(page) {
  return page.evaluate(async () => {
    const w = window;
    w.__ecuSetGameFpsCap(30);
    w.__ecuResetGameFpsCapStats();
    let ecuTicks = 0;
    let live = true;
    const loop = () => {
      if (!live) return;
      ecuTicks += 1;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    await new Promise((r) => setTimeout(r, 1000));
    live = false;
    const stats = w.__ecuGameFpsCapStats();
    return {
      ecuTicks,
      drawRuns: stats.runs,
      drawSkips: stats.skips,
      // ECU rAF must keep ticking under a game cap (not stalled by the shim).
      ecuKeepsTicking: ecuTicks >= 25 && ecuTicks >= stats.runs * 0.8,
    };
  });
}

async function measureAutoPolicies(page) {
  return page.evaluate(async () => {
    const w = window;
    w.__ecuSetGameFpsCapOptions({
      cap: 0,
      whenHidden: true,
      whenBlurred: true,
      pauseWhenCovered: true,
    });
    w.__ecuSetGameFpsCapBgForTests({
      hidden: false,
      blurred: false,
      covered: false,
    });
    const focused = w.__ecuGameFpsCapStats();
    w.__ecuSetGameFpsCapBgForTests({
      hidden: true,
      blurred: false,
      covered: false,
    });
    const hidden = w.__ecuGameFpsCapStats();
    w.__ecuSetGameFpsCapBgForTests({
      hidden: false,
      blurred: true,
      covered: false,
    });
    const blurred = w.__ecuGameFpsCapStats();
    w.__ecuSetGameFpsCapBgForTests({
      hidden: false,
      blurred: false,
      covered: true,
    });
    const covered = w.__ecuGameFpsCapStats();
    // Covered off: fixed 30 still paints when covered if pause toggle is false.
    w.__ecuSetGameFpsCapOptions({
      cap: 30,
      pauseWhenCovered: false,
    });
    w.__ecuSetGameFpsCapBgForTests({
      hidden: false,
      blurred: false,
      covered: true,
    });
    const coveredIgnored = w.__ecuGameFpsCapStats();
    w.__ecuSetGameFpsCapBgForTests(null);
    w.__ecuSetGameFpsCapOptions({
      cap: 0,
      whenHidden: false,
      whenBlurred: false,
      pauseWhenCovered: false,
    });
    return {
      focused: { rate: focused.rate, paused: focused.paused, reason: focused.reason },
      hidden: { rate: hidden.rate, paused: hidden.paused, reason: hidden.reason },
      blurred: { rate: blurred.rate, paused: blurred.paused, reason: blurred.reason },
      covered: { rate: covered.rate, paused: covered.paused, reason: covered.reason },
      coveredIgnored: {
        rate: coveredIgnored.rate,
        paused: coveredIgnored.paused,
        reason: coveredIgnored.reason,
      },
    };
  });
}

async function measureRenderScale(page) {
  return page.evaluate(async () => {
    const w = window;
    if (typeof w.__ecuSetGameRenderScale !== "function") {
      return { error: "missing __ecuSetGameRenderScale" };
    }
    const before =
      w.renderer && typeof w.renderer.resolution === "number"
        ? w.renderer.resolution
        : null;
    w.__ecuSetGameRenderScale(0.5);
    await new Promise((r) => setTimeout(r, 200));
    const mid =
      w.renderer && typeof w.renderer.resolution === "number"
        ? w.renderer.resolution
        : null;
    w.__ecuResetGameFpsCapStats();
    w.__ecuSetGameFpsCap(60);
    await new Promise((r) => setTimeout(r, 500));
    const stats = w.__ecuGameFpsCapStats();
    w.__ecuSetGameRenderScale(1);
    w.__ecuSetGameFpsCap(0);
    const after =
      w.renderer && typeof w.renderer.resolution === "number"
        ? w.renderer.resolution
        : null;
    return {
      before,
      mid,
      after,
      drawsWhileHalf: stats.runs,
      scaledDown: before != null && mid != null && mid < before * 0.8,
      restored: before != null && after != null && Math.abs(after - before) < 0.05,
    };
  });
}

async function measureSpamThrottle(page, cap) {
  return page.evaluate(
    async ({ capValue, sampleMs }) => {
      const w = window;
      w.__ecuSetGameFpsCap(0);
      await new Promise((r) => setTimeout(r, 30));
      w.__ecuSetGameFpsCap(capValue);
      w.__ecuResetGameFpsCapStats();
      const start = performance.now();
      let spamCalls = 0;
      // Sync-spam window.draw; with a cap, most calls should skip.
      while (performance.now() - start < sampleMs) {
        spamCalls += 1;
        try {
          w.draw();
        } catch {
          /* ignore */
        }
        if (capValue === 0 && spamCalls > 40) break; // Off: a few real paints is enough
      }
      await new Promise((r) => setTimeout(r, 40));
      const stats = w.__ecuGameFpsCapStats();
      return {
        cap: capValue,
        spamCalls,
        runs: stats.runs,
        skips: stats.skips,
        rafIsNative: w.requestAnimationFrame === w.__ecuProbeNativeRaf,
      };
    },
    { capValue: cap, sampleMs: SPAM_SAMPLE_MS },
  );
}

async function driveSettingsUi(page) {
  await page.locator('#comm-ui button[title="Settings"]').first().click();
  await page.waitForSelector("#ecu-sec-experimental", { timeout: 15000 });
  const perf = page.locator("#ecu-sec-experimental");
  await perf.scrollIntoViewIfNeeded();

  const group = page.locator('[aria-label="Game FPS cap"]');
  await group.waitFor({ timeout: 5000 });

  async function clickCap(label) {
    await group.locator(`button:has-text("${label}")`).click();
    await page.waitForTimeout(150);
    return page.evaluate(() => ({
      api: window.__ecuGetGameFpsCap(),
      stored: JSON.parse(localStorage.getItem("al-comm-ui-settings-v1") || "{}")
        .gameFpsCap,
    }));
  }

  const after30 = await clickCap("30");
  await page.waitForTimeout(500);
  const readout = await page
    .locator("[data-ecu-fps-readout-text]")
    .first()
    .textContent();
  const after60 = await clickCap("60");
  const afterOff = await clickCap("Off");

  // Independent toggles — click the checkbox inputs by nearby labels.
  async function toggleRow(labelPart, wantChecked) {
    const row = page.locator(".ecu-settings-row", { hasText: labelPart }).first();
    const box = row.locator('input[type="checkbox"]');
    const checked = await box.isChecked();
    if (checked !== wantChecked) await box.click();
    await page.waitForTimeout(80);
    return page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("al-comm-ui-settings-v1") || "{}"),
    );
  }
  const afterHidden = await toggleRow("tab is hidden", true);
  const afterBlur = await toggleRow("window is blurred", true);
  const afterCovered = await toggleRow("map is off-screen", true);
  await toggleRow("tab is hidden", false);
  await toggleRow("window is blurred", false);
  await toggleRow("map is off-screen", false);

  const scaleGroup = page.locator('[aria-label="Map render scale"]');
  let scaleOk = false;
  if (await scaleGroup.count()) {
    await scaleGroup.locator('button:has-text("½")').click();
    await page.waitForTimeout(120);
    const stored = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("al-comm-ui-settings-v1") || "{}")
          .gameRenderScale,
    );
    scaleOk = stored === 0.5;
    await scaleGroup.locator('button:has-text("1×")').click();
  }

  await page.screenshot({
    path: join(outDir, "game-fps-cap-settings.png"),
    fullPage: false,
  });

  return {
    after30,
    after60,
    afterOff,
    readout,
    scaleOk,
    toggles: {
      hidden: afterHidden.gameFpsCapWhenHidden === true,
      blurred: afterBlur.gameFpsCapWhenBlurred === true,
      covered: afterCovered.gameFpsPauseWhenCovered === true,
    },
  };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
});
const errs = [];
page.on("pageerror", (e) => errs.push(String(e.message || e)));

await boot(page);

const settingsUi = await driveSettingsUi(page);

// Real draw: Off restores native rAF; 30/60 throttle after Off→On.
const realOff = await measureRealDraw(page, 0);
const real30 = await measureRealDraw(page, 30);
const real60 = await measureRealDraw(page, 60);
const ecuVsDraw = await measureEcuRafWhileCapped(page);
const autoPolicies = await measureAutoPolicies(page);
const renderScale = await measureRenderScale(page);

const spamOff = await measureSpamThrottle(page, 0);
const spam60 = await measureSpamThrottle(page, 60);
const spam30 = await measureSpamThrottle(page, 30);

await browser.close();

const okSettings =
  settingsUi.after30.api === 30 &&
  settingsUi.after30.stored === 30 &&
  settingsUi.after60.api === 60 &&
  settingsUi.afterOff.api === 0 &&
  typeof settingsUi.readout === "string" &&
  settingsUi.readout.indexOf("FPS") >= 0 &&
  settingsUi.scaleOk === true &&
  settingsUi.toggles.hidden === true &&
  settingsUi.toggles.blurred === true &&
  settingsUi.toggles.covered === true;

const okReal =
  realOff.rafIsNative === true &&
  real30.rafIsNative === false &&
  real30.stats.runs > 10 &&
  real30.stats.skips > 0 &&
  real30.fps > 0 &&
  real30.fps <= 40 &&
  real60.stats.runs > real30.stats.runs &&
  real60.fps <= 75;

const okEcu = ecuVsDraw.ecuKeepsTicking === true && ecuVsDraw.drawRuns > 10;
const okAuto =
  autoPolicies.focused.rate === 0 &&
  autoPolicies.focused.paused === false &&
  autoPolicies.hidden.rate === 60 &&
  autoPolicies.blurred.rate === 60 &&
  autoPolicies.blurred.reason === "blurred" &&
  autoPolicies.covered.paused === true &&
  autoPolicies.covered.reason === "covered" &&
  autoPolicies.coveredIgnored.paused === false &&
  autoPolicies.coveredIgnored.rate === 30;

// Real PIXI draws are slow enough that a 60 cap often runs every sync call;
// 30 still produces a clear skip-heavy signature.
const okSpam =
  spamOff.rafIsNative === true &&
  spam60.rafIsNative === false &&
  spam60.runs > 0 &&
  spam30.skips > spam30.runs &&
  spam30.runs <= spam60.runs;

const okScale =
  !renderScale.error &&
  renderScale.scaledDown === true &&
  renderScale.restored === true &&
  renderScale.drawsWhileHalf > 5;

const full = {
  settingsUi,
  real: { off: realOff, cap30: real30, cap60: real60 },
  ecuVsDraw,
  autoPolicies,
  renderScale,
  spam: { off: spamOff, cap60: spam60, cap30: spam30 },
  pageErrors: errs,
  checks: { okSettings, okReal, okEcu, okAuto, okSpam, okScale },
  ok:
    okSettings &&
    okReal &&
    okEcu &&
    okAuto &&
    okSpam &&
    okScale &&
    errs.length === 0,
};

writeFileSync(join(outDir, "game-fps-cap-probe.json"), JSON.stringify(full, null, 2));
console.log(JSON.stringify(full, null, 2));
console.log("VERDICT", JSON.stringify({ ok: full.ok, ...full.checks }));
process.exit(full.ok ? 0 : 1);
