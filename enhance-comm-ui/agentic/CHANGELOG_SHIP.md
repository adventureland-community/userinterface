# Shipping What's New (changelog)

Source of truth: `src/lib/changelog.ts` (`CHANGELOG`, newest first).

1. Prepend a new entry with a stable `id` (usually package version) and short `title`.
2. Bump `package.json` version to match when you ship.
3. Users who already finished or skipped the first-run intro still see unseen entries via `settings.changelogSeenId`.
4. First-run intro uses `FEATURE_OVERVIEW` and marks the latest id seen on finish/skip so they do not immediately get a duplicate What's New.

Do not gate What's New on `setupWizardDone` alone — that is intentional.
