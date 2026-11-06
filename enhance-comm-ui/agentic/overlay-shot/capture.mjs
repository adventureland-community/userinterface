/**
 * ECU overlay harness shots — real phone/desktop viewports via Playwright.
 *
 * Usage:
 *   node agentic/overlay-shot/capture.mjs --view phone
 *   node agentic/overlay-shot/capture.mjs --view desktop --fov 1.5
 *   node agentic/overlay-shot/capture.mjs --view phone --fov-grid
 *
 * Requires: npm run dev (:3927)
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE =
  process.env.ECU_OVERLAY_URL || "http://127.0.0.1:3927/overlay/frame";
const SETTINGS_KEY = "al-comm-ui-settings-v1";
const OUT_DEFAULT = resolve(HERE, "shots");

const PROFILES = {
  phone: {
    name: "phone",
    width: 390,
    height: 844,
    dpr: 3,
    mobile: true,
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  },
  desktop: {
    name: "desktop",
    width: 1280,
    height: 800,
    dpr: 1,
    mobile: false,
    ua: undefined,
  },
};

function parseArgs(argv) {
  const out = {
    view: "phone",
    fov: null,
    fovGrid: false,
    outDir: OUT_DEFAULT,
    stdout: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--view") out.view = String(argv[++i] || "phone");
    else if (a === "--fov") out.fov = Number(argv[++i]);
    else if (a === "--fov-grid") out.fovGrid = true;
    else if (a === "--out") out.outDir = resolve(String(argv[++i] || OUT_DEFAULT));
    else if (a === "--stdout") out.stdout = true;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  if (out.view !== "phone" && out.view !== "desktop") out.view = "phone";
  return out;
}

async function dismissOverlays(page) {
  const skip = page.locator("button").filter({ hasText: /^Skip tour$/i });
  if (await skip.count()) {
    await skip.click().catch(() => {});
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => {
    for (const sel of [
      ".ecu-tour-shade",
      "[data-ecu-tour-portal]",
      ".ecu-setup-wizard",
      ".ecu-whats-new",
    ]) {
      for (const el of document.querySelectorAll(sel)) el.remove();
    }
  });
}

/** Drop preview-only chrome (sim dock). Shell never appears — we load /overlay/frame. */
async function hidePreviewHarness(page) {
  await page.evaluate(() => {
    const dock = document.getElementById("ecu-overlay-dock");
    if (dock) dock.remove();
    const css = document.getElementById("ecu-overlay-dock-css");
    if (css) css.remove();
    const hud = document.getElementById("comm-ui");
    if (hud) {
      hud.style.top = "0";
      hud.style.height = "100%";
    }
  });
}

async function prepareHomeFraming(page) {
  await page.evaluate(() => {
    document.documentElement.classList.remove("ecu-phone-sheet-open");
    for (const sel of [
      ".ecu-phone-sheet",
      ".ecu-apps-sheet",
      "[data-ecu-phone-sheet]",
    ]) {
      for (const el of document.querySelectorAll(sel)) el.remove();
    }
    const dots = document.querySelectorAll(".ecu-phone-home-dots__dot");
    if (dots[0] && !dots[0].classList.contains("is-on")) {
      dots[0].dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    }
  });
  await page.waitForTimeout(200);
}

async function seedSettings(page, profileName, fov) {
  await page.addInitScript(
    ({ key, profileName, fov }) => {
      let parsed = {};
      try {
        parsed = JSON.parse(localStorage.getItem(key) || "{}");
      } catch {
        parsed = {};
      }
      parsed.layoutProfileMode = profileName === "phone" ? "phone" : "desktop";
      parsed.tourSeen = true;
      parsed.whatsNewSeenVersion = "99.0.0";
      parsed.setupWizardDone = true;
      parsed.cameraJoystickSide = "left";
      if (typeof fov === "number" && fov > 0) parsed.worldFov = fov;
      else parsed.worldFov = 1;
      localStorage.setItem(key, JSON.stringify(parsed));
    },
    { key: SETTINGS_KEY, profileName, fov },
  );
}

async function setFovViaEcu(page, target) {
  const step = async (dir) => {
    try {
      return await page.evaluate((d) => {
        const pick = (sels) => {
          for (const s of sels) {
            const el = document.querySelector(s);
            if (el) return el;
          }
          return null;
        };
        const btn =
          d === "reset"
            ? pick([
                ".ecu-cam-chrome__fov-label",
                'button[title="Reset FOV to 1×"]',
              ])
            : d === "out"
              ? pick([
                  '.ecu-cam-chrome__fov-btn[aria-label="Widen FOV"]',
                  'button[title="Widen FOV (see more)"]',
                ])
              : pick([
                  '.ecu-cam-chrome__fov-btn[aria-label="Tighten FOV"]',
                  'button[title="Tighten FOV (see less)"]',
                ]);
        if (!btn || btn.disabled) return false;
        btn.click();
        return true;
      }, dir);
    } catch {
      return false;
    }
  };
  const read = async () => {
    try {
      return await page.evaluate(() => {
        const label =
          document.querySelector(".ecu-cam-chrome__fov-label") ||
          document.querySelector('button[title="Reset FOV to 1×"]');
        const t = (label && label.textContent) || "";
        const m = t.match(/([\d.]+)/);
        return m ? Number(m[1]) : null;
      });
    } catch {
      return null;
    }
  };
  await step("reset");
  await page.waitForTimeout(80);
  let cur = (await read()) || 1;
  let guard = 40;
  while (Math.abs(cur - target) > 0.01 && guard-- > 0) {
    const ok = await step(cur < target ? "out" : "in");
    if (!ok) break;
    await page.waitForTimeout(90);
    cur = (await read()) || cur;
  }
  return cur;
}

/**
 * @returns {Promise<{ buffer: Buffer, appliedFov: number, meta: object }>}
 */
export async function captureOverlayShot(opts) {
  const view = opts.view === "desktop" ? "desktop" : "phone";
  const profile = PROFILES[view];
  const fov = typeof opts.fov === "number" && opts.fov > 0 ? opts.fov : 1;
  const base = String(opts.baseUrl || BASE).replace(/\/$/, "");
  const url =
    base.includes("?")
      ? base + "&embed=1&view=" + view + "&engine_mode=canvas"
      : base + "?embed=1&view=" + view + "&engine_mode=canvas";

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: profile.width, height: profile.height },
      deviceScaleFactor: profile.dpr,
      isMobile: profile.mobile,
      hasTouch: profile.mobile,
      userAgent: profile.ua,
    });
    const page = await context.newPage();
    await seedSettings(page, profile.name, 1);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForFunction(
      () =>
        !!(
          window.game_loaded &&
          window.renderer &&
          window.observing &&
          window.observing.drawn
        ),
      { timeout: 120000 },
    );
    await page.waitForTimeout(800);
    await dismissOverlays(page);
    await page
      .waitForFunction(
        () =>
          !!(
            document.querySelector(".ecu-cam-chrome") ||
            document.querySelector('button[title="Widen FOV (see more)"]') ||
            document.querySelector("#comm-ui")
          ),
        { timeout: 30000 },
      )
      .catch(() => {});

    const appliedFov = await setFovViaEcu(page, fov);
    await page.waitForTimeout(300);

    if (opts.prepareHome) {
      await prepareHomeFraming(page);
    }

    await hidePreviewHarness(page);
    await page.waitForTimeout(100);

    const buffer = await page.screenshot({ type: "png", fullPage: false });

    const meta = await page.evaluate(() => {
      const viewEl = window.renderer && window.renderer.view;
      return {
        innerW: window.innerWidth,
        innerH: window.innerHeight,
        dpr: window.devicePixelRatio,
        imageRendering: viewEl && viewEl.style && viewEl.style.imageRendering,
        hasCam: !!document.querySelector(".ecu-cam-chrome"),
        hasPhoneDock: !!document.querySelector("[data-ecu-phone-dock]"),
        hasSimDock: !!document.getElementById("ecu-overlay-dock"),
      };
    });

    await context.close();
    return {
      buffer: Buffer.from(buffer),
      appliedFov,
      meta: { view, fov: appliedFov, ...meta },
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage: node agentic/overlay-shot/capture.mjs [options]
  --view phone|desktop   (default phone)
  --fov <n>              single FOV (default 1)
  --fov-grid             shoot 0.5,0.75,1,1.5,2,3,5
  --out <dir>            output directory
  --stdout               write PNG bytes to stdout (single shot only)`);
    process.exit(0);
  }

  mkdirSync(args.outDir, { recursive: true });
  const fovs = args.fovGrid
    ? [0.5, 0.75, 1, 1.5, 2, 3, 5]
    : [args.fov && args.fov > 0 ? args.fov : 1];

  if (args.stdout && fovs.length !== 1) {
    console.error("--stdout requires a single --fov (not --fov-grid)");
    process.exit(2);
  }

  for (const fov of fovs) {
    const result = await captureOverlayShot({
      view: args.view,
      fov,
    });
    const name =
      args.view +
      "-fov-" +
      String(result.appliedFov).replace(".", "_") +
      ".png";
    const file = resolve(args.outDir, name);
    if (args.stdout) {
      process.stdout.write(result.buffer);
    } else {
      writeFileSync(file, result.buffer);
      console.log("wrote", file, "meta", JSON.stringify(result.meta));
    }
  }
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
