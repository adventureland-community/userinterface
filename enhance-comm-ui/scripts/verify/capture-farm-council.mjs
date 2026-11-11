/**
 * Farm council captures with seeded session data.
 * Hides noisy chrome; seeds kills/gold/loot via __ecuSeedFarmPreview.
 * Shots: glance + each Details tab (overview / kills / gold / loot).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "shots", "farm-council");
mkdirSync(outDir, { recursive: true });

const PANEL_IDS = [
  "players",
  "enemies",
  "serverInfo",
  "mapInfo",
  "paperdoll",
  "buffInfo",
  "itemInfo",
  "kills",
  "playerFrame",
  "targetFrame",
  "bossBar",
  "instance",
  "instanceRun",
  "events",
  "eventScore",
  "eventRoster",
  "abilityTimeline",
  "abilityTimelineBigIcon",
  "abilityTimelineHighlight",
  "minimap",
  "threat",
  "command",
  "chat",
  "bag",
  "market",
  "bank",
  "mail",
  "toggles",
];

function allHiddenExceptKills() {
  const out = {};
  for (let i = 0; i < PANEL_IDS.length; i++) {
    out[PANEL_IDS[i]] = PANEL_IDS[i] === "kills";
  }
  return out;
}

async function boot(page) {
  await page.addInitScript((visible) => {
    localStorage.setItem(
      "al-comm-ui-settings-v1",
      JSON.stringify({
        layoutProfileMode: "desktop",
        setupWizardDone: true,
        whatsNewSeenVersion: "99.0.0",
        changelogSeenId: "0.19.0",
        metersHidden: true,
        hudDensity: "full",
        farmGlanceGrow: "right",
        farmGlanceCols: 2,
        farmGlanceRows: 2,
        panelVisible: visible,
        panelLayout: {
          kills: { x: 1.2, y: 78, anchor: "bl", autoSize: true },
        },
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
  }, allHiddenExceptKills());

  await page.goto(
    "http://127.0.0.1:3927/overlay/frame?embed=1&view=desktop&engine_mode=canvas",
    { waitUntil: "domcontentloaded", timeout: 120000 },
  );
  await page.waitForFunction(() => !!window.game_loaded, { timeout: 180000 });
  await page.waitForTimeout(1500);
  await page.waitForFunction(
    () => typeof window.__ecuSeedFarmPreview === "function",
    { timeout: 180000 },
  );
  await page.waitForSelector(".ecu-farm", { timeout: 180000 });

  await page.addStyleTag({
    content: `
      [data-ecu-sim-toggle], [data-ecu-sim-scenario], #ecu-sim-dock,
      .ecu-sim-dock, #topmid, #bottomleftcorner, #bottomrightcorner,
      #topleftcorner, #toprightcorner, #bottommid, #bottom, #gameactions,
      #pagewrapper > .menu, #topui, .gamebutton, #fps,
      .comm-pos-toggles, #comm-ui .comm-pos-panel:not(.comm-pos-kills) {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
        opacity: 0 !important;
      }
      #comm-ui .comm-pos-panel.comm-pos-kills {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
    `,
  });

  async function seedOnce() {
    await page.waitForFunction(
      () => typeof window.__ecuSeedFarmPreview === "function",
      { timeout: 60000 },
    );
    await page.evaluate(() => {
      window.__ecuSeedFarmPreview();
    });
  }
  await seedOnce();
  // Observing can attach after first seed and used to wipe kill rows — reseed.
  await page.waitForTimeout(800);
  await seedOnce();
  await page.waitForTimeout(600);
  await page.waitForFunction(
    () => {
      const gold = document.querySelector(".ecu-farm__gold-v");
      const text = (gold?.textContent || "").replace(/\s+/g, "");
      const rate = document.querySelector(".ecu-farm__rate");
      return (
        text.length > 0 &&
        !/^0g/.test(text) &&
        !!rate &&
        /\d/.test(rate.textContent || "")
      );
    },
    { timeout: 20000 },
  );
}

async function ensureGlance(page) {
  await page.evaluate(() => {
    if (document.querySelector(".ecu-farm--glance")) return;
    const btn = Array.from(
      document.querySelectorAll(".ecu-farm button.ecu-farm__btn"),
    ).find((b) => /Glance/i.test(b.textContent || ""));
    btn?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
  });
  await page.waitForSelector(".ecu-farm--glance", { timeout: 5000 });
  await page.waitForTimeout(150);
}

async function openDetailsTab(page, tabLabel) {
  await page.evaluate(() => {
    if (document.querySelector(".ecu-farm.is-details")) return;
    const open = document.querySelector(".ecu-farm__open");
    open?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
  });
  await page.waitForSelector(".ecu-farm.is-details", { timeout: 5000 });
  await page.evaluate((label) => {
    const tab = Array.from(
      document.querySelectorAll(".ecu-farm__tab"),
    ).find((t) => (t.textContent || "").trim() === label);
    tab?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
  }, tabLabel);
  await page.waitForTimeout(250);
}

async function shotPanel(page, name) {
  const path = join(outDir, name);
  await page.locator(".comm-pos-panel.comm-pos-kills").screenshot({ path });
  return path;
}

async function shotDesktop(page, name) {
  const path = join(outDir, name);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  await boot(page);
  await ensureGlance(page);

  const shots = [];
  shots.push({
    label: "Glance — live farm HUD (gold spark + nearby pace chips)",
    purpose:
      "While fighting: glance only. Gold rate + nameless nearby chips (mob + /m + top drop); cooltip/Details for depth.",
    path: await shotPanel(page, "live-01-glance.png"),
  });
  shots.push({
    label: "Glance on desktop (chrome hidden)",
    purpose: "Same glance in playfield context — should not fight the party mid-screen.",
    path: await shotDesktop(page, "live-01b-glance-desktop.png"),
  });

  await openDetailsTab(page, "Overview");
  shots.push({
    label: "Details · Overview — session KPIs + charts",
    purpose:
      "Opened panel: session kills/gold/loot rates, downtime, nearby count, pace charts when rolling.",
    path: await shotPanel(page, "live-02-details-overview.png"),
  });

  await openDetailsTab(page, "Kills");
  shots.push({
    label: "Details · Kills — per-monster table",
    purpose: "Break down session kills by mtype: /min, avg interval, count; near tag for glance set.",
    path: await shotPanel(page, "live-03-details-kills.png"),
  });

  await openDetailsTab(page, "Gold");
  shots.push({
    label: "Details · Gold — session purse pace",
    purpose: "Session gold totals and /min /h /kill plus sparkline over the farm window.",
    path: await shotPanel(page, "live-04-details-gold.png"),
  });

  await openDetailsTab(page, "Loot");
  shots.push({
    label: "Details · Loot — chest items",
    purpose: "Chest loot this session as ItemInstance tiles with items/min.",
    path: await shotPanel(page, "live-05-details-loot.png"),
  });

  shots.push({
    label: "Details · Loot on desktop (chrome hidden)",
    purpose: "Details window in playfield — readable without other HUD noise.",
    path: await shotDesktop(page, "live-05b-details-loot-desktop.png"),
  });

  const index = {
    scope: {
      surfaces: [
        "Farm glance (seeded)",
        "Farm details Overview / Kills / Gold / Loot (seeded)",
      ],
      viewports: ["desktop 1440×900 @2x"],
      passBar: "median ≥ 8 / 10",
      productBrief: {
        glance:
          "Floating combat HUD: gold pace + nearby chips (monster portrait + kill/m + top drop item). Names in cooltips. Click opens Details.",
        details:
          "Full Farm panel (Overview / Kills / Gold / Loot) for the same meters session — not a second timer.",
      },
    },
    shots,
  };
  writeFileSync(join(outDir, "live-index.json"), JSON.stringify(index, null, 2));
  console.log(JSON.stringify(index, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
