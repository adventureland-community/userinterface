# enhance-comm-ui

Tampermonkey userscript that enhances Adventure.land `/comm` with party roster, boss/enemy frames, coop/PDPS/hit-DPS meters, crypt progress, effects icons, threat table, gear/trade peek, and session kill KPIs.

## Install (Tampermonkey)

1. Build: `npm install && npm run build` in this folder.
2. Install either:
   - `../enhance-comm-ui.js` (synced root copy), or
   - `dist/enhance-comm-ui.js`
3. Open `/comm` on adventure.land (or the community mirror listed in the UserScript header).

## Features

- Map / crypt / server chrome with crypt boss progress
- Players roster by party; bosses, aggroed enemies, selected entity info
- Observed player + target vitals with effects icons + ms tint
- Target HP%, TTK, distance / out-of-range / difficulty
- Rank meters: PDPS, Coop V1, Coop V2 (`pow(p,0.65)/(0.1+Σ)`), Hit DPS
- Threat table from aggro-by-target
- Gear + trade slots on EntityInfo; `setXTarget` on select
- Session kill KPI panel
- Observer **Command** panel (replaces stock CodeMirror COMMAND): run `o:command` / remote `code_eval`, saved named snippets (folders + search) in localStorage
- Party chips: compact buffs/debuffs (+N overflow), aggro badge, soft dim for dead (no range dim)
- **Party buff modes** (`partyBuffMode`, default `auto`): cycle via **Buffs:** on the Party panel — `auto` (all ≤8 chips, else observed-only) · `all` · `observed` · `compact` (max 2+N) · `shared` (one unique strip per party) · `off`
- Readable type floor via shared `typeScale` (counts/badges ~14–15px; chrome ~13–15px; no bold / no text-shadow)
- Server dropdown: live event badges per realm (special monsters) via [ALData](https://github.com/earthiverse/ALData) `GET https://aldata.earthiverse.ca/monsters/:types` (~45s poll, cached by region|identifier); stock `X.servers` has no events — connected realm also merges `window.S` live keys. Fails soft if ALData is unreachable.
- Deselect observe: click active character chip again, or Esc (paperdoll clears first)
- Combat: sticky highlight for watched row; Compact mode (DPS+HPS); Full/Compact + columns persisted; **My party** focus button
- Boss bar: HP%, click-to-target, sort on-me / lowest HP, aggro chip
- Target frame threat spark; paperdoll “VS watched” delta stats + equip Δ icons
- Layout: Ctrl+Shift+L; snap to edges + peer panels; soft avoid-overlap; opacity slider on each panel in layout edit
- **Viewport profiles**: Auto Desktop / Tablet / Phone layouts (drawers/sheets on mobile); force profile in Layout edit
- **Export / import layout**: Copy, Download, Paste, or Upload JSON presets per profile
- Bag open/closed remembered across reloads; empty enemies/threat/meters auto-hide outside layout edit

## Layout profiles

Layouts are stored per profile under `al-comm-ui-settings-v1` (`panelLayoutsByProfile`).

| Profile | Typical trigger | Default feel |
|--------|-----------------|--------------|
| Desktop | width ≳ 1100 | Classic corner layout |
| Tablet | width ≲ 1100 | Combat/threat right drawer, bag left |
| Phone | width ≲ 700 | Combat/bag/command as sheets |

In Layout edit: **Auto** follows the viewport; **Desktop / Tablet / Phone** forces that map. **Reset positions** resets only the active profile (needed after built-in default changes, e.g. desktop). Buff info and item info are separate positionable panels (`buffInfo` / `itemInfo`; legacy `infoDialog` migrates on load). **Copy layout** / **Download** / **Paste / import** / **Upload JSON** share presets between devices.

## Command snippets

On `/comm`, click stock **COMMAND** (or restore the Command panel in Layout edit). Write CODE for the watched character, **Run** (or Ctrl+Enter). Optional **Folder** when saving. Search + folder filter above the list. Persisted under `al-comm-ui-settings-v1`.

## Smoke tests

See [SMOKE.md](./SMOKE.md) for a short post-change checklist.
