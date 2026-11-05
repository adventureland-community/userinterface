/**
 * Home UI + world/nameplate + home-page journey screenshots.
 * node agentic/mobile-preview/world-home/render-world-home.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, "shots");
mkdirSync(OUT, { recursive: true });

const css = `
html,body{margin:0;padding:0;background:#0e1014;font-family:Roboto,"Segoe UI",system-ui,sans-serif;color:#e6e1e5}
.phone{width:390px;height:780px;margin:0;position:relative;overflow:hidden;background:#12161c}
.world{position:absolute;inset:0 0 72px 0;background:
  radial-gradient(ellipse at 60% 40%,#3a2a38 0%,transparent 50%),
  linear-gradient(180deg,#2a2430 0%,#1a181c 55%,#121014 100%);
  overflow:hidden}
.cave{position:absolute;inset:0;opacity:.55;background:
  repeating-linear-gradient(90deg,transparent 0 28px,rgba(0,0,0,.12) 28px 29px),
  repeating-linear-gradient(0deg,transparent 0 22px,rgba(0,0,0,.08) 22px 23px)}
.floor{position:absolute;left:0;right:0;bottom:0;height:42%;background:linear-gradient(180deg,transparent,#5a4030 30%,#4a3428)}
.mob{position:absolute;width:36px;height:28px;border-radius:40% 40% 30% 30%;background:#4a3a58;box-shadow:0 0 0 2px #2a2038}
.char{position:absolute;width:28px;height:40px;border-radius:4px;background:linear-gradient(180deg,#7a9ab8,#3a5070);border:2px solid #1a2030}
.dmg{position:absolute;font-size:13px;font-weight:700;color:#f44;text-shadow:0 1px 2px #000;font-family:Consolas,monospace}
.heal{position:absolute;font-size:13px;font-weight:700;color:#4cf;text-shadow:0 1px 2px #000;font-family:Consolas,monospace}
.burn{position:absolute;font-size:18px;font-weight:800;color:#f80;text-shadow:0 2px 0 #400,0 0 8px #f40;letter-spacing:.02em}
.tag{position:absolute;z-index:3;transform:translateX(-50%);white-space:nowrap;font-family:Consolas,"Courier New",monospace;line-height:1;pointer-events:none}
.tag.bad{font-size:7px;background:#201f1f;color:#fff;padding:1px 3px;border:1px solid #716d6c;opacity:.95;filter:blur(.35px)}
.tag.good{font-size:12px;padding:2px 7px;border-radius:3px;background:rgba(7,8,10,.78);color:#fff;
  text-shadow:-1px 0 #000,1px 0 #000,0 -1px #000,0 1px #000;box-shadow:0 1px 2px rgba(0,0,0,.45);border:1px solid rgba(22,24,28,.55)}
.tag.party{color:#c9a8e0}
.joy{position:absolute;left:18px;bottom:96px;width:88px;height:88px;border-radius:50%;background:rgba(0,0,0,.28);border:2px solid rgba(255,255,255,.18)}
.joy::after{content:"";position:absolute;left:28px;top:28px;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.22)}
.follow{position:absolute;left:28px;bottom:196px;min-height:36px;padding:6px 12px;border-radius:8px;border:1px solid #555;background:rgba(20,20,24,.75);color:#ddd;font-size:13px}
.zoom{position:absolute;left:12px;bottom:88px;display:flex;gap:4px}
.zoom b{min-width:36px;min-height:28px;display:flex;align-items:center;justify-content:center;border:1px solid #444;background:rgba(0,0,0,.55);color:#ccc;font-size:11px;font-weight:600;border-radius:4px}
.players{position:absolute;right:10px;bottom:88px;min-height:36px;padding:6px 10px;border-radius:8px;border:1px solid #555;background:rgba(20,20,24,.75);color:#ddd;font-size:13px}
.pager{position:absolute;left:0;right:0;bottom:78px;display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:4px 8px;padding:4px 10px;z-index:4}
.side{display:inline-flex;align-items:center;gap:4px;min-height:36px;padding:4px 8px;border:1px solid transparent;border-radius:8px;background:rgba(28,27,31,.72);color:#cac4d0;font:inherit;font-size:11px;font-weight:600}
.side.prev{justify-self:start}.side.next{justify-self:end}
.center{display:flex;flex-direction:column;align-items:center;gap:3px}
.cur{font-size:12px;font-weight:700;color:#e8eef4;text-shadow:0 1px 2px rgba(0,0,0,.65)}
.track{display:flex;gap:8px}
.dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.45)}
.dot.on{background:#fff;transform:scale(1.25)}
.dock{position:absolute;left:0;right:0;bottom:0;height:72px;background:#1c1b1f;border-top:1px solid rgba(230,225,229,.12);display:flex;align-items:stretch;padding:10px 2px 8px;z-index:5;box-sizing:border-box}
.status{flex:1;min-width:0;margin:0 2px;padding:6px 10px;border:none;border-radius:12px;background:transparent;color:#cac4d0;text-align:left;font:inherit;min-height:52px}
.status .eye{display:block;font-size:9px;letter-spacing:.06em;text-transform:uppercase;color:#8a93a0}
.status .t{display:block;font-size:13px;font-weight:600;color:#e6e1e5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.status .mm{display:block;font-size:11px;color:#9dd4ec}
.apps{flex:0 0 72px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border:none;background:transparent;color:#9dd4ec;font:inherit;font-size:10px;font-weight:500}
.glyph{width:48px;height:26px;border-radius:14px;background:rgba(157,212,236,.16);display:flex;align-items:center;justify-content:center}
.banner{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:6;font-size:11px;padding:4px 10px;border-radius:999px;background:rgba(0,0,0,.65);border:1px solid #555;color:#ffe08a;font-weight:600}
`;

function dock(watching = true) {
  const char = watching
    ? `<button class="status" type="button"><span class="eye">Character</span><span class="t">Ahnaki</span><span class="mm">Lv. 83 · priest</span></button>`
    : `<button class="status" type="button"><span class="eye">Character</span><span class="t">Not observing</span><span class="mm">Tap to watch</span></button>`;
  return `<div class="dock">${char}<button class="apps" type="button"><span class="glyph">▦</span> Apps</button><button class="status" type="button"><span class="eye">Server</span><span class="t">EU I</span><span class="mm">67 · 40ms</span></button></div>`;
}

function pager(cur, prev, next, i, n) {
  let dots = "";
  for (let d = 0; d < n; d++) dots += `<span class="dot${d === i ? " on" : ""}"></span>`;
  return `<div class="pager"><button class="side prev" type="button">‹ ${prev}</button><div class="center"><div class="cur">${cur}</div><div class="track">${dots}</div></div><button class="side next" type="button">${next} ›</button></div>`;
}

function worldActors(tagClass) {
  return `
    <div class="cave"></div><div class="floor"></div>
    <div class="mob" style="left:18%;top:28%"></div>
    <div class="mob" style="left:62%;top:22%"></div>
    <div class="mob" style="left:72%;top:38%"></div>
    <div class="mob" style="left:40%;top:18%"></div>
    <div class="char" style="left:42%;top:44%"></div>
    <div class="tag ${tagClass}" style="left:calc(42% + 14px);top:36%">Ahnaki</div>
    <div class="char" style="left:52%;top:48%"></div>
    <div class="tag ${tagClass} party" style="left:calc(52% + 14px);top:40%">Red DJ</div>
    <div class="char" style="left:34%;top:50%"></div>
    <div class="tag ${tagClass}" style="left:calc(34% + 14px);top:42%">Houten</div>
    <div class="dmg" style="left:58%;top:24%">-4797</div>
    <div class="dmg" style="left:70%;top:30%">-5147</div>
    <div class="heal" style="left:44%;top:40%">+812</div>
    <div class="burn" style="left:28%;top:30%">STACK BURN!!</div>
    <div class="joy"></div>
    <button class="follow" type="button">Follow</button>
    <div class="zoom"><b>out</b><b>1x</b><b>in</b></div>
    <button class="players" type="button">Players ›</button>
  `;
}

function page(html) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${css}</style></head><body><div class="phone">${html}</div></body></html>`;
}

const shots = [
  {
    id: "01-home-idle",
    label: "Home page · not observing",
    html: page(`
      <div class="world"><div class="cave"></div><div class="floor"></div>
        <div class="char" style="left:46%;top:42%;opacity:.35"></div>
        <div style="position:absolute;left:16px;right:16px;top:18%;padding:14px 16px;border-radius:12px;background:rgba(0,0,0,.58);border:1px solid #3a4550;z-index:3;text-align:center">
          <div style="font-size:15px;font-weight:600;color:#e8eef4;margin-bottom:6px">Watch a character</div>
          <div style="font-size:12px;color:#a8aeb6;line-height:1.4;margin-bottom:12px">Open Character on the dock to follow someone. Bag and vision unlock after you Watch.</div>
          <button type="button" style="min-height:44px;padding:10px 18px;border-radius:8px;border:1px solid #a86;background:#2a2410;color:#ffe08a;font:inherit;font-size:14px;font-weight:600">Choose character</button>
        </div>
      </div>
      ${pager("Home", "Coop", "Players", 0, 3)}
      ${dock(false)}
    `),
  },
  {
    id: "02-players-nameplates-bad",
    label: "Players · current tiny/blurry nameplates",
    html: page(`
      <div class="banner">BEFORE · stock phone size</div>
      <div class="world">${worldActors("bad")}</div>
      ${pager("Players", "Home", "Coop", 1, 3)}
      ${dock(true)}
    `),
  },
  {
    id: "03-players-nameplates-good",
    label: "Players · phone-boosted soft nameplates",
    html: page(`
      <div class="banner">AFTER · phone ×2.25 soft plates</div>
      <div class="world">${worldActors("good")}</div>
      ${pager("Players", "Home", "Coop", 1, 3)}
      ${dock(true)}
    `),
  },
  {
    id: "04-coop-page",
    label: "Coop page · labeled pager",
    html: page(`
      <div class="world">${worldActors("good")}
        <div style="position:absolute;left:12px;right:12px;top:14px;padding:10px 12px;border-radius:10px;background:rgba(0,0,0,.55);border:1px solid #345;z-index:3">
          <div style="font-size:12px;font-weight:600;color:#9dd4ec;margin-bottom:6px">Party</div>
          <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0"><span>Ahnaki · priest</span><span style="color:#7ad86a">alive</span></div>
          <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0"><span>Red DJ · warrior</span><span style="color:#7ad86a">alive</span></div>
          <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0"><span>Houten · ranger</span><span style="color:#e8c96a">low HP</span></div>
        </div>
      </div>
      ${pager("Coop", "Players", "Home", 2, 3)}
      ${dock(true)}
    `),
  },
  {
    id: "05-fov-zoom-out",
    label: "World FOV zoom-out · plates stay large",
    html: page(`
      <div class="banner">FOV 2× · counter-scale + phone boost</div>
      <div class="world" style="transform:scale(0.72);transform-origin:50% 40%">
        ${worldActors("good")}
      </div>
      ${pager("Players", "Home", "Coop", 1, 3)}
      ${dock(true)}
    `),
  },
  {
    id: "06-fov-zoom-in",
    label: "World FOV zoom-in · phone boost kept",
    html: page(`
      <div class="banner">FOV 0.5× · counter-shrink + phone boost</div>
      <div class="world" style="transform:scale(1.6);transform-origin:50% 45%">
        ${worldActors("good").replace(/class="tag good/g, 'class="tag good" style="font-size:13px;padding:3px 8px')}
      </div>
      ${pager("Players", "Home", "Coop", 1, 3)}
      ${dock(true)}
    `),
  },
];

const browser = await chromium.launch();
const pageCtx = await browser.newPage({
  viewport: { width: 430, height: 860 },
  deviceScaleFactor: 2,
});
const manifest = [];
for (const s of shots) {
  await pageCtx.setContent(s.html, { waitUntil: "domcontentloaded" });
  await pageCtx.waitForTimeout(60);
  const file = join(OUT, `${s.id}.png`);
  await pageCtx.locator(".phone").screenshot({ path: file });
  manifest.push({ id: s.id, label: s.label, path: file.replace(/\\/g, "/") });
  console.log(s.id);
}
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));

// Keep the live Edge capture next to harness shots for rating.
const liveSrc =
  "C:/Users/thmsn/.t3/userdata/attachments/320dedf8-7adf-4156-95cc-9bb4a629ea9b-3036b047-3047-4cd0-8905-1dad9a98cd3f.jpg";
try {
  copyFileSync(liveSrc, join(OUT, "00-live-edge-home.jpg"));
  console.log("copied live shot");
} catch (e) {
  console.warn("live copy skipped", e.message);
}

await browser.close();
console.log("wrote", manifest.length, "→", OUT);
