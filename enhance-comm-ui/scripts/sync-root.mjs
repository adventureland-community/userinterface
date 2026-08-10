import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, "../dist/enhance-comm-ui.js");
const dest = resolve(__dirname, "../../enhance-comm-ui.js");

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`Synced ${src} -> ${dest}`);
