/**
 * Headless Chrome probe: overlay ability-timeline marker motion.
 * Usage: node agentic/probe-ability-timeline.mjs
 */
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const OVERLAY = process.env.ECU_OVERLAY || "http://127.0.0.1:3927/overlay";
const CHROME =
  process.env.CHROME ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = Number(process.env.CDP_PORT || 9333);
const OUT_DIR = process.env.ECU_PROBE_OUT || join(tmpdir(), "ecu-abil-probe");
mkdirSync(OUT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitJson(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {
      /* chrome starting */
    }
    await sleep(150);
  }
  throw new Error("CDP not ready: " + url);
}

function cdp(ws, id, method, params) {
  return new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      let msg;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (msg.id !== id) return;
      ws.removeEventListener("message", onMsg);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    };
    ws.addEventListener("message", onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const userData = mkdtempSync(join(tmpdir(), "ecu-chrome-"));
const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userData}`,
    "--headless=new",
    "--disable-gpu",
    "--window-size=1400,900",
    "--no-first-run",
    "--no-default-browser-check",
    OVERLAY,
  ],
  { stdio: "ignore" },
);

try {
  const targets = await waitJson(`http://127.0.0.1:${PORT}/json/list`);
  let page = targets.find(
    (t) => t.type === "page" && String(t.url || "").includes("overlay"),
  );
  if (!page) page = targets.find((t) => t.type === "page");
  if (!page?.webSocketDebuggerUrl) {
    throw new Error("No page target: " + JSON.stringify(targets));
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });
  let n = 1;
  await cdp(ws, n++, "Page.enable");
  await cdp(ws, n++, "Runtime.enable");
  await cdp(ws, n++, "Page.bringToFront");
  await cdp(ws, n++, "Page.reload", { ignoreCache: true });
  await new Promise((resolve) => {
    const onMsg = (ev) => {
      let msg;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (msg.method === "Page.loadEventFired") {
        ws.removeEventListener("message", onMsg);
        resolve();
      }
    };
    ws.addEventListener("message", onMsg);
    setTimeout(() => {
      ws.removeEventListener("message", onMsg);
      resolve();
    }, 4000);
  });
  await sleep(400);

  const ready = await cdp(ws, n++, "Runtime.evaluate", {
    expression: `new Promise((resolve) => {
      const start = Date.now();
      const tick = () => {
        const sim = window.__ecuInstanceSim;
        if (sim && !sim.isActive()) sim.enable("crypt-pull");
        const skip = [...document.querySelectorAll("button")].find((b) =>
          /skip tour/i.test(b.textContent || ""),
        );
        if (skip) skip.click();
        const markers = document.querySelectorAll(".ecu-abil-scroll-marker");
        const shells = {
          rail: !!document.querySelector(".comm-pos-abilityTimeline"),
          bigIcon: !!document.querySelector(".comm-pos-abilityTimelineBigIcon"),
          highlight: !!document.querySelector(".comm-pos-abilityTimelineHighlight"),
        };
        const toolbar = document.querySelectorAll(".ecu-abil-toolbar").length;
        if (markers.length) {
          return resolve({
            markers: markers.length,
            ms: Date.now() - start,
            shells,
            toolbar,
          });
        }
        if (Date.now() - start > 8000) {
          return resolve({
            markers: 0,
            ms: Date.now() - start,
            shells,
            toolbar,
          });
        }
        requestAnimationFrame(tick);
      };
      tick();
    })`,
    awaitPromise: true,
    returnByValue: true,
  });
  console.log("ready", ready.result.value);
  await sleep(400);

  const shot1 = await cdp(ws, n++, "Page.captureScreenshot", {
    format: "png",
  });
  writeFileSync(join(OUT_DIR, "timeline-before.png"), Buffer.from(shot1.data, "base64"));

  const samples = await cdp(ws, n++, "Runtime.evaluate", {
    expression: `new Promise((resolve) => {
      const out = [];
      const t0 = performance.now();
      const grab = () => {
        const now = performance.now();
        const markers = [...document.querySelectorAll(".ecu-abil-scroll-marker")].map((el) => {
          const r = el.getBoundingClientRect();
          const lane = el.closest(".ecu-abil-scroll-lane");
          const lr = lane ? lane.getBoundingClientRect() : null;
          const st = getComputedStyle(el);
          const target = el.closest("[data-target]");
          return {
            id:
              (target &&
                target.getAttribute("data-target") +
                  ":" +
                  el.getAttribute("data-ability")) ||
              el.getAttribute("data-ability"),
            y: Math.round(r.top * 10) / 10,
            x: Math.round(r.left * 10) / 10,
            h: Math.round(r.height * 10) / 10,
            laneH: lr ? Math.round(lr.height * 10) / 10 : 0,
            laneY: lr ? Math.round(lr.top * 10) / 10 : 0,
            bottom: el.style.bottom || st.bottom,
            top: el.style.top || st.top,
            cls: el.className,
          };
        });
        out.push({ t: Math.round(now - t0), markers });
        if (now - t0 >= 1200) return resolve(out);
        requestAnimationFrame(grab);
      };
      requestAnimationFrame(grab);
    })`,
    awaitPromise: true,
    returnByValue: true,
  });

  const rows = samples.result.value || [];
  const byId = {};
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    for (let j = 0; j < row.markers.length; j++) {
      const m = row.markers[j];
      if (!byId[m.id]) byId[m.id] = [];
      byId[m.id].push({
        t: row.t,
        y: m.y,
        x: m.x,
        h: m.h,
        laneH: m.laneH,
        laneY: m.laneY,
        bottom: m.bottom,
      });
    }
  }
  const report = {};
  const ids = Object.keys(byId);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const pts = byId[id];
    let reverse = 0;
    let maxStep = 0;
    let maxDx = 0;
    let pauses = 0;
    const steps = [];
    for (let k = 1; k < pts.length; k++) {
      const dy = pts[k].y - pts[k - 1].y;
      const dx = pts[k].x - pts[k - 1].x;
      const dt = pts[k].t - pts[k - 1].t;
      const ady = Math.abs(dy);
      if (ady > maxStep) maxStep = ady;
      if (Math.abs(dx) > maxDx) maxDx = Math.abs(dx);
      if (ady < 0.05) pauses += 1;
      if (dy * (pts[1].y - pts[0].y) < -0.2) reverse += 1;
      if (ady >= 1.5 || Math.abs(dx) >= 1.5)
        steps.push({
          t: pts[k].t,
          dy,
          dx,
          dt,
          laneH: pts[k].laneH,
          laneY: pts[k].laneY,
          h: pts[k].h,
          bottom: pts[k].bottom,
        });
    }
    report[id] = {
      n: pts.length,
      y0: pts[0]?.y,
      y1: pts[pts.length - 1]?.y,
      maxStep,
      maxDx,
      pauses,
      reverse,
      bigSteps: steps.slice(0, 12),
    };
  }
  console.log(JSON.stringify({ frames: rows.length, report }, null, 2));
  writeFileSync(
    join(OUT_DIR, "timeline-samples.json"),
    JSON.stringify({ frames: rows.length, report, rows: rows.slice(0, 8) }, null, 2),
  );

  const shot2 = await cdp(ws, n++, "Page.captureScreenshot", {
    format: "png",
  });
  writeFileSync(join(OUT_DIR, "timeline-after.png"), Buffer.from(shot2.data, "base64"));
  console.log("wrote", OUT_DIR);
  ws.close();
} finally {
  chrome.kill();
}
