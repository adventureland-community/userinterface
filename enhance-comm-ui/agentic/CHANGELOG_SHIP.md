# Shipping What's New (changelog)

Source of truth: `src/lib/changelog.ts` (`CHANGELOG`, newest first).

1. Prepend a new entry with a stable `id` matching `package.json` `version` and a short `title`.
2. Bump `package.json` (and rebuild) so the UserScript `@version` banner matches — `tsup.config.ts` reads it automatically.
3. Users who already finished or skipped the first-run intro still see unseen entries via `settings.changelogSeenId`.
4. First-run intro uses `FEATURE_OVERVIEW` and marks the latest id seen on finish/skip so they do not immediately get a duplicate What's New.

Do not gate What's New on `setupWizardDone` alone — that is intentional.

Keep this folder lean: reusable verify scripts + smoke notes are fine; do not commit chrome profiles, HTML/PNG tip dumps, or one-off research notes.
