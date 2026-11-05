/**
 * Capture nameplates at FOV steps — zoom ONLY via ECU controls:
 *   phone  → CameraJoystick .ecu-cam-chrome__fov-*
 *   desktop → MapInfo buttons title="Widen/Tighten FOV…"
 * Requires: npm run dev (:3927)
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const URL =
  process.env.ECU_OVERLAY_URL ||
  "http://127.0.0.1:3927/overlay/frame?engine_mode=canvas";
const SETTINGS_KEY = "al-comm-ui-settings-v1";
const FOVS = [0.5, 0.75, 1, 1.5, 2, 3, 5];

const profiles = [
  { name: "phone", width: 390, height: 844, dpr: 3, mobile: true },
  { name: "desktop", width: 1440, height: 900, dpr: 1, mobile: false },
];

async function dismissOverlays(page) {
  const skip = page.locator("button").filter({ hasText: /^Skip tour$/i });
  if (await skip.count()) {
    await skip.click().catch(() => {});
    await page.waitForTimeout(250);
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

async function seedSettings(page, profileName) {
  await page.addInitScript(
    ({ key, profileName }) => {
      let parsed = {};
      try {
        parsed = JSON.parse(localStorage.getItem(key) || "{}");
      } catch {
        parsed = {};
      }
      parsed.worldFov = 1;
      parsed.layoutProfileMode = profileName === "phone" ? "phone" : "desktop";
      parsed.tourSeen = true;
      parsed.whatsNewSeenVersion = "99.0.0";
      parsed.setupWizardDone = true;
      localStorage.setItem(key, JSON.stringify(parsed));
    },
    { key: SETTINGS_KEY, profileName },
  );
}

/**
 * Drive FOV only through ECU UI (cam chrome on phone, MapInfo on desktop).
 * Uses in-page .click() so covered/opacity quirks don't false-disable Playwright.
 */
async function setFovViaEcu(page, target) {
  const kind = await page.evaluate(() => {
    if (document.querySelector(".ecu-cam-chrome")) return "cam";
    if (document.querySelector('button[title="Widen FOV (see more)"]')) return "map";
    return null;
  });
  if (!kind) throw new Error("no ECU FOV controls (cam chrome or MapInfo)");

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
    await page.waitForTimeout(100);
    cur = (await read()) || cur;
  }
  return { kind, applied: cur };
}

async function nameplateMeta(page) {
  return page.evaluate(() => {
    const view = window.renderer && window.renderer.view;
    const tags = [];
    for (const e of Object.values(window.entities || {})) {
      if (!e || !e.name_tag) continue;
      const nt = e.name_tag;
      const walk = (n, d = 0) => {
        if (!n || d > 6) return;
        if (typeof n.text === "string" && n.style) {
          tags.push({
            id: e.id || e.name,
            text: n.text,
            rootScale: nt.scale && nt.scale.x,
            textScale: n.scale && n.scale.x,
            fontSize: n.style && n.style.fontSize,
            dense: n.style && n.style.__ecuDense,
            stroke: n.style && n.style.strokeThickness,
            res: n.resolution,
            fovMark: nt.__ecuNameplateFov,
          });
        }
        if (n.children) for (const c of n.children) walk(c, d + 1);
      };
      walk(nt);
    }
    return {
      imageRendering: view && view.style && view.style.imageRendering,
      canvasW: view && view.width,
      canvasCssW: view && view.style && view.style.width,
      dpr: window.devicePixelRatio,
      tagCount: tags.length,
      tags: tags.slice(0, 10),
    };
  });
}

/**
 * Phone: full portrait viewport (dock/chrome visible — proves it is not desktop).
 * Desktop: landscape crop around the party on the PIXI view.
 */
async function cropBox(page, profileName) {
  if (profileName === "phone") {
    // Full device frame — do not square-crop (that made phone shots look desktop).
    return null;
  }
  return page.evaluate(() => {
    const view = window.renderer && window.renderer.view;
    if (!view || typeof view.getBoundingClientRect !== "function") return null;
    const rect = view.getBoundingClientRect();
    if (!(rect.width > 8 && rect.height > 8)) return null;
    let cx = rect.left + rect.width * 0.5;
    let cy = rect.top + rect.height * 0.45;
    try {
      const c = window.character;
      const stage = window.stage;
      if (c && stage && typeof c.x === "number" && typeof stage.x === "number") {
        const scale =
          stage.scale && typeof stage.scale.x === "number" ? stage.scale.x : 1;
        const sx = rect.left + (c.x + (stage.x || 0)) * scale;
        const sy = rect.top + (c.y + (stage.y || 0)) * scale;
        if (Number.isFinite(sx) && Number.isFinite(sy)) {
          cx = sx;
          cy = sy - 24;
        }
      }
    } catch {
      /* ignore */
    }
    const w = Math.min(rect.width, 640);
    const h = Math.min(rect.height, Math.round(w * 0.7));
    const x = Math.max(rect.left, Math.min(rect.right - w, cx - w / 2));
    const y = Math.max(rect.top, Math.min(rect.bottom - h, cy - h / 2));
    return {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(w),
      height: Math.round(h),
    };
  });
}

async function shootProfile(profile) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: profile.width, height: profile.height },
    deviceScaleFactor: profile.dpr,
    isMobile: profile.mobile,
    hasTouch: profile.mobile,
    userAgent: profile.mobile
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      : undefined,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.error("PAGEERR", profile.name, e.message));

  await seedSettings(page, profile.name);
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
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
  await page.waitForTimeout(1000);
  await dismissOverlays(page);
  await page.waitForTimeout(400);
  await page.waitForFunction(
    () =>
      !!(
        document.querySelector(".ecu-cam-chrome") ||
        document.querySelector('button[title="Widen FOV (see more)"]')
      ),
    { timeout: 30000 },
  );

  const results = [];
  for (const fov of FOVS) {
    const { kind, applied } = await setFovViaEcu(page, fov);
    await page.waitForTimeout(350);
    const isPhone = profile.name === "phone";
    // Desktop: hide Comm panels so the crop is world-only.
    // Phone: KEEP dock + cam chrome so the frame reads as a handset.
    if (!isPhone) {
      await page.evaluate(() => {
        for (const sel of [
          ".ecu-cam-chrome",
          "[data-ecu-phone-dock]",
          ".ecu-phone-nav",
          ".ecu-chrome-stack",
          ".comm-pos-panel",
          "#comm-ui",
          "#topleftcorner",
          "#bottomleftcorner",
          "#rightcorner",
          "#bottommid",
          "#toprightcorner",
          ".gamebutton",
        ]) {
          for (const el of document.querySelectorAll(sel)) {
            el.setAttribute("data-ecu-np-hide", "1");
            el.style.setProperty("visibility", "hidden", "important");
            el.style.setProperty("pointer-events", "none", "important");
          }
        }
      });
    } else {
      // Soft-hide dense desktop panels if any leaked onto phone profile.
      await page.evaluate(() => {
        for (const sel of [".comm-pos-panel", "#topleftcorner", "#rightcorner"]) {
          for (const el of document.querySelectorAll(sel)) {
            el.setAttribute("data-ecu-np-hide", "1");
            el.style.setProperty("visibility", "hidden", "important");
          }
        }
      });
    }
    const meta = await nameplateMeta(page);
    const box = await cropBox(page, profile.name);
    const file = resolve(
      HERE,
      profile.name + "-fov-" + String(fov).replace(".", "_") + ".png",
    );
    if (box) await page.screenshot({ path: file, clip: box });
    else await page.screenshot({ path: file, fullPage: false });
    await page.evaluate(() => {
      for (const el of document.querySelectorAll("[data-ecu-np-hide]")) {
        el.removeAttribute("data-ecu-np-hide");
        el.style.removeProperty("visibility");
        el.style.removeProperty("pointer-events");
      }
    });
    results.push({ fov, applied, kind, file, meta });
    const t0 = meta.tags[0];
    console.log(
      profile.name,
      "via",
      kind,
      "target",
      fov,
      "applied",
      applied,
      "ir",
      meta.imageRendering,
      "rootScale",
      t0 && t0.rootScale,
      "font",
      t0 && t0.fontSize,
      "dense",
      t0 && t0.dense,
      "stroke",
      t0 && t0.stroke,
    );
  }

  writeFileSync(
    resolve(HERE, profile.name + "-meta.json"),
    JSON.stringify(results, null, 2),
  );
  await browser.close();
  return results;
}

mkdirSync(HERE, { recursive: true });
const all = {};
for (const p of profiles) {
  all[p.name] = await shootProfile(p);
}
writeFileSync(resolve(HERE, "summary.json"), JSON.stringify(all, null, 2));
console.log("DONE", HERE);
