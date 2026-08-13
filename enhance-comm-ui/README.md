# enhance-comm-ui

Tampermonkey userscript that enhances Adventure.land `/comm` with a movable combat HUD, party roster, boss/enemy frames, **WoW-style damage meters** (alpha), crypt progress, effects icons, threat, gear/trade peek, and session kill KPIs.

**Current package version:** see `package.json` (ships as `0.8.0-alpha.1` — meters are alpha-quality).

## Install (Tampermonkey)

You do **not** need to clone the repo or build anything. Install the ready userscript from GitHub:

**Script URL (copy exactly):**

```
https://raw.githubusercontent.com/adventureland-community/userinterface/feature/enhance-comm-ui/enhance-comm-ui.js
```

Also linked in-repo: **[enhance-comm-ui.js](../enhance-comm-ui.js)**

### Steps

1. **Install Tampermonkey** for your browser from [tampermonkey.net](https://www.tampermonkey.net/) (pick your browser tab and follow their instructions).
2. **Pin the Tampermonkey icon** on the extensions bar so you can see when a script is active (red badge with a count).
3. Open the Tampermonkey menu → **Dashboard**.
4. Open the **Utilities** tab.
5. Under **Import from URL**, paste the script URL above → click **Install**.
6. On the next page, click **Install** again to confirm.
7. Under **Installed userscripts**, confirm **Adventure.land COMM UI Enhancement** is listed and enabled (green toggle).
8. Open (or refresh) `/comm` on adventure.land (or the community mirror listed in the UserScript header).

### Contributors (build from source)

Only needed if you change the TypeScript. In this folder: `npm install && npm run build` (writes `dist/` and syncs `../enhance-comm-ui.js`). The UserScript `@version` banner comes from `package.json` at build time.

## Local development (refresh to see changes)

Use a tiny committed stub that loads the local build **on every page refresh** (cache-busted fetch — not Tampermonkey `@require` caching).

1. Tampermonkey → **Disable** the full pasted production script
2. **Reinstall / paste** `dev.user.js` once (needs `GM.xmlHttpRequest`)
3. In this folder: `npm run dev`  
   (debounced watch rebuild + `http://127.0.0.1:3927/enhance-comm-ui.js`)
4. Edit source → wait for `[ecu-watch] build #N ok` → **refresh `/comm`**
5. Confirm in the browser console: `[ecu-dev] injected { url: ...?t=..., bytes: ... }`

Health check: [http://127.0.0.1:3927/health](http://127.0.0.1:3927/health) should show `"ok": true`.

Debounce default is 1200ms (override: `ECU_WATCH_DEBOUNCE_MS=700 npm run dev`).  
Port override: `ECU_DEV_PORT=3930 npm run dev` — then change the URL in `dev.user.js` to match.

## Features

### HUD

- Map / crypt / server chrome with crypt boss progress
- Players roster by party; bosses, aggroed enemies, selected entity info
- Observed player + target vitals with effects icons + ms tint
- Target HP%, TTK, distance / out-of-range / difficulty
- Threat table from aggro-by-target; target-frame threat spark
- Gear + trade slots on EntityInfo; `setXTarget` on select
- Session kill KPI panel
- Observer **Command** panel (replaces stock CodeMirror COMMAND): run `o:command` / remote `code_eval`, saved named snippets
- Party chips with buff modes (`partyBuffMode`, default `auto`)
- Server dropdown: live event badges via [ALData](https://github.com/earthiverse/ALData)

### Meters (alpha)

- Ranked DPS / HPS (and related) windows with Details-like chrome
- Native bar list scroll; **Always show me** pins your row under the list when off-screen
- Inspector (player breakdown / spells / targets), Time Line, charts / pie / series, reports
- Edge-snap grouping with HUD panels; flush group resize; arrange guides
- Statusbar plugins, bookmarks, and segment picker (current / past fights)

### Layout

- Ctrl+Shift+L layout edit; lock any panel; Alt to nudge while locked
- Snap to edges + peer panels; Window Control ☰ (lock / ungroup / close / reopen)
- Viewport profiles: Auto Desktop / Tablet / Phone; export / import JSON layouts
- Bag open/closed remembered; empty enemies/threat/meters auto-hide outside layout edit

## What's New

In-game changelog lives in `src/lib/changelog.ts` (`CHANGELOG`, newest first).

1. Prepend an entry whose `id` matches `package.json` `version`, plus a short `title`.
2. Bump `package.json` and rebuild so the UserScript `@version` banner matches (`tsup.config.ts` reads it).
3. Users who already finished/skipped the intro still see unseen entries via `settings.changelogSeenId`.
4. First-run intro uses `FEATURE_OVERVIEW` and marks the latest id seen on finish/skip.

Do not gate What's New on `setupWizardDone` alone.

## Tests

```bash
npm test
```

Unit tests under `tests/` import the real `src/` functions (layout grid, frame clamp, edge groups, bar scale). After a build, `injectBundle.test.ts` also checks the Tampermonkey bundle evaluates without `window.React`.
