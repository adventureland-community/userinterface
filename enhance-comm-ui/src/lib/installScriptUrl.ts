/**
 * Userscript install URL for Settings QR / copy.
 * Primary install is always the GitHub raw userscript. Dev builds also bake a
 * LAN `/enhance-comm-ui.user.js` URL for a folded-away developer handoff
 * (full userscript — mobile TM often cannot GM.xhr HTTP LAN from HTTPS).
 */

import {
  pickDevInstallUrlFromBases,
  rankedDevInstallUrlsFromBases,
} from "./lanIpv4";

export const ECU_PRODUCTION_SCRIPT_URL =
  "https://raw.githubusercontent.com/adventureland-community/userinterface/feature/enhance-comm-ui/enhance-comm-ui.js";

export type InstallScriptUrlInfo = {
  mode: "dev" | "prod";
  url: string;
};

export {
  pickDevInstallUrlFromBases,
  rankedDevInstallUrlsFromBases,
} from "./lanIpv4";

export function isEcuDevBuild(): boolean {
  return typeof __ECU_DEV__ !== "undefined" && __ECU_DEV__ === true;
}

/** Always the public install target (Settings primary QR / copy). */
export function getProductionInstallUrl(): string {
  return ECU_PRODUCTION_SCRIPT_URL;
}

export function getBakedDevInstallUrl(): string {
  if (
    typeof __ECU_DEV_INSTALL_URL__ === "string" &&
    __ECU_DEV_INSTALL_URL__.length > 0
  ) {
    return __ECU_DEV_INSTALL_URL__;
  }
  return "http://127.0.0.1:3927/enhance-comm-ui.user.js";
}

/** All baked LAN install candidates (best first). Empty on prod builds. */
export function getBakedDevInstallUrls(): string[] {
  if (
    typeof __ECU_DEV_INSTALL_URLS__ !== "undefined" &&
    Array.isArray(__ECU_DEV_INSTALL_URLS__)
  ) {
    const out: string[] = [];
    for (let i = 0; i < __ECU_DEV_INSTALL_URLS__.length; i++) {
      const u = __ECU_DEV_INSTALL_URLS__[i];
      if (typeof u === "string" && u.length) out.push(u);
    }
    if (out.length) return out;
  }
  const single = getBakedDevInstallUrl();
  return single ? [single] : [];
}

function isEcuHealthPayload(
  value: unknown,
): value is { ok: true; bases: string[] } {
  if (!value || typeof value !== "object") return false;
  if (!("ok" in value) || value.ok !== true) return false;
  if (!("bases" in value) || !Array.isArray(value.bases)) return false;
  for (let i = 0; i < value.bases.length; i++) {
    if (typeof value.bases[i] !== "string") return false;
  }
  return true;
}

/**
 * Primary install target — always GitHub raw (prod or dev UI).
 */
export async function resolveInstallScriptUrl(): Promise<InstallScriptUrlInfo> {
  return { mode: "prod", url: getProductionInstallUrl() };
}

export type DevLanInstallInfo = {
  url: string;
  urls: string[];
};

/**
 * LAN full-userscript URL for folded-away developer install. Null outside ECU_DEV.
 */
export async function resolveDevLanInstallUrl(): Promise<DevLanInstallInfo | null> {
  if (!isEcuDevBuild()) return null;
  const bakedUrls = getBakedDevInstallUrls();
  const baked = bakedUrls[0] || getBakedDevInstallUrl();
  // Overlay preview is http://127.0.0.1 — can refine via health.
  if (
    typeof location !== "undefined" &&
    location.protocol === "http:" &&
    typeof fetch === "function"
  ) {
    try {
      const portMatch = /:(\d+)(?:\/|$)/.exec(baked);
      const port = portMatch ? portMatch[1] : "3927";
      const res = await fetch(`http://127.0.0.1:${port}/health`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json: unknown = await res.json();
        if (isEcuHealthPayload(json)) {
          const urls = rankedDevInstallUrlsFromBases(json.bases);
          if (urls.length) {
            return {
              url: pickDevInstallUrlFromBases(json.bases, baked),
              urls,
            };
          }
        }
      }
    } catch {
      // keep baked
    }
  }
  return { url: baked, urls: bakedUrls.length ? bakedUrls : [baked] };
}
