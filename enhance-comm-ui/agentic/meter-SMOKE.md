# Meter smoke checklist

Reload `enhance-comm-ui.js` after build. Clear or keep `al-comm-ui-settings-v1` — missing presets backfill on load.

Compare against `agentic/meter-mockup/` — product bar is **mock parity**, not a thin spine.

## Defaults
- [ ] Fresh / backfill: **Damage**, **Healing**, **PDPS**, **s.coop v2**
- [ ] PDPS / coop frames **hidden when no rows** (still visible in Layout edit)
- [ ] Avoidance / Deaths / Compare / Realtime / Encounter / DPS graph / coop v1 **not** re-injected on load
- [ ] Extra panels still available from Add meter catalog
- [ ] Add dialog: **Meters** vs **Tools** (no Pie / Graph / Summary / Realtime / Compare as top-level adds)
- [ ] **View** on ranked meters: Bars · Table · Pie · Graph · Realtime · Compare (same mode, duplicate for 2 views)
- [ ] ‹ › cycles **mode** without resetting View

## Chrome
- [ ] Seg menu switches Current / Total / past fights per panel
- [ ] ‹ › cycles bar modes (damage → heal → taken → … → coop)
- [ ] Party menu: My party / Visible / You / All
- [ ] ⧉ duplicates; ✕ removes; + Meter adds from catalog
- [ ] Layout edit: All → Current / All → Total; Done / Esc exits layout
- [ ] Drag SE corner (browser grip or striped grip) to resize; with grid on, size snaps to cells; **Shift** (or Free placement) = free size; size persists after reload
- [ ] Secondary header actions (Seg / ‹› / Party / …) appear on hover only (always in Layout)
- [ ] Single hide × on the frame (play hover / layout); Layout “Rm” removes the meter
- [ ] Title/rows/footer readable (~15px / 14px / 13px); panel chrome matches mock colors

## Bars (mock bar-list)
- [ ] Live Current bars **patch** on tick (no full remount flicker)
- [ ] Hover shows rich tooltip (totals / rate / tip for drill)
- [ ] Ability rows show skill icons (sprite / letter fallback)
- [ ] Click player → abilities → targets; shift-click → all targets

## Inspector / Details
- [ ] Meters **locked** by default; 🔒 / 🔓 same slot; unlock → arrange; click 🔓 to re-lock
- [ ] Unlock → yellow arrange + grip; hide × sits **above** the frame (on grip while arranging)
- [ ] **Alt** held → drag/resize without unlocking (CommUI layout edit still for HUD)
- [ ] Healing ranks heal amounts (lifesteal shows as **lifesteal**, not attack)
- [ ] Inspector opens ~560×400 (not rank-meter sized)
- [ ] Multiple Inspectors allowed; catalog can add Inspector
- [ ] Split layout: overview + ability list | Outcomes / Targets / Taken tabs
- [ ] Ability click updates outcomes; icons on ability header
- [ ] **Details layout** toggle: dual pie + ability list + outcome table

## Deaths
- [ ] Side death list; killers with icons; hit log; HP chart; Damage/Heals filters

## Series
- [ ] Realtime: DPS/HPS/Taken · 15/30/60s · pause · legend rates update **without** chrome rebuild
- [ ] Compare: Stack / Integrate / Normalize + legend
- [ ] Chart hover sample tooltip

## Encounter / Timeline
- [ ] Encounter grid widgets (taken / dmg / heal req / avoidance) + open Inspector on click
- [ ] Timeline: cast/condition lanes; buffs/cds filters
- [ ] Encounter footer on bar panels

## Threat
- [ ] ThreatTable still shows incoming DPS / TTK (rolling window)
