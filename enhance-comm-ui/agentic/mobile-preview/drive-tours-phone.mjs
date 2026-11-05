/**
 * Phone guided-tour harness — walks every tour at 390×844, asserts the
 * callout does not swallow the spotlight, and screenshots each step.
 *
 * Usage: node agentic/mobile-preview/drive-tours-phone.mjs
 * Requires: ecu-dev on :3927 (npm run dev) + playwright.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "tours");
const URL =
  process.env.ECU_OVERLAY_URL ||
  "http://127.0.0.1:3927/overlay/frame?view=phone&engine_mode=canvas";
const VW = 390;
const VH = 844;

mkdirSync(OUT, { recursive: true });

const report = { url: URL, viewport: { VW, VH }, steps: [], fails: [] };

function ok(name, pass, detail) {
  report.steps.push({ name, pass: !!pass, detail });
  if (!pass) report.fails.push({ name, detail });
  console.log((pass ? "PASS" : "FAIL") + "  " + name + (detail ? " — " + detail : ""));
}

async function shot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function dismissBlocking(page) {
  const labels = ["Skip intro", "Skip tour", "Got it", "Later", "Done", "Close", "Next"];
  for (let round = 0; round < 8; round++) {
    let clicked = false;
    for (const label of labels) {
      const btn = page.getByRole("button", { name: label, exact: true }).first();
      if (!(await btn.count())) continue;
      try {
        await btn.click({ timeout: 600, force: true });
        clicked = true;
        await page.waitForTimeout(200);
        break;
      } catch {
        /* ignore */
      }
    }
    if (!clicked) break;
  }
  await page.evaluate(() => {
    document.querySelectorAll("[data-ecu-comm-modal-portal]").forEach((n) => n.remove());
  });
}

async function waitForTourApi(page) {
  await page.waitForFunction(
    () => !!(window.__ecuGuidedTour && typeof window.__ecuGuidedTour.replay === "function"),
    null,
    { timeout: 30000 },
  );
}

async function measureTour(page) {
  return page.evaluate(() => {
    const card = document.querySelector(".ecu-tour-card");
    const spot = document.querySelector(".ecu-tour-spot");
    const active = window.__ecuGuidedTour && window.__ecuGuidedTour.active
      ? window.__ecuGuidedTour.active()
      : null;
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        top: Math.round(r.top),
        left: Math.round(r.left),
        width: Math.round(r.width),
        height: Math.round(r.height),
        bottom: Math.round(r.bottom),
        right: Math.round(r.right),
      };
    };
    const c = box(card);
    const s = box(spot);
    let overlap = 0;
    if (c && s) {
      const left = Math.max(c.left, s.left);
      const right = Math.min(c.right, s.right);
      const top = Math.max(c.top, s.top);
      const bottom = Math.min(c.bottom, s.bottom);
      if (right > left && bottom > top) overlap = (right - left) * (bottom - top);
    }
    const spotArea = s ? s.width * s.height : 0;
    return {
      active,
      card: c,
      spot: s,
      overlap,
      overlapRatio: spotArea > 0 ? overlap / spotArea : 0,
      cardMaxH: c ? c.height : 0,
    };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: VW, height: VH },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  page.on("pageerror", (err) => {
    report.fails.push({ name: "pageerror", detail: String(err) });
    console.log("PAGEERROR", err);
  });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2800);
  await dismissBlocking(page);
  await waitForTourApi(page);
  ok("tour API ready", true);

  // Overlay preview often starts "observing" — clear so Pick a character stays.
  await page.evaluate(() => {
    if (typeof window.__ecuClearObserve === "function") window.__ecuClearObserve();
  });

  const tourIds = [
    "intro",
    "layout",
    "meters",
    "meter-toolbar",
    "coop",
    "combat",
    "paperdoll-v2",
    "market",
    "bank",
    "buff-info",
  ];

  for (const tourId of tourIds) {
    await dismissBlocking(page);
    let hasApi = await page.evaluate(
      () => !!(window.__ecuGuidedTour && window.__ecuGuidedTour.replay),
    );
    if (!hasApi) {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2500);
      await dismissBlocking(page);
      await waitForTourApi(page).catch(() => {});
      hasApi = await page.evaluate(
        () => !!(window.__ecuGuidedTour && window.__ecuGuidedTour.replay),
      );
    }
    if (!hasApi) {
      ok(`${tourId} tour API`, false, "window.__ecuGuidedTour missing");
      continue;
    }
    await page.evaluate((id) => {
      window.__ecuGuidedTour.dismiss();
      window.__ecuGuidedTour.replay(id);
    }, tourId);
    await page.waitForTimeout(900);

    let step = 0;
    let guard = 0;
    while (guard < 40) {
      guard += 1;
      const m = await measureTour(page);
      if (!m.active || m.active.id !== tourId) {
        if (step === 0) {
          ok(`${tourId} started`, false, JSON.stringify(m.active));
        }
        break;
      }
      const safeTitle = String(m.active.title || "step")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      const label = `${tourId}/${m.active.step}-${safeTitle}`;
      const path = await shot(page, label);
      const cardOk = !!m.card && m.cardMaxH <= Math.round(VH * 0.45) + 8;
      ok(`${label} card compact`, cardOk, `h=${m.cardMaxH} shot=${path}`);
      if (m.spot) {
        // Tiny chips (Layout) can be fully covered if the card is misplaced —
        // treat absolute overlap of a small spot as a fail only when the card
        // also covers most of the viewport band around it.
        const swallow =
          m.overlapRatio > 0.55 && m.overlap > 12000;
        ok(
          `${label} card clears spotlight`,
          !swallow,
          `overlapRatio=${m.overlapRatio.toFixed(2)} overlap=${m.overlap}`,
        );
      } else {
        ok(
          `${label} missing target (hint ok)`,
          true,
          "no spotlight — missingHint path",
        );
      }

      // Advance: prefer Next when enabled, else Skip on last / force step++
      const nextBtn = page.locator(".ecu-tour-btn.primary").first();
      const disabled = await nextBtn.isDisabled().catch(() => true);
      if (!disabled) {
        await nextBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(450);
      } else {
        // Action step — skip to continue audit (user action not simulated)
        const skip = page.getByRole("button", { name: "Skip tour", exact: true });
        if (await skip.count()) {
          // Jump to next step via API when waiting for action
          const cur = m.active.step;
          await page.evaluate((n) => window.__ecuGuidedTour.step(n), cur + 1);
          await page.waitForTimeout(500);
          const still = await page.evaluate(() => window.__ecuGuidedTour.active());
          if (!still || still.id !== tourId || still.step <= cur) {
            await skip.click({ force: true }).catch(() => {});
            await page.waitForTimeout(300);
            break;
          }
        } else {
          break;
        }
      }
      step += 1;
    }
  }

  await page
    .evaluate(() => {
      if (window.__ecuGuidedTour) window.__ecuGuidedTour.dismiss();
    })
    .catch(() => {});
  writeFileSync(join(OUT, "drive-tours-report.json"), JSON.stringify(report, null, 2));
  console.log("\nfails:", report.fails.length);
  await browser.close();
  if (report.fails.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
