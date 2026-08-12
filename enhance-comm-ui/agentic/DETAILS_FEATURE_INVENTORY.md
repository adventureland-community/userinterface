# Details! Damage Meter — feature inventory (AL meters reference)

Strategic deep analysis (adoption plan): [DETAILS_DEEP_ANALYSIS.md](./DETAILS_DEEP_ANALYSIS.md).

Source cloned 2026-08-11 from [Tercioo/Details-Damage-Meter](https://github.com/Tercioo/Details-Damage-Meter) into `agentic/details-ref/retail/`.

One repo ships **Retail + Classic Era + TBC/Wrath/Cata/Mists** via TOC variants (`Details.toc`, `Details_Classic.toc`, …). No separate Classic codebase needed for feature mapping; Classic keeps full CLEU-driven analytics. **Retail Midnight+** is deliberately thinner in practice (Blizzard combat privacy / built-in meter) — confirmed by community videos (e.g. [KWB6HxQvgE4](https://www.youtube.com/watch?v=KWB6HxQvgE4)): still useful as skin + drill-down when data is available; Resources / many Misc / report / plugins often broken or empty.

CurseForge: https://www.curseforge.com/wow/addons/details/files

---

## Mental model (map to ours)

| Details term                  | What it is                                    | Our equivalent                                           |
| ----------------------------- | --------------------------------------------- | -------------------------------------------------------- |
| **Instance / Window**         | One meter panel                               | Meter panel                                              |
| **Attribute → Sub-attribute** | Metric family → concrete display              | Meter **mode** (‹ › / sword menu)                        |
| **Mode**                      | Who appears (Everything / Standard / Plugins) | **Scope** (Party · Only · Visible · Session)             |
| **Segment**                   | Current / Overall / past fights               | Segment / encounter picker                               |
| **Player breakdown**          | Click row → spells / targets / …              | **Inspector**                                            |
| **Window group / snap**       | Edge-attach meters; move/scale as one         | **Not built yet** (high desire)                          |
| **View**                      | Mostly bars (+ plugins: compare, graphs)      | Explicit **View**: Bars/Table/Pie/Graph/Realtime/Compare |

Details does **not** put Direct/Explosion/DoT/AoE (our composition channels) or PDPS/coop in the main display cycle — those are drill-down / plugin / custom.

---

## Window grouping (the “attach two meters” feature)

**UX:** Drag window A near edge of window B → snap → persistent group. Drag any member → whole cluster moves. Shared scale via `SetWindowScale(..., refresh_group)`. Ungroup via title unlock / options **Ungroup** (`STRING_OPTIONS_WC_UNSNAP`). Option **Disable grouping** only blocks _new_ snaps.

**Data model** (`instance.snap`):

- Keys `1` left · `2` bottom · `3` right · `4` top → neighbor instance id
- Flags `horizontalSnap` / `verticalSnap`
- Gap: `Details.grouping_horizontal_gap`
- APIs: `MakeInstanceGroup` / `agrupar_janelas`, `UngroupInstance` / `Desagrupar`, `GetInstanceGroup`, `IsGroupedWith`, `BaseFrameSnap` (BFS re-anchor)

**AL design sketch:**

1. While unlocked (or Alt-arrange), proximity test on panel rects.
2. On release within snap distance on free edge → store `snap: { side → panelId }` on both.
3. Move/resize leader propagates to group (match heights on horizontal attach).
4. Explicit Ungroup control; persist in layout save.
5. Optional gold edge preview (Details Framework snap glow).

---

## Displays (attributes)

From `functions/attributes.lua`:

### Damage

Damage Done · DPS · Damage Taken · Friendly Fire · Frags · Enemy Damage Taken · Auras & Voidzones · Damage Taken By Spell · Avoidable Damage Taken

### Heal

Healing Done · HPS · Overhealing · Healing Taken · Enemy Healing · Damage Prevented · Heal Absorbed · Potions

### Resources

Mana Restored · Rage · Energy · Runic Power · Other Resources · Alternate Power  
_(often dead on modern Retail)_

### Miscellaneous

CC Breaks · Ress · Interrupts · Dispels · Deaths · Cooldowns · Buff Uptime · Debuff Uptime

### Custom

Scriptable / forged displays (activity time, marked-target damage, etc.)

**Toolbar:** Mode · Segment · Attribute · Report · Reset · Close (+ stretch grab, lock/ungroup).

---

## Modes (who)

- **Everything** — all actors Details tracked
- **Standard** — group/raid (default)
- **Plugins** / Raid / Solo — plugin-owned lists
- Spell List (OpenForge)

Maps loosely: Everything ≈ Session · Standard ≈ Party · (self-focus ≈ Only).

---

## Segments & overall

- Current combat, finished segments list, **Overall** (M+ pacing use case in videos)
- Reset current vs keep overall
- Segment-locked option (can break multi-window independence — see GitHub #538)

---

## Player / fight tools (beyond rank bars)

| Tool                                          | Role                         | Our status                           |
| --------------------------------------------- | ---------------------------- | ------------------------------------ |
| Breakdown / Player details                    | Spells, targets, compare tab | Inspector (+ composition, uptime)    |
| Death recap                                   | Last ~seconds before death   | Death report                         |
| Encounter details plugin                      | Boss phases / timeline-ish   | Encounter / Timeline reports         |
| Report to chat                                | Link window summary          | Weak / none                          |
| Always show me                                | Pin self on meter            | Missing                              |
| Compare2 plugin                               | Side-by-side players         | Compare view (partial)               |
| TinyThreat / Vanguard / RaidCheck / Streamer  | Threat, tank, flasks, stream | Out of scope unless wanted           |
| Skins / profiles / SharedMedia                | Appearance                   | Partial chrome                       |
| Click-through in combat · transparency · lock | UX                           | Lock + idle chrome; no click-through |
| Mass show/hide toggle                         | Hide all meters              | Missing                              |

---

## Classic vs Retail (practical)

|                       | Classic / era TOCs                    | Retail (esp. Midnight)            |
| --------------------- | ------------------------------------- | --------------------------------- |
| Full CLEU parsing     | Yes                                   | Restricted / private actors       |
| Display menu depth    | Full                                  | Same code; many empty             |
| Window group / skins  | Yes                                   | Yes (skin still valuable)         |
| Best reference for AL | **Yes — prefer Classic mental model** | Use for chrome + privacy UX notes |

---

## Priority map → AdventureLand meters

### P0 — match Details core UX

1. **Window group / edge snap** (Damage ‖ Healing stacks)
2. Slim **display** cycle: Damage · Healing · Taken (+ optional Avoid / Heal req) — not composition channels
3. Composition (Direct / Explosion / DoT / AoE) **only** in Inspector / drill
4. Segment + Overall-style session view already partly there — keep clear

### P1 — parity polish

5. Always-show-self row
6. Report snapshot (party chat / copy)
7. Damage Taken by ability as meter or Inspector default for tanks
8. Interrupts / deaths as Tools (already direction)

### P2 — AL-native (keep, don’t force into ‹ ›)

9. PDPS · Hit DPS · coop v1/v2 as **AL presets**
10. Views: Table / Pie / Graph / Realtime / Compare
11. Visible / Session scopes (AL vision model)

### Out of scope / later

Resources regen, FF, frags, potions, RaidCheck, threat plugins, voidzones, custom Lua displays.

---

## Local reference tree

```
enhance-comm-ui/agentic/details-ref/retail/   # git clone (gitignore)
  functions/attributes.lua                   # display catalog
  classes/class_instance.lua                 # MakeInstanceGroup, BaseFrameSnap
  frames/window_main.lua                     # GetInstanceGroup, IsGroupedWith
  plugins/                                   # Compare2, EncounterDetails, …
```

Do not commit the clone; inventory lives in this file.
