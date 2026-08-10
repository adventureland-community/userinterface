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
