# Meter mockup v4.8

Open [`index.html`](./index.html) (or `python -m http.server 8777 --bind 127.0.0.1` from this folder).

## Thermo fixes in this version

| Blocker | Fix |
| ------- | --- |
| `mock-data.js` >1k | Split → `mock-fixtures` (549) · `mock-segments` (296) · `mock-query` (243) · facade (66) |
| Dual live clocks | One `MockUiTick` — bars + series subscribe; ingest once per pump |
| Dual panel models | `MockPanelConfig` query×presentation; `kind` = registry alias |
| Inspector vs Details | Merged — Details is a layout on Inspector |

## Architecture

```
MockFixtures      — static players/deaths/incoming/timeline helpers
MockSegments      — SEGMENTS + resolveSegment / withSegment / party / ticks
MockQuery         — ranked* / metrics / encounter / timeline DTOs
MockData          — thin facade (views call this only)
MockPanelConfig   — preset → { query, presentation }
MockUiTick        — single coalesce timer
MockIcons / Charts / Bars / Series / ChartView / Timeline / Views / Shell
```

## Skada segment selection

See [`SKADA-SEGMENTS.md`](./SKADA-SEGMENTS.md). Per-panel Seg menu; toolbar apply-all; OOC Current→last.

## Plan

**Full hybrid in one delivery** — no “slice 1 only” / deferred past fights / timeline / charts. See Cursor plan `wow-style_al_meters`.
