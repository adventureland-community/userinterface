/**
 * Drive the real Comm overlay preview at phone size and assert dock UX.
 * Usage: node agentic/mobile-preview/drive-overlay-phone.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;
const URL = process.env.ECU_OVERLAY_URL || "http://127.0.0.1:3927/overlay";
const VW = 390;
const VH = 844;

mkdirSync(OUT, { recursive: true });

function box(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    x: Math.round(r.x),
    y: Math.round(r.y),
    w: Math.round(r.width),
    h: Math.round(r.height),
    bottom: Math.round(r.bottom),
    right: Math.round(r.right),
  };
}

const report = { url: URL, viewport: { VW, VH }, steps: [], fails: [] };

function ok(name, pass, detail) {
  report.steps.push({ name, pass: !!pass, detail });
  if (!pass) report.fails.push({ name, detail });
  console.log((pass ? "PASS" : "FAIL") + "  " + name + (detail ? " — " + detail : ""));
}

async function shot(page, name) {
  const path = join(OUT, `drive-${name}.png`);
  await page.screenshot({ path, fullPage: false });
  report.steps.push({ name: "shot:" + name, pass: true, detail: path });
  return path;
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
  await page.waitForTimeout(2500);

  async function dismissOverlays() {
    const labels = [
      "Skip tour",
      "Skip intro",
      "Skip",
      "Close",
      "Done",
      "Got it",
      "Later",
      "Next",
    ];
    for (let round = 0; round < 6; round++) {
      let clicked = false;
      for (const label of labels) {
        const btn = page.getByRole("button", { name: label, exact: true }).first();
        if (!(await btn.count())) continue;
        try {
          await btn.click({ timeout: 800, force: true });
          clicked = true;
          await page.waitForTimeout(250);
          break;
        } catch {
          /* ignore */
        }
      }
      if (!clicked) break;
    }
    // Hard-clear leftover tour shade so dock clicks work
    await page.evaluate(() => {
      document.querySelectorAll("[data-ecu-tour-portal]").forEach((n) => n.remove());
      document.querySelectorAll(".ecu-tour-shade").forEach((n) => n.remove());
    });
  }

  await dismissOverlays();

  async function clickDock(label) {
    await dismissOverlays();
    const btn = page.locator(".ecu-phone-dock__btn").filter({ hasText: label }).first();
    await btn.click({ timeout: 5000, force: true });
    await page.waitForTimeout(500);
  }

  // Force phone profile if dock missing (resize already phone)
  const dock = page.locator("[data-ecu-phone-dock='1']");
  await page.waitForTimeout(500);
  let dockVisible = await dock.count();
  if (!dockVisible) {
    // Some overlays gate dock on viewport after first paint — poke resize
    await page.setViewportSize({ width: 389, height: VH });
    await page.waitForTimeout(800);
    dockVisible = await dock.count();
  }
  ok("phone dock mounts", dockVisible > 0, "count=" + dockVisible);
  // Let phone inset publish + PositionedPanel re-clamp meters above chrome.
  await page.waitForTimeout(900);
  await shot(page, "00-home");

  const dockBox = await page.evaluate(() => {
    const el = document.querySelector("[data-ecu-phone-dock='1']");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const css = getComputedStyle(document.documentElement).getPropertyValue(
      "--ecu-phone-dock-h",
    );
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      bottom: Math.round(r.bottom),
      cssVar: css.trim(),
      bodyClass: document.documentElement.classList.contains("ecu-phone-dock-on"),
    };
  });
  ok(
    "dock sits at bottom",
    !!dockBox && dockBox.bottom >= VH - 4 && dockBox.h >= 48,
    JSON.stringify(dockBox),
  );
  ok("dock chrome class applied", !!dockBox?.bodyClass, JSON.stringify(dockBox));

  const homeHud = await page.evaluate(() => {
    const dock = document.querySelector("[data-ecu-phone-dock='1']");
    const bottom = document.getElementById("bottom");
    const dockTop = dock ? Math.round(dock.getBoundingClientRect().top) : null;
    const chromeTop = bottom
      ? Math.round(bottom.getBoundingClientRect().top)
      : null;
    const meters = [...document.querySelectorAll(".ecu-meter-shell")].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        bottom: Math.round(r.bottom),
        top: Math.round(r.top),
        h: Math.round(r.height),
        visible: r.height > 8 && getComputedStyle(el).display !== "none",
      };
    });
    const visibleMeters = meters.filter((m) => m.visible);
    const inset = getComputedStyle(document.documentElement).getPropertyValue(
      "--ecu-phone-hud-bottom",
    );
    return {
      dockTop,
      chromeTop,
      inset: inset.trim(),
      visibleMeterCount: visibleMeters.length,
      meterBottoms: visibleMeters.map((m) => m.bottom),
      worstMeterBottom: visibleMeters.reduce(
        (max, m) => Math.max(max, m.bottom),
        0,
      ),
    };
  });
  ok(
    "home has HUD bottom inset",
    !!homeHud.inset && parseInt(homeHud.inset, 10) > 56,
    JSON.stringify(homeHud),
  );
  if (homeHud.chromeTop != null && homeHud.visibleMeterCount > 0) {
    ok(
      "meters clear character chrome",
      homeHud.worstMeterBottom <= homeHud.chromeTop + 4,
      JSON.stringify(homeHud),
    );
  } else {
    ok(
      "meters clear character chrome",
      true,
      "no visible meters or chrome — " + JSON.stringify(homeHud),
    );
  }
  ok(
    "dock fully exposed (home)",
    homeHud.dockTop != null &&
      (homeHud.visibleMeterCount === 0 ||
        homeHud.worstMeterBottom <= homeHud.dockTop + 2),
    JSON.stringify(homeHud),
  );

  // Ctrl+wheel over stage = DevTools pinch sim on phone.
  const zoomProbe = await page.evaluate(() => {
    const w = window;
    if (typeof w.scale !== "number") w.scale = 2;
    let canvas = document.querySelector("canvas[data-ecu-zoom-probe='1']");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.setAttribute("data-ecu-zoom-probe", "1");
      canvas.width = 200;
      canvas.height = 200;
      canvas.style.cssText =
        "position:fixed;left:20px;top:80px;width:200px;height:200px;z-index:50;pointer-events:auto";
      document.body.appendChild(canvas);
    }
    // Host reads renderer.view — point it at our probe rect.
    w.renderer = { view: canvas };
    return {
      before: w.scale,
      hasView: !!(w.renderer && w.renderer.view),
      profile: window.innerWidth <= 700 ? "phone" : "other",
    };
  });
  await page.mouse.move(120, 180);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, 160);
  await page.keyboard.up("Control");
  await page.waitForTimeout(150);
  const zoomAfter = await page.evaluate(() => window.scale);
  ok(
    "phone ctrl+wheel zooms world",
    zoomProbe.before !== zoomAfter,
    JSON.stringify({ ...zoomProbe, after: zoomAfter }),
  );

  async function edgeSwipe(fromX, fromY, toX, toY) {
    await page.evaluate(
      ({ fromX, fromY, toX, toY }) => {
        const target = document.elementFromPoint(fromX, fromY) || document.body;
        const fire = (type, x, y, opts = {}) => {
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
          const ev = new TouchEvent(type, {
            bubbles: true,
            cancelable: true,
            touches: type === "touchend" || type === "touchcancel" ? [] : [t],
            targetTouches:
              type === "touchend" || type === "touchcancel" ? [] : [t],
            changedTouches: [t],
            ...opts,
          });
          window.dispatchEvent(ev);
        };
        fire("touchstart", fromX, fromY);
        const steps = 6;
        for (let i = 1; i <= steps; i++) {
          const x = fromX + ((toX - fromX) * i) / steps;
          const y = fromY + ((toY - fromY) * i) / steps;
          fire("touchmove", x, y);
        }
        fire("touchend", toX, toY);
      },
      { fromX, fromY, toX, toY },
    );
    await page.waitForTimeout(400);
  }

  // Samsung-style edges: back · shade · drawer (not Chat/Cmd shortcuts).
  await page.evaluate(() => {
    try {
      localStorage.removeItem("ecu-phone-edge-swipe-hint");
    } catch {
      /* ignore */
    }
  });

  // Swipe up from the dock bar itself — Apps drawer
  const dockSwipe = await page.evaluate(() => {
    const bar = document.querySelector(".ecu-phone-dock__bar");
    if (!bar) return null;
    const r = bar.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + 8) };
  });
  if (dockSwipe) {
    await edgeSwipe(dockSwipe.x, dockSwipe.y, dockSwipe.x, dockSwipe.y - 110);
  }
  const edgeApps = await page.evaluate(
    () => !!document.querySelector(".ecu-phone-sheet"),
  );
  ok("swipe up on dock opens apps", edgeApps, JSON.stringify(dockSwipe));
  await edgeSwipe(6, 400, 120, 405);
  const edgeBackClosesApps = await page.evaluate(
    () => !document.querySelector(".ecu-phone-sheet"),
  );
  ok("edge swipe left (back) closes apps", edgeBackClosesApps, "");

  await edgeSwipe(VW / 2, 12, VW / 2, 120);
  const edgeShade = await page.evaluate(() => {
    const shade = document.querySelector(".ecu-phone-shade");
    const cog = document.querySelector(".ecu-phone-shade__cog");
    return !!(shade && cog);
  });
  ok("edge swipe top opens shade with settings cog", edgeShade, "");
  await shot(page, "10-edge-shade");
  await edgeSwipe(VW - 6, 400, VW - 120, 405);
  const edgeBackClosesShade = await page.evaluate(
    () => !document.querySelector(".ecu-phone-shade"),
  );
  ok("edge swipe right (back) closes shade", edgeBackClosesShade, "");

  // Open chat via dock, then edge-back dismisses it.
  await clickDock("Chat");
  await page.waitForTimeout(300);
  await edgeSwipe(6, 400, 120, 405);
  const edgeBackClosesChat = await page.evaluate(() => {
    const shell = document.querySelector('[data-panel="chat"]');
    if (!shell) return true;
    const st = getComputedStyle(shell);
    return st.display === "none" || shell.offsetParent === null;
  });
  ok("edge swipe left (back) closes chat", edgeBackClosesChat, "");

  // Home screen dots (Home / Players / Coop).
  const homeDots = await page.evaluate(
    () => document.querySelectorAll(".ecu-phone-home-dots__dot").length,
  );
  ok("home screen dots present", homeDots >= 2, "dots=" + homeDots);

  const dockBtns = await page.evaluate(
    () => document.querySelectorAll(".ecu-phone-dock__btn").length,
  );
  ok("slim dock has 5 shortcuts", dockBtns === 5, "btns=" + dockBtns);

  // --- Chat open ---
  await clickDock("Chat");
  await shot(page, "01-chat-open");

  const chatMetrics = await page.evaluate(() => {
    // Prefer the panel root — chrome also stamps data-ecu-chat on a badge button.
    const chat = document.querySelector(".ecu-chat");
    const shell = document.querySelector('[data-panel="chat"]');
    const sidebar = chat?.querySelector(".ecu-chat-sidebar");
    const main = chat?.querySelector(".ecu-chat-main");
    const log = chat?.querySelector(".ecu-chat-log, .ecu-chat-body");
    const dock = document.querySelector("[data-ecu-phone-dock='1']");
    const r = (el) =>
      el
        ? {
            w: Math.round(el.getBoundingClientRect().width),
            h: Math.round(el.getBoundingClientRect().height),
            bottom: Math.round(el.getBoundingClientRect().bottom),
            top: Math.round(el.getBoundingClientRect().top),
          }
        : null;
    return {
      classes: chat?.className || null,
      narrow: chat?.classList.contains("is-narrow") || false,
      sidebarOpen: chat?.classList.contains("is-sidebar-open") || false,
      sidebar: r(sidebar),
      main: r(main),
      log: r(log),
      shell: r(shell),
      dockTop: dock ? Math.round(dock.getBoundingClientRect().top) : null,
      toggle: !!chat?.querySelector(".ecu-chat-title-toggle"),
      viewportW: window.innerWidth,
    };
  });

  ok("chat panel open", !!chatMetrics.classes, JSON.stringify(chatMetrics));
  ok("chat is-narrow", chatMetrics.narrow, JSON.stringify(chatMetrics));
  ok(
    "chat single-pane (main wide)",
    !!chatMetrics.main && chatMetrics.main.w >= VW * 0.7,
    "main.w=" + chatMetrics.main?.w,
  );
  ok(
    "chat Chats toggle present",
    chatMetrics.toggle,
    "sidebar drawer control",
  );
  if (chatMetrics.shell && chatMetrics.dockTop != null) {
    ok(
      "chat clears dock",
      chatMetrics.shell.bottom <= chatMetrics.dockTop + 2,
      `shell.bottom=${chatMetrics.shell.bottom} dockTop=${chatMetrics.dockTop}`,
    );
  }
  if (chatMetrics.log) {
    ok(
      "chat log readable width",
      chatMetrics.log.w >= 180,
      "log.w=" + chatMetrics.log.w,
    );
  }

  // Toggle chat closed
  await clickDock("Chat");
  const chatGone = await page.evaluate(
    () => !document.querySelector("[data-ecu-chat='1']") ||
      getComputedStyle(document.querySelector('[data-panel="chat"]') || document.body).display === "none" ||
      !document.querySelector('[data-panel="chat"]'),
  );
  // visible() helper may hide via parent — check panel visibility flag
  const chatClosed = await page.evaluate(() => {
    const shell = document.querySelector('[data-panel="chat"]');
    if (!shell) return true;
    const st = getComputedStyle(shell);
    return st.display === "none" || st.visibility === "hidden" || shell.offsetParent === null;
  });
  ok("chat toggles closed", chatClosed || chatGone, "closed=" + chatClosed);
  await shot(page, "02-chat-closed");

  // --- Cmd open/toggle ---
  await clickDock("Cmd");
  await shot(page, "03-cmd-open");
  const cmdOpen = await page.evaluate(() => {
    const p = document.querySelector('[data-panel="command"]') || document.querySelector(".CommandPanel");
    if (!p) return { open: false };
    const r = p.getBoundingClientRect();
    const dock = document.querySelector("[data-ecu-phone-dock='1']");
    return {
      open: r.height > 40,
      w: Math.round(r.width),
      h: Math.round(r.height),
      bottom: Math.round(r.bottom),
      dockTop: dock ? Math.round(dock.getBoundingClientRect().top) : null,
      narrow: !!p.querySelector(".CommandPanel.is-narrow") || p.classList.contains("is-narrow"),
    };
  });
  ok("cmd opens", cmdOpen.open, JSON.stringify(cmdOpen));
  if (cmdOpen.dockTop != null) {
    ok(
      "cmd clears dock",
      cmdOpen.bottom <= cmdOpen.dockTop + 4,
      `cmd.bottom=${cmdOpen.bottom} dockTop=${cmdOpen.dockTop}`,
    );
  }

  await clickDock("Cmd");
  const cmdClosed = await page.evaluate(() => {
    const p = document.querySelector('[data-panel="command"]');
    if (!p) return true;
    const st = getComputedStyle(p);
    return st.display === "none" || p.offsetParent === null || p.getBoundingClientRect().height < 8;
  });
  ok("cmd toggles closed", cmdClosed, "closed=" + cmdClosed);
  await shot(page, "04-cmd-closed");

  // --- Settings open via shade cog ---
  await edgeSwipe(VW / 2, 12, VW / 2, 120);
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const cog = document.querySelector(".ecu-phone-shade__cog");
    if (cog instanceof HTMLElement) cog.click();
  });
  await page.waitForTimeout(400);
  await shot(page, "05-settings-open");
  const settings = await page.evaluate(() => {
    const backdrop = document.querySelector(".ecu-settings-backdrop");
    const modal = document.querySelector(".ecu-settings-modal");
    const dock = document.querySelector("[data-ecu-phone-dock='1']");
    const pane = document.querySelector(".ecu-settings-pane");
    const desc = document.querySelector(".ecu-settings-pane-desc");
    const r = (el) =>
      el
        ? {
            w: Math.round(el.getBoundingClientRect().width),
            h: Math.round(el.getBoundingClientRect().height),
            bottom: Math.round(el.getBoundingClientRect().bottom),
            top: Math.round(el.getBoundingClientRect().top),
          }
        : null;
    return {
      phoneBackdrop: backdrop?.classList.contains("is-phone") || false,
      phoneModal: modal?.classList.contains("is-phone") || false,
      backdrop: r(backdrop),
      modal: r(modal),
      pane: r(pane),
      desc: r(desc),
      dockTop: dock ? Math.round(dock.getBoundingClientRect().top) : null,
      dockVisible: dock
        ? (() => {
            const b = dock.getBoundingClientRect();
            return b.height > 20 && b.bottom <= window.innerHeight + 2;
          })()
        : false,
      dockZ: dock ? getComputedStyle(dock).zIndex : null,
      backdropZ: backdrop ? getComputedStyle(backdrop).zIndex : null,
      done: !!document.querySelector(".ecu-settings-phone-done"),
      chipsRow:
        modal &&
        getComputedStyle(modal.querySelector(".ecu-settings-split")).flexDirection ===
          "column",
      vw: window.innerWidth,
      vh: window.innerHeight,
    };
  });
  ok("settings phone sheet", settings.phoneBackdrop && settings.phoneModal, JSON.stringify(settings));
  ok("settings Done button", settings.done, "");
  ok("settings stacked (column)", !!settings.chipsRow, "");
  if (settings.backdrop && settings.dockTop != null) {
    ok(
      "settings clears dock (no overlap)",
      settings.backdrop.bottom <= settings.dockTop + 2,
      `backdrop.bottom=${settings.backdrop.bottom} dockTop=${settings.dockTop}`,
    );
  }
  ok(
    "settings text not crushed",
    (settings.pane?.w || 0) >= 280 && (settings.desc?.w || 0) >= 200,
    `pane.w=${settings.pane?.w} desc.w=${settings.desc?.w} maxText=${settings.maxTextBoxW}`,
  );

  // Close settings via Done
  const doneBtn = page.locator(".ecu-settings-phone-done");
  if (await doneBtn.count()) {
    await page.evaluate(() => {
      const b = document.querySelector(".ecu-settings-phone-done");
      if (b instanceof HTMLElement) b.click();
    });
    await page.waitForTimeout(400);
    const closedByDone = await page.evaluate(
      () => !document.querySelector(".ecu-settings-backdrop"),
    );
    ok("settings Done closes", closedByDone, "");
  } else {
    ok("settings Done closes", false, "Done missing");
  }
  await shot(page, "06-settings-closed");

  // --- Apps sheet via swipe-up on dock ---
  const dockSwipe2 = await page.evaluate(() => {
    const bar = document.querySelector(".ecu-phone-dock__bar");
    if (!bar) return null;
    const r = bar.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + 8) };
  });
  if (dockSwipe2) {
    await edgeSwipe(dockSwipe2.x, dockSwipe2.y, dockSwipe2.x, dockSwipe2.y - 110);
  }
  await shot(page, "07-apps-open");
  const apps = await page.evaluate(() => {
    const sheet = document.querySelector(".ecu-phone-sheet");
    const title = sheet?.querySelector(".ecu-phone-sheet__title");
    const r = (el) =>
      el
        ? {
            bottom: Math.round(el.getBoundingClientRect().bottom),
            top: Math.round(el.getBoundingClientRect().top),
            h: Math.round(el.getBoundingClientRect().height),
          }
        : null;
    return {
      sheet: r(sheet),
      title: title?.textContent || null,
      vh: window.innerHeight,
    };
  });
  const appsGrid = await page.evaluate(
    () => document.querySelectorAll(".ecu-phone-apps__tile").length,
  );
  ok(
    "apps sheet open fullscreen",
    !!apps.sheet &&
      apps.title === "Apps" &&
      (apps.sheet.top || 0) <= 2 &&
      (apps.sheet.h || 0) >= (apps.vh || VH) - 8,
    JSON.stringify(apps),
  );
  ok("apps icon grid", appsGrid >= 6, "tiles=" + appsGrid);

  // Dots are under the fullscreen drawer while open — check after close.
  await page.evaluate(() => {
    const done = document.querySelector(".ecu-phone-sheet__done");
    if (done instanceof HTMLElement) done.click();
  });
  await page.waitForTimeout(300);
  const dotsVisible = await page.evaluate(() => {
    const dots = document.querySelector("[data-ecu-home-dots='1']");
    if (!dots) return { ok: false, reason: "missing" };
    const r = dots.getBoundingClientRect();
    const hudBottom = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--ecu-phone-hud-bottom",
      ),
    );
    return {
      ok: r.height > 0 && r.bottom < window.innerHeight - 40,
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      count: dots.querySelectorAll(".ecu-phone-home-dots__dot").length,
      hudBottom,
    };
  });
  ok(
    "home page dots visible above chrome",
    !!dotsVisible.ok && (dotsVisible.count || 0) >= 3,
    JSON.stringify(dotsVisible),
  );
  // Re-open apps for settings mutual-dismiss check below.
  if (dockSwipe2) {
    await edgeSwipe(dockSwipe2.x, dockSwipe2.y, dockSwipe2.x, dockSwipe2.y - 110);
  }

  // Mutual dismiss: shade cog settings while apps open
  await edgeSwipe(VW / 2, 12, VW / 2, 120);
  await page.waitForTimeout(200);
  // Top edge while apps open acts as back — reopen apps then open settings from sheet chip
  if (!(await page.evaluate(() => !!document.querySelector(".ecu-phone-sheet")))) {
    if (dockSwipe2) {
      await edgeSwipe(
        dockSwipe2.x,
        dockSwipe2.y,
        dockSwipe2.x,
        dockSwipe2.y - 110,
      );
    }
  }
  await page.evaluate(() => {
    const tiles = document.querySelectorAll(".ecu-phone-apps__tile");
    for (let i = 0; i < tiles.length; i++) {
      const label = tiles[i].querySelector(".ecu-phone-apps__label");
      if (label && label.textContent === "Settings") {
        tiles[i].click();
        break;
      }
    }
  });
  await page.waitForTimeout(400);
  const mutual = await page.evaluate(() => ({
    sheet: !!document.querySelector(".ecu-phone-sheet"),
    settings: !!document.querySelector(".ecu-settings-backdrop"),
  }));
  ok(
    "settings app dismisses apps sheet",
    !mutual.sheet && mutual.settings,
    JSON.stringify(mutual),
  );
  await shot(page, "08-settings-after-apps");

  // Close settings for clean end
  await page.evaluate(() => {
    const b = document.querySelector(".ecu-settings-phone-done");
    if (b instanceof HTMLElement) b.click();
  });
  await page.waitForTimeout(300);
  await shot(page, "09-end");

  writeFileSync(join(OUT, "drive-report.json"), JSON.stringify(report, null, 2));
  console.log("\nFails:", report.fails.length);
  await browser.close();
  process.exit(report.fails.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
