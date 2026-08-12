# Details! UI references (Imgur)

Local copies in [`refs/details/`](./refs/details/).

| Shot | URL | What it shows | AL keep? |
| ---- | --- | ------------- | -------- |
| Encounter Summary | [1AjSgEH](https://imgur.com/1AjSgEH) | Multi-widget dashboard: DT by player, DT by spell, adds, interrupts, death list, segment picker | **Yes** — widget grid (skip empty interrupt/dispel if AL has no wire) |
| Time Line | [VKhLtdg](https://imgur.com/VKhLtdg) | Multi-actor Gantt: Cooldowns / Debuffs over fight, filter, spell-icons toggle | **Yes — in delivery** — sample entity `s.*` + action CD markers; death strip + inspector Buffs |
| Chart / breakdown collage cues | [Ev8Dhsy](https://imgur.com/Ev8Dhsy) | Chart Viewer tabs + legend; player detail left/right; bar tooltip; death table | **Yes** — tooltips, chart tabs, player inspector |
| Advanced Death Logs | [WZVTWPC](https://imgur.com/WZVTWPC) | Death sidebar; relative time; dmg/heal amount colors; ability+source; **per-row HP bar**; top killers | **Yes — primary death UX** (prefer over Recount Death alone) |

## Patterns to adopt

### 1. Rich bar tooltip (main window hover)
Not just totals — show:
- Total + rate + activity %
- Top 3–5 abilities (icon + %)
- Top targets
- Damage taken (for healers) / healing done (for DPS) as secondary

### 2. Player inspector (click → Details!)
Left: general stats (damage, DPS, taken, heal, HPS, activity, deaths) + spell list  
Right tabs: Targets | Spells | Damage Taken | Death Logs  
Selected spell → Normal/Crit min/avg/max + targets list  
(= our `details` + `summary` merged into one inspector shell)

### 3. Encounter Summary dashboard
Composable widgets over one segment:
- Damage Taken (players)
- Damage Taken by ability (incoming spell ranks)
- Death list (time into fight)
- Optional: interrupts/dispels only if AL events exist later

### 4. Advanced Death Logs (gold standard)
- Sidebar: `mm:ss Name` deaths this segment
- Header: top killing abilities this death
- Rows: `−t` · **±amount** (red bg damage / green heal) · `[ability]` · source · **HP bar**
- Footer tabs: Current / Timeline / Overall (AL: Current segment / Total)

### 5. Chart Viewer
- Tab presets (Your Damage, All Healers, …) = saved compare queries
- Multi-line + legend checkboxes
- Add Chart = spawn meter instance

### 6. Time Line (in delivery)
Raid-wide vertical bands + per-player duration bars for debuffs/CDs/buffs. AL analogue = condition timeline from entity `s.*` sampling + `action` CD markers. Also: death-adjacent strip, inspector Buffs uptime tab, optional buffs-up-on-hit.

## Skip
- WeakAuras / Emotes tabs
- Full raid interrupt/dispel modules without AL packets
- Details skin marketplace
