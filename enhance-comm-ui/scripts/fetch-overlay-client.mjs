/**
 * Pull live adventure.land data.js + stock sprite/item_container into
 * dev/overlay/cache/ (gitignored). Used by the overlay preview harness.
 *
 * Stock host scripts are taken from adventureland_mongodb `upstream/main`
 * (`git show`), not the local worktree. See overlay-client-cache.mjs.
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
if (manifest.mongodbRef) {
  console.log(
    `[ecu-overlay-cache] stock host ← mongodb ${manifest.mongodbRef}` +
      (manifest.mongodbSha ? ` (${manifest.mongodbSha.slice(0, 12)})` : "") +
      (manifest.mongodbWorktree ? " [WORKDIR allowed]" : ""),
  );
}
for (let i = 0; i < manifest.files.length; i++) {
  const f = manifest.files[i];
  const tag = f.cached ? "cached" : f.source || "fetched";
  const extra = f.sha ? ` @${String(f.sha).slice(0, 12)}` : "";
  console.log(`  ${tag} ${f.rel} (${f.bytes} bytes)${extra}`);
}
