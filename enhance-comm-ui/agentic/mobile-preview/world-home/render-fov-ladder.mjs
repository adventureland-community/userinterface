/**
 * Nameplate readability across FOV steps (phone boost on).
 * Models CSS-fit: world appears at 1/fov; plate screen size ≈ stock × (S/fov).
 * node agentic/mobile-preview/world-home/render-fov-ladder.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, "shots", "fov-ladder");
mkdirSync(OUT, { recursive: true });

const PHONE_BOOST = 2.25;

/** Mirror enhance-comm-ui/src/host/nameplateSharpness nameplateScreenScale(phone). */
function screenScale(f) {
  return Math.max(1 / 3, Math.min(8, f * PHONE_BOOST));
}

/**
 * Tag scale when tags live inside worldScale=1/f.
 * Child scale S/boost cancels parent shrink so screen size ≈ FOV=1 phone plate.
 */
function plateRel(f) {
  return screenScale(f) / PHONE_BOOST;
}

const FOVS = [0.5, 0.75, 1, 1.5, 2, 3, 4];

const css = `
html,body{margin:0;padding:0;background:#0e1014;font-family:Consolas,"Courier New",monospace;color:#e6e1e5}
.phone{width:390px;height:780px;margin:0;position:relative;overflow:hidden;background:#12161c}
.world{position:absolute;inset:0 0 56px 0;background:
  radial-gradient(ellipse at 55% 42%,#3a2a38 0%,transparent 48%),
  linear-gradient(180deg,#2a2430 0%,#1a181c 55%,#121014 100%);overflow:hidden}
.cave{position:absolute;inset:0;opacity:.5;background:
  repeating-linear-gradient(90deg,transparent 0 28px,rgba(0,0,0,.12) 28px 29px),
  repeating-linear-gradient(0deg,transparent 0 22px,rgba(0,0,0,.08) 22px 23px)}
.floor{position:absolute;left:0;right:0;bottom:0;height:40%;background:linear-gradient(180deg,transparent,#5a4030 30%,#4a3428)}
.stage{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%)}
.char{position:absolute;width:28px;height:40px;border-radius:4px;background:linear-gradient(180deg,#7a9ab8,#3a5070);border:2px solid #1a2030}
.mob{position:absolute;width:32px;height:26px;border-radius:40%;background:#4a3a58;box-shadow:0 0 0 2px #2a2038}
.tag{position:absolute;z-index:3;transform:translateX(-50%);white-space:nowrap;line-height:1;pointer-events:none;
  padding:2px 7px;border-radius:3px;background:rgba(7,8,10,.82);color:#fff;
  text-shadow:-1px 0 #000,1px 0 #000,0 -1px #000,0 1px #000;box-shadow:0 1px 2px rgba(0,0,0,.45);border:1px solid rgba(22,24,28,.55);
  font-size:12px;font-weight:700}
.tag.party{color:#e8d4f8}
.banner{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:6;font-size:11px;padding:5px 12px;border-radius:999px;background:rgba(0,0,0,.72);border:1px solid #555;color:#ffe08a;font-weight:600;font-family:"Segoe UI",sans-serif;white-space:nowrap}
.meta{position:absolute;left:10px;right:10px;bottom:64px;z-index:5;font:11px/1.35 "Segoe UI",sans-serif;color:#9ab;text-align:center}
.dock{position:absolute;left:0;right:0;bottom:0;height:52px;background:#1c1b1f;border-top:1px solid rgba(230,225,229,.12);display:flex;align-items:center;justify-content:space-around;font:10px "Segoe UI",sans-serif;color:#cac4d0;z-index:5}
.dock .on{color:#9dd4ec}
`;

function scene(fov) {
  const worldScale = 1 / fov;
  const tagScale = plateRel(fov);
  const S = screenScale(fov);
  const screenMul = (S / fov).toFixed(2);
  const label =
    fov < 1
      ? `FOV ${fov}× · zoom-in · plate screen ×${screenMul}`
      : fov === 1
        ? `FOV 1× · default · phone boost ×${PHONE_BOOST}`
        : `FOV ${fov}× · zoom-out · plate screen ×${screenMul}`;
  // Spread chars a bit more at zoom-in so boosted plates don't stack as hard.
  const spread = fov < 1 ? 1.15 / fov : 1;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${css}</style></head><body>
<div class="phone">
  <div class="banner">${label}</div>
  <div class="world">
    <div class="cave"></div><div class="floor"></div>
    <div class="stage" style="transform:translate(-50%,-50%) scale(${worldScale})">
      <div class="mob" style="left:${-110 * spread}px;top:-70px"></div>
      <div class="mob" style="left:${90 * spread}px;top:-90px"></div>
      <div class="mob" style="left:${130 * spread}px;top:-20px"></div>
      <div class="char" style="left:${-48 * spread}px;top:0"></div>
      <div class="tag" style="left:${-34 * spread}px;top:-28px;transform:translateX(-50%) scale(${tagScale});transform-origin:50% 100%">Houten</div>
      <div class="char" style="left:0;top:-8px"></div>
      <div class="tag" style="left:14px;top:-36px;transform:translateX(-50%) scale(${tagScale});transform-origin:50% 100%">Ahnaki</div>
      <div class="char" style="left:${52 * spread}px;top:6px"></div>
      <div class="tag party" style="left:${66 * spread}px;top:-22px;transform:translateX(-50%) scale(${tagScale});transform-origin:50% 100%">Red DJ</div>
    </div>
  </div>
  <div class="meta">S=${S} · world ${worldScale.toFixed(2)}× · tag×${tagScale.toFixed(2)} · screen×${screenMul}</div>
  <div class="dock"><span class="on">Apps</span><span>Chat</span><span>Cmd</span><span>⚙</span></div>
</div></body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 430, height: 860 },
  deviceScaleFactor: 2,
});
const manifest = [];
for (const fov of FOVS) {
  const id = `fov-${String(fov).replace(".", "p")}`;
  await page.setContent(scene(fov), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(40);
  const file = join(OUT, `${id}.png`);
  await page.locator(".phone").screenshot({ path: file });
  const entry = {
    id,
    fov,
    screenScale: screenScale(fov),
    worldScale: 1 / fov,
    plateRel: plateRel(fov),
    path: file.replace(/\\/g, "/"),
  };
  manifest.push(entry);
  console.log(id, "S=", entry.screenScale, "rel=", entry.plateRel.toFixed(3));
}

// Before/after zoom-in comparison (old bug: S=f without phone boost)
let before = scene(0.5);
const oldS = 0.5;
const oldRel = oldS / PHONE_BOOST; // tags inside worldScale — no phone boost
before = before.replaceAll(
  `scale(${plateRel(0.5)})`,
  `scale(${oldRel})`,
);
before = before.replace(
  /FOV 0\.5× · zoom-in · plate screen ×[0-9.]+/,
  "BEFORE · FOV 0.5× · no phone boost on zoom-in",
);
before = before.replace(
  /S=[0-9.]+ · world 2\.00× · tag×[0-9.]+ · screen×[0-9.]+/,
  `S=${oldS} · world 2.00× · tag×${oldRel.toFixed(2)} · screen×${(oldS / 0.5).toFixed(2)}`,
);
await page.setContent(before, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(40);
const beforePath = join(OUT, "fov-0p5-before.png");
await page.locator(".phone").screenshot({ path: beforePath });
manifest.push({
  id: "fov-0p5-before",
  fov: 0.5,
  note: "old bug: S=f without phone boost",
  path: beforePath.replace(/\\/g, "/"),
});

writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
await browser.close();
console.log("wrote", manifest.length, "→", OUT);
