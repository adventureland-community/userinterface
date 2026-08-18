# Instance sim (overlay preview)

Simulate instance HUD **without** the game client or `/comm`.

The live Comm overlay does not include sim controls. Open the preview:

1. `npm run dev` in `enhance-comm-ui`
2. [http://127.0.0.1:3927/overlay](http://127.0.0.1:3927/overlay)

## Dock

Top-left on the preview page:

1. **Sim: ON/OFF** — toggles fake instance entities
2. **Scenario** — crypt / tomb / spider / winter presets

Turning sim **on** also opens instance, instance run, boss bar, ability timeline, Big Icon, and highlight panels if they were closed (preview seeds those visible).

## Console API

```js
// Mid crypt pull — Spike aggro, Bill CDs, bats
__ecuInstanceSim.enable("crypt-pull");

// Orlok only
__ecuInstanceSim.enable("crypt-boss");

__ecuInstanceSim.setScenario("tomb");
__ecuInstanceSim.disable();
__ecuInstanceSim.toggle();
__ecuInstanceSim.listScenarios();
__ecuInstanceSim.revealPanels();
```

## Scenarios

| id | What you get |
|----|----------------|
| `crypt-pull` | a1 aggro, a2 anger CD, bats |
| `crypt-boss` | Orlok only |
| `tomb` | Purple protector + CDs |
| `spider` | Side queens + spider adds |
| `winter` | Fire mage phase |

Sim entities use instance id `__ecu_sim__`. Ability timeline, boss mechanics, labels, and icons use cached live `window.G` plus stock `sprite()` / `item_container` from `dev/overlay/cache/` (gitignored; `npm run overlay:sync`). If the cache cannot be fetched, the preview falls back to a tiny G stub.

With **Sim: ON** (`crypt-boss` or `tomb` for looping CDs):

- Rail has no V/H / Bars / Icons / Opts chrome
- Icons travel toward NOW; wrap sits Ready then pops a new cycle
- BigIcon and highlight frames mount independently (`comm-pos-abilityTimelineBigIcon`, `comm-pos-abilityTimelineHighlight`)
- **Settings** patches apply on the live sim HUD and in the modal preview
- **Layout** can drag all three frames; sim OFF empty-hides them (no dark boxes on desert/main)


## Code

- `dev/overlay/` — host stub, sim dock, preview HTML
- `dev/overlay/cache/` — live data.js, client-kit, sprites/fonts (not in git)
- `scripts/overlay-client-cache.mjs` — fetch + `/images` proxy
- `src/debug/instanceSim.ts` — state + snapshot merge (tests + preview)
- `src/debug/instanceSimScenarios.ts` — entity scripts
