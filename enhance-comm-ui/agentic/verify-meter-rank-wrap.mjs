/**
 * Overlay harness — coop_v2 ranks 9–12 stay on one line after rank-column fix.
 * Requires ecu-dev on :3927.
 *
 * Snapshot meters only live-tick while a combat segment is open, so this script
 * paints ranked rows into the live coop shell with the real meter CSS classes.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const URL = "http://127.0.0.1:3927/overlay";
const SETTINGS_KEY = "al-comm-ui-settings-v1";
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "meter-rank-wrap");

const NAMES = [
  "earthMag",
  "Shibtank",
  "Shibpri",
  "Shibmage",
  "Shibtank2",
  "Shibpri2",
  "makiz",
  "dreamweaver",
  "Rataladin",
  "Myras",
  "Shibmerch",
  "LordOfAliens",
  "Kraggnar",
  "Spadar",
  "SpadarMerch",
  "SpadarMerch2",
];

const results = [];

function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || "" });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 900, height: 700 },
  deviceScaleFactor: 2,
});

try {
  const health = await fetch("http://127.0.0.1:3927/health").then((r) =>
    r.json(),
  );
  check("dev server", health.ok === true, health.service);
  mkdirSync(OUT, { recursive: true });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.evaluate(
    ({ key }) => {
      let parsed = {};
      try {
        parsed = JSON.parse(localStorage.getItem(key) || "{}");
      } catch {
        parsed = {};
      }
      parsed.setupWizardDone = true;
      parsed.changelogSeenId = "0.11.1";
      parsed.metersHidden = false;
      parsed.panelVisible = {
        ...(parsed.panelVisible || {}),
        market: false,
        command: false,
        party: false,
        chat: false,
        mail: false,
        bank: false,
        threat: false,
        bossBar: false,
      };
      const meters = (
        Array.isArray(parsed.meterInstances) ? parsed.meterInstances : []
      ).filter((m) => m && m.id !== "meter-coop_v2");
      for (let i = 0; i < meters.length; i++) meters[i].visible = false;
      meters.push({
        id: "meter-coop_v2",
        label: "coop_v2",
        query: { kind: "snapshot", mode: "coop_v2" },
        presentation: "bars",
        selectedset: "current",
        partyFocus: "watched",
        fadeWhenIdle: false,
        hideWhenEmpty: false,
        pos: { x: 10, y: 10, anchor: "tl" },
        visible: true,
        opacity: 1,
        locked: false,
        frameW: 340,
        frameH: 400,
        zIndex: 9999,
        statusbar: { left: "segment", center: "clock", right: "pdps" },
      });
      parsed.meterInstances = meters;
      localStorage.setItem(key, JSON.stringify(parsed));
    },
    { key: SETTINGS_KEY },
  );
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1800);

  const painted = await page.evaluate((names) => {
    for (const sel of [
      ".ecu-tour-shade",
      "[data-ecu-tour-portal]",
      ".ecu-whats-new",
      ".ecu-setup-wizard",
      "#ecu-sim-dock",
    ]) {
      document.querySelectorAll(sel).forEach((el) => {
        el.style.display = "none";
      });
    }
    if (window.__ecuInstanceSim) window.__ecuInstanceSim.disable();

    const bossId = "coop-boss";
    const seed = () => {
      const rec = {};
      const obs = window.observing || window.character;
      if (obs?.id != null) {
        rec[String(obs.id)] = Object.assign({}, obs, {
          player: true,
          type: "character",
          s: { ...(obs.s || {}), coop: { p: 42000, id: bossId } },
        });
      }
      rec[bossId] = {
        id: bossId,
        name: "Franky",
        type: "monster",
        mtype: "franky",
        cooperative: true,
        visible: true,
        dead: false,
        hp: 1e6,
        max_hp: 1e6,
        map: "main",
        in: "main",
      };
      for (let i = 0; i < names.length; i++) {
        const name = names[i];
        rec[name] = {
          id: name,
          name,
          type: "character",
          player: true,
          ctype: "warrior",
          visible: true,
          dead: false,
          hp: 1,
          max_hp: 1,
          map: "main",
          in: "main",
          s: { coop: { p: 50000 - i * 2800, id: bossId } },
        };
      }
      window.entities = rec;
    };
    seed();
    clearInterval(window.__ecuRankSeedTimer);
    window.__ecuRankSeedTimer = setInterval(seed, 40);

    const ents = Object.values(window.entities || {});
    const ids = new Set(ents.map((e) => String(e.id)));
    const coopPlayers = ents
      .filter(
        (e) =>
          e.player &&
          e.type === "character" &&
          (e.s?.coop?.p || 0) > 0 &&
          e.s?.coop?.id != null &&
          ids.has(String(e.s.coop.id)),
      )
      .sort((a, b) => b.s.coop.p - a.s.coop.p);
    let total = 0.1;
    const values = coopPlayers.map((p) => {
      const v = Math.pow(Math.max(0, p.s.coop.p), 0.65);
      total += v;
      return v;
    });
    const max = Math.max(...values, 1);
    const coop = [...document.querySelectorAll(".ecu-meter-shell")].find((h) =>
      /coop_v2/i.test(h.textContent || ""),
    );
    const list = coop?.querySelector(
      ".ecu-meter-bar-list, .ecu-meter-bar-scroll",
    );
    if (!list) return { ok: false, reason: "no coop list" };
    list.innerHTML = "";
    for (let i = 0; i < coopPlayers.length; i++) {
      const p = coopPlayers[i];
      const value = values[i];
      const row = document.createElement("div");
      row.className = "ecu-meter-row";
      row.dataset.rank = String(i + 1);
      row.innerHTML =
        `<div class="ecu-meter-fill" style="width:${(value / max) * 100}%;background:hsl(${(i * 37) % 360} 55% 42%)"></div>` +
        `<span class="ecu-meter-rank">${i + 1}.</span>` +
        `<span class="ecu-meter-who"><span class="ecu-meter-label"></span></span>` +
        `<span class="ecu-meter-vals">${(value / 1000).toFixed(1)}k (${((value / total) * 100).toFixed(1)}%)</span>`;
      row.querySelector(".ecu-meter-label").textContent = p.name;
      list.appendChild(row);
    }

    const metrics = [...list.querySelectorAll(".ecu-meter-row")]
      .slice(8, 12)
      .map((row) => {
        const rank = row.querySelector(".ecu-meter-rank");
        const who = row.querySelector(".ecu-meter-who");
        return {
          rank: rank.textContent,
          name: row.querySelector(".ecu-meter-label").textContent,
          sameLine:
            Math.abs(
              rank.getBoundingClientRect().y - who.getBoundingClientRect().y,
            ) < 1,
          rankH: +rank.getBoundingClientRect().height.toFixed(1),
          whoH: +who.getBoundingClientRect().height.toFixed(1),
          rowH: +row.getBoundingClientRect().height.toFixed(1),
          ws: getComputedStyle(rank).whiteSpace,
        };
      });
    return { ok: true, rows: list.children.length, metrics };
  }, NAMES);

  check("painted rows", painted.ok && painted.rows >= 12, JSON.stringify(painted.metrics));
  if (painted.ok) {
    for (const m of painted.metrics) {
      check(
        `${m.rank} ${m.name} single-line`,
        m.sameLine && m.rankH <= m.rowH && m.whoH <= m.rowH && m.ws === "nowrap",
        `rankH=${m.rankH} whoH=${m.whoH} rowH=${m.rowH} ws=${m.ws}`,
      );
    }
  }

  await page.waitForTimeout(200);
  const panel = page.locator(".ecu-meter-shell").filter({ hasText: /coop_v2/i }).first();
  await panel.screenshot({ path: resolve(OUT, "coop-panel.png") });
  for (const n of [9, 10, 11]) {
    const handle = await page.$(`.ecu-meter-row[data-rank="${n}"]`);
    if (handle) await handle.screenshot({ path: resolve(OUT, `row-${n}.png`) });
  }
  const clip = await page.evaluate(() => {
    const coop = [...document.querySelectorAll(".ecu-meter-shell")].find((h) =>
      /coop_v2/i.test(h.textContent || ""),
    );
    const rows = [...coop.querySelectorAll(".ecu-meter-row")];
    const a = rows[8].getBoundingClientRect();
    const b = rows[11].getBoundingClientRect();
    const p = coop.getBoundingClientRect();
    return {
      x: Math.max(0, p.x),
      y: Math.max(0, a.y - 8),
      width: p.width,
      height: b.bottom - a.y + 16,
    };
  });
  await page.screenshot({ path: resolve(OUT, "ranks-9-12.png"), clip });
} catch (err) {
  check("harness", false, String(err));
  await page
    .screenshot({ path: resolve(OUT, "error.png") })
    .catch(() => {});
} finally {
  await browser.close();
}

console.log("\n=== Meter rank wrap harness ===\n");
for (const r of results) {
  console.log(
    `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`,
  );
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
console.log(`shots: ${OUT}`);
process.exit(failed ? 1 : 0);
