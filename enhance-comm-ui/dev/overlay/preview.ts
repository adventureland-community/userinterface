/**
 * Overlay preview boot — cached live G + stock sprite APIs + sim dock.
 * Stays synchronous when /al/data.js already set window.G (HTML blocking script).
 */

import {
  installInstanceSimDebug,
  setInstanceSimEnabled,
  subscribeInstanceSim,
} from "../../src/debug/instanceSim";
import { ensureGameData, installPreviewHost } from "./hostStub";
import {
  adoptLiveGameData,
  ensureSpriteApis,
  hasLiveG,
} from "./spriteApis";
import { mountSimDock, pinHudBelowToolbar } from "./simDock";
import { syncSimToHost } from "./simHost";
import { startWorldStage } from "./worldStage";

const SIM_TICK_MS = 250;

function startSimLoop(
  player: ReturnType<typeof installPreviewHost>["player"],
  party: ReturnType<typeof installPreviewHost>["party"],
): void {
  syncSimToHost(player, party);
  subscribeInstanceSim(() => syncSimToHost(player, party));
  window.setInterval(() => syncSimToHost(player, party), SIM_TICK_MS);
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

function bootWithG(gSource: "live" | "stub"): void {
  startWorldStage();
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

(function bootPreview() {
  "use strict";
  (window as any).__ecuOverlayPreview = true;
  if (typeof (window as any).__ecuAssetOrigin !== "string") {
    (window as any).__ecuAssetOrigin = "";
  }
  if (hasLiveG()) {
    adoptLiveGameData();
    ensureSpriteApis();
    bootWithG("live");
    return;
  }
  ensureGameData().then((src) => bootWithG(src));
})();
