# Comm minimap — /comm only

## Camera model

1. **Focus set**: observing → `character` → `me` in entities → largest party → any visible players.
2. **World → screen**: one shared `MapExtent` → `makeProjector` (walls + dots).
3. **Static after snap**: sticky zoom (`zoomRef`); pan center is `camFocusRef` from the last entity-fit snap. Drag still uses `panRef`. No continuous observer tracking while walking.
4. **Auto pan + zoom-fit** (observer center + bbox of all drawable entities — players & monsters, not `G.geometry`) fires only when:
   - First focus after panel mount
   - `map` or `in` changes (blank flicker ignored)
   - Explicit ◎
5. **Does not** auto-fit on: walking, small Δ, observe-id flicker, every paint.

## Mode

- **manual** only (default). Legacy `follow` / `fit` / `auto` / `radar` / `map` migrate to `manual` so old saves do not re-enable tracking.

## Manual controls

- Drag → `panRef` (not cleared except on auto-fit / ◎)
- Wheel / ± → `clampMinimapZoom` full range
- ◎ → one-shot entity-fit around observer (same as map-load snap)
- Chrome: idle = map name only; zoom/◎ + legend on hover / unlock / touch

## Impossible on /comm (not faked)

- Click-to-move, floor tiles, fog / full-server radar.
