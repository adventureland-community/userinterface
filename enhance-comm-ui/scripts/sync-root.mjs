/**
 * Copy dist/enhance-comm-ui.js → repo-root enhance-comm-ui.js for release installs.
 * Never sync an ECU_DEV-baked bundle (embeds LAN IPs; must not be committed).
 */

import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, "../dist/enhance-comm-ui.js");
const dest = resolve(__dirname, "../../enhance-comm-ui.js");

if (process.env.ECU_DEV === "1") {
  console.warn(
    "[ecu] skip root sync: ECU_DEV=1 — DEV bundles bake LAN IPs and must not be committed. Use npm run build before shipping.",
  );
  process.exit(0);
}

const body = readFileSync(src, "utf8");
if (
  /function isEcuDevBuild\(\)\s*\{\s*return true\s*;/.test(body) ||
  /return true;\s*\}\s*function getBakedDevInstallUrl/.test(body)
) {
  console.error(
    "[ecu] refuse root sync: dist looks like an ECU_DEV bundle (isEcuDevBuild → true). Run a clean npm run build without ECU_DEV.",
  );
  process.exit(1);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`Synced ${src} -> ${dest}`);
