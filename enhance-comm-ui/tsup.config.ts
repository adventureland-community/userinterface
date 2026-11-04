import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsup";
import {
  phoneInstallIpv4Addresses,
  preferredLanIpv4,
} from "./scripts/lan-ipv4.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
) as { version: string };

const buildTime = new Date().toISOString();
const isDevBuild = process.env.ECU_DEV === "1";
const devPort = String(process.env.ECU_DEV_PORT || "3927");
/** YYYYMMDDHHmmss — Tampermonkey treats each watch rebuild as a newer @version. */
const buildStamp = buildTime.replace(/[-:TZ.]/g, "").slice(0, 14);
const userscriptVersion = isDevBuild
  ? `${pkg.version}-dev.${buildStamp}`
  : pkg.version;
const userscriptName = isDevBuild
  ? "DEV Adventure.land Hub UI Enhancement"
  : "Adventure.land Hub UI Enhancement";

/** Loopback + RFC1918 only — never bake Tailscale CGNAT into the bundle. */
function ecuDevInstallUrls(): string[] {
  const hosts = phoneInstallIpv4Addresses();
  const preferred = preferredLanIpv4() || "127.0.0.1";
  const ordered = [preferred];
  for (let i = 0; i < hosts.length; i++) {
    if (hosts[i] !== preferred) ordered.push(hosts[i]);
  }
  if (ordered.indexOf("127.0.0.1") < 0) ordered.push("127.0.0.1");
  const out: string[] = [];
  for (let i = 0; i < ordered.length; i++) {
    // Full userscript for phones (GM.xhr LAN loader is unreliable on mobile TM).
    out.push(`http://${ordered[i]}:${devPort}/enhance-comm-ui.user.js`);
  }
  return out;
}

function ecuDevInstallUrl(): string {
  return ecuDevInstallUrls()[0];
}

const banner = `// ==UserScript==
// @name         ${userscriptName}
// @namespace    http://tampermonkey.net/
// @version      ${userscriptVersion}
// @description  enhance https://adventure.land/hub/ (formerly /comm)
// @author       kevinsandow
// @contributors vett0, thmsn
// @match        https://adventure.land/hub*
// @match        https://adventure.land/comm*
// @match        https://thmsn.adventureland.community/hub*
// @match        https://thmsn.adventureland.community/comm*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==
`;

const shared = {
  format: ["iife"] as const,
  platform: "browser" as const,
  outDir: "dist",
  outExtension() {
    return { js: ".js" };
  },
  minify: false,
  sourcemap: false,
  noExternal: ["uqr"],
  define: {
    __ECU_VERSION__: JSON.stringify(userscriptVersion),
    __ECU_BUILD_TIME__: JSON.stringify(buildTime),
    __ECU_DEV__: JSON.stringify(isDevBuild),
    __ECU_DEV_INSTALL_URL__: JSON.stringify(
      isDevBuild ? ecuDevInstallUrl() : "",
    ),
    __ECU_DEV_INSTALL_URLS__: JSON.stringify(
      isDevBuild ? ecuDevInstallUrls() : [],
    ),
  },
};

export default defineConfig([
  {
    ...shared,
    entry: {
      "enhance-comm-ui": "src/main.ts",
    },
    globalName: "EnhanceCommUI",
    clean: false,
    banner: {
      js: banner,
    },
  },
  {
    ...shared,
    entry: {
      "overlay-preview": "dev/overlay/preview.ts",
    },
    globalName: "EcuOverlayPreview",
    clean: false,
  },
]);
