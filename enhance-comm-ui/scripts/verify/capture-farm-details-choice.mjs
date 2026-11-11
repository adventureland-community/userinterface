/**
 * Structural choice pack: Details · Loot on desktop — three live layout contracts.
 * A = current BL dock (control)
 * B = short scroll dock (max ~180px body)
 * C = bottom-center peek sheet
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "shots", "farm-council", "choice-details-desktop");
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

const VARIANTS = {
  A: {
    id: "A",
    label: "Bottom-left full dock (control)",
    css: `
      #comm-ui .comm-pos-panel.comm-pos-kills {
        left: 8px !important;
        bottom: 48px !important;
        top: auto !important;
        right: auto !important;
        transform: none !important;
      }
      .ecu-farm.is-details .ecu-farm__body {
        max-height: none !important;
        overflow: visible !important;
      }
    `,
  },
  B: {
    id: "B",
    label: "Bottom-left short scroll dock",
    css: `
      #comm-ui .comm-pos-panel.comm-pos-kills {
        left: 8px !important;
        bottom: 48px !important;
        top: auto !important;
        right: auto !important;
        transform: none !important;
      }
      .ecu-farm.is-details .ecu-farm__body {
        max-height: 160px !important;
        overflow-y: auto !important;
      }
      .ecu-farm.is-details {
        max-width: 240px !important;
      }
    `,
  },
  C: {
    id: "C",
    label: "Bottom-center peek sheet",
    css: `
      #comm-ui .comm-pos-panel.comm-pos-kills {
        left: 50% !important;
        bottom: 12px !important;
        top: auto !important;
        right: auto !important;
        transform: translateX(-50%) !important;
      }
      .ecu-farm.is-details .ecu-farm__body {
        max-height: 140px !important;
        overflow-y: auto !important;
      }
      .ecu-farm.is-details {
        max-width: min(420px, 70vw) !important;
        width: max-content !important;
      }
    `,
  },
};

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
  await page.waitForTimeout(1200);
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

  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => window.__ecuSeedFarmPreview());
    await page.waitForTimeout(600);
  }

  await page.evaluate(() => {
    if (document.querySelector(".ecu-farm.is-details")) return;
    document
      .querySelector(".ecu-farm__open")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await page.waitForSelector(".ecu-farm.is-details", { timeout: 5000 });
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll(".ecu-farm__tab")).find(
      (t) => (t.textContent || "").trim() === "Loot",
    );
    tab?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(250);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await boot(page);

  const shots = [];
  const keys = Object.keys(VARIANTS);
  for (let i = 0; i < keys.length; i++) {
    const v = VARIANTS[keys[i]];
    await page.evaluate(() => {
      document.getElementById("ecu-farm-choice-variant")?.remove();
    });
    await page.addStyleTag({
      content: v.css,
    });
    // Tag last style for removal — Playwright addStyleTag doesn't return id easily; use evaluate inject.
    await page.evaluate((css) => {
      document.getElementById("ecu-farm-choice-variant")?.remove();
      const el = document.createElement("style");
      el.id = "ecu-farm-choice-variant";
      el.textContent = css;
      document.head.appendChild(el);
    }, v.css);
    await page.waitForTimeout(200);
    const name = `choice-${v.id}-loot-desktop.png`;
    const path = join(outDir, name);
    await page.screenshot({ path, fullPage: false });
    shots.push({
      id: v.id,
      label: v.label,
      path,
      purpose: "Details · Loot on desktop fight canvas",
    });
  }

  const index = {
    decision: "details-desktop-intrusion",
    question: "Which Details · Loot desktop layout keeps the fight readable?",
    viewports: ["desktop 1440×900 @2x"],
    shots,
  };
  writeFileSync(join(outDir, "index.json"), JSON.stringify(index, null, 2));
  console.log(JSON.stringify(index, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
