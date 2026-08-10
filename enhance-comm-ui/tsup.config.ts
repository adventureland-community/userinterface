import { defineConfig } from "tsup";

const banner = `// ==UserScript==
// @name         Adventure.land COMM UI Enhancement
// @namespace    http://tampermonkey.net/
// @version      0.7
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

export default defineConfig({
  entry: {
    "enhance-comm-ui": "src/main.ts",
  },
  format: ["iife"],
  platform: "browser",
  outDir: "dist",
  outExtension() {
    return { js: ".js" };
  },
  globalName: "EnhanceCommUI",
  minify: false,
  sourcemap: false,
  clean: true,
  banner: {
    js: banner,
  },
});
