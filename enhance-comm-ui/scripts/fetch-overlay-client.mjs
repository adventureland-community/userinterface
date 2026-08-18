/**
 * Pull live adventure.land data.js + stock sprite/item_container into
 * dev/overlay/cache/ (gitignored). Used by the overlay preview harness.
 *
 *   npm run overlay:sync
 *   npm run overlay:sync -- --force
 */

import { syncOverlayCache } from "./overlay-client-cache.mjs";

const force = process.argv.includes("--force");

const manifest = await syncOverlayCache({ force });
console.log(
  `[ecu-overlay-cache] ${manifest.origin} @ ${manifest.fetchedAt}`,
);
for (let i = 0; i < manifest.files.length; i++) {
  const f = manifest.files[i];
  const tag = f.cached ? "cached" : "fetched";
  console.log(`  ${tag} ${f.rel} (${f.bytes} bytes)`);
}
