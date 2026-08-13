# Details UX gap (re-analysis)

Re-read of retail Details chrome vs `MeterPanelShell` / `meterChromeCss`.  
Focus: **interaction model + visual UX**, not combat math.

## Iteration log

### 2026-08-12 — Snap / bookmarks / Inspector chrome

- **Snap feel**: top-edge align on attach, wider magnet (36px), live gold highlight on snap target while dragging
- **Bookmarks**: drag slots to reorder (pointer drag in bookmark overlay)
- **Inspector**: class-color strip + DPS/subtitle in titlebar; Details-style tabs/body chrome; no duplicate in-body header

### 2026-08-12 — Hit-tag parity (Details breakdown)

- Inspector = **Spells / Targets / Summary** only (no Hit mix, no Explosion-by-ability rollup)
- Per-spell explosion splash shown on Targets when a spell is selected
- Removed composition channel presets (Direct/Explosion/DoT/AoE) from catalog
- Engine hit tags (`base/blast/burn/cleave`) stay internal for aggregation only

### 2026-08-12 — Details model pass

- Row click → **Inspector window** (rank panel stays ranked bars)
- Report hover = copy/recent only; **Tools** (⊞) for Encounter/Deaths/Timeline
- No View morph on rank windows; segment timer on Segment menu not title
- Reset click opens menu (not silent wipe-all)
- Titlebar: lock/ungroup/stretch only (⚙/+ in layout edit)
- Channel-ranked instances migrate to Damage Done on load
- PDPS/coop hidden on fresh install

### 2026-08-12 — Cooltip / toolbar pass

- Cooltips use **solid** body-portaled chrome (no shell CSS vars) + dark scrollbars
- Click-to-pin + click-outside dismiss; mousedown select (no double-toggle)
- Toolbar order **Mode · Segment · Attribute · Report · Tools · Reset** (left strip)
- Title: click / wheel cycles Display; right-click = all-displays Switch
- Report: **click = dialog**, hover = recent + copy
- Primary icons stay visible; secondary chrome fades until interact
- Frame overflow visible so arrange mode does not clip chrome

### 2026-08-12 — Death recap + interaction audit

- **Death view** (Details Recap): victim header, HP chart on top, damage-source bars, chronological event log with relative timestamps (`−3.2s`), filter tabs (All / Damage / Heals)
- **Report statusbar**: segment timer only on Deaths/Timeline; encounter damage total only on Encounter tab (was wrongly clickable “open encounter” on all report tabs)
- **Rank row tooltip**: honest “Click row → Inspector” (removed stale Shift+click / in-window drill hints)
- **Right-click row**: opens Inspector (same as click) on rank panels
- **Report cooltip**: removed dead View / Windows / Save bookmark section headers

### 2026-08-13 — Crit / damage hit-stat parity

- Aggregate per-ability (and per-target) **normal vs crit**: count, total, min, max from hub `hit.damage`/`heal` + `crit` (>1)
- Track AL `damage_type` totals (physical/magical/pure) — shown as type label, not WoW school
- Inspector Normal/Critical blocks: Count %, Min, Max, Average, contribution DPS/HPS
- TARGETS label matches Details (`TARGETS:` only); summary type row uses dominant AL type
- **New fight required** after reload for min/max/crit damage splits on live segments

### 2026-08-13 — Breakdown layout (video / current Details)

Source of truth: Details **Player Details! Breakdown** (YouTube ~4:58 + current screenshots).

- Window title **Player Details! Breakdown**; body sub-header class + **"{Attribute} of {name}"**
- **Horizontal** Spells / Auras / Compare tabs (top-right, gold underline) — removed vertical right rail
- Spells: **left** ability list + **TARGETS under abilities**; **right** spell blocks full height
- Auras: left player picker + Buffs | Debuffs columns (Name / Uptime / % / A / R); Debuffs empty with AL note
- Compare: same-class columns (AL-limited)

### 2026-08-13 — Player Details full parity pass

- Inspector Spells: Details-shaped spell blocks (Casts/Hits, Damage, Average/DPS, Normal/Critical/Defenses with fill %)
- Ability click stays on Spells; auto-selects top ability; TARGETS strip follows selection
- Readable density: larger ability/target bars + icons, bigger block/rail type
- Auras: Condition / Uptime / % / A table + honest empty state (entity.s, not CLEU)
- Compare: same-class columns with totals + shared top-spell bars (max 3); empty when no peers
- Aggregation: per-ability normal/crit count·total·min·max + `damage_type` now stored from hub hits

### 2026-08-13 — Player-click Details parity

- Rank row click → Inspector with **Spells** default: left ability bars + right spell blocks + bottom **TARGETS:**
- Tabs **Spells / Auras / Compare** (right rail); ability select updates blocks/targets without leaving Spells
- Title **"{Attribute} of {name}"**; metric/primary carried from Damage/DPS/Heal/HPS source meter
- Auras/Compare stubbed honestly when AL data is thin (no CLEU aura/crit-split)

## Still softer than Details

- Report dialog skin depth (polished earlier; minor depth vs retail)
- Compare is totals + shared ability list (not full Details Compare2 peer spell matrix / target compare)
- No WoW-style spell schools (AL `damage_type` only); Details hit-rate-scaled bucket DPS formula not copied (we use contribution total/time)
- Auras: no real buff/debuff split or refreshes (R shows —)
- Crit multiplier value itself not shown (only crit vs normal amount buckets)

## Interaction notes (intentional)

- Report windows: title display cycle disabled (use report tabs instead)
- Rank row click opens separate Inspector window (rank panel stays bars)
- Tools (⊞) spawns/focuses shared report window with Encounter / Deaths / Timeline tabs

### 2026-08-12 — Grouped resize + drag chrome

- **Resize**: single corner grip on meter shell (removed CSS `resize: both` on outer frame — was desyncing grouped panels)
- **Group resize**: horizontal row shares **height** only; vertical stack shares **width** only (Details `horizontalSnap` / `verticalSnap`)
- **Drag**: removed ⠿ grip above meters — drag from titlebar like Details
- **Group indicator**: gold inset on grouped titlebar; lighter outer outline

### 2026-08-12 — Report window chrome parity

- **Titlebar**: maroon rank-meter bar (not gray inspector bar) with Mode · Segment · Reset toolbar
- **Title**: `⊞ Encounter` + segment subtitle (`Current · 74s · Party · Ahnaki`) like rank meters
- **Tabs**: Inspector-style gold underline tabs under titlebar
- **Footer**: encounter total only (segment info moved to title); Deaths/Timeline have no redundant status row
- **Segment menu**: context line rendered as proper cooltip section header

Reload `enhance-comm-ui.js` after each build.
