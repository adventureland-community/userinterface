# Phone harness (real ECU)

Phone UI verification loads the **same** `enhance-comm-ui.js` IIFE as Tampermonkey, via the overlay preview host — not hand-drawn HTML mocks.

`/overlay` is the Phone/Desktop harness shell. `/overlay/frame` boots the **stock Adventure Land `/comm` client** (cached PIXI + `functions.js` + `game.js` + `data.js`). ECU wraps the live `add_name_tag` / FOV / camera path. Instance-sim feeds entities through stock `add_character` / `add_monster`.

## Prerequisites

```bash
npm run overlay:sync   # once (or when adventure.land / upstream main updates)
npm run dev
```

Serves `http://127.0.0.1:3927/overlay` — **Phone / Desktop** shell; game lives at `/overlay/frame` (LAN: host from `/health`).

Stock host scripts follow `htmls/comm.html` on sibling `adventureland_mongodb` at
**`upstream/main`** via `git show` (PIXI, `functions.js`, `generated_zones.js`,
`event_schedule.js`, `game.js`, `pixel_fonts.js`, …) — not your dirty worktree
or feature branches. `data.js` still comes from live adventure.land.

| Env | Effect |
|-----|--------|
| `ECU_AL_MONGODB` | Path to the mongodb clone (default: `../../adventureland_mongodb`) |
| `ECU_AL_MONGODB_REF` | Git ref for stock files (default: `upstream/main`) |
| `ECU_AL_MONGODB_WORKDIR=1` | Opt into copying the worktree (personal mods — avoid for harness) |

Overlay uses **canvas** PIXI (`engine_mode=canvas`) so Playwright screenshots keep the world pixels (PIXI 4 seals WebGLRenderer; `preserveDrawingBuffer` cannot be patched).

## Drivers

| Script | Purpose |
|--------|---------|
| `npm run overlay:shot -- --view phone\|desktop` | Viewport-correct PNGs under `agentic/overlay-shot/shots/` (`--fov`, `--fov-grid`) |
| Shell **Shot** | Same capture via `POST /overlay/api/shot` from the harness dock |
| `npm run phone:flows` | Open real panels (dock / Apps) at 390×844 and write PNGs under `flows/shots/` |
| `node agentic/mobile-preview/drive-overlay-phone.mjs` | Dock / Chat / Cmd / Settings smoke |
| `node agentic/mobile-preview/drive-tours-phone.mjs` | Guided-tour walkthrough |

Override frame URL: `ECU_OVERLAY_URL=http://192.168.x.x:3927/overlay/frame` (drivers that expect the game page must hit `/overlay/frame`, not the shell).

## Do not

Do not reintroduce `render-flows.mjs`-style `page.setContent` HTML mock scoring. Blind rates and polish must use shots from these drivers (real `#comm-ui`).
