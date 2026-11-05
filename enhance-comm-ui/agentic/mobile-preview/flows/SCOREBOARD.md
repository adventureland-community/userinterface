# Phone real-harness: previous vs new

Real ECU `/overlay` shots (`npm run phone:flows`). No HTML mocks for scoring.

| Set | Path |
|-----|------|
| Previous | [shots-prev4/](shots-prev4/) |
| New | [shots/](shots/) |

## Latest board (blind raters, absolute ≥8 goal)

Consensus median after settings Display toggle wall + command Quick-10 + multi-page home (2–3 raters; variance real):

| Flow | Score | ≥8? | Notes |
|------|------:|:---:|-------|
| home | 8 | yes | Stick/FOV clear Players › / dots (~20–40px); map-first. Nameplates via stock `add_name_tag` → ECU beautify |
| apps | 9 | yes | Launcher packed to top |
| chat | 8–9 | yes | Dense party log + quick chips |
| command | 8–9 | yes | Quick tab default; ~10 snippets |
| settings | 8 | yes | Display first; Comm HUD + drawings toggles above the fold |
| bank | 8–9 | yes | Dense sprite grid |
| market | 8 | yes | Named cards + Sell/Buy |
| mail | 8–9 | yes | Full-height; production sync copy; 8 rows |
| bag | 8–9 | yes | Sprite slots; dense seed |

**Status: Board cleared — every flow median ≥8.** `phone:flows` green.

### Homescreen delta (live BEFORE vs harness AFTER)

Independent rater, multi-page fixture (`defaultPhoneHomeScreens`):

| Image | Map-first | Nameplates | Stick/FOV vs pager | Chrome collision | Overall | ≥8? |
|-------|----------:|-----------:|-------------------:|-----------------:|--------:|:---:|
| BEFORE (live JPG) | 4 | 2 | 2 | 2 | 3 | no |
| AFTER (`01-home.png`) | 8 | N/A | 9 | 8 | 8 | yes |

- BEFORE: huge class plates; stick/FOV on **Players ›**.
- AFTER: cam chrome raised above pager; clear gap. Overlay boots stock `/comm` PIXI+`game.js` (canvas); sim feeds `add_character`/`add_monster`; ECU wraps live `add_name_tag`.

### What moved the needle this round

- Hide harness `#ecu-overlay-dock` during flow shots (production-like home)
- Settings: open Display; hide phone prose; drawings toggles first-paint on phone
- Command: phone defaults to Quick; seed ~10 snippets
- Home: production Home / Players / Coop pages (score stick+FOV vs pager)
- Cam chrome bottom offset clears pager strip
- Mail: “Synced just now” instead of “Preview fixtures”
- Bag/market/chat fixture density
