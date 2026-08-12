# Skada fight / segment selection (source notes)

Upstream: classic [abl/AddOns Skada.lua](https://github.com/abl/AddOns/blob/master/Skada/Skada.lua) + [zarnivoop/skada v2.0.4 Menus.lua](https://github.com/zarnivoop/skada/blob/v2.0.4/Menus.lua).

## Core model (do not flatten to a global picker)

| Concept | Skada | AL mapping |
| ------- | ----- | ---------- |
| Per-window selection | `window.selectedset` | `meterInstance.selectedset` / `SegmentRef` on each panel |
| Resolve pointer → data | `Skada:find_set(selectedset)` | `resolveSegment(ref)` |
| Shared history store | `current` · `total` · `char.sets[]` | one store; many windows read it |
| Title | `Mode: Segment` via `set_mode_title` | `Damage Done: Current` |

**Wrong:** one global `activeSegment` that rebinds every panel (mock ≤v4.6).  
**Right:** each window keeps its own `selectedset`; changing one does not change others.

## Menu UX (`SegmentMenu` / title submenu)

Order in the dropdown:

1. **Total** → `selectedset = "total"`
2. **Current** → `selectedset = "current"`
3. Past sets → `selectedset = setIdentifier` (index or session id), label via `GetSetLabel(set)`

On pick: `Wipe()` that window’s display → `UpdateDisplay(true)`. Other windows untouched.

Also: Mode menu is separate (`ModeMenu` / left-click modes). Segment ≠ mode.

## `find_set("current")` — critical OOC behavior

Classic comment: *If set is "current", returns current set if we are in combat, otherwise returns the last set.*

```lua
function Skada:find_set(s)
  if s == "current" then
    if Skada.current ~= nil then return Skada.current
    elseif Skada.last ~= nil then return Skada.last
    else return self.char.sets[1]
    end
  elseif s == "total" then
    return Skada.total
  else
    return self.char.sets[s]  -- numeric index into past ring
  end
end
```

So the **label** “Current” stays selected out of combat, but the **data** is the last completed fight (not an empty live buffer). Title still shows `Current`, not the past set’s mob name.

AL: `resolveSegment("current")` → live segment if `inCombat`, else `last` archived fight.

## Title chrome (`set_mode_title`)

- If `selectedset == "current"` → append localized **Current** (not mob name).
- If `total` → **Total**.
- Else → `GetSetLabel(set)` = `SetLabelFormat(name, starttime, endtime)` (mob name + duration).

Persists `db.set` / `db.mode` for restore after reload.

## Lifecycle

### Combat start

- Every window: `selectedset = "current"` (force live view).
- Optional `returnaftercombat`: stash `restore_set` / `restore_mode` first.
- Optional `modeincombat`: switch mode for the fight.
- Start display update timer (~0.25s).

### Combat end (`EndSegment`)

- Drop trivial fights (&lt;5s / no mob) or non-boss if `onlykeepbosses`.
- Name = mob name; optional `(2)` suffix if duplicate (`setnumber`).
- `table.insert(char.sets, 1, current)` — newest first.
- Merge duration into `total`; clear per-player first/last on total.
- `last = current`; `current = nil`.
- Trim to `setstokeep`, skipping `set.keep` pins.
- Optional restore previous set/mode; wipe-mode if raid dead.
- `UpdateDisplay(true)` so windows still on older sets refresh after list shift.

### Reset

- Wipe store; all windows → `selectedset = "current"`.
- Global (not per-window) — clears everyone’s data.

### Delete / keep past sets

- Delete set → windows pointing at it fall back to `current`; indices after shift down.
- `keep` flag protects from trim and Reset’s non-kept purge.

## Navigation note (Skada-only)

With no mode selected, a window can show a **mode list for the chosen set** (`DisplayModes`). AL uses layout presets / mode ‹ › instead of that list UI — keep segment selection Skada-faithful without cloning mode-list navigation.

## AL product rules (locked from this research)

1. **Canonical:** per-panel `selectedset` + `resolveSegment` (Skada `find_set`).
2. **Title segment button / right-click title** opens Total · Current · past list (Skada `SegmentMenu`).
3. **Toolbar “apply fight to all”** is an AL convenience only — not Skada; label it as sync, not the primary path.
4. **Encounter Summary fight list** changes **that panel’s** `selectedset` only (Details-native browse on one window).
5. **Reset `↻`** = Skada Reset (archive/clear store + all panels → Current).
6. **Combat start** (idle break ends / new pull) forces panels to Current unless we add `returnAfterCombat` later.
7. **Ingest** always writes live `current`; UI read path never mutates other sets.
