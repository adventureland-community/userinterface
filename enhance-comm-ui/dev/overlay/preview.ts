/**
 * Overlay preview boot — stock AL /comm host + sim dock + ECU.
 * Stays synchronous when /data.js already set window.G (HTML blocking script).
 */

import {
  installInstanceSimDebug,
  setInstanceSimEnabled,
  subscribeInstanceSim,
} from "../../src/debug/instanceSim";
import { bootStockHost } from "./bootStockHost";
import { installPreviewHost } from "./hostStub";
import { mountSimDock, pinHudBelowToolbar } from "./simDock";
import { syncSimToHost } from "./simHost";

const SIM_TICK_MS = 250;

function startSimLoop(
  player: ReturnType<typeof installPreviewHost>["player"],
  party: ReturnType<typeof installPreviewHost>["party"],
): void {
  syncSimToHost(player, party);
  subscribeInstanceSim(() => syncSimToHost(player, party));
  window.setInterval(() => syncSimToHost(player, party), SIM_TICK_MS);

  // Capture / console: update Preview+party so the 250ms sync tick does not
  // stomp window.entities back to 0,0.
  (
    window as Window & {
      __ecuPreviewPlace?: (x: number, y: number) => void;
    }
  ).__ecuPreviewPlace = (x, y) => {
    const slots: Array<{
      ent: typeof player | (typeof party)[number];
      dx: number;
      dy: number;
    }> = [
      { ent: player, dx: 0, dy: 0 },
      { ent: party[0], dx: -40, dy: 24 },
      { ent: party[1], dx: 40, dy: -24 },
    ];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (!s.ent) continue;
      const nx = x + s.dx;
      const ny = y + s.dy;
      s.ent.x = nx;
      s.ent.y = ny;
      s.ent.real_x = nx;
      s.ent.real_y = ny;
    }
    syncSimToHost(player, party);
    const bust = (
      window as Window & { __ecuBustNameTags?: () => void }
    ).__ecuBustNameTags;
    if (typeof bust === "function") bust();
  };
}

async function watchRebuild(): Promise<void> {
  let last = "";
  const poll = async () => {
    try {
      const res = await fetch("/health", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as {
        mtimeMs?: number;
        overlayMtimeMs?: number;
      };
      const fp = `${json.mtimeMs || 0}:${json.overlayMtimeMs || 0}`;
      if (last && fp !== last) {
        window.location.reload();
        return;
      }
      last = fp;
    } catch {
      /* server restarting */
    }
  };
  await poll();
  window.setInterval(poll, 1500);
}

function watchCommUiOffset(): void {
  pinHudBelowToolbar();
  let n = 0;
  const t = window.setInterval(() => {
    pinHudBelowToolbar();
    n += 1;
    if (document.getElementById("comm-ui") || n > 40) window.clearInterval(t);
  }, 50);
}

async function bootPreview(): Promise<void> {
  "use strict";
  (window as { __ecuOverlayPreview?: boolean }).__ecuOverlayPreview = true;
  if (typeof (window as { __ecuAssetOrigin?: string }).__ecuAssetOrigin !== "string") {
    (window as { __ecuAssetOrigin?: string }).__ecuAssetOrigin = "";
  }

  const stockOk = await bootStockHost();
  const gSource = stockOk ? "live" : "stub";
  if (!stockOk) {
    console.warn(
      "[ecu] stock host failed — Comm UI may still mount; world will be empty. Run npm run overlay:sync",
    );
  }

  const { player, party } = installPreviewHost();
  setInstanceSimEnabled(true);
  installInstanceSimDebug();
  startSimLoop(player, party);

  const mount = () => {
    mountSimDock(gSource);
    watchCommUiOffset();
  };
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
  watchRebuild();
}

bootPreview().catch((err) => {
  console.error("[ecu] overlay preview boot failed", err);
});
