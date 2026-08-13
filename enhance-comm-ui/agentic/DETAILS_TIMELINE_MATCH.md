# Details! Time Line — match notes (AL)

## Source of truth

Players open **Details_TimeLine** (`agentic/details-ref/Details_TimeLine/Details_TimeLine.lua`), not DF `CreateTimeLineFrame`.

DF `retail/Libs/DF/timeline.lua` is a reusable scrolling widget (`pixels_per_second`, scale, horizontal scroll). The plugin does **not** use it for layout.

## How Details Time Line works

| Concern | Behavior | Lua |
| --- | --- | --- |
| Collect | CLEU during combat into temp tables | `NewCombat`, `OnCooldown`, aura handlers, `EnemySpellCast` |
| Persist | Only on valid boss finish | `FinishCombat` → `cooldowns_timeline` / `debuff_timeline` / … |
| Redraw | Open window or finish while open — **not** live | `Refresh` / `OpenWindow`; `FinishCombat` → `Refresh` if `open` |
| Axis | Fit fight into fixed track width | `pixel_per_sec = CONST_VALID_WIDHT / total_time` (784) |
| Labels | 21 ticks, 00:00 → end | `CONST_TOTAL_TIMELINES`, `UpdateTimeLine` |
| Scroll | No horizontal time scroll; rows stack vertically | `CreateRow` absolute Y |
| Modes | Exclusive: Cooldowns / Debuffs / Enemy Cast / Enemy Spells | `selectWhatToShow` |
| Default tab | Debuffs | `currentSelectedType = allDisplayTypes[2]` |
| Blocks | Colored bar (+ optional icon); visual duration **clamped 5–20s** | `SetSpellBlock` |
| Deaths | Thin 4×14 pins | `PlaceDeathPins` |

## What was wrong in our hybrid

1. Fixed ~10 px/s + grow + horizontal scroll (DF) mixed with fit-to-width (plugin).
2. Live auto-follow → axis labels appeared mid-fight (e.g. `00:18`).
3. “All” overlay denser than any Details tab.
4. Condition bars used **full** aura length → fat bars across the fight (Details clamps width).
5. Live refresh crushed density as duration grew.

## AL implementation (current)

- Post-combat fit-to-width; live shows wait message.
- Modes: Cooldowns (casts) / Debuffs / Buffs (no CLEU → no Enemy Cast/Spells).
- Visual duration clamp 5–20s; death pins thin; class sprites kept.
- Vertical scroll only for player rows.

## Honest AL limits

- No CLEU → casts ≈ cooldowns; no enemy cast / enemy spell tabs.
- Conditions are sampled intervals, not full aura CLEU.
- No `DetailsFramework.CooldownsInfo` durations → casts use 8s visual default.
- Pixel sprites need larger rows than WoW’s 18px.
