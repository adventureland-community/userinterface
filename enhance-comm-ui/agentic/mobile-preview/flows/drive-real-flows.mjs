/**
 * Phone deep flows against the REAL ECU overlay (same bundle as Tampermonkey).
 *
 * Usage: npm run phone:flows
 * Requires: npm run dev (ecu-dev on :3927) + playwright.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "shots");
const URL = process.env.ECU_OVERLAY_URL || "http://127.0.0.1:3927/overlay";
const VW = 390;
const VH = 844;

mkdirSync(OUT, { recursive: true });

const report = {
  url: URL,
  viewport: { VW, VH },
  realEcu: true,
  steps: [],
  fails: [],
};

function ok(name, pass, detail) {
  report.steps.push({ name, pass: !!pass, detail });
  if (!pass) report.fails.push({ name, detail });
  console.log((pass ? "PASS" : "FAIL") + "  " + name + (detail ? " — " + detail : ""));
}

async function dismissOverlays(page) {
  const labels = [
    "Skip tour",
    "Skip intro",
    "Skip",
    "Got it",
    "Later",
  ];
  for (let round = 0; round < 10; round++) {
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
    document.querySelectorAll("[data-ecu-tour-portal]").forEach((n) => n.remove());
    document.querySelectorAll(".ecu-tour-shade").forEach((n) => n.remove());
    document.querySelectorAll(".ecu-tour-card").forEach((n) => n.remove());
    document.querySelectorAll("[data-ecu-comm-modal-portal]").forEach((n) => n.remove());
  });
}

async function shot(page, flow, name) {
  // Hide harness-only overlay dock so ratings match production phone chrome.
  await page.evaluate(() => {
    const dock = document.getElementById("ecu-overlay-dock");
    if (dock instanceof HTMLElement) {
      dock.style.visibility = "hidden";
      dock.setAttribute("data-ecu-flows-hidden", "1");
    }
  });
  const dir = join(OUT, flow);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(flow, name);
  return path;
}

async function assertCommUi(page) {
  const n = await page.locator("#comm-ui").count();
  ok("real #comm-ui mounted", n > 0, "count=" + n);
  return n > 0;
}

async function openApps(page) {
  await dismissOverlays(page);
  // Close sheet if already open so we start clean
  const open = await page.locator(".ecu-phone-sheet").count();
  if (open) {
    const back = page.locator(".ecu-phone-sheet button").filter({ hasText: /^Apps$|^Done$/ }).first();
    if (await back.count()) {
      try {
        await back.click({ timeout: 800, force: true });
        await page.waitForTimeout(250);
      } catch {
        /* ignore */
      }
    }
  }
  const apps = page.locator(".ecu-phone-dock__apps, [aria-label='Apps']").first();
  if (!(await apps.count())) return false;
  await apps.click({ timeout: 5000, force: true });
  await page.waitForTimeout(450);
  return (await page.locator(".ecu-phone-sheet, .ecu-phone-apps").count()) > 0;
}

async function clearTargetChrome(page) {
  await page.evaluate(() => {
    window.xtarget = null;
    const obs = window.observing;
    if (obs && typeof obs === "object") {
      try {
        delete obs.target;
      } catch {
        /* ignore */
      }
    }
    // Freeze sim retarget so Spike card stays gone for shots.
    try {
      window.__ecuFreezeTarget = true;
      if (typeof window.__ecuSimSetTarget === "function") {
        window.__ecuSimSetTarget(null);
      }
    } catch {
      /* ignore */
    }
    document
      .querySelectorAll('[data-panel="targetFrame"], .comm-pos-targetFrame')
      .forEach((n) => {
        if (n instanceof HTMLElement) {
          n.style.display = "none";
          n.style.visibility = "hidden";
        }
      });
  });
}

async function openAppsTile(page, label) {
  await clearTargetChrome(page);
  const opened = await openApps(page);
  if (!opened) return false;
  const tile = page.locator(".ecu-phone-apps__tile").filter({ hasText: label }).first();
  if (!(await tile.count())) {
    const byLabel = page
      .locator(".ecu-phone-apps__tile")
      .filter({ has: page.locator(".ecu-phone-apps__label", { hasText: label }) })
      .first();
    if (!(await byLabel.count())) return false;
    await byLabel.click({ timeout: 5000, force: true });
  } else {
    await tile.click({ timeout: 5000, force: true });
  }
  await page.waitForTimeout(700);
  await dismissOverlays(page);
  return true;
}

async function panelVisible(page, selectors) {
  return page.evaluate((sels) => {
    for (let i = 0; i < sels.length; i++) {
      const el = document.querySelector(sels[i]);
      if (!el) continue;
      const st = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (st.display === "none" || st.visibility === "hidden") continue;
      if (r.width < 40 || r.height < 40) continue;
      return true;
    }
    return false;
  }, selectors);
}

async function closeSheets(page) {
  await dismissOverlays(page);
  // Prefer React-owned Done (never sheet.remove — that detaches React roots).
  for (let i = 0; i < 5; i++) {
    const done = page
      .locator(
        [
          ".ecu-settings-phone-done",
          ".CommandPanel-phoneDone",
          ".BankPanel-phoneDone",
          ".MarketPanel-phoneDone",
          ".comm-bag-panel__phoneDone",
          ".ecu-chat-phone-done",
          ".comm-mail__phoneDone",
          ".ecu-phone-sheet__done",
          ".ecu-phone-sheet__done--foot",
        ].join(", "),
      )
      .filter({ hasText: /^Done$/ })
      .first();
    if (!(await done.count())) break;
    try {
      await done.click({ timeout: 800, force: true });
      await page.waitForTimeout(320);
    } catch {
      break;
    }
  }
  // Dismiss shade via its own chrome if still open
  const shadeDone = page
    .locator(".ecu-phone-shade button")
    .filter({ hasText: /^Done$|^Close$/ })
    .first();
  if (await shadeDone.count()) {
    try {
      await shadeDone.click({ timeout: 600, force: true });
      await page.waitForTimeout(200);
    } catch {
      /* ignore */
    }
  }
  await page.evaluate(() => {
    const shade = document.querySelector(".ecu-phone-shade");
    if (shade instanceof HTMLElement) shade.style.display = "none";
    document.documentElement.classList.remove("ecu-phone-sheet-open");
  });
  await page.waitForTimeout(200);
}

async function openSettingsViaShade(page) {
  await dismissOverlays(page);
  // Prefer Apps → Settings (reliable). Shade cog is secondary.
  if (await openAppsTile(page, "Settings")) {
    await page.waitForTimeout(300);
    if (
      await panelVisible(page, [
        ".ecu-settings-modal",
        ".ecu-settings-backdrop.is-phone",
      ])
    ) {
      return true;
    }
  }
  await closeSheets(page);
  // Swipe down from top for shade
  await page.evaluate(() => {
    const fromX = window.innerWidth / 2;
    const fromY = 12;
    const toY = 140;
    const target = document.elementFromPoint(fromX, fromY) || document.body;
    const fire = (type, x, y) => {
      const t = new Touch({
        identifier: 1,
        target,
        clientX: x,
        clientY: y,
        pageX: x,
        pageY: y,
        screenX: x,
        screenY: y,
      });
      window.dispatchEvent(
        new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          touches: type === "touchend" ? [] : [t],
          targetTouches: type === "touchend" ? [] : [t],
          changedTouches: [t],
        }),
      );
    };
    fire("touchstart", fromX, fromY);
    fire("touchmove", fromX, (fromY + toY) / 2);
    fire("touchmove", fromX, toY);
    fire("touchend", fromX, toY);
  });
  await page.waitForTimeout(400);
  const cog = page.locator(".ecu-phone-shade__cog, [aria-label='Settings']").first();
  if (await cog.count()) {
    await cog.click({ force: true });
    await page.waitForTimeout(600);
    return panelVisible(page, [
      ".ecu-settings-modal",
      ".ecu-settings-backdrop.is-phone",
    ]);
  }
  return false;
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

  try {
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  } catch (err) {
    ok("overlay reachable", false, String(err));
    writeFileSync(join(OUT, "drive-report.json"), JSON.stringify(report, null, 2));
    await browser.close();
    process.exit(1);
  }

  await page.waitForTimeout(2500);
  await dismissOverlays(page);
  await page.waitForTimeout(500);

  if (!(await assertCommUi(page))) {
    writeFileSync(join(OUT, "drive-report.json"), JSON.stringify(report, null, 2));
    await browser.close();
    process.exit(1);
  }

  const dock = await page.locator("[data-ecu-phone-dock='1']").count();
  ok("phone dock mounts", dock > 0, "count=" + dock);

  await clearTargetChrome(page);
  await page.waitForTimeout(200);
  await shot(page, "home-apps", "01-home");

  ok("open apps", await openApps(page));
  await shot(page, "home-apps", "02-apps");
  await closeSheets(page);

  ok("open chat", await openAppsTile(page, "Chat"));
  ok(
    "chat panel visible",
    await panelVisible(page, [".ecu-chat", '[data-panel="chat"]']),
  );
  // Prefer Party tab so fixture messages show
  const partyTab = page.locator(".ecu-chat-phone-seg-btn").filter({ hasText: "Party" }).first();
  if (await partyTab.count()) {
    await partyTab.click({ force: true });
    await page.waitForTimeout(300);
  }
  await shot(page, "chat", "01-open");
  await closeSheets(page);
  // Ensure chat shell fully dropped before next Apps open.
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    document.documentElement.classList.remove("ecu-phone-sheet-open");
  });

  let cmdOpened =
    (await openAppsTile(page, "Cmd")) || (await openAppsTile(page, "Command"));
  if (!cmdOpened) {
    await closeSheets(page);
    await page.waitForTimeout(300);
    cmdOpened =
      (await openAppsTile(page, "Cmd")) ||
      (await openAppsTile(page, "Command"));
  }
  ok("open command", cmdOpened);
  ok(
    "command panel visible",
    await panelVisible(page, [".CommandPanel", '[data-panel="command"]']),
  );
  await shot(page, "command", "01-open");
  await closeSheets(page);

  ok("open settings", await openSettingsViaShade(page));
  ok(
    "settings panel visible",
    await panelVisible(page, [
      ".ecu-settings-modal",
      ".ecu-settings-backdrop",
      '[data-panel="settings"]',
    ]),
  );
  await shot(page, "settings", "01-open");
  await closeSheets(page);

  const panelSelectors = {
    Bank: [".BankPanel", '[data-panel="bank"]'],
    Market: [".MarketPanel", '[data-panel="market"]'],
    Mail: [".comm-mail", '[data-panel="mail"]'],
    Bag: [
      ".comm-bag-panel",
      '[data-panel="bag"]',
      "#bottomleftcorner",
      ".ecu-preview-bag",
      ".ecu-phone-observe",
      "[data-ecu-phone-observe]",
    ],
  };

  for (const [flow, label] of [
    ["bank", "Bank"],
    ["market", "Market"],
    ["mail", "Mail"],
    ["bag", "Bag"],
  ]) {
    // Keep overlay fixtures + observe alive across long drives.
    await page.evaluate((wantBag) => {
      window.__ecuOverlayPreview = true;
      if (typeof window.__ecuReseedPhoneFixtures === "function") {
        window.__ecuReseedPhoneFixtures();
      }
      const ents = window.entities ? Object.values(window.entities) : [];
      let ent = window.observing;
      if (!ent || ent.id == null) {
        for (let i = 0; i < ents.length; i++) {
          if (ents[i] && ents[i].id != null && ents[i].type !== "monster") {
            ent = ents[i];
            break;
          }
        }
        if (!ent) {
          for (let i = 0; i < ents.length; i++) {
            if (ents[i] && ents[i].id != null) {
              ent = ents[i];
              break;
            }
          }
        }
        if (ent) window.observing = ent;
      }
      if (wantBag && typeof window.render_inventory === "function") {
        window.render_inventory(true);
      }
    }, label === "Bag");
    await page.waitForTimeout(200);
    let opened = await openAppsTile(page, label);
    if (label === "Bag" && opened) {
      for (let attempt = 0; attempt < 4; attempt++) {
        await page.evaluate(() => {
          window.__ecuOverlayPreview = true;
          if (typeof window.__ecuReseedPhoneFixtures === "function") {
            window.__ecuReseedPhoneFixtures();
          }
          const ents = window.entities ? Object.values(window.entities) : [];
          let ent = null;
          for (let i = 0; i < ents.length; i++) {
            if (
              ents[i] &&
              ents[i].id != null &&
              ents[i].type !== "monster"
            ) {
              ent = ents[i];
              break;
            }
          }
          if (!ent && ents[0] && ents[0].id != null) ent = ents[0];
          if (ent) window.observing = ent;
          if (typeof window.render_inventory === "function") {
            window.render_inventory(true);
          }
        });
        await page.waitForTimeout(550);
        const hasBag = await panelVisible(page, [
          ".comm-bag-panel",
          ".ecu-preview-bag",
          "#bottomleftcorner .ecu-preview-bag",
          "#comm-bag-mount .ecu-preview-bag",
          '[data-panel="bag"].ecu-bag-shell-expanded',
        ]);
        if (hasBag) break;
        await closeSheets(page);
        opened = await openAppsTile(page, "Bag");
      }
    }
    ok("open " + label, opened);
    if (opened) {
      ok(
        label + " panel visible",
        await panelVisible(page, panelSelectors[label]),
      );
      await shot(page, flow, "01-open");
    }
    await closeSheets(page);
  }

  writeFileSync(join(OUT, "drive-report.json"), JSON.stringify(report, null, 2));
  await browser.close();
  console.log("wrote shots →", OUT, "fails=" + report.fails.length);
  process.exit(report.fails.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
