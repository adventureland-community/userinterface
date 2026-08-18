# Module stash guide (enhance-comm-ui)

Active in tree: **minimap** + **crypt** (instance run, progress cards) + **abilityTimeline** (rail + BigIcon + highlight) + **viz** (in-game map overlays) + **bag send-item**. Everything else is in named git stashes for later work.

## Git stashes (newest first)

| Stash | Message | Restore with |
|-------|---------|--------------|
| `stash@{0}` | `ecu: unified settings hub (stash for later)` | do **not** apply — not the live Settings hub |
| `stash@{1}` | `ecu: viz overlays module (stash for later)` | restored into `src/viz/` — stash may still exist as backup |
| `stash@{2}` | `ecu: events module (stash for later)` | `git stash apply stash@{2}` |

`stash@{0}` is a leftover generic hub (`HUB_EDITORS` / `aggregateSettings` / `CommModuleDef.settings`). Live Settings is a slim two-pane shell in `src/ui/frames/SettingsPanel.ts` that mounts Ability Timeline + In game panes.

Run `git stash list` from `userinterface/` — indices shift if you add stashes.

### Restore one module

From repo root (`C:/Projects/AdventureLand/userinterface`):

```bash
# Example: bring back events module only
git stash apply stash@{2}
# Re-add registry imports in src/modules/registry.ts, wire CommPanelLayout, rebuild
npm test --prefix enhance-comm-ui
```

Use `git stash pop` instead of `apply` when you want to drop the stash after a successful merge.

## Active modules

| Module file | id | Status |
|-------------|-----|--------|
| `src/crypt/module.ts` | crypt | **on** — panels: `instanceRun`, `instance` |
| `src/instance/abilityTimelineModule.ts` | abilityTimeline | **on** — panels: `abilityTimeline`, `abilityTimelineBigIcon`, `abilityTimelineHighlight` |
| `src/ui/minimap/module.ts` | minimap | **on** |

Registry: `src/modules/registry.ts` — one import + one line per module.

## Crypt / instance (in tree, not stashed)

Shared groundwork under `src/instance/`:

- `configs.ts`, `labels.ts` — instance definitions
- `runModel.ts` — compact run summary model
- `mechanicChips.ts`, `monsterSpawns.ts`, `sectionCounts.ts`, `spawnAlerts.ts` — boss bar + card helpers

Panels owned by **crypt**:

- `InstanceRunPanel.ts` — progress / phase / luckm strip
- `CryptProgress.ts` — per-boss cards

## Ability timeline (own module)

Three HUD frames; empty-hide with `bossBar` (`!hasBosses`). Layout edit places empty frames. Overlay instance sim is the live validation surface. Settings preview is in-modal. No `/at test` HUD dummy mode.

- `AbilityTimelinePanel.ts` — chrome-free rail (bars remain an extra display mode)
- `AbilityTimelineBigIconPanel.ts` — last-N imminent icons; show/hide is `panelVisible`
- `AbilityTimelineHighlightPanel.ts` — center names; same empty-hide family
- `src/ui/frames/settings/abilityTimelineSettingsPane.ts` — Travel / Icons / Frames

Model/helpers:

- `src/instance/abilityTimelineModel.ts` — sticky CD rows from `entity.s` + `G.monsters`
- `src/instance/abilityTimelinePrefs.ts` — geometry (no duplicate show flags)
- `src/ui/frames/abilityTimelineCss.ts`

## Stashed bundles (paths)

### Unified settings (`stash@{0}`) — not live

Do not `git stash apply stash@{0}`. The live hub is the slim Settings shell above.

### Viz overlays (`stash@{1}`) — restored

In tree (not via `src/modules`):

- `src/viz/` — `startWorldOverlay`, `paintWorldOverlay`, `vizSettings`, `overlayToggleCatalog`
- Settings → **In game** (`src/ui/frames/settings/inGameSettingsPane.ts`)
- Overlay preview world stage: `dev/overlay/fakePixi.ts`, `dev/overlay/worldStage.ts`
- `tests/vizOverlay.test.ts`

Stash may still exist as a backup. Do not re-apply `module.ts` / `defineModule`.

### Events (`stash@{2}`)

- `src/events/`
- `src/ui/frames/EventsPanel.ts`, `EventScorePanel.ts`, `EventRosterPanel.ts`
- `tests/eventListModel.test.ts`, `abtestingModel.test.ts`

## Instance sim debug (in tree)

Overlay preview only — do not ship sim into live `/comm`. See `agentic/crypt-sim-debug.md`.

## Bag context menu (in tree, not stashed)

Inventory right-click menu is its own shell; features register actions:

- `src/ui/bag/bagItemContextMenu.ts` — menu shell + `registerBagMenuProvider`
- `src/ui/bag/registerBagMenuProviders.ts` — wires mail, send-item, item info
- `src/ui/frames/mail/mailBagMenuActions.ts` — mail compose / attach
- `src/host/sendItem.ts` + `src/host/sendItemBagMenuActions.ts` — nearby trade send
- `tests/sendItem.test.ts`

## Runtime toggle (when a module is in tree)

Set `enabled: false` in that module's `module.ts`. Panels and bootstrap drop out via `isPanelModuleEnabled`.
