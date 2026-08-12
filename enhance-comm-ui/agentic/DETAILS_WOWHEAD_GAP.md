# Details guide gap analysis (Wowhead primary)

**Sources:** [Wowhead guide 6112](https://www.wowhead.com/guide/details-damage-meter-addon-guide-6112) (**browser-verified** — 30 screenshots at `wow.zamimg.com/uploads/guide/images/13248–13284`), [Warcraft Tavern guide](https://www.warcrafttavern.com/wow/guides/details-damage-meter-addon-guide/) (options-panel depth), local clone `agentic/details-ref/retail/`.

**Compared to:** `feature/wow-style-meters` worktree as of 2026-08-12.

**Implementation pass (2026-08-12):** Full parity pass completed except **Weak Aura** and **raid announcements** (explicitly excluded). Chat report (Say/Party/Whisper) also excluded. See `agentic/DETAILS_UX_GAP.md` for iteration log.

### Implemented this pass ✅

| Area | Status |
|------|--------|
| Rank bars | Class icons, `# · name · total (rate, pct%)`, animate, scroll wheel, total bar, test bars |
| Statusbar | Bottom micro displays (segment, DPS, HPS) |
| Segments | Wipe/kill colors (red/green) |
| Stretch | Top drag tab (continuous resize) |
| Resize | Dual bottom-corner grips + Shift free size |
| Bookmarks | "Bookmark" header, Select Display sub-menu, drag reorder |
| Gear menu | Standard/Everything, Plugins, Window Control (create/close/reopen), Options, Spell List→Inspector, Statistics→Report, view modes |
| Misc displays | Interrupts, Dispels, Deaths, CC Breaks |
| Inspector | Auras + Compare tabs, death log life%/invert |
| Encounter | Dashboard tabs + skull/play badges on titlebar |
| Timeline | Death markers, debuff lanes |
| Options panel | Appearance toggles, sliders, test bars |
| Setup wizard | First-run walkthrough |
| Window control | Runtime close → reopen from gear; mass hide; segments locked |
| Report | Copy-only (no chat); Reverse checkbox |

### Still partial / deferred 🟡

| Area | Notes |
|------|-------|
| Title bar position (top/bottom) | Always top |
| Click-through body | Not implemented |
| Bar textures / skins / profiles | Flat fill only |
| Aligned text columns | Single flowing right text |
| Auto-erase segment policies | Manual reset only |
| Full Encounter Details parity | Dashboard depth improved; not 1:1 with 15-tab retail |
| Automation (role-based display switch) | Options shell only |

**Legend:** ✅ have · 🟡 partial · ❌ missing · 🚫 explicitly out of scope (user)

---

## Wowhead guide structure (official screenshots)

The Wowhead guide is **not** empty — the static fetch misses JS-rendered content. Browser review confirms these sections and images:

| Section | Key screenshots | What they show |
|---------|-----------------|----------------|
| Out of the Box | 13248, 13249 | Setup wizard: Effective/Activity time, skin picker, 2nd window, statusbar toggle, texture, spec icons, bar speed/animate/realtime |
| Core Features | 13252 | Rank window + feature bullet list |
| Detailed DPS/HPS | 13262, 13254, 13283 | Breakdown window, Compare side-by-side, player gear/talent tooltip |
| Navigating Interface | 13256–13261 | Gear menu, Segment list, Display tree, Report dialog + chat example, Reset |
| Interrupts walkthrough | 13263–13265 | Segment → Misc → Interrupts step-by-step |
| Bookmarks | 13284, 13267, 13269 | Bookmark overlay + Select Display sub-menu |
| Window Control | 13272–13274 | Full options panel tree, window delete dropdown |
| Plugins | 13278, 13275, 13276–13277 | Encounter Details dashboard, Timeline graph, Raid Check, Tiny Threat |
| Extra Tools | 13279–13282 | Weak Aura creator, interrupt/CD/death announcement settings |

---

## Wowhead screenshot UX details (add to gap list)

These are visible in the Wowhead guide but were not fully captured in the earlier Warcraft Tavern pass:

### Rank window (13248, 13252, 13256)

- Titlebar: **display name left** ("Damage Done"), **toolbar icons right** (gear, segment, display, report, reset)
- Bars: **rank # · spec/class icon · name · total · (rate, pct%)** — e.g. `1. [icon] PlayerName 306.14M (2.16M, 49.4%)`
- Class-colored bar fills on dark row background

### Settings gear menu (13256)

Hover/click gear opens a **vertical menu**, not just scope:

- Standard / Everything
- Plugins: Raid · Solo Play
- Window Control (create/close/reopen)
- Spell List · Statistics · Options Panel

AL maps **Standard ≈ Party scope** but lacks Spell List, Statistics, runtime Window Control submenu.

### Segment menu (13257)

- Past fights listed **newest at top**
- **Red segments = wipes, green = kills** (color coding)
- Current Segment + Overall Data at bottom

AL has segment list but **no wipe/kill color coding**.

### Display menu (13258, 13263–13264)

- Top-level: **Damage · Heal · Resources · Miscellaneous · Custom**
- Misc includes **Interrupts, Dispels, Deaths, CC**, etc.
- Guide walks through Segment → Misc → Interrupts as the canonical navigation example

AL has slim Display cycle (7 metrics) — **Misc rank displays missing**.

### Breakdown / Inspector (13262, 13254, 13283)

- **Click bar** opens detailed window (in-window or separate — screenshot shows full breakdown panel)
- **Tabs on the RIGHT edge**: Auras, Compare (+ spell/target tabs implied)
- **Shift+hover** bar tooltip → more spells; **Ctrl+hover** → more targets
- **Player info icon** left of bar: hover = gear/talents/ilvl tooltip; right-click = refresh
- Compare tab: side-by-side same class/spec players

AL Inspector: top tabs (Spells/Targets/Summary), no Auras/Compare tabs, no modifier-expanded tooltips, no gear icon on rank rows.

### Bookmarks (13284, 13267)

- Overlay titled **"Bookmark"** with gear + close in header
- **Two-column icon grid** (Damage, Healing D, Deaths, Interrupts, Dispels, …)
- Empty slot → **"Select Display"** sub-menu (Damage / Healing / Energy / Utility / Other tree)
- Manage/reorder via Options → Display → Manage Bookmarks

AL: overlay + drag reorder ✅; missing **Bookmark header chrome**, **Select Display sub-menu tree**, **options manage page**.

### Encounter Details plugin (13278)

- Opens from **skull icon on titlebar** after encounter
- Title: boss name ("Argus, the Unmaker")
- **Many tabs**: Summary · Charts · Phases · Compare · Deaths · Interrupts · Dispels · Crowd Control · Damage · Healing · Avoidable Damage · Energy · Resources · Custom
- Summary dashboard: multi-column — Damage Taken per Player, Adds, Interrupts, Damage Taken by Spell, Dispels, Death Log
- Left tools rail: Create Aura · Export Data · Options · Spell List · Statistics

AL Encounter tab: basic widget grid only — **far from this dashboard depth**.

### Timeline plugin (13275)

- **Play-button icon** on titlebar after encounter
- Time graph: cooldowns, debuffs, deaths over fight duration

AL Timeline tab: lane Gantt — partial analogue.

### Setup wizard (13249)

- First-run: skin, 2nd window, color, statusbar, texture, icons, update speed, animate, realtime
- Fake/test DPS bars during setup

AL: no wizard, no test bars during setup.

---

## Visual model (rank window anatomy)

Details rank window anatomy:

```
┌─ stretch tab (drag up) ─────────────────────────────┐
│ [gear][paper][sword][report][reset]  Display title │  ← maroon titlebar
├────────────────────────────────────────────────────┤
│ #1 ████████████ PlayerName          1.2M (45%)     │  ← class-colored bars
│ #2 ██████       Other               800k (30%)     │
│ … scroll if more rows than fit …                   │
│ [optional total bar]                               │
├────────────────────────────────────────────────────┤
│ segment · duration · micro displays                │  ← statusbar (optional)
└ resize grips (both corners) ───────────────────────┘
```

Right-click **body** → bookmark icon grid. Click row → **breakdown** (spells/targets). **Report** dialog = copy preview (WoW also has chat channels — **🚫 excluded for AL**).

---

## 1. Window controls (guide § “Details Window Controls”)

| Feature | Guide / screenshot | AL status | Notes |
|--------|-------------------|-----------|-------|
| Lock / unlock | Lower-right lock; move when unlocked | 🟡 | Lock on titlebar hover strip; drag from titlebar. No separate corner lock button like Details. |
| Resize | **Two** diagonal grips, bottom corners; modifier hints on hover | 🟡 | Single corner grip on shell; Shift = free size. No dual corners, no Shift/Alt/Ctrl group-resize hints. |
| Group / snap | Edge snap → cluster; lock icon to ungroup | ✅ | Edge snap, gold target preview, ungroup, horizontal/vertical snap flags, group resize rules. |
| Bookmarks | Right-click body → icon grid; manage in options | 🟡 | Overlay + drag reorder. No dedicated “Manage Bookmarks” options page; empty slot = “click to bookmark”. |
| Stretch | **Top tab**, drag up continuously | 🟡 | ↕ toggle  default↔360px. Not a draggable top tab; no stretch-along-titlebar gesture. |
| Display picker | Right-click titlebar (not icons) → all displays | ✅ | Title click/wheel cycle + right-click Switch grid + Attribute cooltip tree. |
| Title bar position | Top or bottom (option) | ❌ | Always top. |
| Window scale | Options slider scales window + fonts together | 🟡 | Frame W/H only; text does not scale proportionally (`SetWindowScale`). |
| Click-through | Body click-through (combat option) | ❌ | |
| Disable grouping | Option blocks new snaps | ❌ | |
| Mass show/hide | Toggle all windows | ❌ | |
| Ignore mass toggle | Per-window opt-out | ❌ | |
| Create / close / reopen window | Window Control menu | 🟡 | Add/duplicate in layout edit; no runtime “close window, reopen later” like Details. |
| Quick setup wizard | First-run walkthrough | ❌ | |

---

## 2. Titlebar toolbar (guide § menu icons)

Details order (screenshots): **Main · Segments · Display · Report · Reset** (upper-right).

| Control | AL status | Notes |
|---------|-----------|-------|
| Main menu (gear) — Mode, Window Control, Options | 🟡 | **Mode** = Scope (Party/Only/Visible/Session). No gear menu; scope on Segment area / layout ⚙. |
| Segments (paper) — past fights, Current, Overall | ✅ | Cooltip with fight list, Current, Overall, context line. |
| Display (sword) — attribute tree | ✅ | Hierarchical Damage/Heal/Misc + ‹ › cycle (7 displays). |
| Report (waves) — Report Results | 🟡 | Copy + recent on hover; dialog with Lines + Copy. **Say/Party still in code — 🚫 remove per user.** No Reverse toggle. |
| Reset (X) — Reset Overall / Reset All | ✅ | Menu: reset current segment, reset overall, wipe all. |
| Tools (⊞) — Encounter / Deaths / Timeline | ✅ | AL-specific; opens shared report window with tabs. |
| Toolbar on report window | 🟡 | Mode · Segment · Reset added; no Report/Attribute on report chrome (OK). Encounter tab still has redundant in-body “Encounter · …” header. |
| Encounter timer in title | Option: stopwatch left of title | ❌ | Duration in segment subtitle only. |
| Auto-hide toolbar buttons | Fade until hover | 🟡 | Secondary chrome (lock/ungroup/stretch) fades; primary toolbar stays. |
| Display icon in title | Shows current attribute icon | 🟡 | Text title + subtitle; no attribute glyph ball. |

---

## 3. Rank bars (guide § Bars: General / Bars: Texts)

| Feature | AL status | Notes |
|---------|-----------|-------|
| Class-colored bars | ✅ | |
| Rank number on bar | 🟡 | Pool supports rank; verify always visible. |
| Left: name · Right: total / rate / % | ✅ | |
| Aligned text columns | ❌ | Single flowing right text. |
| Bar height / spacing sliders | ❌ | Fixed CSS. |
| Animate bar width changes | ❌ | Instant updates. |
| Bar textures / overlay / background | ❌ | Flat fill. |
| Spec / role / faction icons | 🟡 | Skill icons in Inspector; no spec icon on rank rows. |
| Total bar (sum row) | ❌ | |
| Always show me | ✅ | Pin self via Mode menu + `pinAlwaysShowSelf`. |
| Scroll wheel through rows | ❌ | `maxRowsForFrameHeight` caps visible rows; no scroll offset. |
| Bar highlight on hover | ✅ | |
| Percent relative to top vs total | ❌ | Always vs segment total. |
| Custom bar text (Lua format) | ❌ | N/A for AL. |
| Test bars (options) | ❌ | |

---

## 4. Segments & data (guide § Segments, Overall, Auto Erase)

| Feature | AL status | Notes |
|---------|-----------|-------|
| Current segment | ✅ | |
| Overall segment | ✅ | |
| Past segment list | ✅ | |
| Segments locked (all windows same segment) | ❌ | Windows independent (intentional footgun avoidance in deep analysis). |
| Segment metadata on hover | 🟡 | Duration + label in menu. |
| Auto-erase trash / world / on instance enter | ❌ | |
| Overall reset policies | 🟡 | Manual reset overall; no auto-clear on boss/dungeon end. |
| Dynamic overall damage | ❌ | |
| Time measure (pause inactive) | ❌ | |

---

## 5. Breakdown / Inspector (guide + double-click screenshot)

| Feature | AL status | Notes |
|---------|-----------|-------|
| Open breakdown from row | ✅ | Click / right-click → separate Inspector window. |
| Spells / Targets / Summary tabs | ✅ | Matches slimmed Details breakdown (no Direct/Explosion/DoT/AoE tabs). |
| Compare tab in breakdown | ❌ | Compare is separate View, not in Inspector. |
| Auras / uptime in breakdown | 🟡 | Data exists; not full Details auras panel. |
| Class strip + DPS in titlebar | ✅ | Recent pass. |
| Double-click to open | 🟡 | Single click opens (acceptable AL variant). |
| `/de me` shortcut | ❌ | |

---

## 6. Report (guide § Report button)

| Feature | AL status | Notes |
|---------|-----------|-------|
| Lines selector (5–30) | ✅ | |
| Preview text | ✅ | |
| Copy to clipboard | ✅ | |
| Recent reports | ✅ | |
| Reverse order | ❌ | |
| Channel dropdown (Say/Party/Raid/Whisper) | 🚫 | User: **not useful, do not implement.** Remove existing Say/Party from `MeterReportDialog`. |
| Shift+click report line only | ❌ | |
| Healing spell links in report | ❌ | |

---

## 7. Tools & plugins (guide § Tools, Plugins, Mythic Dungeon)

| Tool | AL status | Notes |
|------|-----------|-------|
| Encounter Breakdown plugin | 🟡 | Multi-widget grid (dmg/dps/taken/heal/hr/avoid); no boss phases, no end-of-run charts. |
| Death Recap / Advanced Death Logs | 🟡 | HP chart, source bars, event log, filters. Missing: life % on hits, relevance time slider, invert order options, segment list sidebar. |
| Chart Viewer / Timeline | 🟡 | Lane Gantt for casts/conditions; filters all/buffs/cds. Not full Chart Viewer plugin depth. |
| Compare 2.0 | 🟡 | Compare **view** exists; not side-by-side breakdown window. |
| Interrupts / Dispels / Deaths / CC as **rank displays** | ❌ | Deaths in Tools only, not Misc attribute menu. |
| TinyThreat / Vanguard / Raid Check / Streamer | ❌ | WoW-specific plugins. |
| Statistics / guild boss kills | ❌ | |
| Spell List search | ❌ | |
| Plater / WeakAuras integration | ❌ | N/A. |
| Mythic+ charts at dungeon end | ❌ | |

---

## 8. Statusbar & micro displays (guide § Statusbar tab)

| Feature | AL status | Notes |
|---------|-----------|-------|
| Bottom statusbar row | 🟡 | Rank meters: no persistent statusbar. Report Encounter tab: footer total only. |
| Configurable micro displays | ❌ | Details: segment timer, damage done, etc. per slot. |
| Click micro display to action | ❌ | e.g. click segment → segment menu. |
| Statusbar on top option | ❌ | |
| Lock micro displays | ❌ | |

---

## 9. Options panel depth (guide § Options Panel)

Details has a **large multi-tab options panel** (Display, Combat Log, Bars×2, Title Bar, Window Body, Statusbar, Wallpaper, Automation, Profiles, Skins, Plugins, Tooltips, …). AL has **layout edit + cooltip menus**, not a equivalent panel.

| Area | AL status |
|------|-----------|
| Full options panel with search | ❌ |
| Editing Group (apply to all in snap cluster) | ❌ |
| Per-window settings dropdown | 🟡 (per-instance in layout JSON) |
| Profiles import/export | ❌ |
| Skins (Minimalistic, ElvUI, …) | ❌ (single maroon chrome) |
| Wallpaper / 3D background | ❌ |
| Automation: role-based display switch | ❌ |
| Automation: auto-hide in combat / on hover alpha | 🟡 (idle chrome fade only, not configurable rules) |
| Tooltips tab (maximize on Shift, anchor modes) | 🟡 (solid cooltips; no modifier maximize) |
| Nickname / realm strip / self bar color | ❌ |
| Class color editor | ❌ (uses AL class colors) |
| Death log options (min heal threshold, invert) | ❌ |

---

## 10. Displays catalog (guide § Display / attributes.lua)

### Damage (Details)

| Display | AL |
|---------|-----|
| Damage Done | ✅ |
| DPS | ✅ |
| Damage Taken | ✅ |
| Friendly Fire | ❌ |
| Frags | ❌ |
| Enemy Damage Taken | ❌ |
| Auras & Voidzones | ❌ |
| Damage Taken By Spell | 🟡 (Inspector/taken drill, not rank display) |
| Avoidable Damage Taken | 🟡 (Avoidance meter) |

### Heal (Details)

| Display | AL |
|---------|-----|
| Healing Done | ✅ |
| HPS | ✅ |
| Overhealing | ❌ |
| Healing Taken | ❌ |
| Damage Prevented | ❌ |
| Heal Absorbed | ❌ |

### Misc (Details)

| Display | AL |
|---------|-----|
| Interrupts | ❌ |
| Dispels | ❌ |
| Deaths (rank) | ❌ |
| CC Breaks | ❌ |
| Cooldowns | ❌ |
| Buff/Debuff uptime (rank) | ❌ |

### AL-native (keep)

| Display | AL |
|---------|-----|
| Healing Required | ✅ |
| PDPS / Hit DPS / coop | 🟡 (presets, not in main ‹ › cycle) |
| Composition channels | 🟡 (Inspector only — correct) |
| Visible / Session scope | ✅ |

---

## 11. Interaction differences (documented, not necessarily bugs)

| Details | AL choice |
|---------|-----------|
| Rank panel morphs to breakdown in-window | Separate Inspector window |
| Double-click row | Single click |
| Titlebar bottom option | Top only |
| Hover-open menus | Click-open cooltips (pin supported) |
| Report window = rank chrome clone | Shared report shell with tabs |
| Chat report | **🚫 Excluded** — clipboard only |

---

## Priority backlog (excluding 🚫 chat report)

Ordered by guide visibility / screenshot prominence:

### P0 — reads wrong in screenshots (Wowhead-verified)

1. **Spec/class icons on rank rows** — left of name (13248, 13252).
2. **Bar text format** — `total (rate, pct%)` with rank prefix (13248).
3. **Stretch tab drag** — top grab, continuous height (Warcraft Tavern; not in Wowhead but still Details canon).
4. **Dual corner resize** + modifier tooltips.
5. **Rank list scroll** — wheel through rows when content exceeds frame.
6. **Statusbar** — bottom micro row (setup wizard 13249 explicitly toggles this).
7. **Segment wipe/kill colors** — red/green in segment menu (13257).
8. **Bookmark overlay chrome** — "Bookmark" header, Select Display sub-tree (13284, 13267).
9. **Remove Say/Party** from report dialog (align with 🚫 scope; Wowhead 13259 shows chat but user excluded).
10. **Post-encounter titlebar icons** — skull → Encounter Details, play → Timeline (13278, 13275).

### P1 — core Details polish

11. Total bar row.
12. Bar animate + configurable height/spacing.
13. Window scale (font + chrome proportional).
14. **Inspector: Auras + Compare tabs**, right-edge tab rail option (13262, 13254).
15. **Shift/Ctrl expanded row tooltips** (13262).
16. **Player gear icon** on rank rows (13283).
17. Encounter view: full Summary dashboard + tab set (13278).
18. Death recap: life % on hits, relevance window, invert order.
19. Mass show/hide all meters.
20. Gear menu: Window Control / Spell List / Statistics entries (13256).
21. Misc rank displays: Interrupts, Dispels, Deaths (13263–13265 walkthrough).
22. Report reverse order.
23. Close/reopen window without deleting from layout.
24. Quick setup wizard + test bars (13249).

### P2 — options & automation

17. Options panel shell (or staged: Bars, Statusbar, Automation tabs).
18. Auto-hide rules (combat fade, hover alpha sliders).
19. Role-based auto display switch.
20. Skins / profile export.
21. Editing Group in options.
22. Test bars.
23. Quick setup wizard.

### P3 — data displays & plugins

24. Misc rank displays: Interrupts, Dispels, Deaths count, CC breaks.
25. Overheal, Healing Taken, Damage Taken by Spell as displays.
26. Compare tab inside Inspector.
27. Timeline / Chart Viewer depth.
28. Statistics, Spell List, custom displays (low AL priority).

---

## References

- Warcraft Tavern full text: `agent-tools/61df6512-4fe7-4794-a998-7be2eb6a8e36.txt` (Cursor fetch cache)
- UX iteration log: [DETAILS_UX_GAP.md](./DETAILS_UX_GAP.md)
- Feature inventory (needs refresh): [DETAILS_FEATURE_INVENTORY.md](./DETAILS_FEATURE_INVENTORY.md)
- Strategic plan: [DETAILS_DEEP_ANALYSIS.md](./DETAILS_DEEP_ANALYSIS.md)
