# Details! → AL meters — strategic deep analysis

Companion to [DETAILS_FEATURE_INVENTORY.md](./DETAILS_FEATURE_INVENTORY.md).  
Interactive summary: Cursor canvas `details-deep-analysis.canvas.tsx`.

**Verdict:** Adopt Details’ _grammar_ (orthogonal Scope × Display × Segment, window groups, rank-bars + breakdown depth, Overall as a segment). Keep AL-native data (composition channels, PDPS, coop, Visible scope) and AL-extra Views — but stop mixing them into the Display ‹ › cycle.

---

## 1. Details product grammar

Details is not “a DPS meter with many modes.” It is:

```
Shared combat store (current / overall / past[])
  └─ Instance = local viewport
        Mode (who) × Attribute/Sub-attribute (what) × Segment (when)
        → ranked bars
        → click actor → Breakdown (spells / targets / compare / auras)
        → layout: edge-snap groups, lock, stretch, ungroup
```

**Why this feels coherent**

1. **Orthogonal axes** — users learn three menus, not 30 presets.
2. **Shared data, local lens** — Damage ‖ Healing share fights; only the metric differs.
3. **Rank home, depth click** — composition never competes with Damage Done in the sword menu.
4. **Physical windows** — snap groups make multi-metric layouts feel like furniture.
5. **Overall is a segment** — not a filter; M+ pacing window beside current pull.
6. **Extensibility at the edges** — Custom + plugins absorb niche tools without bloating core Displays.

Primary source truth: Classic CLEU Details (`Details_Classic.toc` in the same repo). Retail Midnight is often a chrome shell over Blizzard’s meter — do not use it as the feature ceiling.

---

## 2. AL architecture today (brief)

| Concept      | Implementation                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------- |
| Panel        | `MeterInstance` = query × presentation × segment × partyFocus + layout                          |
| “Mode” cycle | `BAR_MODE_CYCLE` — Damage/Heal/Taken/Avoid/Healreq **plus** channels **plus** PDPS/rolling/coop |
| View         | `VIEW_MODES` — Bars/Table/Pie/Graph/Realtime/Compare                                            |
| Scope        | `PartyFocus` — Party/Only/Visible/Session                                                       |
| Depth        | Drill nav on bars + multi Inspector + shared report (Encounter/Deaths/Timeline)                 |
| Data         | hub → meterEngine → CombatSegment ActorAgg tree → `runMeterQuery`                               |
| AL-native    | `channelDerive` (Direct/Explosion/DoT/AoE), snapshot PDPS/coop, rolling Hit DPS, Visible scope  |

**Skeleton is already Details/Skada-shaped.** The coherence break is collapsing Attribute + composition + AL snapshots into one cycle and overloading `MeterPresentation` with tool kinds.

---

## 3. Gap analysis (Details → AL)

### Adopt (high leverage)

| Details                    | Gap                                                | Target                                                 |
| -------------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| Mode × Attribute × Segment | Naming muddle; Display cycle polluted              | UX: **Scope · Display · Segment · View**               |
| Slim Displays              | Composition + PDPS in ‹ ›                          | Display = Damage · Healing · Taken (+ Avoid, Heal req) |
| Breakdown for depth        | Partial (Inspector good; cycle still has channels) | Composition only in Inspector / ability drill          |
| Window edge-snap           | Missing                                            | `snap[side]→panelId`, group move/scale, Ungroup        |
| Overall segment            | Soft “total” / Current→last fight                  | Explicit Overall + reset policies                      |
| Toolbar grammar            | Close but inconsistent labels                      | Align control order + names                            |
| Report / always-show-me    | Missing                                            | P1 polish                                              |

### Keep (already good)

- Shared segment store + per-panel query
- Reports as on-demand Tools (not permanent Add presets)
- Inspector multi-window for players
- Lock / Alt-arrange / layout edit / grid-free resize
- View modes as first-class (richer than Details)

### AL-only / AL-extra (do not force into Details Display)

| Feature                          | Where it belongs                                    |
| -------------------------------- | --------------------------------------------------- |
| Direct / Explosion / DoT / AoE   | Inspector + ability drill (data stays)              |
| PDPS · Hit DPS · coop v1/v2      | Add-meter presets / optional panels                 |
| Visible / Session scopes         | Scope menu (map Session≈Everything, Party≈Standard) |
| Pie / Graph / Realtime / Compare | View menu                                           |
| Vision-based party filtering     | Keep — no WoW analogue                              |

### Skip / defer

- Resources regen, Friendly Fire, Frags, Potions, voidzones
- Full plugin host (threat, raid check, streamer)
- SharedMedia skins / profile marketplace (optional export later)
- `instances_segments_locked` default-on (Details footgun — leave windows independent unless user opts in)

---

## 4. Target UX contract

### Ranked meter

```
[Scope ▾] [Segment ▾] [Display ‹ ›] [View ▾] [Tools] [🔒] [Ungroup?]
ranked bars…
footer: duration · scope · total  → click opens Encounter
```

- **Display ‹ ›** only: Damage, Healing, Damage taken, Avoidance, Healing required
- **Right-click row** → Inspector
- **Shift+click** → targets drill (keep if useful)

### Add meter

- Core: Damage, Healing, Taken, Avoidance, Heal required
- AL: PDPS, Hit DPS, coop v1, coop v2
- Optional advanced: party-ranked by composition channel (not in ‹ ›)

### Inspector (Details breakdown analogue)

Tabs/sections: Overview · Abilities · Composition · Targets · Taken · Uptime · Outcomes  
(Compare later)

### Tools

Encounter · Deaths · Timeline · Report/copy · (later Bookmarks)

### Layout

Edge-snap groups; default Damage ‖ Healing; per-panel lock; keep AL edit mode + Alt arrange.

---

## 5. Phased plan

### Phase 1 — Grammar

1. Rename chrome: Scope / Display / Segment / View
2. Slim `BAR_MODE_CYCLE`
3. Park composition + PDPS/coop/Hit DPS outside cycle
4. Explicit Overall + reset: current / overall / all

### Phase 2 — Physical windows

1. Edge proximity snap + bidirectional side map
2. Group drag, height match, optional shared scale
3. Ungroup + disable-new-grouping
4. Default snapped Damage ‖ Healing

### Phase 3 — Depth & tools

1. Inspector tab polish toward breakdown
2. Always-show-self
3. Report/copy
4. Keep shared report window

### Phase 4 — Optional parity

Interrupts/dispels if events exist · Taken-by-ability · Bookmarks · profile export

---

## 6. Naming cheat sheet

| Details             | AL today (confused)                      | Target AL        |
| ------------------- | ---------------------------------------- | ---------------- |
| Mode                | called “Scope” (good) / sometimes “mode” | **Scope**        |
| Attribute / Display | “mode” in ‹ ›                            | **Display**      |
| Segment             | segment / selectedset                    | **Segment**      |
| (bars only)         | View                                     | **View**         |
| Breakdown           | Inspector                                | **Inspector**    |
| Instance group      | —                                        | **Window group** |

---

## 7. Implementation anchors

**Details (read-only clone):** `agentic/details-ref/retail/`

- `functions/attributes.lua`
- `classes/class_instance.lua` — `MakeInstanceGroup`, `BaseFrameSnap`
- `frames/window_main.lua` — toolbar, `GetInstanceGroup`
- `frames/window_breakdown*`

**AL:**

- `src/meters/meterCatalog.ts` — cycle / presets
- `src/meters/meterTypes.ts` — query / presentation
- `src/ui/meter/MeterPanelShell.ts` — chrome
- `src/ui/frames/CommUI.ts` — multi-panel host
- `src/ui/meter/views/MeterMiscViews.ts` — Inspector / reports

---

## 8. Decision for the team

**Yes — move toward Details for most UX structure.**  
**No — do not become a WoW clone of every sub-attribute.**  
**Yes — AL combat composition and entity snapshots stay first-class, but as depth/presets, not as peer Displays.**
