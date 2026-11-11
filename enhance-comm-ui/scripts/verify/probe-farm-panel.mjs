/**
 * Overlay harness for Farm panel (replaces Kill KPI).
 * Proves glance chrome, Details tabs, and Comm HUD Farm glance settings.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "shots");
mkdirSync(outDir, { recursive: true });

async function boot(page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "al-comm-ui-settings-v1",
      JSON.stringify({
        layoutProfileMode: "desktop",
        setupWizardDone: true,
        whatsNewSeenVersion: "99.0.0",
        changelogSeenId: "0.19.0",
        farmGlanceGrow: "right",
        farmGlanceCols: 2,
        farmGlanceRows: 2,
        panelVisible: { kills: true },
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
    () => !!(window.game_loaded && document.getElementById("comm-ui")),
    { timeout: 120000 },
  );
  await page.waitForTimeout(1500);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const report = { ok: false, steps: [] };

  try {
    await boot(page);

    const glance = await page.evaluate(() => {
      const panel = document.querySelector(".comm-pos-panel.comm-pos-kills");
      const farm = document.querySelector(".ecu-farm");
      const title = farm?.querySelector(".ecu-farm__title")?.textContent || "";
      const gold = !!farm?.querySelector(".ecu-farm__gold");
      const detailsBtn = Array.from(
        farm?.querySelectorAll("button.ecu-farm__btn") || [],
      ).find((b) => /Details|Glance/i.test(b.textContent || ""));
      return {
        panel: !!panel,
        farm: !!farm,
        title: title.trim(),
        gold,
        detailsLabel: detailsBtn?.textContent?.trim() || null,
      };
    });
    report.steps.push({ name: "glance", ...glance });
    if (!glance.farm || !/Farm/i.test(glance.title)) {
      throw new Error("Farm glance missing: " + JSON.stringify(glance));
    }

    const opened = await page.evaluate(() => {
      const btns = Array.from(
        document.querySelectorAll(".ecu-farm button.ecu-farm__btn"),
      );
      const d = btns.find((b) => /Details/i.test(b.textContent || ""));
      if (!d) return false;
      d.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      return true;
    });
    if (!opened) throw new Error("Details button missing");
    await page.waitForSelector(".ecu-farm.is-details", { timeout: 5000 });

    const details = await page.evaluate(() => {
      const farm = document.querySelector(".ecu-farm.is-details");
      const tabs = Array.from(
        farm?.querySelectorAll(".ecu-farm__tab") || [],
      ).map((t) => (t.textContent || "").trim());
      return {
        details: !!farm,
        tabs,
        hasKpi: !!farm?.querySelector(".ecu-farm__kpi-row"),
      };
    });
    report.steps.push({ name: "details", ...details });
    if (
      !details.details ||
      details.tabs.join(",") !== "Overview,Kills,Gold,Loot"
    ) {
      throw new Error("Farm details tabs wrong: " + JSON.stringify(details));
    }

    await page.evaluate(() => {
      const tab = Array.from(
        document.querySelectorAll(".ecu-farm__tab"),
      ).find((t) => /Loot/i.test(t.textContent || ""));
      tab?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });
    await page.waitForFunction(
      () =>
        (document.querySelector(".ecu-farm__body")?.textContent || "").includes(
          "No chest loot",
        ),
      { timeout: 5000 },
    );
    report.steps.push({ name: "loot-empty", ok: true });

    // Settings → Comm HUD → Farm glance
    await page.evaluate(() => {
      const settings = document.querySelector(
        '#comm-ui button[title="Settings"]',
      );
      settings?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });
    await page.waitForSelector(".ecu-settings-nav-btn", { timeout: 10000 });
    await page.evaluate(() => {
      const nav = Array.from(
        document.querySelectorAll(".ecu-settings-nav-btn"),
      ).find((b) => /Comm HUD/i.test(b.textContent || ""));
      nav?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });
    await page.waitForSelector("#ecu-sec-farm-glance", { timeout: 15000 });
    await page.evaluate(() => {
      document
        .getElementById("ecu-sec-farm-glance")
        ?.scrollIntoView({ block: "center" });
      const growRow = Array.from(
        document.querySelectorAll(".ecu-settings-row"),
      ).find((el) => /Grow/i.test(el.textContent || ""));
      const select = growRow?.querySelector("select");
      if (!select) return;
      select.value = "down";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForTimeout(150);

    const farmSection = await page.evaluate(() => {
      const raw = JSON.parse(
        localStorage.getItem("al-comm-ui-settings-v1") || "{}",
      );
      return {
        section: !!document.getElementById("ecu-sec-farm-glance"),
        grow: raw.farmGlanceGrow,
        cols: raw.farmGlanceCols,
        rows: raw.farmGlanceRows,
      };
    });
    report.steps.push({ name: "settings-farm-glance", ...farmSection });
    if (!farmSection.section) {
      throw new Error("Farm glance settings section missing");
    }
    if (farmSection.grow !== "down") {
      throw new Error("farmGlanceGrow did not patch: " + farmSection.grow);
    }

    const shot = join(outDir, "farm-panel-details.png");
    await page.screenshot({ path: shot, fullPage: false });
    report.shot = shot;
    report.ok = true;
  } catch (err) {
    report.error = String(err && err.message ? err.message : err);
    try {
      const shot = join(outDir, "farm-panel-error.png");
      await page.screenshot({ path: shot, fullPage: false });
      report.shot = shot;
    } catch {
      /* ignore */
    }
  } finally {
    await browser.close();
  }

  const jsonPath = join(outDir, "farm-panel-probe.json");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main();
