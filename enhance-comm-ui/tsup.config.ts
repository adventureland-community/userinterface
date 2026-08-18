import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsup";

const root = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
) as { version: string };

const buildTime = new Date().toISOString();

const banner = `// ==UserScript==
// @name         Adventure.land COMM UI Enhancement
// @namespace    http://tampermonkey.net/
// @version      ${pkg.version}
// @description  enhance https://adventure.land/comm/
// @author       kevinsandow
// @contributors vett0, thmsn
// @match        https://adventure.land/comm
// @match        https://adventure.land/comm?borders=1
// @match        https://thmsn.adventureland.community/comm
// @match        https://thmsn.adventureland.community/comm?borders=1
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
  define: {
    __ECU_VERSION__: JSON.stringify(pkg.version),
    __ECU_BUILD_TIME__: JSON.stringify(buildTime),
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
